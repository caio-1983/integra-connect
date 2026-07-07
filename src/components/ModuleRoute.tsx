import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { isModuleEnabled } from '@/lib/platformPhase';

interface ModuleRouteProps {
  module: string;
}

const ModuleRoute: React.FC<ModuleRouteProps> = ({ module }) => {
  if (!isModuleEnabled(module)) {
    return <Navigate to="/operations" replace />;
  }

  return <Outlet />;
};

export default ModuleRoute;
