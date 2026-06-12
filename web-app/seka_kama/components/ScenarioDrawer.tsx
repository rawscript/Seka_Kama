'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useMap, Source, Layer } from 'react-map-gl/maplibre';
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
  Activity,
  History
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

export default function ScenarioDrawer({ onScenarioRun, selectedUnit }: ScenarioDrawerProps) {
  const { 'main-map': map } = useMap();
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [points, setPoints] = useState<[number, number][]>([]);
  const [drawnGeometry, setDrawnGeometry] = useState<GeoJSON.Polygon | null>(null);
  const [modifications, setModifications] = useState(DEFAULT_MODIFICATIONS);
  const [userQuery, setUserQuery] = useState('');
  const [loading, setLoading] = useState(false);

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
      
      // Filter out points that are too close (common in double clicks)
      const uniquePoints: [number, number][] = [];
      prev.forEach(p => {
        if (uniquePoints.length === 0) {
          uniquePoints.push(p);
        } else {
          const last = uniquePoints[uniquePoints.length - 1];
          const dist = Math.sqrt(Math.pow(p[0] - last[0], 2) + Math.pow(p[1] - last[1], 2));
          if (dist > 0.00001) { // Very small threshold
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

  const startDrawing = () => {
    setPoints([]);
    setDrawnGeometry(null);
    setIsDrawingMode(true);
  };

  const cancelDrawing = () => {
    setPoints([]);
    setDrawnGeometry(null);
    setIsDrawingMode(false);
    setUserQuery('');
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
      
      onScenarioRun?.(result);
      cancelDrawing();
    } catch (error) {
      console.error('❌ Scenario execution failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Simulation failed: ${errorMessage}\n\nPlease check:\n1. Backend server is running\n2. Database is connected\n3. XGBoost model is loaded\n4. Selected area contains grid cells`);
    } finally {
      setLoading(false);
    }
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

      {/* Control Surface */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[30] w-full max-w-2xl px-6 pointer-events-none">
        {isDrawingMode ? (
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
                   <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest flex items-center gap-2">
                     <span className="w-1.5 h-1.5 rounded-none bg-[#775a19]" /> Defining Logic for {points.length} Node Segment
                   </div>
                </div>
              </div>
              <button onClick={cancelDrawing} className="p-2.5 hover:bg-white/5 rounded-none text-slate-500 hover:text-white transition-all">
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

              <div className="space-y-8">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-amber-500" />
                      <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Nightlight Trend</span>
                    </div>
                    <div className="px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono font-bold text-emerald-400">
                      {modifications.longterm_slope_mean > 0 ? '+' : ''}
                      {(modifications.longterm_slope_mean * 100).toFixed(0)}%
                    </div>
                  </div>
                  <input
                    type="range" min="-0.5" max="0.5" step="0.01"
                    value={modifications.longterm_slope_mean || 0}
                    onChange={(e) => setModifications({ ...modifications, longterm_slope_mean: parseFloat(e.target.value) })}
                    className="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-emerald-500"
                  />
                  <div className="flex justify-between mt-3 text-[9px] text-slate-600 font-bold uppercase tracking-tighter">
                    <span>Diminished</span>
                    <span>Stable</span>
                    <span>Intense</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-emerald-500" />
                      <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Protected Proximity</span>
                    </div>
                    <div className="px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono font-bold text-emerald-400">
                      {modifications.dist_to_protected_km > 0 ? '+' : ''}
                      {(modifications.dist_to_protected_km * 100).toFixed(0)}%
                    </div>
                  </div>
                  <input
                    type="range" min="-0.5" max="0.5" step="0.01"
                    value={modifications.dist_to_protected_km || 0}
                    onChange={(e) => setModifications({ ...modifications, dist_to_protected_km: parseFloat(e.target.value) })}
                    className="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-emerald-500"
                  />
                  <div className="flex justify-between mt-3 text-[9px] text-slate-600 font-bold uppercase tracking-tighter">
                    <span>Closer</span>
                    <span>No Change</span>
                    <span>Farther</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <History className="w-4 h-4 text-emerald-500" />
                      <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Projection Horizon</span>
                    </div>
                    <div className="px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono font-bold text-emerald-400">
                      {modifications.simulation_years || 0} Years
                    </div>
                  </div>
                  <input
                    type="range" min="0" max="10" step="1"
                    value={modifications.simulation_years || 0}
                    onChange={(e) => setModifications({ ...modifications, simulation_years: parseInt(e.target.value) })}
                    className="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-blue-500" />
                      <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Spatial Variation</span>
                    </div>
                    <div className="px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono font-bold text-emerald-400">
                      {modifications.all_skew_mean > 0 ? '+' : ''}
                      {(modifications.all_skew_mean * 100).toFixed(0)}%
                    </div>
                  </div>
                  <input
                    type="range" min="-0.5" max="0.5" step="0.01"
                    value={modifications.all_skew_mean || 0}
                    onChange={(e) => setModifications({ ...modifications, all_skew_mean: parseFloat(e.target.value) })}
                    className="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                       <Dna className="w-4 h-4 text-pink-500" />
                       <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Cheetah Abundance</span>
                    </div>
                    <div className="px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono font-bold text-emerald-400">
                      {modifications.cheetah_abundance > 0 ? '+' : ''}
                      {(modifications.cheetah_abundance * 100).toFixed(0)}%
                    </div>
                  </div>
                  <input
                    type="range" min="-0.5" max="0.5" step="0.01"
                    value={modifications.cheetah_abundance || 0}
                    onChange={(e) => setModifications({ ...modifications, cheetah_abundance: parseFloat(e.target.value) })}
                    className="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                       <MapPin className="w-4 h-4 text-orange-500" />
                       <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Human Population Density</span>
                    </div>
                    <div className="px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono font-bold text-emerald-400">
                      {modifications.pop2018_mean > 0 ? '+' : ''}
                      {(modifications.pop2018_mean * 100).toFixed(0)}%
                    </div>
                  </div>
                  <input
                    type="range" min="-0.5" max="0.5" step="0.01"
                    value={modifications.pop2018_mean || 0}
                    onChange={(e) => setModifications({ ...modifications, pop2018_mean: parseFloat(e.target.value) })}
                    className="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>


                <div className="p-5 bg-amber-500/5 border border-amber-500/10 rounded-2xl flex gap-4">
                  <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0" />
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Higher intensity values correlate with <span className="text-slate-200">urban encroachment</span> and <span className="text-slate-200">habitat fragmentation</span> within the SekaNet predictive engine.
                  </p>
                </div>

                <button
                  onClick={handleRun}
                  disabled={loading}
                  className="w-full relative group"
                >
                  <div className="absolute inset-0 bg-[#775a19] blur-2xl opacity-20 group-hover:opacity-40 transition-opacity" />
                  <div className={`relative w-full h-16 rounded-none bg-[#775a19] flex items-center justify-center gap-3 transition-all ${loading ? 'opacity-80' : 'hover:-translate-y-1 active:translate-y-0 shadow-2xl shadow-[#775a19]/20'}`}>
                    {loading ? (
                      <div className="flex items-center gap-3">
                         <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-none animate-spin" />
                         <span className="text-sm font-black uppercase tracking-[0.2em] text-white">Synthesizing Digital Twin</span>
                      </div>
                    ) : (
                      <>
                        <Play className="w-5 h-5 fill-current text-white" />
                        <span className="text-sm font-black uppercase tracking-[0.2em] text-white">Execute Simulation</span>
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