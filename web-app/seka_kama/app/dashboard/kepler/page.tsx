'use client';

import { useState, useEffect } from 'react';
import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useSearchParams } from 'next/navigation';
import { api } from '@/services/api';

const KeplerMap = dynamic(() => import('@/components/KeplerMap'), { ssr: false });

function KeplerContent() {
  const searchParams = useSearchParams();
  const [scenarioData, setScenarioData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [scenarioMeta, setScenarioMeta] = useState<{ id: string; description?: string } | null>(null);
  
  // Check for scenario ID in URL params or sessionStorage
  useEffect(() => {
    const scenarioIdFromUrl = searchParams.get('scenario');
    const scenarioIdFromStorage = typeof window !== 'undefined' 
      ? sessionStorage.getItem('kepler_scenario_id')
      : null;
    
    const scenarioId = scenarioIdFromUrl || scenarioIdFromStorage;
    
    if (scenarioId) {
      setLoading(true);
      setScenarioMeta({ id: scenarioId });
      console.log('📊 Loading scenario #' + scenarioId + ' into Kepler.gl...');
      
      api.getScenarioById(parseInt(scenarioId))
        .then(scenario => {
          console.log('✅ Scenario loaded for Kepler:', {
            id: scenario.scenario_id ?? scenario.id,
            has_geojson: !!scenario.scenario_geojson,
            features_count: scenario.scenario_geojson?.features?.length,
            description: scenario.user_description
          });
          
          // Normalize the scenario object so KeplerMap can use it directly
          const normalized = {
            ...scenario,
            id: scenario.scenario_id ?? scenario.id,
            scenario_id: scenario.scenario_id ?? scenario.id,
          };
          setScenarioData(normalized);
          setScenarioMeta({ id: scenarioId, description: scenario.user_description });
          
          // Persist the scenario in sessionStorage so it doesn't get cleared on refresh
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('kepler_scenario_id', scenarioId);
          }
        })
        .catch(err => {
          console.error('❌ Failed to load scenario for Kepler:', err);
          setScenarioMeta(null);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      // Clear sessionStorage only if navigating directly to Kepler Explorer without context
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('kepler_scenario_id');
      }
      setScenarioData(null);
      setScenarioMeta(null);
    }
  }, [searchParams]);

  return (
    <div style={{ width: '100%', height: 'calc(100vh - 58px)', position: 'relative', overflow: 'hidden' }}>
      {/* Scenario indicator banner */}
      {scenarioMeta && !loading && scenarioData && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[200] pointer-events-none">
          <div className="glass-effect-heavy px-6 py-3 rounded-none border border-[#775a19]/30 pointer-events-auto flex items-center gap-4 shadow-2xl">
            <div className="w-2 h-2 bg-emerald-400 animate-pulse" />
            <div>
              <span className="text-[9px] font-bold text-[#c5a059] uppercase tracking-[0.2em] block">
                Scenario #{scenarioMeta.id} Active
              </span>
              {scenarioMeta.description && (
                <span className="text-[10px] text-slate-400 font-medium truncate max-w-xs block">
                  {scenarioMeta.description}
                </span>
              )}
            </div>
            <span className="text-[9px] font-mono text-emerald-400/60">
              {scenarioData?.scenario_geojson?.features?.length ?? 0} cells loaded
            </span>
          </div>
        </div>
      )}
      
      {loading ? (
        <div className="w-full h-full flex items-center justify-center bg-slate-900">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full border-4 border-[#775a19]/20 border-t-[#775a19] animate-spin" />
            <p className="text-[#c5a059] font-medium text-xs uppercase tracking-widest">
              Loading Scenario #{scenarioMeta?.id} Visualization...
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
            <div className="w-12 h-12 rounded-full border-4 border-[#775a19]/20 border-t-[#775a19] animate-spin" />
            <p className="text-[#c5a059] font-medium text-xs uppercase tracking-widest">
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
