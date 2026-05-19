'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Map, { Source, Layer, MapRef, MapProvider, useMap } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { api } from '@/services/api';
import ScenarioDrawer from './ScenarioDrawer';
import { Loader2, Filter, Layers, Info } from 'lucide-react';

const CONSERVANCY_COORDS: Record<string, { lng: number, lat: number, zoom: number }> = {
  'Mara North': { lng: 35.034, lat: -1.168, zoom: 11 },
  'Olare-Motorogi': { lng: 35.138, lat: -1.296, zoom: 11 },
  'Naboisho': { lng: 35.334, lat: -1.312, zoom: 11 },
  'Ol Kinyei': { lng: 35.454, lat: -1.332, zoom: 11 },
};

export default function SekaMap({ onScenarioRun }: SekaMapProps) {
  return (
    <MapProvider>
      <div className="relative w-full h-full bg-[#0a0a20]" style={{ height: 'calc(100vh - 58px - 48px)' }}>
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
  const [viewState, setViewState] = useState({
    longitude: 35.1,
    latitude: -1.25,
    zoom: 9,
    pitch: 45,
    bearing: 0
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

  // Redirection Logic
  useEffect(() => {
    if (selectedUnit && CONSERVANCY_COORDS[selectedUnit] && mapMain) {
      const { lng, lat, zoom } = CONSERVANCY_COORDS[selectedUnit];
      mapMain.flyTo({
        center: [lng, lat],
        zoom: zoom,
        duration: 2000,
        essential: true
      });
    }
  }, [selectedUnit, mapMain]);

  const handleScenarioRun = (result: any) => {
    onScenarioRun?.(result);
  };

  return (
    <>
      <Map
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        style={{ width: '100%', height: '100%' }}
        mapStyle={{
          version: 8,
          sources: {
            'satellite': {
              type: 'raster',
              tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
              tileSize: 256,
              attribution: 'Esri, Maxar'
            }
          },
          layers: [
            {
              id: 'satellite-layer',
              type: 'raster',
              source: 'satellite',
              paint: { 'raster-opacity': 0.8 }
            }
          ]
        }}
        id="main-map"
      >
        {/* Land-X Layer (Boundaries) */}
        {landXSourceUrl && (
          <Source id="landx-boundaries" type="geojson" data={landXSourceUrl}>
            <Layer
              id="landx-line"
              type="line"
              paint={{
                'line-color': '#4ade80',
                'line-width': 1.5,
                'line-opacity': 0.6
              }}
            />
            <Layer
              id="landx-fill"
              type="fill"
              paint={{
                'fill-color': '#4ade80',
                'fill-opacity': 0.05
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
                'fill-color': '#10b981',
                'fill-opacity': 0.2,
                'fill-outline-color': '#059669'
              }}
            />
          </Source>
        )}

        {/* Lion Density Grid Layer */}
        {baselineData && (
          <Source id="lion-density" type="geojson" data={baselineData}>
            <Layer
              id="lions-heatmap"
              type="circle"
              paint={{
                'circle-radius': [
                  'interpolate', ['linear'], ['zoom'],
                  8, ['interpolate', ['linear'], ['get', 'density'], 0, 1, 30, 8],
                  12, ['interpolate', ['linear'], ['get', 'density'], 0, 3, 30, 25]
                ],
                'circle-color': [
                  'interpolate', ['linear'], ['get', 'density'],
                  0, '#fef3c7',
                  5, '#fcd34d',
                  15, '#f59e0b',
                  30, '#b45309'
                ],
                'circle-opacity': 0.8,
                'circle-blur': 0.2
              }}
            />
          </Source>
        )}

        {/* Custom Controls Overlay */}
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
          <div className="glass-panel p-4 rounded-xl border border-white/10 shadow-2xl backdrop-blur-md bg-black/40 text-white">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-semibold uppercase tracking-wider">Conservancy</span>
            </div>
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              className="w-full bg-white/5 border border-white/20 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              <option value="" className="bg-[#1a1a2e]">All Landscapes</option>
              {Object.keys(CONSERVANCY_COORDS).map(u => (
                <option key={u} value={u} className="bg-[#1a1a2e]">{u}</option>
              ))}
            </select>
          </div>

          <div className="glass-panel p-4 rounded-xl border border-white/10 shadow-2xl backdrop-blur-md bg-black/40 text-white">
            <div className="flex items-center gap-2 mb-3">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-semibold uppercase tracking-wider">Legend</span>
            </div>
            <div className="space-y-2">
              <LegendItem color="#b45309" label="High Density" />
              <LegendItem color="#f59e0b" label="Medium Density" />
              <LegendItem color="#fef3c7" label="Low Density" />
              <div className="pt-2 border-t border-white/10">
                <LegendItem color="#10b981" label="Protected Area" opacity={0.3} />
              </div>
              {landXSourceUrl && (
                <div className="pt-2 border-t border-white/10">
                  <LegendItem color="#4ade80" label="Boundary (Land-X)" opacity={0.6} />
                </div>
              )}
            </div>
          </div>
        </div>

        <ScenarioDrawer onScenarioRun={handleScenarioRun} />
      </Map>

      {loading && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#0a0a20]/80 backdrop-blur-sm">
          <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
          <p className="text-emerald-100 font-medium tracking-widest uppercase text-xs">Synchronizing Ecosystem Digital Twin</p>
        </div>
      )}

      <style>{`
        .glass-panel {
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
        }
        .maplibregl-ctrl-attrib {
          background: rgba(0,0,0,0.5) !important;
          color: #ccc !important;
        }
        .maplibregl-ctrl-attrib a {
          color: #4ade80 !important;
        }
      `}</style>
    </>
  );
}

function LegendItem({ color, label, opacity = 1 }: { color: string; label: string; opacity?: number }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-3 h-3 rounded-full border border-white/20"
        style={{ backgroundColor: color, opacity }}
      />
      <span className="text-[10px] text-gray-300 font-medium">{label}</span>
    </div>
  );
}