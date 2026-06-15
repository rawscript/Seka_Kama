'use client';

import { useState, useEffect, useCallback } from 'react';
import { useMap, Source, Layer } from 'react-map-gl/maplibre';
import { useRouter } from 'next/navigation';
import { api } from '@/services/api';
import { 
  Play, 
  MapPin, 
  X, 
  Lightbulb, 
  TrendingUp, 
  AlertTriangle, 
  Edit3,
  Dna,
  Cpu,
  ShieldAlert,
  History,
  CheckCircle2,
  Layers,
  ArrowRight
} from 'lucide-react';

interface ScenarioDrawerProps {
  onScenarioRun?: (result: any) => void;
  selectedUnit?: string;
}

const DEFAULT_MODIFICATIONS = {
  longterm_slope_mean: 0.10,
  dist_to_protected_km: 0.0,
  all_skew_mean: 0.0,
  cheetah_abundance: 0.0,
  pop2018_mean: 0.0,
  simulation_years: 0,
};

interface ScenarioResult {
  scenario_id: number;
  delta_lions: number;
  delta_percent: number;
  baseline_total_lions: number;
  predicted_total_lions: number;
}

export default function ScenarioDrawer({ onScenarioRun, selectedUnit }: ScenarioDrawerProps) {
  const router = useRouter();
  const { 'main-map': map } = useMap();
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [points, setPoints] = useState<[number, number][]>([]);
  const [drawnGeometry, setDrawnGeometry] = useState<GeoJSON.Polygon | null>(null);
  const [modifications, setModifications] = useState(DEFAULT_MODIFICATIONS);
  const [userQuery, setUserQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [completedResult, setCompletedResult] = useState<ScenarioResult | null>(null);

  // -- Drawing handlers --
  const handleMapClick = useCallback((e: any) => {
    if (!isDrawingMode) return;
    const { lng, lat } = e.lngLat;
    setPoints(prev => [...prev, [lng, lat]]);
  }, [isDrawingMode]);

  const handleMapDblClick = useCallback((e: any) => {
    if (!isDrawingMode) return;
    e.preventDefault();
    
    setPoints(prev => {
      if (prev.length < 3) return prev;
      
      const uniquePoints: [number, number][] = [];
      prev.forEach(p => {
        if (uniquePoints.length === 0) {
          uniquePoints.push(p);
        } else {
          const last = uniquePoints[uniquePoints.length - 1];
          const dist = Math.sqrt(Math.pow(p[0] - last[0], 2) + Math.pow(p[1] - last[1], 2));
          if (dist > 0.00001) {
            uniquePoints.push(p);
          }
        }
      });

      if (uniquePoints.length < 3) return prev;

      const closed: [number, number][] = [...uniquePoints, uniquePoints[0]];
      setDrawnGeometry({ type: 'Polygon', coordinates: [closed] });
      setIsDrawingMode(false);
      return uniquePoints;
    });
  }, [isDrawingMode]);

  useEffect(() => {
    const nativeMap = map?.getMap();
    if (!nativeMap) return;

    if (isDrawingMode) {
      nativeMap.getCanvas().style.cursor = 'crosshair';
      nativeMap.on('click', handleMapClick);
      nativeMap.on('dblclick', handleMapDblClick);
    } else {
      nativeMap.getCanvas().style.cursor = '';
      nativeMap.off('click', handleMapClick);
      nativeMap.off('dblclick', handleMapDblClick);
    }

    return () => {
      nativeMap.getCanvas().style.cursor = '';
      nativeMap.off('click', handleMapClick);
      nativeMap.off('dblclick', handleMapDblClick);
    };
  }, [map, isDrawingMode, handleMapClick, handleMapDblClick]);

  const previewGeoJSON: GeoJSON.Feature | null = points.length >= 2 ? {
    type: 'Feature',
    properties: {},
    geometry: { type: 'LineString', coordinates: points },
  } : null;

  const drawnPolygonGeoJSON: GeoJSON.Feature | null = drawnGeometry ? {
    type: 'Feature',
    properties: {},
    geometry: drawnGeometry,
  } : null;

  const nodesGeoJSON: GeoJSON.FeatureCollection | null = points.length > 0 ? {
    type: 'FeatureCollection',
    features: points.map((p, i) => ({
      type: 'Feature',
      properties: { index: i },
      geometry: { type: 'Point', coordinates: p }
    }))
  } : null;

  const startDrawing = () => {
    setPoints([]);
    setDrawnGeometry(null);
    setIsDrawingMode(true);
    setCompletedResult(null);
  };

  const cancelDrawing = () => {
    setPoints([]);
    setDrawnGeometry(null);
    setIsDrawingMode(false);
    setUserQuery('');
    setCompletedResult(null);
  };

  const handleRun = async () => {
    if (!drawnGeometry) return;
    setLoading(true);
    
    console.log('🚀 Starting scenario execution...', {
      geometry: drawnGeometry,
      modifications,
      simulation_years: modifications.simulation_years || 0,
      user_query: userQuery,
      selected_unit: selectedUnit
    });
    
    try {
      const { simulation_years, ...otherMods } = modifications as any;
      const result = await api.runScenario({
        geometry: drawnGeometry,
        feature_modifications: otherMods,
        simulation_years: simulation_years || 0,
        user_query: userQuery,
        management_units: selectedUnit ? [selectedUnit] : undefined,
      });
      
      console.log('✅ Scenario execution successful!', {
        scenario_id: result.scenario_id,
        baseline_lions: result.baseline_total_lions,
        predicted_lions: result.predicted_total_lions,
        delta: result.delta_lions,
        delta_percent: result.delta_percent,
        has_geojson: !!result.scenario_geojson,
        features_count: result.scenario_geojson?.features?.length || 0,
        ecological_context: result.ecological_context
      });
      
      // Show success state with routing options
      setCompletedResult({
        scenario_id: result.scenario_id,
        delta_lions: result.delta_lions,
        delta_percent: result.delta_percent,
        baseline_total_lions: result.baseline_total_lions,
        predicted_total_lions: result.predicted_total_lions,
      });
      
      onScenarioRun?.(result);
    } catch (error) {
      console.error('❌ Scenario execution failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Simulation failed: ${errorMessage}\n\nPlease check:\n1. Backend server is running\n2. Database is connected\n3. XGBoost model is loaded\n4. Selected area contains grid cells`);
    } finally {
      setLoading(false);
    }
  };

  const navigateToKepler = (scenarioId: number) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('kepler_scenario_id', scenarioId.toString());
    }
    router.push(`/dashboard/kepler?scenario=${scenarioId}`);
  };

  const navigateToHistory = () => {
    router.push('/dashboard/scenarios');
  };

  return (
    <>
      {/* Map Layers for Draw State */}
      {previewGeoJSON && (
        <Source id="draw-preview" type="geojson" data={previewGeoJSON}>
          <Layer
            id="draw-preview-line"
            type="line"
            paint={{ 'line-color': '#775a19', 'line-width': 3, 'line-dasharray': [2, 1], 'line-opacity': 0.8 }}
          />
        </Source>
      )}
      {drawnPolygonGeoJSON && (
        <Source id="draw-polygon" type="geojson" data={drawnPolygonGeoJSON}>
          <Layer
            id="draw-polygon-fill"
            type="fill"
            paint={{ 'fill-color': '#775a19', 'fill-opacity': 0.2 }}
          />
          <Layer
            id="draw-polygon-line"
            type="line"
            paint={{ 'line-color': '#775a19', 'line-width': 2.5 }}
          />
        </Source>
      )}
      {nodesGeoJSON && (
        <Source id="draw-nodes" type="geojson" data={nodesGeoJSON}>
          <Layer
            id="draw-nodes-outer"
            type="circle"
            paint={{
              'circle-radius': 6,
              'circle-color': '#775a19',
              'circle-opacity': 0.8,
              'circle-stroke-width': 2,
              'circle-stroke-color': '#ffffff'
            }}
          />
          <Layer
            id="draw-nodes-inner"
            type="circle"
            paint={{
              'circle-radius': 2,
              'circle-color': '#ffffff'
            }}
          />
        </Source>
      )}

      {/* Control Surface */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[30] w-full max-w-2xl px-6 pointer-events-none">
        {/* ── Success State ── */}
        {completedResult ? (
          <div className="glass-effect-heavy p-8 rounded-none border border-emerald-500/20 shadow-[0_30px_100px_rgba(0,0,0,0.8)] pointer-events-auto animate-in slide-in-from-bottom-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-emerald-500/15 rounded-none border border-emerald-500/20">
                <CheckCircle2 className="w-7 h-7 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-white tracking-tight leading-none mb-1">Simulation Complete</h3>
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">
                  Scenario #{completedResult.scenario_id} · Saved to History
                </span>
              </div>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-black/30 p-4 border border-white/5">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Baseline</span>
                <span className="text-lg font-bold text-white">{completedResult.baseline_total_lions.toFixed(1)}</span>
                <span className="text-[10px] text-slate-500 ml-1">lions</span>
              </div>
              <div className="bg-black/30 p-4 border border-white/5">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Predicted</span>
                <span className="text-lg font-bold text-white">{completedResult.predicted_total_lions.toFixed(1)}</span>
                <span className="text-[10px] text-slate-500 ml-1">lions</span>
              </div>
              <div className={`p-4 border ${completedResult.delta_lions >= 0 ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-rose-500/5 border-rose-500/10'}`}>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Delta</span>
                <span className={`text-lg font-bold ${completedResult.delta_lions >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {completedResult.delta_lions >= 0 ? '+' : ''}{completedResult.delta_lions.toFixed(1)}
                </span>
                <span className={`text-[10px] ml-1 ${completedResult.delta_lions >= 0 ? 'text-emerald-400/60' : 'text-rose-400/60'}`}>
                  ({completedResult.delta_percent >= 0 ? '+' : ''}{completedResult.delta_percent.toFixed(1)}%)
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => navigateToKepler(completedResult.scenario_id)}
                className="flex items-center justify-center gap-2 py-4 bg-[#775a19] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#4e3700] transition-all col-span-2"
              >
                <Layers className="w-4 h-4" />
                Analyze in Kepler
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={navigateToHistory}
                className="flex items-center justify-center gap-2 py-4 border border-white/10 text-slate-300 text-[10px] font-bold uppercase tracking-widest hover:bg-white/5 transition-all"
              >
                <History className="w-3.5 h-3.5" />
                History
              </button>
            </div>

            <button
              onClick={cancelDrawing}
              className="w-full mt-3 py-2 text-[9px] text-slate-500 hover:text-slate-300 uppercase tracking-widest font-bold transition-colors"
            >
              Dismiss & Start New
            </button>
          </div>
        ) : isDrawingMode ? (
          <div className="glass-effect-heavy p-5 rounded-none border-[#775a19]/40 border-2 shadow-2xl animate-in fade-in slide-in-from-bottom-4 pointer-events-auto text-center">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="relative">
                <MapPin className="w-5 h-5 text-[#c5a059] animate-bounce" />
                <div className="absolute inset-0 bg-[#775a19]/40 blur-xl rounded-none" />
              </div>
              <span className="text-xs font-bold text-[#c5a059] uppercase tracking-[0.2em]">Active Boundary Delineation</span>
            </div>
            <div className="text-[11px] text-slate-400 mb-4 font-mono">
              [L_CLICK] to Segment · [DBL_CLICK] to Finalize Logic · <span className="text-[#775a19]">{points.length} nodes active</span>
            </div>
            <button
              onClick={cancelDrawing}
              className="px-6 py-2 rounded-none bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-bold uppercase tracking-widest hover:bg-rose-500/20 transition-all flex items-center gap-2 mx-auto"
            >
              <X className="w-3.5 h-3.5" /> Abort Sequence
            </button>
          </div>
        ) : !drawnGeometry ? (
          <div className="flex flex-col items-center gap-4 pointer-events-auto">
            <button
              onClick={startDrawing}
              className="group relative px-10 py-5 rounded-none bg-gradient-to-br from-[#775a19] to-[#4e3700] text-white font-bold shadow-[0_20px_50px_rgba(119,90,25,0.3)] transition-all hover:scale-105 active:scale-95 overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex items-center gap-3">
                <Edit3 className="w-6 h-6" />
                <span className="text-xl tracking-tight">Propose Scenario</span>
              </div>
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-none glass-effect border-white/5 animate-pulse">
               <Cpu className="w-3 h-3 text-[#775a19]" />
               <span className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.2em]">Neural Engine Standby</span>
            </div>
          </div>
        ) : (
          <div className="glass-effect-heavy p-8 rounded-none border border-white/10 shadow-[0_30px_100px_rgba(0,0,0,0.8)] pointer-events-auto animate-in slide-in-from-bottom-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="p-3.5 bg-[#775a19]/15 rounded-none border border-[#775a19]/20 shadow-inner">
                  <Dna className="w-7 h-7 text-[#775a19]" />
                </div>
                <div>
                   <h3 className="text-xl font-extrabold text-white tracking-tight leading-none mb-1">Scenario Parameters</h3>
                   <div className="text-[10px] text-slate-400 uppercase font-bold tracking-widest flex items-center gap-2">
                     <span className="w-1.5 h-1.5 rounded-none bg-[#775a19]" /> Logic Delineation: {points.length} Boundary Nodes
                   </div>
                   <p className="text-[9px] text-slate-500 mt-1 italic font-medium">Nodes (displayed as golden points) define the spatial limits of this simulation.</p>
                </div>
              </div>
              <button onClick={cancelDrawing} className="p-2.5 hover:bg-white/10 rounded-none text-slate-400 hover:text-white transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-5">
                <label className="block">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="w-3.5 h-3.5 text-[#c5a059]" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Proposed Intervention</span>
                  </div>
                  <textarea
                    value={userQuery}
                    onChange={(e) => setUserQuery(e.target.value)}
                    placeholder="Describe the development or environmental change..."
                    className="w-full bg-black/40 border-2 border-white/5 rounded-none p-5 text-sm text-slate-200 focus:outline-none focus:border-[#775a19]/50 min-h-[160px] transition-all placeholder:text-slate-700"
                  />
                </label>
              </div>

              <div className="space-y-6">
                {/* Nightlight Trend */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-[#c5a059]" />
                      <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Urban Dynamics (Nightlight)</span>
                    </div>
                    <div className={`px-2 py-0.5 rounded-none border text-[10px] font-mono font-bold ${modifications.longterm_slope_mean > 0 ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}>
                      {modifications.longterm_slope_mean > 0 ? '+' : ''}
                      {(modifications.longterm_slope_mean * 100).toFixed(0)}% Shift
                    </div>
                  </div>
                  <input
                    type="range" min="-0.5" max="0.5" step="0.01"
                    value={modifications.longterm_slope_mean || 0}
                    onChange={(e) => setModifications({ ...modifications, longterm_slope_mean: parseFloat(e.target.value) })}
                    className="w-full h-1 bg-white/10 rounded-none appearance-none cursor-pointer accent-[#775a19]"
                  />
                  <div className="flex justify-between mt-2 text-[9px] text-slate-500 font-bold uppercase tracking-widest overflow-hidden">
                    <span className={modifications.longterm_slope_mean < -0.1 ? 'text-blue-400' : ''}>Contraction</span>
                    <span className={Math.abs(modifications.longterm_slope_mean) <= 0.1 ? 'text-white' : ''}>Baseline</span>
                    <span className={modifications.longterm_slope_mean > 0.1 ? 'text-amber-400' : ''}>Expansion</span>
                  </div>
                </div>

                {/* Protected Proximity */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-[#c5a059]" />
                      <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Conservation Buffer Zone</span>
                    </div>
                    <div className={`px-2 py-0.5 rounded-none border text-[10px] font-mono font-bold ${modifications.dist_to_protected_km < 0 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                      {modifications.dist_to_protected_km > 0 ? '+' : ''}
                      {(modifications.dist_to_protected_km * 10).toFixed(1)} km Offset
                    </div>
                  </div>
                  <input
                    type="range" min="-0.5" max="0.5" step="0.01"
                    value={modifications.dist_to_protected_km || 0}
                    onChange={(e) => setModifications({ ...modifications, dist_to_protected_km: parseFloat(e.target.value) })}
                    className="w-full h-1 bg-white/10 rounded-none appearance-none cursor-pointer accent-[#775a19]"
                  />
                  <div className="flex justify-between mt-2 text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                    <span className={modifications.dist_to_protected_km < -0.1 ? 'text-emerald-400' : ''}>Encroaching</span>
                    <span className={Math.abs(modifications.dist_to_protected_km) <= 0.1 ? 'text-white' : ''}>Sustain</span>
                    <span className={modifications.dist_to_protected_km > 0.1 ? 'text-blue-400' : ''}>Withdraw</span>
                  </div>
                </div>

                {/* Projection Horizon */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <History className="w-4 h-4 text-[#c5a059]" />
                      <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Simulation Temporal Depth</span>
                    </div>
                    <div className="px-2 py-0.5 rounded-none border border-white/20 bg-white/5 text-[10px] font-mono font-bold text-white">
                      {modifications.simulation_years || 0} Earth Years
                    </div>
                  </div>
                  <input
                    type="range" min="0" max="10" step="1"
                    value={modifications.simulation_years || 0}
                    onChange={(e) => setModifications({ ...modifications, simulation_years: parseInt(e.target.value) })}
                    className="w-full h-1 bg-white/10 rounded-none appearance-none cursor-pointer accent-[#775a19]"
                  />
                </div>

                {/* Other Parameters (Cheetah & Population) - Compact */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Cheetah Density</span>
                      <span className={`text-[9px] font-mono ${modifications.cheetah_abundance > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                        {modifications.cheetah_abundance > 0 ? '+' : ''}{(modifications.cheetah_abundance * 100).toFixed(0)}%
                      </span>
                    </div>
                    <input
                      type="range" min="-0.5" max="0.5" step="0.05"
                      value={modifications.cheetah_abundance || 0}
                      onChange={(e) => setModifications({ ...modifications, cheetah_abundance: parseFloat(e.target.value) })}
                      className="w-full h-1 bg-white/5 rounded-none appearance-none cursor-pointer accent-[#775a19]"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Human Pop Index</span>
                      <span className={`text-[9px] font-mono ${modifications.pop2018_mean > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                        {modifications.pop2018_mean > 0 ? '+' : ''}{(modifications.pop2018_mean * 100).toFixed(0)}%
                      </span>
                    </div>
                    <input
                      type="range" min="-0.5" max="0.5" step="0.05"
                      value={modifications.pop2018_mean || 0}
                      onChange={(e) => setModifications({ ...modifications, pop2018_mean: parseFloat(e.target.value) })}
                      className="w-full h-1 bg-white/5 rounded-none appearance-none cursor-pointer accent-[#775a19]"
                    />
                  </div>
                </div>

                <div className="p-4 bg-[#775a19]/5 border border-[#775a19]/10 rounded-none flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                  <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                    Adjustments directly influence the <span className="text-white font-bold">XGBoost Digital Twin</span> logic to project population shifts and ecological stability within the delineated segment.
                  </p>
                </div>

                <button
                  onClick={handleRun}
                  disabled={loading}
                  className="w-full relative group"
                >
                  <div className="absolute inset-0 bg-[#775a19] blur-2xl opacity-10 group-hover:opacity-30 transition-opacity" />
                  <div className={`relative w-full h-14 rounded-none bg-[#775a19] flex items-center justify-center gap-3 transition-all ${loading ? 'opacity-80' : 'hover:bg-[#4e3700] active:scale-[0.98] shadow-2xl shadow-[#775a19]/20'}`}>
                    {loading ? (
                      <div className="flex items-center gap-3">
                         <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-none animate-spin" />
                         <span className="text-xs font-black uppercase tracking-[0.2em] text-white">Synthesizing Twin</span>
                      </div>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-current text-white" />
                        <span className="text-xs font-black uppercase tracking-[0.2em] text-white">Execute Simulation</span>
                      </>
                    )}
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}