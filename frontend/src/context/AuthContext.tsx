import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { UserSession, Role } from '../types/auth';
import { authService } from '../services/authService';
import { useToast } from '../hooks/useToast';

export interface Permissions {
  isAdmin: boolean;
  isDeptManager: boolean;
  isStaff: boolean;
  isAuditor: boolean;
  isViewer: boolean;
  canWrite: boolean;
  canImport: boolean;
}

export interface AuthContextType {
  user: UserSession | null;
  isLoading: boolean;
  sessionExpiredMessage: string | null;
  mustChangePassword: boolean;
  permissions: Permissions;
  login: (username: string, password: string) => Promise<UserSession>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<UserSession | null>;
  setMustChangePassword: (val: boolean) => void;
  clearSessionExpiredMessage: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState<string | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState<boolean>(false);
  const { showToast } = useToast();

  const permissions = useMemo<Permissions>(() => {
    const role: Role | undefined = user?.role;
    const isAdmin = role === 'ADMIN';
    const isDeptManager = role === 'DEPT_MANAGER';
    const isStaff = role === 'STAFF';
    const isAuditor = role === 'AUDITOR';
    const isViewer = role === 'VIEWER';

    return {
      isAdmin,
      isDeptManager,
      isStaff,
      isAuditor,
      isViewer,
      canWrite: isAdmin || isDeptManager,
      canImport: isAdmin || isDeptManager,
    };
  }, [user?.role]);

  const refreshSession = useCallback(async (): Promise<UserSession | null> => {
    try {
      const session = await authService.getCurrentUser();
      setUser(session);
      sessionStorage.setItem('gebze_auth_active', '1');
      if (session.mustChangePassword) {
        setMustChangePassword(true);
      }
      return session;
    } catch {
      setUser(null);
      if (sessionStorage.getItem('gebze_auth_active') === '1') {
        sessionStorage.removeItem('gebze_auth_active');
        const msg = 'Oturum süreniz doldu. Lütfen tekrar giriş yapınız.';
        setSessionExpiredMessage(msg);
        showToast(msg, 'error');
      }
      return null;
    }
  }, [showToast]);

  useEffect(() => {
    // İlk açılışta oturumu sorgula
    refreshSession().finally(() => {
      setIsLoading(false);
    });

    // Oturum süresi doldu olayı
    const handleSessionExpired = (e: Event) => {
      const customEvent = e as CustomEvent<{ message?: string }>;
      const msg = customEvent.detail?.message || 'Oturum süreniz doldu. Lütfen tekrar giriş yapınız.';
      setUser(null);
      setSessionExpiredMessage(msg);
      showToast(msg, 'error');
    };

    // Zorunlu şifre değiştirme olayı
    const handlePasswordChangeRequired = () => {
      setMustChangePassword(true);
    };

    window.addEventListener('auth:session-expired', handleSessionExpired);
    window.addEventListener('auth:password-change-required', handlePasswordChangeRequired);

    return () => {
      window.removeEventListener('auth:session-expired', handleSessionExpired);
      window.removeEventListener('auth:password-change-required', handlePasswordChangeRequired);
    };
  }, [refreshSession, showToast]);

  const login = async (username: string, password: string): Promise<UserSession> => {
    setSessionExpiredMessage(null);
    const session = await authService.login(username, password);
    setUser(session);
    sessionStorage.setItem('gebze_auth_active', '1');
    if (session.mustChangePassword) {
      setMustChangePassword(true);
    }
    return session;
  };

  const logout = async (): Promise<void> => {
    try {
      await authService.logout();
    } catch {
      // Logout hatası olsa bile istemci durumunu sıfırla
    } finally {
      sessionStorage.removeItem('gebze_auth_active');
      setUser(null);
      setMustChangePassword(false);
      setSessionExpiredMessage(null);
    }
  };

  const clearSessionExpiredMessage = () => setSessionExpiredMessage(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        sessionExpiredMessage,
        mustChangePassword,
        permissions,
        login,
        logout,
        refreshSession,
        setMustChangePassword,
        clearSessionExpiredMessage,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
