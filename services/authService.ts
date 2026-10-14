import { User, Role } from '@/types/auth';
import { getItem, setItem, removeItem, STORAGE_KEYS } from '@/lib/storage';
import { demoUsers } from '@/data/users';
import { apiClient, setAuthTokens, clearAuthTokens, DEFAULT_ORG_ID } from '@/lib/apiClient';

// Email aliases mapping for tenant aliases in development
const EMAIL_ALIASES: Record<string, string> = {
  'admin@pgmanager.com': 'owner@blrstays.com',
  'manager@pgmanager.com': 'manager@blrstays.com',
  'accountant@pgmanager.com': 'accountant@blrstays.com',
  'warden@pgmanager.com': 'staff@blrstays.com',
  'security@pgmanager.com': 'staff@blrstays.com',
  'maintenance@pgmanager.com': 'staff@blrstays.com',
  'tenant@pgmanager.com': 'resident@blrstays.com',
};

export const GUEST_USER: User = {
  id: '',
  name: 'Guest',
  email: '',
  role: 'tenant',
};

export const authService = {
  getCurrentUser: (): User => {
    if (!authService.isAuthenticated()) {
      return GUEST_USER;
    }
    return getItem<User>(STORAGE_KEYS.AUTH_USER, GUEST_USER);
  },

  setCurrentUser: (user: User): void => {
    setItem(STORAGE_KEYS.AUTH_USER, user);
  },

  isAuthenticated: (): boolean => {
    const user = getItem<User | null>(STORAGE_KEYS.AUTH_USER, null);
    return Boolean(user && user.id);
  },

  /**
   * Real backend authentication with email and password
   */
  loginWithCredentials: async (email: string, password: string = '', requestedRole?: Role): Promise<User> => {
    const targetEmail = EMAIL_ALIASES[email.toLowerCase().trim()] || email.trim().toLowerCase();

    const response = await apiClient.post('/auth/login', {
      email: targetEmail,
      password,
    }, { skipOrgHeader: true });

    const backendUser = response.user;

    // Determine user role
    let role: Role = requestedRole || 'admin';
    if (targetEmail.includes('resident') || targetEmail.includes('tenant')) role = 'tenant';
    else if (targetEmail.includes('accountant')) role = 'accountant';
    else if (targetEmail.includes('manager')) role = 'manager';
    else if (targetEmail.includes('staff') || targetEmail.includes('warden')) role = 'warden';
    else role = 'admin';

    const user: User = {
      id: backendUser.id,
      name: `${backendUser.firstName || ''} ${backendUser.lastName || ''}`.trim() || backendUser.email,
      email: backendUser.email,
      role,
      phone: backendUser.phone || '',
      avatar: backendUser.avatarUrl || demoUsers[role]?.avatar,
      propertyId: role === 'tenant' ? '10f6501b-487c-4118-89e7-40bccb670c05' : undefined,
      tenantId: role === 'tenant' ? backendUser.id : undefined,
    };

    setAuthTokens(undefined, undefined, DEFAULT_ORG_ID);
    setItem(STORAGE_KEYS.AUTH_USER, user);
    return user;
  },

  /**
   * 1-Click login as specific SaaS role connected to backend (Development only)
   * Zero passwords or credential maps are embedded in production client code.
   */
  loginAsRole: async (role: Role): Promise<User> => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('1-Click demo authentication is permanently disabled in production.');
    }

    // Backend endpoint verifies dev mode and generates authenticated session cookies
    const response = await apiClient.post('/auth/demo-login', { role }, { skipOrgHeader: true });
    const backendUser = response.user;

    const user: User = {
      id: backendUser.id,
      name: `${backendUser.firstName || ''} ${backendUser.lastName || ''}`.trim() || backendUser.email,
      email: backendUser.email,
      role,
      phone: backendUser.phone || '',
      avatar: backendUser.avatarUrl || demoUsers[role]?.avatar,
      propertyId: role === 'tenant' ? '10f6501b-487c-4118-89e7-40bccb670c05' : undefined,
      tenantId: role === 'tenant' ? backendUser.id : undefined,
    };

    setAuthTokens(undefined, undefined, DEFAULT_ORG_ID);
    setItem(STORAGE_KEYS.AUTH_USER, user);
    return user;
  },

  /**
   * Logout from backend session
   * Automatically clears HttpOnly cookies and CSRF cookies on backend
   */
  logout: async (): Promise<void> => {
    try {
      await apiClient.post('/auth/logout', {}).catch(() => {});
    } finally {
      clearAuthTokens();
      removeItem(STORAGE_KEYS.AUTH_USER);
    }
  },

  /**
   * Verify authenticated session with backend /api/auth/me
   */
  validateSession: async (): Promise<User | null> => {
    try {
      const backendUser = await apiClient.get('/auth/me');
      const currentUser = authService.getCurrentUser();
      const updatedUser: User = {
        ...currentUser,
        id: backendUser.id,
        name: `${backendUser.firstName || ''} ${backendUser.lastName || ''}`.trim() || backendUser.email,
        email: backendUser.email,
        phone: backendUser.phone,
      };
      setItem(STORAGE_KEYS.AUTH_USER, updatedUser);
      return updatedUser;
    } catch {
      clearAuthTokens();
      removeItem(STORAGE_KEYS.AUTH_USER);
      return null;
    }
  },
};
