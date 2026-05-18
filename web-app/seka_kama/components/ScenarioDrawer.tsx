'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useMap, Source, Layer } from 'react-map-gl/maplibre';
import { api } from '@/services/api';
import { Play, Edit3, X, Lightbulb, TrendingUp, AlertTriangle, MapPin } from 'lucide-react';

interface ScenarioDrawerProps {
  onScenarioRun: (result: any) => void;
}

const DEFAULT_MODIFICATIONS = {
  longterm_slope_mean: 0.10,
};

export default function ScenarioDrawer({ onScenarioRun }: ScenarioDrawerProps) {
  const { 'main-map': map } = useMap();
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [points, setPoints] = useState<[number, number][]>([]);
  const [drawnGeometry, setDrawnGeometry] = useState<GeoJSON.Polygon | null>(null);
  const [modifications, setModifications] = useState(DEFAULT_MODIFICATIONS);
  const [userQuery, setUserQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // ── Drawing click handler ─────────────────────────────────────────
  const handleMapClick = useCallback((e: any) => {
    if (!isDrawingMode) return;
    const { lng, lat } = e.lngLat;
    setPoints(prev => [...prev, [lng, lat]]);
  }, [isDrawingMode]);

  const handleMapDblClick = useCallback((e: any) => {
    if (!isDrawingMode) return;
    e.preventDefault();
    e.originalEvent?.stopPropagation();
    setPoints(prev => {
      if (prev.length < 3) return prev;
      const closed: [number, number][] = [...prev, prev[0]];
      setDrawnGeometry({ type: 'Polygon', coordinates: [closed] });
      setIsDrawingMode(false);
      return prev;
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

  // ── Live preview GeoJSON ──────────────────────────────────────────
  const previewGeoJSON: GeoJSON.Feature | null = points.length >= 2 ? {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: points,
    },
  } : null;

  const drawnPolygonGeoJSON: GeoJSON.Feature | null = drawnGeometry ? {
    type: 'Feature',
    properties: {},
    geometry: drawnGeometry,
  } : null;

  // ── Actions ───────────────────────────────────────────────────────
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
    try {
      const result = await api.runScenario({
        geometry: drawnGeometry,
        feature_modifications: modifications,
        user_query: userQuery,
      });
      onScenarioRun(result);
      cancelDrawing();
    } catch (error) {
      console.error('Scenario run failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Live drawing preview layers — must be inside <Map> context via siblings in SekaMap */}
      {previewGeoJSON && (
        <Source id="draw-preview" type="geojson" data={previewGeoJSON}>
          <Layer
            id="draw-preview-line"
            type="line"
            paint={{ 'line-color': '#10b981', 'line-width': 2, 'line-dasharray': [2, 2] }}
          />
        </Source>
      )}
      {drawnPolygonGeoJSON && (
        <Source id="draw-polygon" type="geojson" data={drawnPolygonGeoJSON}>
          <Layer
            id="draw-polygon-fill"
            type="fill"
            paint={{ 'fill-color': '#10b981', 'fill-opacity': 0.15 }}
          />
          <Layer
            id="draw-polygon-line"
            type="line"
            paint={{ 'line-color': '#10b981', 'line-width': 2 }}
          />
        </Source>
      )}

      {/* UI Panel — rendering overlay on top of map */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 w-full max-w-2xl px-4">
        {isDrawingMode ? (
          <div className="glass-effect p-4 rounded-2xl border border-emerald-500/30 bg-black/60 text-white text-center backdrop-blur-xl">
            <div className="flex items-center justify-center gap-3 mb-2">
              <MapPin className="w-5 h-5 text-emerald-400 animate-pulse" />
              <span className="font-bold text-emerald-300 tracking-wide">Drawing Mode Active</span>
            </div>
            <p className="text-xs text-white/60 mb-3">
              Click to add points · Double-click to close polygon
              {points.length > 0 && ` · ${points.length} point${points.length > 1 ? 's' : ''} placed`}
            </p>
            <button
              onClick={cancelDrawing}
              className="flex items-center gap-2 mx-auto px-4 py-2 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-sm hover:bg-red-500/30 transition-all"
            >
              <X className="w-4 h-4" /> Cancel
            </button>
          </div>
        ) : !drawnGeometry ? (
          <div className="flex justify-center flex-col items-center">
            <button
              onClick={startDrawing}
              className="group flex items-center gap-3 bg-emerald-500 hover:bg-emerald-400 text-white px-8 py-4 rounded-2xl font-bold shadow-2xl transition-all hover:scale-105 active:scale-95"
            >
              <Edit3 className="w-5 h-5" />
              <span className="tracking-tight text-lg">Propose Development Scenario</span>
            </button>
            <p className="mt-3 text-white/60 text-[10px] uppercase font-bold tracking-[0.2em] drop-shadow-md">
              Draw a polygon on the map to start your simulation
            </p>
          </div>
        ) : (
          <div className="glass-effect p-6 rounded-3xl border border-white/20 shadow-2xl backdrop-blur-2xl bg-black/40 text-white">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-500/20 rounded-xl">
                  <Lightbulb className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold tracking-tight">Scenario Configuration</h3>
                  <p className="text-xs text-white/50">Define environmental impacts for the selected area</p>
                </div>
              </div>
              <button onClick={cancelDrawing} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <label className="block">
                  <span className="text-xs font-bold text-white/60 uppercase tracking-widest block mb-2">
                    Ecological Narrative
                  </span>
                  <textarea
                    value={userQuery}
                    onChange={(e) => setUserQuery(e.target.value)}
                    placeholder="e.g. Construction of a luxury lodge with perimeter nightlights..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 min-h-[120px] transition-all"
                  />
                </label>
              </div>

              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-white/60 uppercase tracking-widest flex items-center gap-2">
                      <TrendingUp className="w-3 h-3 text-orange-400" />
                      Nightlight Trend Offset
                    </span>
                    <span className="text-sm font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      {modifications.longterm_slope_mean > 0 ? '+' : ''}
                      {(modifications.longterm_slope_mean * 100).toFixed(0)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-0.5"
                    max="0.5"
                    step="0.01"
                    value={modifications.longterm_slope_mean}
                    onChange={(e) => setModifications({
                      ...modifications,
                      longterm_slope_mean: parseFloat(e.target.value),
                    })}
                    className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-emerald-500"
                  />
                  <div className="flex justify-between mt-2 text-[10px] text-white/30 font-bold">
                    <span>-50% LIGHT</span>
                    <span>NEUTRAL</span>
                    <span>+50% LIGHT</span>
                  </div>
                </div>

                <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0" />
                  <p className="text-[11px] text-orange-100/70 leading-relaxed font-medium">
                    Increased nightlight is a primary driver in SekaNet. Simulating development near protected boundaries may show significant population displacement.
                  </p>
                </div>

                <button
                  onClick={handleRun}
                  disabled={loading}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-500/50 text-white py-4 rounded-2xl font-black text-lg shadow-[0_10px_30px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-3 active:scale-95"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span className="uppercase tracking-widest text-sm">Simulating Ecosystem...</span>
                    </div>
                  ) : (
                    <>
                      <Play className="w-5 h-5 fill-current" />
                      <span className="uppercase tracking-widest">Run Digital Twin Model</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .glass-effect {
          background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%);
          backdrop-filter: blur(40px);
          -webkit-backdrop-filter: blur(40px);
        }
      `}</style>
    </>
  );
}