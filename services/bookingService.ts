import { Application, Booking, MoveInRecord, MoveOutRecord } from '@/types/booking';
import { getItem, setItem, STORAGE_KEYS } from '@/lib/storage';
import { initialApplications, initialBookings, initialMoveIns, initialMoveOuts } from '@/data/bookings';
import { propertyService } from './propertyService';
import { tenantService } from './tenantService';
import { apiClient } from '@/lib/apiClient';

export const bookingService = {
  // Live Backend: Bookings
  fetchBookings: async (): Promise<Booking[]> => {
    try {
      const res = await apiClient.get<any>('/api/bookings');
      const items = res?.items || (Array.isArray(res) ? res : res?.data || []);
      if (Array.isArray(items) && items.length > 0) {
        const mapped: Booking[] = items.map((b: any) => ({
          id: b.id,
          bookingCode: b.receiptNumber || `BKG-${b.id.substring(0, 8)}`,
          applicantName: b.enquiries?.name || b.resident?.fullName || 'Resident',
          phone: b.enquiries?.phone || b.resident?.phone || '',
          email: b.enquiries?.email || b.resident?.email || '',
          propertyId: b.propertyId,
          roomId: b.roomId || 'room-1',
          bedId: b.bedId || 'bed-1',
          moveInDate: b.expectedMoveIn ? new Date(b.expectedMoveIn).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          tokenDeposit: Number(b.bookingAmount || 0),
          monthlyRent: Number(b.beds?.rent || 8000),
          totalDeposit: Number(b.beds?.securityDeposit || 16000),
          status: (['pending', 'confirmed', 'cancelled', 'completed'].includes(b.status?.toLowerCase()) ? b.status.toLowerCase() : 'confirmed') as any,
          notes: b.notes || '',
          createdAt: b.bookingDate ? new Date(b.bookingDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        }));
        setItem(STORAGE_KEYS.BOOKINGS, mapped);
        return mapped;
      }
    } catch (err) {
      console.warn('Could not fetch backend bookings:', err);
    }
    return bookingService.getBookings();
  },

  createBookingLive: async (data: any): Promise<Booking> => {
    try {
      const res = await apiClient.post<any>('/api/bookings', data);
      if (res) {
        const b = res.data || res;
        const newBooking: Booking = {
          id: b.id,
          bookingCode: b.receiptNumber || `BKG-${b.id.substring(0, 8)}`,
          applicantName: data.applicantName || 'Resident',
          phone: data.phone || '',
          email: data.email || '',
          propertyId: b.propertyId || data.propertyId,
          roomId: b.roomId || data.roomId || 'room-1',
          bedId: b.bedId || data.bedId || 'bed-1',
          moveInDate: b.expectedMoveIn || data.expectedMoveInDate || new Date().toISOString().split('T')[0],
          tokenDeposit: Number(b.bookingAmount || data.tokenAmount || data.tokenDeposit || 0),
          monthlyRent: Number(data.monthlyRent || 8000),
          totalDeposit: Number(data.totalDeposit || 16000),
          status: (['pending', 'confirmed', 'cancelled', 'completed'].includes(b.status?.toLowerCase()) ? b.status.toLowerCase() : 'confirmed') as any,
          notes: b.notes || '',
          createdAt: new Date().toISOString().split('T')[0],
        };
        const list = bookingService.getBookings();
        setItem(STORAGE_KEYS.BOOKINGS, [newBooking, ...list]);
        return newBooking;
      }
    } catch (err) {
      console.warn('Backend booking creation failed, using local store:', err);
    }
    return bookingService.createBooking(data);
  },

  // Live Backend: Move-Ins
  fetchMoveIns: async (): Promise<MoveInRecord[]> => {
    try {
      const res = await apiClient.get<any>('/api/move-ins');
      const items = res?.items || (Array.isArray(res) ? res : res?.data || []);
      if (Array.isArray(items) && items.length > 0) {
        const mapped: MoveInRecord[] = items.map((m: any) => ({
          id: m.id,
          tenantId: m.residentId,
          propertyId: m.propertyId,
          roomId: m.roomId || 'room-1',
          bedId: m.bedId || 'bed-1',
          agreementDate: m.moveInDate ? new Date(m.moveInDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          depositReceived: Number(m.depositPaid || m.securityDepositAmount || 0),
          firstRentReceived: Number(m.firstInvoiceAmount || 0),
          inventoryChecked: true,
          keysHandedOver: true,
          kycCompleted: true,
          remarks: m.notes || '',
        }));
        setItem(STORAGE_KEYS.MOVE_INS, mapped);
        return mapped;
      }
    } catch (err) {
      console.warn('Could not fetch backend move-ins:', err);
    }
    return bookingService.getMoveIns();
  },

  // Applications
  getApplications: (): Application[] => {
    return getItem<Application[]>(STORAGE_KEYS.APPLICATIONS, initialApplications);
  },

  createApplication: (data: Omit<Application, 'id' | 'createdAt'>): Application => {
    const list = bookingService.getApplications();
    const newApp: Application = {
      ...data,
      id: `app-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setItem(STORAGE_KEYS.APPLICATIONS, [newApp, ...list]);
    return newApp;
  },

  updateApplicationStatus: (id: string, status: Application['status']): Application | null => {
    const list = bookingService.getApplications();
    const idx = list.findIndex((a) => a.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], status };
    setItem(STORAGE_KEYS.APPLICATIONS, [...list]);
    return list[idx];
  },

  deleteApplication: (id: string): boolean => {
    const list = bookingService.getApplications();
    const filtered = list.filter((a) => a.id !== id);
    if (filtered.length === list.length) return false;
    setItem(STORAGE_KEYS.APPLICATIONS, filtered);
    return true;
  },

  // Bookings
  getBookings: (): Booking[] => {
    return getItem<Booking[]>(STORAGE_KEYS.BOOKINGS, initialBookings);
  },

  getBookingById: (id: string): Booking | undefined => {
    const list = bookingService.getBookings();
    return list.find((b) => b.id === id);
  },

  createBooking: (data: Omit<Booking, 'id' | 'bookingCode' | 'createdAt'>): Booking => {
    const list = bookingService.getBookings();
    const count = list.length + 1;
    const newBooking: Booking = {
      ...data,
      id: `bkg-${Date.now()}`,
      bookingCode: `BKG-2024-${String(count).padStart(3, '0')}`,
      createdAt: new Date().toISOString().split('T')[0],
    };

    setItem(STORAGE_KEYS.BOOKINGS, [newBooking, ...list]);

    // Reserve bed if provided
    if (data.bedId) {
      propertyService.reserveBed(data.bedId, data.applicantName);
    }

    return newBooking;
  },

  updateBookingStatus: (id: string, status: Booking['status']): Booking | null => {
    const list = bookingService.getBookings();
    const idx = list.findIndex((b) => b.id === id);
    if (idx === -1) return null;
    const old = list[idx];
    list[idx] = { ...old, status };
    setItem(STORAGE_KEYS.BOOKINGS, [...list]);

    if (status === 'cancelled' && old.bedId) {
      propertyService.releaseBed(old.bedId);
    }

    return list[idx];
  },

  deleteBooking: (id: string): boolean => {
    const list = bookingService.getBookings();
    const target = list.find((b) => b.id === id);
    if (!target) return false;
    if (target.bedId) {
      propertyService.releaseBed(target.bedId);
    }
    const filtered = list.filter((b) => b.id !== id);
    setItem(STORAGE_KEYS.BOOKINGS, filtered);
    return true;
  },

  // Move-in
  getMoveIns: (): MoveInRecord[] => {
    return getItem<MoveInRecord[]>(STORAGE_KEYS.MOVE_INS, initialMoveIns);
  },

  createMoveIn: (record: Omit<MoveInRecord, 'id'>): MoveInRecord => {
    const list = bookingService.getMoveIns();
    const newRecord: MoveInRecord = { ...record, id: `mvi-${Date.now()}` };
    setItem(STORAGE_KEYS.MOVE_INS, [newRecord, ...list]);

    tenantService.addActivity(
      record.tenantId,
      'Move-In Check-In Completed',
      'Inventory checked and keys handed over.',
      'Manager'
    );

    return newRecord;
  },

  // Move-out
  getMoveOuts: (): MoveOutRecord[] => {
    return getItem<MoveOutRecord[]>(STORAGE_KEYS.MOVE_OUTS, initialMoveOuts);
  },

  createMoveOut: (record: Omit<MoveOutRecord, 'id'>): MoveOutRecord => {
    const list = bookingService.getMoveOuts();
    const newRecord: MoveOutRecord = { ...record, id: `mvo-${Date.now()}` };
    setItem(STORAGE_KEYS.MOVE_OUTS, [newRecord, ...list]);

    // Update tenant status to vacated
    tenantService.updateTenant(record.tenantId, {
      status: 'vacated',
    });

    // Release tenant's bed
    const tenant = tenantService.getTenantById(record.tenantId);
    if (tenant && tenant.bedId) {
      propertyService.releaseBed(tenant.bedId);
    }

    tenantService.addActivity(
      record.tenantId,
      'Move-Out Completed',
      `Vacated with net refund ₹${record.finalRefundAmount}. Settlement status: ${record.settlementStatus}`,
      'Manager'
    );

    return newRecord;
  },
};
