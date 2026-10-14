import { apiClient } from '@/lib/apiClient';

export interface PortalProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  alternatePhone?: string | null;
  gender?: string;
  dateOfBirth?: string | null;
  bloodGroup?: string | null;
  avatarUrl?: string | null;
  permanentAddress?: string | null;
  currentAddress?: string | null;
  city?: string;
  state?: string | null;
  pincode?: string | null;
  emergencyContactName?: string;
  emergencyContactRelation?: string;
  emergencyContactPhone?: string | null;
  occupationType?: string;
  employerOrCollegeName?: string | null;
  designation?: string | null;
  workAddress?: string | null;
  status: string;
  joiningDate?: string;
  expectedMoveOutDate?: string | null;
  foodIncluded: boolean;
}

export interface PortalAccommodation {
  property: {
    id: string;
    name: string;
    code: string;
    addressLine1: string;
    city: string;
    state: string;
    pincode: string;
  } | null;
  floor: {
    id: string;
    floorNumber: number;
    name: string;
  } | null;
  room: {
    id: string;
    roomNumber: string;
    roomType: string;
  } | null;
  bed: {
    id: string;
    bedNumber: string;
  } | null;
}

export interface PortalDashboardData {
  profile: PortalProfile;
  property: any;
  currentAccommodation: PortalAccommodation;
  currentStay: any;
  outstandingBalance: number;
  recentInvoices: any[];
  recentPayments: any[];
  depositBalance: number;
  recentNotices: any[];
  unreadNotificationsCount: number;
  openComplaintsCount: number;
  recentComplaints: any[];
  activeMaintenanceCount: number;
  recentMaintenance: any[];
  leaveStatus: any[];
  upcomingMenu: any;
}

export const portalService = {
  getDashboard: async (): Promise<PortalDashboardData> => {
    return apiClient.get('/portal/dashboard');
  },

  getProfile: async (): Promise<PortalProfile> => {
    return apiClient.get('/portal/profile');
  },

  updateProfile: async (data: Partial<PortalProfile>): Promise<PortalProfile> => {
    return apiClient.patch('/portal/profile', data);
  },

  getStay: async (): Promise<any> => {
    return apiClient.get('/portal/stay');
  },

  getAccommodation: async (): Promise<PortalAccommodation> => {
    return apiClient.get('/portal/accommodation');
  },

  getInvoices: async (params?: { page?: number; limit?: number }): Promise<any> => {
    const q = params ? `?page=${params.page || 1}&limit=${params.limit || 20}` : '';
    return apiClient.get(`/portal/invoices${q}`);
  },

  getInvoiceById: async (invoiceId: string): Promise<any> => {
    return apiClient.get(`/portal/invoices/${invoiceId}`);
  },

  getPayments: async (params?: { page?: number; limit?: number }): Promise<any> => {
    const q = params ? `?page=${params.page || 1}&limit=${params.limit || 20}` : '';
    return apiClient.get(`/portal/payments${q}`);
  },

  getPaymentById: async (paymentId: string): Promise<any> => {
    return apiClient.get(`/portal/payments/${paymentId}`);
  },

  getDeposit: async (): Promise<any> => {
    return apiClient.get('/portal/deposit');
  },

  getNotices: async (params?: { page?: number; limit?: number }): Promise<any> => {
    const q = params ? `?page=${params.page || 1}&limit=${params.limit || 20}` : '';
    return apiClient.get(`/portal/notices${q}`);
  },

  getNotifications: async (params?: { page?: number; limit?: number }): Promise<any> => {
    const q = params ? `?page=${params.page || 1}&limit=${params.limit || 20}` : '';
    return apiClient.get(`/portal/notifications${q}`);
  },

  getUnreadNotificationsCount: async (): Promise<{ unreadCount: number }> => {
    return apiClient.get('/portal/notifications/unread-count');
  },

  markNotificationAsRead: async (id: string): Promise<any> => {
    return apiClient.patch(`/portal/notifications/${id}/read`);
  },

  markAllNotificationsAsRead: async (): Promise<any> => {
    return apiClient.post('/portal/notifications/read-all');
  },

  getComplaints: async (params?: { page?: number; limit?: number }): Promise<any> => {
    const q = params ? `?page=${params.page || 1}&limit=${params.limit || 20}` : '';
    return apiClient.get(`/portal/complaints${q}`);
  },

  createComplaint: async (data: {
    category: string;
    subject: string;
    description: string;
    priority?: string;
  }): Promise<any> => {
    return apiClient.post('/portal/complaints', data);
  },

  getComplaintById: async (id: string): Promise<any> => {
    return apiClient.get(`/portal/complaints/${id}`);
  },

  getComplaintHistory: async (id: string): Promise<any> => {
    return apiClient.get(`/portal/complaints/${id}/history`);
  },

  getMaintenance: async (params?: { page?: number; limit?: number }): Promise<any> => {
    const q = params ? `?page=${params.page || 1}&limit=${params.limit || 20}` : '';
    return apiClient.get(`/portal/maintenance${q}`);
  },

  createMaintenance: async (data: {
    category: string;
    title: string;
    description: string;
    priority?: string;
  }): Promise<any> => {
    return apiClient.post('/portal/maintenance', data);
  },

  getMaintenanceById: async (id: string): Promise<any> => {
    return apiClient.get(`/portal/maintenance/${id}`);
  },

  getLeaves: async (params?: { page?: number; limit?: number }): Promise<any> => {
    const q = params ? `?page=${params.page || 1}&limit=${params.limit || 20}` : '';
    return apiClient.get(`/portal/leaves${q}`);
  },

  createLeave: async (data: {
    startDate: string;
    endDate: string;
    reason: string;
    emergencyContact?: string;
  }): Promise<any> => {
    return apiClient.post('/portal/leaves', data);
  },

  getLeaveById: async (id: string): Promise<any> => {
    return apiClient.get(`/portal/leaves/${id}`);
  },

  cancelLeave: async (id: string): Promise<any> => {
    return apiClient.post(`/portal/leaves/${id}/cancel`);
  },

  getFoodMenu: async (): Promise<any> => {
    return apiClient.get('/portal/food/menu');
  },

  getMealRecords: async (params?: { page?: number; limit?: number }): Promise<any> => {
    const q = params ? `?page=${params.page || 1}&limit=${params.limit || 20}` : '';
    return apiClient.get(`/portal/food/meals${q}`);
  },

  getMealAttendance: async (params?: { page?: number; limit?: number }): Promise<any> => {
    const q = params ? `?page=${params.page || 1}&limit=${params.limit || 20}` : '';
    return apiClient.get(`/portal/food/attendance${q}`);
  },

  getVisitors: async (params?: { page?: number; limit?: number }): Promise<any> => {
    const q = params ? `?page=${params.page || 1}&limit=${params.limit || 20}` : '';
    return apiClient.get(`/portal/visitors${q}`);
  },

  getDocuments: async (): Promise<any> => {
    return apiClient.get('/portal/documents');
  },

  getBookings: async (): Promise<any> => {
    return apiClient.get('/portal/bookings');
  },

  getMoveIns: async (): Promise<any> => {
    return apiClient.get('/portal/move-ins');
  },

  getMoveOuts: async (): Promise<any> => {
    return apiClient.get('/portal/move-outs');
  },
};
