'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Role } from '@/types/auth';
import { authService, GUEST_USER } from '@/services/authService';
import { initializeStorageIfEmpty } from '@/lib/storage';
import { demoUsers } from '@/data/users';

interface AuthContextType {
  user: User;
  role: Role;
  isAuthenticated: boolean;
  loginAsRole: (role: Role) => Promise<void> | void;
  loginWithCredentials: (email: string, password?: string, role?: Role) => Promise<User>;
  logout: () => Promise<void> | void;
  canAccess: (allowedRoles: Role[]) => boolean;
  isLoaded: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(GUEST_USER);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    initializeStorageIfEmpty();
    const storedUser = authService.getCurrentUser();
    setUser(storedUser);
    setIsLoaded(true);

    // Validate active backend session in background
    if (authService.isAuthenticated()) {
      authService.validateSession().then((validUser) => {
        if (validUser) {
          setUser(validUser);
        } else {
          setUser(GUEST_USER);
        }
      }).catch(() => {
        setUser(GUEST_USER);
      });
    }

    const handleStorageChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.key === 'pg_auth_user') {
        setUser(customEvent.detail.value || GUEST_USER);
      }
    };

    const handleReset = () => {
      setUser(authService.getCurrentUser());
    };

    window.addEventListener('pg_storage_change', handleStorageChange);
    window.addEventListener('pg_data_reset', handleReset);

    return () => {
      window.removeEventListener('pg_storage_change', handleStorageChange);
      window.removeEventListener('pg_data_reset', handleReset);
    };
  }, []);

  const loginAsRole = async (role: Role) => {
    const updatedUser = await authService.loginAsRole(role);
    setUser(updatedUser);
  };

  const loginWithCredentials = async (email: string, password?: string, role?: Role): Promise<User> => {
    const updatedUser = await authService.loginWithCredentials(email, password, role);
    setUser(updatedUser);
    return updatedUser;
  };

  const logout = async () => {
    await authService.logout();
    setUser(authService.getCurrentUser());
  };

  const canAccess = (allowedRoles: Role[]) => {
    if (!authService.isAuthenticated()) return false;
    if (user.role === 'admin') return true; // Admin has full access
    return allowedRoles.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user.role,
        isAuthenticated: authService.isAuthenticated(),
        loginAsRole,
        loginWithCredentials,
        logout,
        canAccess,
        isLoaded,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
