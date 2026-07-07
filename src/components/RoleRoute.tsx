import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useCompanySettings } from '@/hooks/useCompanySettings';

/** Gates a route to admins/managers — plain agents are redirected away. */
const RoleRoute: React.FC = () => {
  const { loading, canManageUsers } = useCompanySettings();

  if (loading) return null;

  if (!canManageUsers) {
    return <Navigate to="/operations" replace />;
  }

  return <Outlet />;
};

export default RoleRoute;
