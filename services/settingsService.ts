import { PGSettings, NotificationItem } from '@/types/settings';
import { getItem, setItem, STORAGE_KEYS } from '@/lib/storage';
import { initialSettings, initialNotifications } from '@/data/settings';
import { apiClient } from '@/lib/apiClient';

export const settingsService = {
  // Live Backend: Organization Settings
  fetchOrganization: async (): Promise<any> => {
    try {
      const res = await apiClient.get<any>('/api/settings/organization');
      if (res.data) {
        return res.data;
      }
    } catch (err) {
      console.warn('Could not fetch backend organization settings:', err);
    }
    return settingsService.getSettings();
  },

  updateOrganization: async (updates: Record<string, any>): Promise<any> => {
    try {
      const res = await apiClient.patch<any>('/api/settings/organization', updates);
      return res.data;
    } catch (err) {
      console.warn('Backend organization update failed, updating local state:', err);
      return settingsService.updateSettings(updates as Partial<PGSettings>);
    }
  },

  // Live Backend: Notification Preferences
  fetchNotificationPreferences: async (): Promise<any> => {
    try {
      const res = await apiClient.get<any>('/api/settings/notifications/preferences');
      return res.data;
    } catch (err) {
      console.warn('Could not fetch backend notification preferences:', err);
      return null;
    }
  },

  updateNotificationPreferences: async (preferences: Record<string, any>): Promise<any> => {
    try {
      const res = await apiClient.patch<any>('/api/settings/notifications/preferences', preferences);
      return res.data;
    } catch (err) {
      console.warn('Backend notification preferences update failed:', err);
      return null;
    }
  },

  // Live Backend: Notifications
  fetchNotifications: async (): Promise<NotificationItem[]> => {
    try {
      const res = await apiClient.get<any>('/api/notifications');
      const items = res.data?.items || res.data || [];
      if (Array.isArray(items) && items.length > 0) {
        const mapped: NotificationItem[] = items.map((n: any) => ({
          id: n.id,
          title: n.title || 'Notification',
          message: n.content || n.message || '',
          type: (['rent', 'booking', 'complaint', 'payment', 'kyc', 'system'].includes(n.type?.toLowerCase()) ? n.type.toLowerCase() : 'system') as any,
          priority: (['low', 'medium', 'high'].includes(n.priority?.toLowerCase()) ? n.priority.toLowerCase() : 'medium') as any,
          read: !!n.isRead,
          createdAt: n.createdAt ? new Date(n.createdAt).toISOString().replace('T', ' ').substring(0, 16) : new Date().toISOString(),
        }));
        setItem(STORAGE_KEYS.NOTIFICATIONS, mapped);
        return mapped;
      }
    } catch (err) {
      console.warn('Could not fetch backend notifications:', err);
    }
    return settingsService.getNotifications();
  },

  markAsReadLive: async (id: string): Promise<void> => {
    try {
      await apiClient.patch(`/api/notifications/${id}/read`);
    } catch (err) {
      console.warn('Backend mark notification read failed:', err);
    }
    settingsService.markAsRead(id);
  },

  markAllAsReadLive: async (): Promise<void> => {
    try {
      await apiClient.patch('/api/notifications/mark-all-read');
    } catch (err) {
      console.warn('Backend mark all notifications read failed:', err);
    }
    settingsService.markAllAsRead();
  },

  // Local / Synchronous compatibility
  getSettings: (): PGSettings => {
    return getItem<PGSettings>(STORAGE_KEYS.SETTINGS, initialSettings);
  },

  updateSettings: (updates: Partial<PGSettings>): PGSettings => {
    const current = settingsService.getSettings();
    const updated = { ...current, ...updates };
    setItem(STORAGE_KEYS.SETTINGS, updated);
    return updated;
  },

  // Notifications
  getNotifications: (): NotificationItem[] => {
    return getItem<NotificationItem[]>(STORAGE_KEYS.NOTIFICATIONS, initialNotifications);
  },

  markAsRead: (id: string): void => {
    const list = settingsService.getNotifications();
    const updated = list.map((n) => (n.id === id ? { ...n, read: true } : n));
    setItem(STORAGE_KEYS.NOTIFICATIONS, updated);
  },

  markAllAsRead: (): void => {
    const list = settingsService.getNotifications();
    const updated = list.map((n) => ({ ...n, read: true }));
    setItem(STORAGE_KEYS.NOTIFICATIONS, updated);
  },

  addNotification: (data: Omit<NotificationItem, 'id' | 'createdAt' | 'read'>): NotificationItem => {
    const list = settingsService.getNotifications();
    const newItem: NotificationItem = {
      ...data,
      id: `ntf-${Date.now()}`,
      read: false,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
    };
    setItem(STORAGE_KEYS.NOTIFICATIONS, [newItem, ...list]);
    return newItem;
  },
};
