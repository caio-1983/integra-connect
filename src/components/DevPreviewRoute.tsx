import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useFeatureVisible } from '@/lib/devPreview';

/** Routes of a feature still in dev preview: anyone else lands on /operations. */
const DevPreviewRoute: React.FC<{ feature: string }> = ({ feature }) => {
  if (!useFeatureVisible(feature)) return <Navigate to="/operations" replace />;
  return <Outlet />;
};

export default DevPreviewRoute;
