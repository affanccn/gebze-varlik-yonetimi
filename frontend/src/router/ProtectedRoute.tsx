import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import type { Role } from '../types/auth';
import { PATHS } from './paths';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
  forbiddenRoles?: Role[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  forbiddenRoles,
}) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const { showToast } = useToast();

  const isUnauthorized = Boolean(
    user && (
      (allowedRoles && !allowedRoles.includes(user.role)) ||
      (forbiddenRoles && forbiddenRoles.includes(user.role))
    )
  );

  useEffect(() => {
    if (isUnauthorized) {
      showToast('Bu sayfaya erişim yetkiniz bulunmamaktadır.', 'error');
    }
  }, [isUnauthorized, showToast]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f1f5f9]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-600">Oturum doğrulanıyor...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={PATHS.LOGIN} state={{ from: location }} replace />;
  }

  if (isUnauthorized) {
    return <Navigate to={PATHS.DASHBOARD} replace />;
  }

  return <>{children}</>;
};
