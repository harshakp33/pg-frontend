import { Property, Building, Room, Bed } from '@/types/property';
import { getItem, setItem, STORAGE_KEYS } from '@/lib/storage';
import { initialProperties, initialBuildings, initialRooms, initialBeds } from '@/data/properties';
import { apiClient } from '@/lib/apiClient';

function mapBackendProperty(bp: any): Property {
  return {
    id: bp.id,
    name: bp.name,
    type: (bp.propertyType ? bp.propertyType.toLowerCase() : 'coliving') as any,
    address: bp.addressLine1 || '',
    city: bp.city || '',
    area: bp.area || bp.city || '',
    pincode: bp.pincode || '',
    contactNumber: bp.contactPhone || '',
    email: bp.contactEmail || '',
    managerName: 'Property Manager',
    status: (bp.status ? bp.status.toLowerCase() : 'active') as any,
    totalFloors: bp._count?.floors || 1,
    amenities: Array.isArray(bp.amenities)
      ? bp.amenities
      : ['High Speed WiFi', 'Power Backup', 'CCTV Security', 'Housekeeping', 'Laundry Facility'],
    image:
      bp.image ||
      'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80',
    createdAt: bp.createdAt ? bp.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
  };
}

export const propertyService = {
  // Sync reading from state/cache
  getProperties: (): Property[] => {
    return getItem<Property[]>(STORAGE_KEYS.PROPERTIES, initialProperties);
  },

  getPropertyById: (id: string): Property | undefined => {
    const list = propertyService.getProperties();
    return list.find((p) => p.id === id);
  },

  /**
   * Fetch live properties from backend and update local cache
   */
  fetchProperties: async (): Promise<Property[]> => {
    try {
      const response = await apiClient.get('/properties');
      const items = Array.isArray(response) ? response : response?.items || [];
      const mapped = items.map(mapBackendProperty);
      if (mapped.length > 0) {
        setItem(STORAGE_KEYS.PROPERTIES, mapped);
        return mapped;
      }
      return propertyService.getProperties();
    } catch (err) {
      console.warn('Using local properties cache due to API network error:', err);
      return propertyService.getProperties();
    }
  },

  createProperty: async (data: Omit<Property, 'id' | 'createdAt'>): Promise<Property> => {
    const payload = {
      name: data.name,
      code: `PROP-${Date.now().toString().slice(-4)}`,
      propertyType: 'CO_LIVING',
      genderType: 'UNISEX',
      addressLine1: data.address || 'Silicon Valley Area',
      city: data.city || 'Bengaluru',
      state: 'Karnataka',
      pincode: data.pincode || '560100',
      contactPhone: data.contactNumber || '+91 99000 11223',
      contactEmail: data.email || 'stay@pgmanager.com',
    };

    try {
      const created = await apiClient.post('/properties', payload);
      const mapped = mapBackendProperty(created);
      const current = propertyService.getProperties();
      const updated = [mapped, ...current.filter((p) => p.id !== mapped.id)];
      setItem(STORAGE_KEYS.PROPERTIES, updated);
      return mapped;
    } catch (err: any) {
      // If backend fails, propagate error cleanly to UI
      throw err;
    }
  },

  updateProperty: async (id: string, updates: Partial<Property>): Promise<Property | null> => {
    try {
      const payload: any = {};
      if (updates.name) payload.name = updates.name;
      if (updates.address) payload.addressLine1 = updates.address;
      if (updates.city) payload.city = updates.city;
      if (updates.contactNumber) payload.contactPhone = updates.contactNumber;
      if (updates.email) payload.contactEmail = updates.email;

      const updated = await apiClient.patch(`/properties/${id}`, payload);
      const mapped = mapBackendProperty(updated);
      const current = propertyService.getProperties();
      const nextList = current.map((p) => (p.id === id ? mapped : p));
      setItem(STORAGE_KEYS.PROPERTIES, nextList);
      return mapped;
    } catch (err) {
      // Local fallback
      const list = propertyService.getProperties();
      const index = list.findIndex((p) => p.id === id);
      if (index === -1) return null;
      const updated = { ...list[index], ...updates };
      list[index] = updated;
      setItem(STORAGE_KEYS.PROPERTIES, [...list]);
      return updated;
    }
  },

  deleteProperty: async (id: string): Promise<boolean> => {
    try {
      await apiClient.delete(`/properties/${id}`);
      const list = propertyService.getProperties();
      const filtered = list.filter((p) => p.id !== id);
      setItem(STORAGE_KEYS.PROPERTIES, filtered);
      return true;
    } catch {
      const list = propertyService.getProperties();
      const filtered = list.filter((p) => p.id !== id);
      if (filtered.length === list.length) return false;
      setItem(STORAGE_KEYS.PROPERTIES, filtered);
      return true;
    }
  },

  // Buildings & Floors
  getBuildings: (propertyId?: string): Building[] => {
    const list = getItem<Building[]>(STORAGE_KEYS.BUILDINGS, initialBuildings);
    if (propertyId) return list.filter((b) => b.propertyId === propertyId);
    return list;
  },

  createBuilding: (data: Omit<Building, 'id'>): Building => {
    const list = propertyService.getBuildings();
    const newBld: Building = { ...data, id: `bld-${Date.now()}` };
    setItem(STORAGE_KEYS.BUILDINGS, [...list, newBld]);
    return newBld;
  },

  updateBuilding: (id: string, updates: Partial<Building>): Building | null => {
    const list = propertyService.getBuildings();
    const idx = list.findIndex((b) => b.id === id);
    if (idx === -1) return null;
    const updated = { ...list[idx], ...updates };
    list[idx] = updated;
    setItem(STORAGE_KEYS.BUILDINGS, [...list]);
    return updated;
  },

  deleteBuilding: (id: string): boolean => {
    const list = propertyService.getBuildings();
    const filtered = list.filter((b) => b.id !== id);
    if (filtered.length === list.length) return false;
    setItem(STORAGE_KEYS.BUILDINGS, filtered);
    return true;
  },

  // Rooms
  getRooms: (propertyId?: string): Room[] => {
    const list = getItem<Room[]>(STORAGE_KEYS.ROOMS, initialRooms);
    if (propertyId) return list.filter((r) => r.propertyId === propertyId);
    return list;
  },

  getRoomById: (id: string): Room | undefined => {
    const list = propertyService.getRooms();
    return list.find((r) => r.id === id);
  },

  /**
   * Fetch property structure (floors, rooms, beds) from backend
   */
  fetchPropertyStructure: async (propertyId: string): Promise<{ rooms: Room[]; beds: Bed[] }> => {
    try {
      const struct = await apiClient.get(`/properties/${propertyId}/structure`);
      const extractedRooms: Room[] = [];
      const extractedBeds: Bed[] = [];

      if (struct && Array.isArray(struct.floors)) {
        for (const floor of struct.floors) {
          if (Array.isArray(floor.rooms)) {
            for (const r of floor.rooms) {
              extractedRooms.push({
                id: r.id,
                propertyId,
                buildingId: 'bld-1',
                floorId: floor.id,
                roomNumber: r.roomNumber,
                floorNumber: floor.floorNumber || 1,
                roomType: (r.roomType ? r.roomType.toLowerCase() : 'double') as any,
                capacity: r.capacity || 2,
                baseRent: Number(r.baseRent || 8500),
                hasAttachedWashroom: Boolean(r.hasAttachedBathroom),
                hasBalcony: Boolean(r.hasBalcony),
                hasAc: Boolean(r.hasAirConditioning),
                status: 'available',
                description: r.description || undefined,
              });

              if (Array.isArray(r.beds)) {
                for (const b of r.beds) {
                  extractedBeds.push({
                    id: b.id,
                    bedNumber: b.bedNumber,
                    roomId: r.id,
                    propertyId,
                    buildingId: 'bld-1',
                    floorId: floor.id,
                    monthlyRent: Number(b.monthlyRent || r.baseRent || 8500),
                    status: (b.status ? b.status.toLowerCase() : 'available') as any,
                    tenantId: b.residents?.[0]?.id || null,
                    tenantName: b.residents?.[0]?.fullName || null,
                  });
                }
              }
            }
          }
        }
      }

      if (extractedRooms.length > 0) {
        const existingRooms = propertyService.getRooms().filter((r) => r.propertyId !== propertyId);
        setItem(STORAGE_KEYS.ROOMS, [...extractedRooms, ...existingRooms]);
      }
      if (extractedBeds.length > 0) {
        const existingBeds = propertyService.getBeds().filter((b) => b.propertyId !== propertyId);
        setItem(STORAGE_KEYS.BEDS, [...extractedBeds, ...existingBeds]);
      }

      return { rooms: extractedRooms, beds: extractedBeds };
    } catch (err) {
      console.warn('Using cached rooms/beds for structure:', err);
      return {
        rooms: propertyService.getRooms(propertyId),
        beds: propertyService.getBeds(propertyId),
      };
    }
  },

  createRoom: (data: Omit<Room, 'id'>): Room => {
    const list = propertyService.getRooms();
    const newRoom: Room = { ...data, id: `room-${Date.now()}` };
    setItem(STORAGE_KEYS.ROOMS, [...list, newRoom]);

    // Automatically generate beds for this room based on capacity
    const beds = propertyService.getBeds();
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
    const newBeds: Bed[] = [];
    for (let i = 0; i < data.capacity; i++) {
      newBeds.push({
        id: `bed-${newRoom.id}-${letters[i]}`,
        bedNumber: `${data.roomNumber}-${letters[i]}`,
        roomId: newRoom.id,
        propertyId: data.propertyId,
        buildingId: data.buildingId,
        floorId: data.floorId,
        monthlyRent: data.baseRent,
        status: 'available',
        tenantId: null,
        tenantName: null,
      });
    }
    setItem(STORAGE_KEYS.BEDS, [...beds, ...newBeds]);

    return newRoom;
  },

  updateRoom: (id: string, updates: Partial<Room>): Room | null => {
    const list = propertyService.getRooms();
    const idx = list.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    const updated = { ...list[idx], ...updates };
    list[idx] = updated;
    setItem(STORAGE_KEYS.ROOMS, [...list]);
    return updated;
  },

  deleteRoom: (id: string): boolean => {
    const list = propertyService.getRooms();
    const filtered = list.filter((r) => r.id !== id);
    if (filtered.length === list.length) return false;
    setItem(STORAGE_KEYS.ROOMS, filtered);
    return true;
  },

  // Beds
  getBeds: (propertyId?: string): Bed[] => {
    const list = getItem<Bed[]>(STORAGE_KEYS.BEDS, initialBeds);
    if (propertyId) return list.filter((b) => b.propertyId === propertyId);
    return list;
  },

  getBedById: (id: string): Bed | undefined => {
    const list = propertyService.getBeds();
    return list.find((b) => b.id === id);
  },

  updateBedStatus: (
    id: string,
    status: Bed['status'],
    tenantId?: string | null,
    tenantName?: string | null
  ): Bed | null => {
    const list = propertyService.getBeds();
    const idx = list.findIndex((b) => b.id === id);
    if (idx === -1) return null;
    const updated: Bed = {
      ...list[idx],
      status,
      tenantId: tenantId !== undefined ? tenantId : list[idx].tenantId,
      tenantName: tenantName !== undefined ? tenantName : list[idx].tenantName,
    };
    list[idx] = updated;
    setItem(STORAGE_KEYS.BEDS, [...list]);
    return updated;
  },

  assignBed: (bedId: string, tenantId: string, tenantName: string): Bed | null => {
    return propertyService.updateBedStatus(bedId, 'occupied', tenantId, tenantName);
  },

  releaseBed: (bedId: string): Bed | null => {
    return propertyService.updateBedStatus(bedId, 'available', null, null);
  },

  reserveBed: (bedId: string, applicantName: string): Bed | null => {
    return propertyService.updateBedStatus(bedId, 'reserved', null, `${applicantName} (Reserved)`);
  },

  markBedMaintenance: (bedId: string): Bed | null => {
    return propertyService.updateBedStatus(bedId, 'maintenance', null, null);
  },
};
