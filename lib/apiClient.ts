/**
 * Centralized Typed API Client for PG Management SaaS
 * Communicates with the NestJS backend using HttpOnly session cookies & Double Submit CSRF
 */

function resolveApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL.replace(/\/+$/, '');
  }
  if (process.env.NODE_ENV === 'production') {
    if (typeof window !== 'undefined') {
      console.error('CRITICAL: NEXT_PUBLIC_API_BASE_URL is not configured for production deployment.');
    }
    return '';
  }
  return 'http://localhost:4000';
}

export const API_BASE_URL = resolveApiBaseUrl();

export const DEFAULT_ORG_ID = '0d65eb80-f0b1-4d96-b87f-99fbc75bbe49';

const STORAGE_KEYS = {
  ACTIVE_ORG_ID: 'pg_active_org_id',
  AUTH_USER: 'pg_auth_user',
  // Deprecated token keys - retained only for purge operations
  LEGACY_ACCESS_TOKEN: 'pg_access_token',
  LEGACY_REFRESH_TOKEN: 'pg_refresh_token',
} as const;

export interface ApiResponse<T = any> {
  success?: boolean;
  statusCode?: number;
  data?: T;
  message?: string | string[];
  path?: string;
  timestamp?: string;
  meta?: any;
}

export class ApiError extends Error {
  statusCode: number;
  data?: any;

  constructor(message: string, statusCode: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.data = data;
  }
}

// Token & Organization helpers
// Pure HttpOnly cookie authentication: no tokens read from browser storage
export function getStoredAccessToken(): string | null {
  return null;
}

export function getStoredRefreshToken(): string | null {
  return null;
}

export function getStoredOrganizationId(): string {
  if (typeof window === 'undefined') return DEFAULT_ORG_ID;
  return localStorage.getItem(STORAGE_KEYS.ACTIVE_ORG_ID) || DEFAULT_ORG_ID;
}

export function getStoredCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)pg_csrf_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function setAuthTokens(_accessToken?: string, _refreshToken?: string, orgId?: string): void {
  if (typeof window === 'undefined') return;
  if (orgId) {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_ORG_ID, orgId);
  } else if (!localStorage.getItem(STORAGE_KEYS.ACTIVE_ORG_ID)) {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_ORG_ID, DEFAULT_ORG_ID);
  }
  // Defense-in-depth: Purge any legacy tokens from localStorage to ensure pure HttpOnly cookie security
  localStorage.removeItem(STORAGE_KEYS.LEGACY_ACCESS_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.LEGACY_REFRESH_TOKEN);
}

export function clearAuthTokens(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEYS.LEGACY_ACCESS_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.LEGACY_REFRESH_TOKEN);
}

export interface RequestOptions extends RequestInit {
  timeoutMs?: number;
  skipOrgHeader?: boolean;
}

/**
 * Core HTTP Request Engine
 */
async function request<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { timeoutMs = 15000, skipOrgHeader = false, headers: customHeaders, ...fetchOptions } = options;

  // Normalize path with /api prefix
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const path = cleanEndpoint.startsWith('/api') ? cleanEndpoint : `/api${cleanEndpoint}`;
  const url = `${API_BASE_URL}${path}`;

  const headers = new Headers(customHeaders);
  if (!headers.has('Content-Type') && !(fetchOptions.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // CSRF double-submit token injection for state-changing operations
  const csrfToken = getStoredCsrfToken();
  if (csrfToken && !headers.has('X-CSRF-Token')) {
    headers.set('X-CSRF-Token', csrfToken);
  }

  // Multi-tenant organization injection
  if (!skipOrgHeader && !headers.has('X-Organization-Id')) {
    const orgId = getStoredOrganizationId();
    if (orgId) {
      headers.set('X-Organization-Id', orgId);
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      credentials: 'include',
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Parse JSON safely
    const contentType = response.headers.get('content-type') || '';
    let parsedBody: any = null;
    if (contentType.includes('application/json')) {
      try {
        parsedBody = await response.json();
      } catch {
        parsedBody = null;
      }
    } else {
      parsedBody = await response.text();
    }

    if (!response.ok) {
      const message =
        parsedBody && typeof parsedBody === 'object'
          ? Array.isArray(parsedBody.message)
            ? parsedBody.message.join(', ')
            : parsedBody.message || `Request failed with status ${response.status}`
          : `HTTP error ${response.status}`;

      // Handle 401 Unauthorized session expiration
      if (response.status === 401 && typeof window !== 'undefined') {
        if (!cleanEndpoint.includes('/auth/login')) {
          clearAuthTokens();
          localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
        }
      }

      throw new ApiError(message, response.status, parsedBody);
    }

    // Unpack standard NestJS response envelope { success: true, data: T }
    if (parsedBody && typeof parsedBody === 'object' && 'data' in parsedBody) {
      return parsedBody.data as T;
    }

    return parsedBody as T;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new ApiError('Request timed out. Please check your network connection.', 408);
    }
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(error.message || 'Unable to connect to server. Please try again.', 500);
  }
}

export const apiClient = {
  get: <T = any>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'GET' }),

  post: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  put: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  patch: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  delete: <T = any>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),
};
