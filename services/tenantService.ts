import { Tenant, KycDetails, TenantDocument, ActivityLog } from '@/types/tenant';
import { getItem, setItem, STORAGE_KEYS } from '@/lib/storage';
import { initialTenants } from '@/data/tenants';
import { propertyService } from './propertyService';
import { apiClient } from '@/lib/apiClient';

function mapBackendResident(r: any): Tenant {
  return {
    id: r.id,
    tenantCode: r.properties?.code ? `${r.properties.code}-${r.beds?.bedNumber || 'R'}` : `TNT-${r.id.slice(0, 4)}`,
    name: r.fullName,
    phone: r.phone,
    email: r.email,
    gender: (r.gender ? (r.gender.toLowerCase() === 'girls' ? 'female' : 'male') : 'male') as any,
    dob: r.dateOfBirth ? r.dateOfBirth.split('T')[0] : undefined,
    occupation: r.designation || r.occupationType || 'Employed',
    companyOrCollege: r.employerOrCollegeName || undefined,
    propertyId: r.propertyId || '10f6501b-487c-4118-89e7-40bccb670c05',
    buildingId: 'bld-1',
    floorId: r.floorId || 'flr-1',
    roomId: r.roomId || 'room-1',
    bedId: r.bedId || 'bed-1',
    moveInDate: r.joiningDate ? r.joiningDate.split('T')[0] : new Date().toISOString().split('T')[0],
    agreementEndDate: r.expectedMoveOutDate ? r.expectedMoveOutDate.split('T')[0] : undefined,
    noticePeriodDays: 30,
    monthlyRent: Number(r.monthlyRent || 0),
    securityDeposit: Number(r.securityDeposit || 0),
    depositPaid: Number(r.depositPaid || 0),
    paymentStatus: 'paid',
    status: (r.status ? r.status.toLowerCase() : 'active') as any,
    emergencyContact: {
      name: r.emergencyContactName || 'Emergency Contact',
      relation: r.emergencyContactRelation || 'Family',
      phone: r.emergencyContactPhone || r.phone,
    },
    kyc: {
      status: 'verified',
      aadhaarStatus: 'verified',
      panStatus: 'verified',
      policeVerificationStatus: 'completed',
    },
    documents: [],
    activities: [
      {
        id: `act-${r.id}`,
        action: 'Resident Registered',
        details: `Stay initialized at ${r.properties?.name || 'Property'}`,
        timestamp: new Date(r.createdAt || Date.now()).toLocaleString('en-IN'),
        actor: 'Admin',
      },
    ],
  };
}

export const tenantService = {
  getTenants: (propertyId?: string): Tenant[] => {
    const list = getItem<Tenant[]>(STORAGE_KEYS.TENANTS, initialTenants);
    if (propertyId) return list.filter((t) => t.propertyId === propertyId);
    return list;
  },

  getTenantById: (id: string): Tenant | undefined => {
    const list = tenantService.getTenants();
    return list.find((t) => t.id === id);
  },

  /**
   * Fetch live residents from backend and update local store
   */
  fetchTenants: async (propertyId?: string): Promise<Tenant[]> => {
    try {
      const q = propertyId ? `?propertyId=${propertyId}&limit=100` : '?limit=100';
      const response = await apiClient.get(`/residents${q}`);
      const items = Array.isArray(response) ? response : response?.items || [];
      const mapped = items.map(mapBackendResident);
      if (mapped.length > 0) {
        setItem(STORAGE_KEYS.TENANTS, mapped);
        return mapped;
      }
      return tenantService.getTenants(propertyId);
    } catch (err) {
      console.warn('Using local tenants cache due to API network error:', err);
      return tenantService.getTenants(propertyId);
    }
  },

  createTenant: async (data: Omit<Tenant, 'id' | 'tenantCode' | 'documents' | 'activities'>): Promise<Tenant> => {
    const payload = {
      fullName: data.name,
      email: data.email,
      phone: data.phone,
      gender: data.gender === 'female' ? 'GIRLS' : 'BOYS',
      monthlyRent: Number(data.monthlyRent || 0),
      securityDeposit: Number(data.securityDeposit || 0),
      depositPaid: Number(data.depositPaid || 0),
      status: 'ACTIVE',
      propertyId: data.propertyId,
      roomId: data.roomId && data.roomId.length > 20 ? data.roomId : undefined,
      bedId: data.bedId && data.bedId.length > 20 ? data.bedId : undefined,
      emergencyContactName: data.emergencyContact?.name || 'Emergency Contact',
      emergencyContactRelation: data.emergencyContact?.relation || 'Family',
      emergencyContactPhone: data.emergencyContact?.phone || data.phone,
    };

    try {
      const created = await apiClient.post('/residents', payload);
      const mapped = mapBackendResident(created);
      const current = tenantService.getTenants();
      const updated = [mapped, ...current.filter((t) => t.id !== mapped.id)];
      setItem(STORAGE_KEYS.TENANTS, updated);

      if (data.bedId) {
        propertyService.assignBed(data.bedId, mapped.id, mapped.name);
      }
      return mapped;
    } catch (err) {
      // Local fallback for demo reliability
      const list = tenantService.getTenants();
      const count = list.length + 1;
      const newTenant: Tenant = {
        ...data,
        id: `tnt-${Date.now()}`,
        tenantCode: `TNT-${1000 + count}`,
        documents: [],
        activities: [
          {
            id: `act-${Date.now()}`,
            action: 'Tenant Created',
            details: `Registered in Room bed ${data.bedId}`,
            timestamp: new Date().toLocaleString('en-IN'),
            actor: 'Admin',
          },
        ],
      };
      setItem(STORAGE_KEYS.TENANTS, [newTenant, ...list]);
      if (data.bedId) {
        propertyService.assignBed(data.bedId, newTenant.id, newTenant.name);
      }
      return newTenant;
    }
  },

  updateTenant: async (id: string, updates: Partial<Tenant>): Promise<Tenant | null> => {
    try {
      const payload: any = {};
      if (updates.name) payload.fullName = updates.name;
      if (updates.email) payload.email = updates.email;
      if (updates.phone) payload.phone = updates.phone;
      if (updates.monthlyRent !== undefined) payload.monthlyRent = Number(updates.monthlyRent);

      const updated = await apiClient.patch(`/residents/${id}`, payload);
      const mapped = mapBackendResident(updated);
      const current = tenantService.getTenants();
      const nextList = current.map((t) => (t.id === id ? mapped : t));
      setItem(STORAGE_KEYS.TENANTS, nextList);
      return mapped;
    } catch {
      const list = tenantService.getTenants();
      const idx = list.findIndex((t) => t.id === id);
      if (idx === -1) return null;
      const old = list[idx];
      const updated: Tenant = { ...old, ...updates };

      if (updates.bedId && updates.bedId !== old.bedId) {
        if (old.bedId) propertyService.releaseBed(old.bedId);
        propertyService.assignBed(updates.bedId, updated.id, updated.name);
      }

      list[idx] = updated;
      setItem(STORAGE_KEYS.TENANTS, [...list]);
      return updated;
    }
  },

  deleteTenant: async (id: string): Promise<boolean> => {
    try {
      await apiClient.delete(`/residents/${id}`);
      const list = tenantService.getTenants();
      const target = list.find((t) => t.id === id);
      if (target && target.bedId) {
        propertyService.releaseBed(target.bedId);
      }
      const filtered = list.filter((t) => t.id !== id);
      setItem(STORAGE_KEYS.TENANTS, filtered);
      return true;
    } catch {
      const list = tenantService.getTenants();
      const target = list.find((t) => t.id === id);
      if (!target) return false;
      if (target.bedId) {
        propertyService.releaseBed(target.bedId);
      }
      const filtered = list.filter((t) => t.id !== id);
      setItem(STORAGE_KEYS.TENANTS, filtered);
      return true;
    }
  },

  updateKyc: (id: string, kyc: Partial<KycDetails>): Tenant | null => {
    const tenant = tenantService.getTenantById(id);
    if (!tenant) return null;
    const updatedKyc: KycDetails = { ...tenant.kyc, ...kyc };
    return tenantService.updateTenant(id, { kyc: updatedKyc }) as any;
  },

  addDocument: async (id: string, doc: Omit<TenantDocument, 'id' | 'uploadedAt'>): Promise<Tenant | null> => {
    try {
      await apiClient.post(`/residents/${id}/documents`, {
        documentType: 'ID_PROOF',
        title: doc.title,
        fileUrl: doc.fileUrl,
      });
    } catch (e) {
      console.warn('Backend document upload skipped:', e);
    }
    const tenant = tenantService.getTenantById(id);
    if (!tenant) return null;
    const newDoc: TenantDocument = {
      ...doc,
      id: `doc-${Date.now()}`,
      uploadedAt: new Date().toISOString().split('T')[0],
    };
    return tenantService.updateTenant(id, {
      documents: [...(tenant.documents || []), newDoc],
    });
  },

  addActivity: (id: string, action: string, details: string, actor: string = 'Staff'): Tenant | null => {
    const tenant = tenantService.getTenantById(id);
    if (!tenant) return null;
    const newAct: ActivityLog = {
      id: `act-${Date.now()}`,
      action,
      details,
      timestamp: new Date().toLocaleString('en-IN'),
      actor,
    };
    return tenantService.updateTenant(id, {
      activities: [newAct, ...(tenant.activities || [])],
    }) as any;
  },
};
