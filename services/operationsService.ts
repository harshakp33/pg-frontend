import {
  Complaint,
  ComplaintComment,
  MaintenanceTask,
  Visitor,
  LeaveRequest,
  MealItem,
  Notice,
  Staff,
  StaffAttendanceRecord,
} from '@/types/operations';
import { getItem, setItem, STORAGE_KEYS } from '@/lib/storage';
import {
  initialComplaints,
  initialMaintenanceTasks,
  initialVisitors,
  initialLeaveRequests,
  weeklyFoodMenu,
  initialNotices,
  initialStaff,
  initialStaffAttendance,
} from '@/data/operations';
import { apiClient } from '@/lib/apiClient';

function mapBackendComplaint(c: any): Complaint {
  return {
    id: c.id,
    ticketNumber: c.ticketNumber || `CMP-${c.id.slice(0, 4)}`,
    tenantId: c.residentId || 'tnt-1',
    propertyId: c.propertyId || '10f6501b-487c-4118-89e7-40bccb670c05',
    category: (c.category ? c.category.toLowerCase() : 'other') as any,
    title: c.subject || 'Complaint',
    description: c.description || '',
    priority: (c.priority ? c.priority.toLowerCase() : 'medium') as any,
    status: (c.status === 'SUBMITTED' ? 'open' : c.status.toLowerCase()) as any,
    createdDate: c.createdAt ? c.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    assignedStaffName: c.users ? `${c.users.firstName} ${c.users.lastName}` : undefined,
    comments: [],
  };
}

function mapBackendMaintenance(m: any): MaintenanceTask {
  return {
    id: m.id,
    taskNumber: m.ticketNumber || `MNT-${m.id.slice(0, 4)}`,
    propertyId: m.propertyId,
    title: m.title || 'Maintenance Task',
    description: m.description || '',
    priority: (m.priority ? m.priority.toLowerCase() : 'medium') as any,
    status: (m.status === 'CREATED' ? 'open' : (m.status === 'IN_PROGRESS' ? 'in_progress' : 'completed')) as any,
    estimatedCost: Number(m.estimatedCost || 0),
    actualCost: Number(m.actualCost || 0),
    dueDate: m.createdAt ? m.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
  };
}

function mapBackendVisitor(v: any): Visitor {
  return {
    id: v.id,
    visitorName: v.fullName || 'Visitor',
    phone: v.phone || '',
    propertyId: v.propertyId,
    tenantId: v.residentId || 'tnt-1',
    purpose: v.purpose || 'Visit',
    entryTime: v.entryTime ? new Date(v.entryTime).toLocaleString('en-IN') : new Date().toLocaleString('en-IN'),
    exitTime: v.exitTime ? new Date(v.exitTime).toLocaleString('en-IN') : null,
    status: (v.status === 'CHECKED_IN' ? 'inside' : 'checked_out') as any,
  };
}

function mapBackendLeave(l: any): LeaveRequest {
  return {
    id: l.id,
    tenantId: l.residentId,
    propertyId: l.propertyId,
    startDate: l.startDate ? l.startDate.split('T')[0] : new Date().toISOString().split('T')[0],
    endDate: l.endDate ? l.endDate.split('T')[0] : new Date().toISOString().split('T')[0],
    reason: l.reason,
    status: (l.status ? l.status.toLowerCase() : 'pending') as any,
    requestedAt: l.createdAt ? l.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
    reviewedBy: l.reviewedBy || undefined,
  };
}

function mapBackendNotice(n: any): Notice {
  return {
    id: n.id,
    noticeCode: `NTC-${n.id.slice(0, 4)}`,
    title: n.title,
    content: n.description,
    propertyId: n.propertyId || 'all',
    audience: (n.audience ? n.audience.toLowerCase() : 'all') as any,
    priority: (n.priority ? n.priority.toLowerCase() : 'normal') as any,
    isPublished: n.status === 'PUBLISHED',
    publishedDate: n.publishedAt ? n.publishedAt.split('T')[0] : new Date().toISOString().split('T')[0],
    authorName: 'Management',
  };
}

export const operationsService = {
  // Complaints
  getComplaints: (propertyId?: string): Complaint[] => {
    const list = getItem<Complaint[]>(STORAGE_KEYS.COMPLAINTS, initialComplaints);
    if (propertyId) return list.filter((c) => c.propertyId === propertyId);
    return list;
  },

  getComplaintById: (id: string): Complaint | undefined => {
    const list = operationsService.getComplaints();
    return list.find((c) => c.id === id);
  },

  fetchComplaints: async (propertyId?: string): Promise<Complaint[]> => {
    try {
      const q = propertyId ? `?propertyId=${propertyId}&limit=100` : '?limit=100';
      const response = await apiClient.get(`/complaints${q}`);
      const items = Array.isArray(response) ? response : response?.items || [];
      const mapped = items.map(mapBackendComplaint);
      if (mapped.length > 0) {
        setItem(STORAGE_KEYS.COMPLAINTS, mapped);
        return mapped;
      }
      return operationsService.getComplaints(propertyId);
    } catch {
      return operationsService.getComplaints(propertyId);
    }
  },

  createComplaint: async (
    data: Omit<Complaint, 'id' | 'ticketNumber' | 'createdDate' | 'comments'>
  ): Promise<Complaint> => {
    try {
      const created = await apiClient.post('/complaints', {
        propertyId: data.propertyId,
        residentId: data.tenantId,
        category: (data.category || 'OTHER').toUpperCase(),
        subject: data.title,
        description: data.description,
        priority: (data.priority || 'MEDIUM').toUpperCase(),
      });
      const mapped = mapBackendComplaint(created);
      const list = operationsService.getComplaints();
      setItem(STORAGE_KEYS.COMPLAINTS, [mapped, ...list.filter((c) => c.id !== mapped.id)]);
      return mapped;
    } catch {
      const list = operationsService.getComplaints();
      const count = list.length + 1;
      const newComplaint: Complaint = {
        ...data,
        id: `cmp-${Date.now()}`,
        ticketNumber: `CMP-2024-${100 + count}`,
        createdDate: new Date().toISOString().split('T')[0],
        comments: [],
      };
      setItem(STORAGE_KEYS.COMPLAINTS, [newComplaint, ...list]);
      return newComplaint;
    }
  },

  updateComplaint: async (id: string, updates: Partial<Complaint>): Promise<Complaint | null> => {
    try {
      const payload: any = {};
      if (updates.status) {
        payload.status = updates.status.toUpperCase() === 'OPEN' ? 'SUBMITTED' : updates.status.toUpperCase();
      }
      await apiClient.patch(`/complaints/${id}`, payload);
    } catch {}
    const list = operationsService.getComplaints();
    const idx = list.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...updates };
    setItem(STORAGE_KEYS.COMPLAINTS, [...list]);
    return list[idx];
  },

  addComplaintComment: async (
    complaintId: string,
    comment: Omit<ComplaintComment, 'id' | 'createdAt'>
  ): Promise<Complaint | null> => {
    const complaint = operationsService.getComplaintById(complaintId);
    if (!complaint) return null;
    const newComment: ComplaintComment = {
      ...comment,
      id: `cm-${Date.now()}`,
      createdAt: new Date().toLocaleString('en-IN'),
    };
    return operationsService.updateComplaint(complaintId, {
      comments: [...complaint.comments, newComment],
    });
  },

  // Maintenance
  getMaintenanceTasks: (propertyId?: string): MaintenanceTask[] => {
    const list = getItem<MaintenanceTask[]>(STORAGE_KEYS.MAINTENANCE, initialMaintenanceTasks);
    if (propertyId) return list.filter((m) => m.propertyId === propertyId);
    return list;
  },

  fetchMaintenanceTasks: async (propertyId?: string): Promise<MaintenanceTask[]> => {
    try {
      const q = propertyId ? `?propertyId=${propertyId}&limit=100` : '?limit=100';
      const response = await apiClient.get(`/maintenance${q}`);
      const items = Array.isArray(response) ? response : response?.items || [];
      const mapped = items.map(mapBackendMaintenance);
      if (mapped.length > 0) {
        setItem(STORAGE_KEYS.MAINTENANCE, mapped);
        return mapped;
      }
      return operationsService.getMaintenanceTasks(propertyId);
    } catch {
      return operationsService.getMaintenanceTasks(propertyId);
    }
  },

  createMaintenanceTask: async (data: Omit<MaintenanceTask, 'id' | 'taskNumber'>): Promise<MaintenanceTask> => {
    try {
      const created = await apiClient.post('/maintenance', {
        propertyId: data.propertyId,
        title: data.title,
        description: data.description,
        priority: (data.priority || 'MEDIUM').toUpperCase(),
      });
      const mapped = mapBackendMaintenance(created);
      const list = operationsService.getMaintenanceTasks();
      setItem(STORAGE_KEYS.MAINTENANCE, [mapped, ...list.filter((m) => m.id !== mapped.id)]);
      return mapped;
    } catch {
      const list = operationsService.getMaintenanceTasks();
      const count = list.length + 1;
      const newTask: MaintenanceTask = {
        ...data,
        id: `mnt-${Date.now()}`,
        taskNumber: `MNT-2024-${String(count).padStart(3, '0')}`,
      };
      setItem(STORAGE_KEYS.MAINTENANCE, [newTask, ...list]);
      return newTask;
    }
  },

  updateMaintenanceTask: (id: string, updates: Partial<MaintenanceTask>): MaintenanceTask | null => {
    const list = operationsService.getMaintenanceTasks();
    const idx = list.findIndex((m) => m.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...updates };
    setItem(STORAGE_KEYS.MAINTENANCE, [...list]);
    return list[idx];
  },

  // Visitors
  getVisitors: (propertyId?: string): Visitor[] => {
    const list = getItem<Visitor[]>(STORAGE_KEYS.VISITORS, initialVisitors);
    if (propertyId) return list.filter((v) => v.propertyId === propertyId);
    return list;
  },

  fetchVisitors: async (propertyId?: string): Promise<Visitor[]> => {
    try {
      const q = propertyId ? `?propertyId=${propertyId}&limit=100` : '?limit=100';
      const response = await apiClient.get(`/visitors${q}`);
      const items = Array.isArray(response) ? response : response?.items || [];
      const mapped = items.map(mapBackendVisitor);
      if (mapped.length > 0) {
        setItem(STORAGE_KEYS.VISITORS, mapped);
        return mapped;
      }
      return operationsService.getVisitors(propertyId);
    } catch {
      return operationsService.getVisitors(propertyId);
    }
  },

  checkInVisitor: async (data: Omit<Visitor, 'id' | 'entryTime' | 'status'>): Promise<Visitor> => {
    try {
      const created = await apiClient.post('/visitors', {
        propertyId: data.propertyId,
        residentId: data.tenantId && data.tenantId.length > 20 ? data.tenantId : undefined,
        fullName: data.visitorName,
        phone: data.phone,
        purpose: 'FRIEND_VISIT',
      });
      await apiClient.post(`/visitors/${created.id}/check-in`, {}).catch(() => {});
      const mapped = mapBackendVisitor(created);
      const list = operationsService.getVisitors();
      setItem(STORAGE_KEYS.VISITORS, [mapped, ...list.filter((v) => v.id !== mapped.id)]);
      return mapped;
    } catch {
      const list = operationsService.getVisitors();
      const now = new Date();
      const entryTime = `${now.toISOString().split('T')[0]} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      const newVisitor: Visitor = {
        ...data,
        id: `vis-${Date.now()}`,
        entryTime,
        exitTime: null,
        status: 'inside',
      };
      setItem(STORAGE_KEYS.VISITORS, [newVisitor, ...list]);
      return newVisitor;
    }
  },

  checkOutVisitor: async (id: string): Promise<Visitor | null> => {
    try {
      await apiClient.post(`/visitors/${id}/check-out`, {});
    } catch {}
    const list = operationsService.getVisitors();
    const idx = list.findIndex((v) => v.id === id);
    if (idx === -1) return null;
    const now = new Date();
    const exitTime = `${now.toISOString().split('T')[0]} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    list[idx] = { ...list[idx], status: 'checked_out', exitTime };
    setItem(STORAGE_KEYS.VISITORS, [...list]);
    return list[idx];
  },

  // Leave Requests
  getLeaveRequests: (propertyId?: string): LeaveRequest[] => {
    const list = getItem<LeaveRequest[]>(STORAGE_KEYS.LEAVE, initialLeaveRequests);
    if (propertyId) return list.filter((l) => l.propertyId === propertyId);
    return list;
  },

  fetchLeaveRequests: async (propertyId?: string): Promise<LeaveRequest[]> => {
    try {
      const q = propertyId ? `?propertyId=${propertyId}&limit=100` : '?limit=100';
      const response = await apiClient.get(`/leaves${q}`);
      const items = Array.isArray(response) ? response : response?.items || [];
      const mapped = items.map(mapBackendLeave);
      if (mapped.length > 0) {
        setItem(STORAGE_KEYS.LEAVE, mapped);
        return mapped;
      }
      return operationsService.getLeaveRequests(propertyId);
    } catch {
      return operationsService.getLeaveRequests(propertyId);
    }
  },

  createLeaveRequest: async (data: Omit<LeaveRequest, 'id' | 'status' | 'requestedAt'>): Promise<LeaveRequest> => {
    try {
      const created = await apiClient.post('/leaves', {
        propertyId: data.propertyId,
        residentId: data.tenantId,
        startDate: data.startDate,
        endDate: data.endDate,
        reason: data.reason,
      });
      const mapped = mapBackendLeave(created);
      const list = operationsService.getLeaveRequests();
      setItem(STORAGE_KEYS.LEAVE, [mapped, ...list.filter((l) => l.id !== mapped.id)]);
      return mapped;
    } catch {
      const list = operationsService.getLeaveRequests();
      const newReq: LeaveRequest = {
        ...data,
        id: `lev-${Date.now()}`,
        status: 'pending',
        requestedAt: new Date().toISOString().split('T')[0],
      };
      setItem(STORAGE_KEYS.LEAVE, [newReq, ...list]);
      return newReq;
    }
  },

  updateLeaveStatus: async (
    id: string,
    status: LeaveRequest['status'],
    reviewedBy: string,
    reviewRemarks?: string
  ): Promise<LeaveRequest | null> => {
    try {
      if (status === 'approved') {
        await apiClient.post(`/leaves/${id}/approve`, {});
      } else if (status === 'rejected') {
        await apiClient.post(`/leaves/${id}/reject`, { rejectionReason: reviewRemarks || 'Rejected by Warden' });
      }
    } catch {}
    const list = operationsService.getLeaveRequests();
    const idx = list.findIndex((l) => l.id === id);
    if (idx === -1) return null;
    list[idx] = {
      ...list[idx],
      status,
      reviewedBy,
      reviewRemarks,
      reviewedAt: new Date().toISOString().split('T')[0],
    };
    setItem(STORAGE_KEYS.LEAVE, [...list]);
    return list[idx];
  },

  // Food Menu
  getFoodMenu: (): MealItem[] => {
    return getItem<MealItem[]>(STORAGE_KEYS.FOOD_MENU, weeklyFoodMenu);
  },

  updateMealItem: (id: string, updates: Partial<MealItem>): MealItem | null => {
    const list = operationsService.getFoodMenu();
    const idx = list.findIndex((m) => m.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...updates };
    setItem(STORAGE_KEYS.FOOD_MENU, [...list]);
    return list[idx];
  },

  // Notices
  getNotices: (): Notice[] => {
    return getItem<Notice[]>(STORAGE_KEYS.NOTICES, initialNotices);
  },

  fetchNotices: async (): Promise<Notice[]> => {
    try {
      const response = await apiClient.get('/notices?limit=100');
      const items = Array.isArray(response) ? response : response?.items || [];
      const mapped = items.map(mapBackendNotice);
      if (mapped.length > 0) {
        setItem(STORAGE_KEYS.NOTICES, mapped);
        return mapped;
      }
      return operationsService.getNotices();
    } catch {
      return operationsService.getNotices();
    }
  },

  createNotice: async (data: Omit<Notice, 'id' | 'noticeCode' | 'publishedDate'>): Promise<Notice> => {
    try {
      const created = await apiClient.post('/notices', {
        title: data.title,
        description: data.content,
        audience: (data.audience || 'ALL').toUpperCase(),
        priority: (data.priority || 'NORMAL').toUpperCase(),
        status: data.isPublished ? 'PUBLISHED' : 'DRAFT',
      });
      const mapped = mapBackendNotice(created);
      const list = operationsService.getNotices();
      setItem(STORAGE_KEYS.NOTICES, [mapped, ...list.filter((n) => n.id !== mapped.id)]);
      return mapped;
    } catch {
      const list = operationsService.getNotices();
      const count = list.length + 1;
      const newNotice: Notice = {
        ...data,
        id: `not-${Date.now()}`,
        noticeCode: `NTC-2024-${String(count).padStart(2, '0')}`,
        publishedDate: new Date().toISOString().split('T')[0],
      };
      setItem(STORAGE_KEYS.NOTICES, [newNotice, ...list]);
      return newNotice;
    }
  },

  updateNotice: (id: string, updates: Partial<Notice>): Notice | null => {
    const list = operationsService.getNotices();
    const idx = list.findIndex((n) => n.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...updates };
    setItem(STORAGE_KEYS.NOTICES, [...list]);
    return list[idx];
  },

  deleteNotice: async (id: string): Promise<boolean> => {
    try {
      await apiClient.delete(`/notices/${id}`);
    } catch {}
    const list = operationsService.getNotices();
    const filtered = list.filter((n) => n.id !== id);
    if (filtered.length === list.length) return false;
    setItem(STORAGE_KEYS.NOTICES, filtered);
    return true;
  },

  // Staff
  getStaff: (propertyId?: string): Staff[] => {
    const list = getItem<Staff[]>(STORAGE_KEYS.STAFF, initialStaff);
    if (propertyId) return list.filter((s) => s.propertyId === propertyId);
    return list;
  },

  fetchStaff: async (propertyId?: string): Promise<Staff[]> => {
    try {
      const q = propertyId ? `?propertyId=${propertyId}&limit=100` : '?limit=100';
      const response = await apiClient.get(`/staff${q}`);
      const items = Array.isArray(response) ? response : response?.items || [];
      if (items.length > 0) {
        const mapped = items.map((s: any) => ({
          id: s.id,
          staffCode: s.staffCode || `STF-${s.id.slice(0, 4)}`,
          name: s.fullName,
          phone: s.phone,
          email: s.email || `${s.fullName.toLowerCase().replace(/\s+/g, '')}@pgmanager.com`,
          role: (s.role ? s.role.toLowerCase() : 'warden') as any,
          propertyId: s.propertyId || '10f6501b-487c-4118-89e7-40bccb670c05',
          joiningDate: s.joiningDate ? s.joiningDate.split('T')[0] : '2024-01-01',
          salary: Number(s.salary || 18000),
          shift: (s.shift ? s.shift.toLowerCase() : 'morning') as any,
          status: (s.status ? s.status.toLowerCase() : 'active') as any,
          assignedTasks: 0,
        }));
        setItem(STORAGE_KEYS.STAFF, mapped);
        return mapped;
      }
      return operationsService.getStaff(propertyId);
    } catch {
      return operationsService.getStaff(propertyId);
    }
  },

  createStaff: (data: Omit<Staff, 'id' | 'staffCode'>): Staff => {
    const list = operationsService.getStaff();
    const count = list.length + 1;
    const newStaff: Staff = {
      ...data,
      id: `stf-${Date.now()}`,
      staffCode: `STF-${String(count).padStart(2, '0')}`,
    };
    setItem(STORAGE_KEYS.STAFF, [newStaff, ...list]);
    return newStaff;
  },

  updateStaff: (id: string, updates: Partial<Staff>): Staff | null => {
    const list = operationsService.getStaff();
    const idx = list.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...updates };
    setItem(STORAGE_KEYS.STAFF, [...list]);
    return list[idx];
  },

  // Attendance
  getAttendance: (): StaffAttendanceRecord[] => {
    return getItem<StaffAttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE, initialStaffAttendance);
  },

  markAttendance: (
    staffId: string,
    date: string,
    status: StaffAttendanceRecord['status'],
    checkIn?: string,
    checkOut?: string
  ): StaffAttendanceRecord => {
    const list = operationsService.getAttendance();
    const existingIndex = list.findIndex((a) => a.staffId === staffId && a.date === date);
    if (existingIndex !== -1) {
      list[existingIndex] = {
        ...list[existingIndex],
        status,
        checkIn: checkIn || list[existingIndex].checkIn,
        checkOut: checkOut || list[existingIndex].checkOut,
      };
      setItem(STORAGE_KEYS.ATTENDANCE, [...list]);
      return list[existingIndex];
    } else {
      const newRec: StaffAttendanceRecord = {
        id: `att-${Date.now()}`,
        staffId,
        date,
        status,
        checkIn: checkIn || '09:00',
        checkOut: checkOut || '18:00',
      };
      setItem(STORAGE_KEYS.ATTENDANCE, [newRec, ...list]);
      return newRec;
    }
  },
};
