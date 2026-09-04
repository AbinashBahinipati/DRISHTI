import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useOrgAuth } from '../../hooks/useOrgAuth';
import { useDeviceMode } from '../../hooks/useDeviceMode';

interface OrganizationAuthGuardProps {
  children: React.ReactNode;
}

export const OrganizationAuthGuard: React.FC<OrganizationAuthGuardProps> = ({ children }) => {
  const location = useLocation();
  const { isDesktop } = useDeviceMode();
  const { isAuthenticated } = useOrgAuth();

  // 1. Mobile viewports are redirected to Citizen application
  if (!isDesktop) {
    return <Navigate to="/user" replace />;
  }

  // 2. Unauthenticated requests are redirected to Organization Login
  if (!isAuthenticated) {
    return <Navigate to="/organization-login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default OrganizationAuthGuard;
