'use client';

import { useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import dynamic from 'next/dynamic';

const DashboardTabs = dynamic(() => import('@/components/DashboardTabs'), { ssr: false });
const ScenarioResultPanel = dynamic(() => import('@/components/ScenarioResultPanel'), { ssr: false });

export default function DashboardPage() {
  const [scenarioResult, setScenarioResult] = useState<any>(null);

  return (
    <ProtectedRoute>
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <DashboardTabs onScenarioRun={(result) => setScenarioResult(result)} />
        {scenarioResult && (
          <ScenarioResultPanel 
            result={scenarioResult} 
            onClose={() => setScenarioResult(null)} 
          />
        )}
      </div>
    </ProtectedRoute>
  );
}