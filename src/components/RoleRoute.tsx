import React from 'react';
import { Navigate, Outlet, useOutletContext } from 'react-router-dom';
import { useCompanySettings } from '@/hooks/useCompanySettings';

/** Gates a route to admins/managers — plain agents are redirected away. */
const RoleRoute: React.FC<{ redirectTo?: string }> = ({ redirectTo = '/operations' }) => {
  const { loading, canManageUsers } = useCompanySettings();
  // Pathless guard between a layout and its pages: forward the layout's outlet
  // context, or pages like /dashboard/atendimento read `undefined` and crash.
  const context = useOutletContext();

  if (loading) return null;

  if (!canManageUsers) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet context={context} />;
};

export default RoleRoute;
