'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Map, { Source, Layer, MapRef, MapProvider, useMap } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { api } from '@/services/api';
import ScenarioDrawer from './ScenarioDrawer';
import { 
  Loader2, 
  Filter, 
  Layers, 
  Info, 
  Zap, 
  Compass, 
  Maximize2,
  Box
} from 'lucide-react';

function getDirectDriveLink(url: string) {
  if (!url) return '';
  const fileIdMatch = url.match(/[-\w]{25,}/);
  if (fileIdMatch && fileIdMatch[0]) {
    const rawUrl = `https://drive.google.com/uc?export=download&id=${fileIdMatch[0]}`;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
    return `${apiUrl}/proxy-geojson?url=${encodeURIComponent(rawUrl)}`;
  }
  return url;
}

interface SekaMapProps {
  onScenarioRun?: (result: any) => void;
}

const CONSERVANCY_COORDS: Record<string, { lng: number, lat: number, zoom: number }> = {
  'Mara North': { lng: 35.034, lat: -1.168, zoom: 11 },
  'Olare-Motorogi': { lng: 35.138, lat: -1.296, zoom: 11 },
  'Naboisho': { lng: 35.334, lat: -1.312, zoom: 11 },
  'Ol Kinyei': { lng: 35.454, lat: -1.332, zoom: 11 },
};

export default function SekaMap({ onScenarioRun }: SekaMapProps) {
  return (
    <MapProvider>
      <div className="relative w-full h-full bg-[#020617]">
        <SekaMapContent onScenarioRun={onScenarioRun} />
      </div>
    </MapProvider>
  );
}

function SekaMapContent({ onScenarioRun }: SekaMapProps) {
  const { 'main-map': mapMain } = useMap();
  const envLandXUrl = process.env.NEXT_PUBLIC_LANDX_TILE_URL || '';
  const landXSourceUrl = getDirectDriveLink(envLandXUrl);
  
  const [loading, setLoading] = useState(true);
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [baselineData, setBaselineData] = useState<any>(null);
  const [protectedData, setProtectedData] = useState<any>(null);
  const [isStyleLoaded, setIsStyleLoaded] = useState(false);
  const [viewState, setViewState] = useState({
    longitude: 35.1,
    latitude: -1.25,
    zoom: 9.2,
    pitch: 45,
    bearing: -10
  });

  const loadData = useCallback(async () => {
    try {
      const [baseline, protected_areas] = await Promise.all([
        api.getBaseline(selectedUnit || undefined),
        api.getProtectedAreas()
      ]);
      setBaselineData(baseline);
      setProtectedData(protected_areas);
      setLoading(false);
    } catch (error) {
      console.error("Failed to load map data:", error);
      setLoading(false);
    }
  }, [selectedUnit]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Conservancy Navigation
  useEffect(() => {
    if (selectedUnit && CONSERVANCY_COORDS[selectedUnit] && mapMain) {
      const { lng, lat, zoom } = CONSERVANCY_COORDS[selectedUnit];
      mapMain.flyTo({
        center: [lng, lat],
        zoom: zoom,
        duration: 3000,
        essential: true,
        pitch: 50
      });
    }
  }, [selectedUnit, mapMain]);

  return (
    <div className="w-full h-full relative group">
      <Map
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        onLoad={() => setIsStyleLoaded(true)}
        style={{ width: '100%', height: '100%' }}
        mapStyle={{
          version: 8,
          sources: {
            'satellite': {
              type: 'raster',
              tiles: ['https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
              tileSize: 256,
              attribution: 'Esri, Maxar'
            }
          },
          layers: [
            {
              id: 'satellite-layer',
              type: 'raster',
              source: 'satellite',
              paint: { 'raster-opacity': 0.85, 'raster-saturation': -0.2, 'raster-contrast': 0.1 }
            }
          ]
        }}
        id="main-map"
      >
        {isStyleLoaded && (
          <>
            {/* Land-X Layer (Boundaries) */}
            {landXSourceUrl && (
              <Source id="landx-boundaries" type="geojson" data={landXSourceUrl}>
                <Layer
                  id="landx-line"
                  type="line"
                  paint={{
                    'line-color': '#10b981',
                    'line-width': 2,
                    'line-opacity': 0.8,
                    'line-dasharray': [2, 1]
                  }}
                />
                <Layer
                  id="landx-fill"
                  type="fill"
                  paint={{
                    'fill-color': '#10b981',
                    'fill-opacity': 0.03
                  }}
                />
              </Source>
            )}

            {/* Protected Areas Layer */}
            {protectedData && (
              <Source id="protected-areas" type="geojson" data={protectedData}>
                <Layer
                  id="protected-areas-fill"
                  type="fill"
                  paint={{
                    'fill-color': '#059669',
                    'fill-opacity': 0.3,
                    'fill-outline-color': '#10b981'
                  }}
                />
              </Source>
            )}

            {/* AI Density Grid Layer */}
            {baselineData && (
              <Source id="lion-density" type="geojson" data={baselineData}>
                <Layer
                  id="lions-heatmap"
                  type="circle"
                  paint={{
                    'circle-radius': [
                      'interpolate', ['linear'], ['zoom'],
                      8, ['interpolate', ['linear'], ['get', 'density'], 0, 1.5, 30, 10],
                      12, ['interpolate', ['linear'], ['get', 'density'], 0, 4, 30, 30]
                    ],
                    'circle-color': [
                      'interpolate', ['linear'], ['get', 'density'],
                      0, '#fef3c7',
                      5, '#fbbf24',
                      15, '#f59e0b',
                      30, '#d97706'
                    ],
                    'circle-opacity': 0.9,
                    'circle-stroke-width': 1,
                    'circle-stroke-color': 'rgba(255,255,255,0.1)'
                  }}
                />
              </Source>
            )}
          </>
        )}

        {/* HUD Elements */}
        <div className="absolute top-6 left-6 z-10 flex flex-col gap-4 pointer-events-none">
           <div className="glass-effect p-3 px-4 rounded-xl flex items-center gap-3 border-emerald-500/20 border pointer-events-auto shadow-2xl">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-white uppercase tracking-widest">Digital Twin Active</span>
              <div className="w-px h-4 bg-white/10" />
              <span className="text-[10px] font-mono text-emerald-400">FPS: 60.0</span>
           </div>
        </div>

        <div className="absolute top-6 right-6 z-10 flex flex-col gap-3 w-72 pointer-events-none">
          {/* Unit Selector HUD */}
          <div className="glass-effect-heavy p-5 rounded-2xl pointer-events-auto animate-in duration-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-emerald-400" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-200">Zone Selection</span>
              </div>
              <div className="p-1 rounded-md bg-white/5 border border-white/10">
                <Maximize2 className="w-3 h-3 text-slate-500" />
              </div>
            </div>
            
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-3 text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all appearance-none cursor-pointer"
            >
              <option value="" className="bg-[#0f172a]">Regional Overview</option>
              {Object.keys(CONSERVANCY_COORDS).map(u => (
                <option key={u} value={u} className="bg-[#0f172a]">{u}</option>
              ))}
            </select>
          </div>

          {/* Intelligent Legend */}
          <div className="glass-effect-heavy p-5 rounded-2xl pointer-events-auto animate-in duration-1000">
            <div className="flex items-center gap-2 mb-4">
              <Box className="w-4 h-4 text-emerald-400" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-200">Ecosystem Indicators</span>
            </div>
            <div className="space-y-3">
              <div className="flex flex-col gap-1.5">
                 <div className="h-1.5 w-full rounded-full bg-gradient-to-r from-amber-50 to-amber-700 shadow-inner" />
                 <div className="flex justify-between text-[9px] text-slate-500 uppercase font-bold tracking-tighter">
                   <span>Baseline</span>
                   <span>Lion Density Grid (XGB)</span>
                   <span>High</span>
                 </div>
              </div>
              
              <div className="pt-2 border-t border-white/5 space-y-2.5">
                <LegendItem color="#059669" label="Protected Wildlife Zones" opacity={0.4} />
                <LegendItem color="#10b981" label="Land-X Administrative Boundary" bordered />
              </div>
            </div>
          </div>
        </div>

        <ScenarioDrawer onScenarioRun={onScenarioRun} />
      </Map>

      {/* Modern Loader Overlay */}
      {loading && (
        <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-[#020617]/90 backdrop-blur-xl animate-in fade-in duration-500">
          <div className="relative w-24 h-24 flex items-center justify-center">
             <div className="absolute inset-0 rounded-full border-4 border-emerald-500/10 border-t-emerald-500 animate-spin" />
             <div className="absolute inset-4 rounded-full border-4 border-emerald-500/5 border-b-teal-500 animate-spin" style={{ animationDirection: 'reverse' }} />
             <ShieldCheck className="w-8 h-8 text-emerald-500 animate-pulse" />
          </div>
          <div className="mt-8 text-center space-y-2">
            <h2 className="text-sm font-bold text-white uppercase tracking-[0.3em] mb-0 leading-none">Initializing Hub</h2>
            <p className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">Connecting to SekaNet Oracle v4.2</p>
          </div>
        </div>
      )}

      <style jsx global>{`
        .maplibregl-ctrl-attrib { display: none !important; }
        .maplibregl-canvas { outline: none !important; }
      `}</style>
    </div>
  );
}

function LegendItem({ color, label, opacity = 1, bordered = false }: { color: string; label: string; opacity?: number; bordered?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`w-2.5 h-2.5 rounded-sm ${bordered ? 'border-2 border-white/20' : ''}`}
        style={{ backgroundColor: color, opacity }}
      />
      <span className="text-[10px] text-slate-400 font-medium tracking-tight truncate">{label}</span>
      <Info className="w-3 h-3 text-slate-700 ml-auto hover:text-slate-400 transition-colors cursor-help" />
    </div>
  );
}

import { ShieldCheck } from 'lucide-react';