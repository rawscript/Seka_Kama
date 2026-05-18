'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import dynamic from 'next/dynamic';

const DashboardTabs = dynamic(() => import('@/components/DashboardTabs'), { ssr: false });

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardTabs onScenarioRun={(result) => console.log('Scenario result:', result)} />
    </ProtectedRoute>
  );
}