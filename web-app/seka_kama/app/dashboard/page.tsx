'use client';

import { useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import dynamic from 'next/dynamic';

const SekaMap = dynamic(() => import('@/components/SekaMap'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-950/50 animate-pulse">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
        <p className="text-slate-500 font-mono text-xs uppercase tracking-widest">Initialising Spatial Engine...</p>
      </div>
    </div>
  )
});

const ScenarioResultPanel = dynamic(() => import('@/components/ScenarioResultPanel'), { ssr: false });

export default function DashboardPage() {
  const [scenarioResult, setScenarioResult] = useState<any>(null);

  return (
    <ProtectedRoute>
      <div className="relative w-full h-full bg-[#020617]">
        <SekaMap onScenarioRun={(result) => setScenarioResult(result)} />
        {scenarioResult && (
          <div className="absolute top-24 left-6 z-[100]">
            <ScenarioResultPanel 
              result={scenarioResult} 
              onClose={() => setScenarioResult(null)} 
            />
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}