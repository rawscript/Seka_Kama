'use client';

import { useState, useEffect } from 'react';
import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/services/api';

const KeplerMap = dynamic(() => import('@/components/KeplerMap'), { ssr: false });

function KeplerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [scenarioData, setScenarioData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  // Check for scenario ID in URL params or sessionStorage
  useEffect(() => {
    const scenarioIdFromUrl = searchParams.get('scenario');
    const scenarioIdFromStorage = typeof window !== 'undefined' 
      ? sessionStorage.getItem('kepler_scenario_id')
      : null;
    
    const scenarioId = scenarioIdFromUrl || scenarioIdFromStorage;
    
    if (scenarioId) {
      setLoading(true);
      console.log('📊 Loading scenario #' + scenarioId + ' into Kepler.gl...');
      
      api.getScenarioById(parseInt(scenarioId))
        .then(scenario => {
          console.log('✅ Scenario loaded for Kepler:', {
            id: scenario.scenario_id,
            has_geojson: !!scenario.scenario_geojson,
            features_count: scenario.scenario_geojson?.features?.length,
            description: scenario.user_description
          });
          setScenarioData(scenario);
          
          // Clear sessionStorage after loading
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('kepler_scenario_id');
          }
        })
        .catch(err => {
          console.error('❌ Failed to load scenario for Kepler:', err);
          alert('Failed to load scenario. Showing baseline view.');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [searchParams]);

  return (
    <div style={{ width: '100%', height: 'calc(100vh - 58px)', position: 'relative', overflow: 'hidden' }}>
      {loading ? (
        <div className="w-full h-full flex items-center justify-center bg-slate-900">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
            <p className="text-emerald-500 font-medium text-xs uppercase tracking-widest">
              Loading Scenario Visualization...
            </p>
          </div>
        </div>
      ) : (
        <KeplerMap scenarioData={scenarioData} />
      )}
    </div>
  );
}

export default function KeplerPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={
        <div className="w-full h-[calc(100vh-58px)] flex items-center justify-center bg-slate-900">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
            <p className="text-emerald-500 font-medium text-xs uppercase tracking-widest">
              Initializing Analyst Workspace...
            </p>
          </div>
        </div>
      }>
        <KeplerContent />
      </Suspense>
    </ProtectedRoute>
  );
}
