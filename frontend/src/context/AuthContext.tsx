import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/api/client';
import { User } from '@/types';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('jb_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('jb_access_token');
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchCurrentUser = useCallback(async () => {
    const storedToken = localStorage.getItem('jb_access_token');
    if (!storedToken) {
      setUser(null);
      setToken(null);
      setIsLoading(false);
      return;
    }

    try {
      const response = await apiClient.get<User>('/auth/me/');
      setUser(response.data);
      localStorage.setItem('jb_user', JSON.stringify(response.data));
    } catch (err) {
      // apiClient response interceptor already handles 401 & 403 account_disabled
      console.error('Failed to fetch user profile:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await apiClient.post('/auth/login/', {
        email: email.trim(),
        password,
      });

      const { access, refresh, user: userData } = response.data;

      localStorage.setItem('jb_access_token', access);
      localStorage.setItem('jb_refresh_token', refresh);
      localStorage.setItem('jb_user', JSON.stringify(userData));

      setToken(access);
      setUser(userData);

      toast.success(`Welcome back, ${userData.name}!`);
      return { success: true };
    } catch (err: any) {
      const errorData = err.response?.data;
      let errorMsg = 'Failed to sign in. Please check your credentials.';

      if (errorData?.code === 'account_disabled' || errorData?.detail?.includes('disabled by the administrator')) {
        errorMsg = errorData.detail || 'Your access has been disabled by the administrator. Please contact admin.';
      } else if (errorData?.detail) {
        errorMsg = errorData.detail;
      } else if (typeof errorData === 'object' && errorData !== null) {
        const firstKey = Object.keys(errorData)[0];
        if (Array.isArray(errorData[firstKey])) {
          errorMsg = errorData[firstKey][0];
        }
      }

      return { success: false, error: errorMsg };
    }
  };

  const logout = () => {
    try {
      apiClient.post('/auth/logout/').catch(() => {});
    } finally {
      localStorage.removeItem('jb_access_token');
      localStorage.removeItem('jb_refresh_token');
      localStorage.removeItem('jb_user');
      setToken(null);
      setUser(null);
      toast.info('You have been signed out.');
      window.location.href = '/login';
    }
  };

  const refreshUser = async () => {
    await fetchCurrentUser();
  };

  const isAuthenticated = !!token && !!user;
  const isAdmin = user?.role === 'ADMIN';
  const isStaff = user?.role === 'STAFF';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isAdmin,
        isStaff,
        isLoading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

