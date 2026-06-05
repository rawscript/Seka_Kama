'use client';

import { useState, useEffect, useCallback } from 'react';
import Map, { Source, Layer, useMap } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { ShieldCheck, Info, Target } from 'lucide-react';
import { api } from '@/services/api';
import { getApiUrl } from '@/services/config';
import ScenarioDrawer from './ScenarioDrawer';
import DraggablePanel from './DraggablePanel';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDirectDriveLink(url: string) {
  if (!url) return '';
  const fileIdMatch = url.match(/[-\w]{25,}/);
  if (fileIdMatch?.[0]) {
    const rawUrl = `https://drive.google.com/uc?export=download&id=${fileIdMatch[0]}`;
    return `${getApiUrl()}/proxy-geojson?url=${encodeURIComponent(rawUrl)}`;
  }
  return url;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SekaMapProps {
  onScenarioRun?: (result: any) => void;
  selectedUnit?: string;
  onUnitChange?: (unit: string) => void;
  onViewStateChange?: (viewState: any) => void;
  activeLayer?: string;
  /** 0–100 slider value mapped to the data year range (2020–2026) */
  timeValue?: number;
  /** Whether the Protected Wildlife Zones layer is visible */
  showProtectedAreas?: boolean;
  /** Whether the Land-X Admin Boundary layer is visible */
  showLandXBoundary?: boolean;
  /** Whether to show Prey Density instead of Lion Density */
  showPreyDensity?: boolean;
  /** Whether to show biological corridors */
  showCorridors?: boolean;
  /** Whether to show neural landscape prediction heatmap */
  showPrediction?: boolean;
  /** Whether to show human encroachment (nightlight) heatmap */
  showEncroachment?: boolean;
  /** Whether the Live Twin mode is active */
  isLiveMode?: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CONSERVANCY_COORDS: Record<string, { lng: number; lat: number; zoom: number }> = {
  'Mara North':       { lng: 35.034, lat: -1.168, zoom: 11 },
  'Olare-Motorogi':   { lng: 35.138, lat: -1.296, zoom: 11 },
  'Naboisho':         { lng: 35.334, lat: -1.312, zoom: 11 },
  'Ol Kinyei':        { lng: 35.454, lat: -1.332, zoom: 11 },
};

/** Map a 0–100 slider value to a calendar year in [2020, 2026] */
function sliderToYear(value: number): number {
  const MIN_YEAR = 2020;
  const MAX_YEAR = 2026;
  return Math.round(MIN_YEAR + (value / 100) * (MAX_YEAR - MIN_YEAR));
}

// ---------------------------------------------------------------------------
// Public wrapper (keeps MapProvider-agnostic usage simple)
// ---------------------------------------------------------------------------

export default function SekaMap(props: SekaMapProps) {
  return (
    <div className="relative w-full h-full bg-white">
      <SekaMapContent {...props} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inner component (needs to be inside a MapProvider to use useMap)
// ---------------------------------------------------------------------------

function SekaMapContent({
  onScenarioRun,
  selectedUnit,
  onUnitChange,
  onViewStateChange,
  activeLayer,
  timeValue = 66,
  showProtectedAreas = true,
  showLandXBoundary = false,
  showPreyDensity = false,
  showCorridors = false,
  showPrediction = false,
  showEncroachment = false,
  isLiveMode = false,
}: SekaMapProps): JSX.Element {
  const { 'main-map': mapMain } = useMap();
  const [onScenarioRunResult, setOnScenarioRunResult] = useState<any>(null);
  const envLandXUrl = process.env.NEXT_PUBLIC_LANDX_TILE_URL || '';
  const landXSourceUrl = getDirectDriveLink(envLandXUrl);

  // Derive the selected year from the slider value
  const selectedYear = sliderToYear(timeValue);

  // Map style switches between satellite and vector topographic
  const currentMapStyle: any =
    activeLayer === 'VECTOR (TOPOGRAPHIC)'
      ? 'https://demotiles.maplibre.org/style.json'
      : {
          version: 8,
          sources: {
            satellite: {
              type: 'raster',
              tiles: [
                'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
              ],
              tileSize: 256,
              attribution: 'Esri, Maxar',
            },
          },
          layers: [
            {
              id: 'satellite-layer',
              type: 'raster',
              source: 'satellite',
              paint: {
                'raster-opacity': 0.85,
                'raster-saturation': -0.2,
                'raster-contrast': 0.1,
              },
            },
          ],
        };

  const [loading, setLoading] = useState(true);
  const [baselineData, setBaselineData]   = useState<any>(null);
  const [protectedData, setProtectedData] = useState<any>(null);
  const [corridorData, setCorridorData]   = useState<any>(null);
  const [predictionData, setPredictionData] = useState<any>(null);
  const [hoverInfo, setHoverInfo]         = useState<any>(null);
  const [isStyleLoaded, setIsStyleLoaded] = useState(false);
  const [viewState, setViewState] = useState({
    longitude: 35.1,
    latitude: -1.25,
    zoom: 9.2,
    pitch: 45,
    bearing: -10,
  });
  const [filteredBins, setFilteredBins] = useState<string[]>([]);

  // Notify parent of initial view state once on mount
  useEffect(() => {
    onViewStateChange?.(viewState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMove = useCallback(
    (evt: any) => {
      setViewState(evt.viewState);
      onViewStateChange?.(evt.viewState);
    },
    [onViewStateChange],
  );

  // ---------------------------------------------------------------------------
  // Data loading — re-fetches when selectedUnit or selectedYear changes
  // ---------------------------------------------------------------------------
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [baseline, protected_areas, corridors, prediction] = await Promise.all([
        isLiveMode 
          ? api.getEnrichedBaseline(selectedUnit || undefined, selectedYear)
          : api.getBaseline(selectedUnit || undefined, selectedYear),
        api.getProtectedAreas(),
        api.getCorridors(selectedUnit || undefined),
        isLiveMode ? api.getLandscapePrediction(selectedUnit || undefined, selectedYear) : null
      ]);

      // Filter baseline features to the selected year when raw data is used.
      // Enriched data is already year-specific.
      const filtered = isLiveMode ? baseline : filterByYear(baseline, selectedYear);

      setBaselineData(filtered);
      setProtectedData(protected_areas);
      setCorridorData(corridors);
      if (prediction) setPredictionData(prediction);
    } catch (error) {
      console.error('Failed to load map data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedUnit, selectedYear, isLiveMode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ---------------------------------------------------------------------------
  // Conservancy fly-to
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!mapMain) return;

    if (selectedUnit && CONSERVANCY_COORDS[selectedUnit]) {
      const { lng, lat, zoom } = CONSERVANCY_COORDS[selectedUnit];
      mapMain.flyTo({ center: [lng, lat], zoom, duration: 3000, essential: true, pitch: 50 });
    } else if (!selectedUnit) {
      // Zoom out to Regional Overview
      mapMain.flyTo({
        center: [35.1, -1.25],
        zoom: 9.2,
        duration: 3000,
        essential: true,
        pitch: 45,
        bearing: -10,
      });
    }
  }, [selectedUnit, mapMain]);

  // ---------------------------------------------------------------------------
  // Overview control
  // ---------------------------------------------------------------------------
  const handleOverviewClick = useCallback(() => {
    if (!mapMain) return;
    mapMain.flyTo({
      center: [35.1, -1.25],
      zoom: 9.2,
      duration: 2000,
      essential: true,
      pitch: 45,
      bearing: -10,
    });
  }, [mapMain]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  const onMapClick = (event: any) => {
    const features = event.features;
    if (features && features.length > 0) {
      const cell = features.find((f: any) => f.layer.id === 'lions-heatmap' || f.layer.id === 'scenario-heatmap');
      if (cell) {
        onScenarioRun?.({
          type: 'selection',
          cells: [{
            properties: cell.properties,
            geometry: cell.geometry
          }]
        });
      }
    }
  };

  const onMouseMove = (event: any) => {
    const { features, point: { x, y } } = event;
    const hoveredFeature = features && features.find((f: any) => f.layer.id === 'lions-heatmap');
    if (hoveredFeature) {
      setHoverInfo({
        x,
        y,
        properties: hoveredFeature.properties
      });
    } else {
      setHoverInfo(null);
    }
  };

  return (
    <div className="w-full h-full relative group">
      <Map
        {...viewState}
        onMove={handleMove}
        onLoad={() => setIsStyleLoaded(true)}
        onMouseMove={onMouseMove}
        style={{ width: '100%', height: '100%' }}
        mapStyle={currentMapStyle}
        id="main-map"
        onClick={onMapClick}
        interactiveLayerIds={['lions-heatmap', 'scenario-heatmap']}
      >
        {isStyleLoaded && (
          <>
            {/* Land-X Admin Boundary — visibility controlled by prop */}
            {landXSourceUrl && (
              <Source id="landx-boundaries" type="geojson" data={landXSourceUrl}>
                <Layer
                  id="landx-line"
                  type="line"
                  layout={{ visibility: showLandXBoundary ? 'visible' : 'none' }}
                  paint={{
                    'line-color': '#e9c176',
                    'line-width': 2,
                    'line-opacity': 0.85,
                    'line-dasharray': [2, 1],
                  }}
                />
                <Layer
                  id="landx-fill"
                  type="fill"
                  layout={{ visibility: showLandXBoundary ? 'visible' : 'none' }}
                  paint={{ 'fill-color': '#e9c176', 'fill-opacity': 0.04 }}
                />
              </Source>
            )}

            {/* Corridors — dynamic ecological analysis */}
            {corridorData && (
              <Source id="biological-corridors" type="geojson" data={corridorData}>
                <Layer
                  id="corridor-lines"
                  type="line"
                  layout={{ visibility: showCorridors ? 'visible' : 'none' }}
                  paint={{
                    'line-color': '#8b5cf6',
                    'line-width': 2,
                    'line-opacity': 0.6,
                    'line-dasharray': [3, 2],
                  }}
                />
                <Layer
                  id="corridor-glow"
                  type="line"
                  layout={{ visibility: showCorridors ? 'visible' : 'none' }}
                  paint={{
                    'line-color': '#8b5cf6',
                    'line-width': 8,
                    'line-opacity': 0.15,
                    'line-blur': 4,
                  }}
                />
              </Source>
            )}

            {/* Landscape Prediction Layer (Targeting the whole map) */}
            {predictionData && isLiveMode && (
               <Source id="landscape-prediction" type="geojson" data={predictionData}>
                 <Layer
                   id="prediction-heatmap"
                   type="fill"
                   layout={{ visibility: showPrediction ? 'visible' : 'none' }}
                   paint={{
                      'fill-color': [
                        'interpolate',
                        ['linear'],
                        ['get', 'predicted_density'],
                        0, 'transparent',
                        2, '#3f2b96',
                        10, '#f87171'
                      ],
                      'fill-opacity': 0.4
                   }}
                 />
               </Source>
            )}

            {/* ── Human Encroachment (Nightlight) Layer ── */}
            {baselineData && (
              <Source id="encroachment-source" type="geojson" data={baselineData}>
                <Layer
                  id="encroachment-heat"
                  type="fill"
                  layout={{ visibility: showEncroachment ? 'visible' : 'none' }}
                  paint={{
                    'fill-color': [
                      'interpolate', ['linear'], ['get', 'all_mean_mean'],
                      0,   'rgba(0,0,0,0)',
                      0.1, 'rgba(255,235,59,0.2)',
                      0.5, 'rgba(255,152,0,0.5)',
                      1.0, 'rgba(244,67,54,0.8)'
                    ],
                    'fill-opacity': 0.6,
                  }}
                />
              </Source>
            )}

            {protectedData && (
              <Source id="protected-areas" type="geojson" data={protectedData}>
                <Layer
                  id="protected-areas-fill"
                  type="fill"
                  layout={{ visibility: showProtectedAreas ? 'visible' : 'none' }}
                  paint={{
                    'fill-color': '#059669',
                    'fill-opacity': 0.3,
                    'fill-outline-color': '#10b981',
                  }}
                />
              </Source>
            )}

            {/* Lion Density / Prey Density Grid — always visible, filtered by year */}
            {baselineData && (
              <Source id="lion-density" type="geojson" data={baselineData}>
                <Layer
                  id="lions-heatmap"
                  type="circle"
                  paint={{
                    'circle-radius': [
                      'interpolate', ['linear'], ['zoom'],
                      8,  ['interpolate', ['linear'], ['coalesce', ['get', showPreyDensity ? 'prey_density' : 'lion_density'], 0], 0, 1.5, 30, 10],
                      12, ['interpolate', ['linear'], ['coalesce', ['get', showPreyDensity ? 'prey_density' : 'lion_density'], 0], 0, 4,   30, 30],
                    ],
                    'circle-color': [
                      'interpolate', ['linear'], ['coalesce', ['get', showPreyDensity ? 'prey_density' : 'lion_density'], 0],
                      0,  showPreyDensity ? '#f0fdf4' : '#fef3c7',
                      5,  showPreyDensity ? '#bbf7d0' : '#fbbf24',
                      15, showPreyDensity ? '#4ade80' : '#f59e0b',
                      30, showPreyDensity ? '#16a34a' : '#d97706',
                    ],
                    'circle-opacity': 0.9,
                    'circle-stroke-width': 1,
                    'circle-stroke-color': 'rgba(255,255,255,0.1)',
                  }}
                />
              </Source>
            )}

            {/* Future Scenario Layer — shown only after a run */}
            {onScenarioRunResult?.scenario_geojson && (
              <Source id="scenario-result" type="geojson" data={onScenarioRunResult.scenario_geojson}>
                <Layer
                  id="scenario-heatmap"
                  type="circle"
                  paint={{
                    'circle-radius': [
                      'interpolate', ['linear'], ['zoom'],
                      8,  ['interpolate', ['linear'], ['coalesce', ['get', 'scenario_density'], 0], 0, 2, 30, 12],
                      12, ['interpolate', ['linear'], ['coalesce', ['get', 'scenario_density'], 0], 0, 6, 30, 40],
                    ],
                    'circle-color': [
                      'interpolate', ['linear'], ['coalesce', ['get', 'scenario_density'], 0],
                      0,  '#fef3c7',
                      5,  '#fbbf24',
                      15, '#f59e0b',
                      30, '#d97706',
                    ],
                    'circle-opacity': [
                      'case',
                      ['==', ['length', ['literal', filteredBins]], 0], 0.9,
                      ['any', 
                        ['all', ['<', ['coalesce', ['get', 'scenario_density'], 0], 5], ['in', 'Very low  (0–5)', ['literal', filteredBins]]],
                        ['all', ['>=', ['coalesce', ['get', 'scenario_density'], 0], 5], ['<', ['coalesce', ['get', 'scenario_density'], 0], 15], ['in', 'Low       (5–15)', ['literal', filteredBins]]],
                        ['all', ['>=', ['coalesce', ['get', 'scenario_density'], 0], 15], ['<', ['coalesce', ['get', 'scenario_density'], 0], 30], ['in', 'Moderate  (15–30)', ['literal', filteredBins]]],
                        ['all', ['>=', ['coalesce', ['get', 'scenario_density'], 0], 30], ['in', 'High      (30+)', ['literal', filteredBins]]]
                      ], 0.95,
                      0.05
                    ],
                    'circle-stroke-width': 2,
                    'circle-stroke-color': '#fff',
                  }}
                />
              </Source>
            )}

            {/* Biological Corridors pulse layer */}
            {baselineData && (
              <Source id="corridors" type="geojson" data={baselineData}>
                <Layer
                  id="corridors-pulse"
                  type="circle"
                  layout={{ visibility: showCorridors === true ? 'visible' : 'none' }}
                  paint={{
                    'circle-radius': [
                      'interpolate', ['linear'], ['zoom'],
                      8,  ['case', ['all', ['>', ['get', 'lion_density'], 15], ['<', ['get', 'all_mean_mean'], 0.05]], 3, 0],
                      12, ['case', ['all', ['>', ['get', 'lion_density'], 15], ['<', ['get', 'all_mean_mean'], 0.05]], 8, 0]
                    ],
                    'circle-color': '#8b5cf6',
                    'circle-opacity': 0.6,
                    'circle-stroke-width': [
                        'interpolate', ['linear'], ['zoom'],
                         8, 1,
                         12, 4
                    ],
                    'circle-stroke-color': 'rgba(139, 92, 246, 0.4)'
                  }}
                />
              </Source>
            )}
          </>
        )}

        <ScenarioDrawer
          onScenarioRun={(res) => {
            setOnScenarioRunResult(res);
            onScenarioRun?.(res);
          }}
          selectedUnit={selectedUnit}
        />

        {hoverInfo && (
          <div 
            className="absolute z-[200] pointer-events-none bg-white/95 backdrop-blur-sm border border-slate-200 p-4 rounded-xl shadow-2xl animate-in fade-in duration-200"
            style={{ left: hoverInfo.x + 10, top: hoverInfo.y + 10 }}
          >
             <div className="space-y-3">
                <div className="flex items-center gap-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                   <span className="text-[10px] font-bold text-slate-800 uppercase tracking-widest leading-none">
                     {hoverInfo.properties.management_unit || 'Wild Zone'}
                   </span>
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <p className="text-[8px] font-bold text-slate-600 uppercase mb-0.5">
                         {isLiveMode ? 'Enriched Density' : 'Lion Density'}
                       </p>
                       <p className="text-sm font-black text-emerald-700">
                         {parseFloat(hoverInfo.properties.lion_density || 0).toFixed(3)}
                       </p>
                    </div>
                    <div>
                       <p className="text-[8px] font-bold text-slate-600 uppercase mb-0.5">
                         {isLiveMode ? 'HWC Risk' : 'Threat Level'}
                       </p>
                       <p className={`text-sm font-black ${
                         isLiveMode 
                           ? (parseFloat(hoverInfo.properties.hwc_risk || 0) > 0.6 ? 'text-rose-700' : 'text-blue-700')
                           : (parseFloat(hoverInfo.properties.pop2018_mean || 0) > 5 ? 'text-rose-700' : 'text-blue-700')
                       }`}>
                         {isLiveMode 
                           ? (parseFloat(hoverInfo.properties.hwc_risk || 0) * 100).toFixed(0) + '%'
                           : (parseFloat(hoverInfo.properties.pop2018_mean || 0) > 5 ? 'High' : 'Low')}
                       </p>
                    </div>
                 </div>
                 {isLiveMode && hoverInfo.properties.rainfall_mm && (
                   <div className="pt-2 border-t border-slate-100">
                      <p className="text-[8px] font-bold text-slate-600 uppercase mb-0.5">Annu. Rainfall</p>
                      <p className="text-xs font-bold text-slate-800">{hoverInfo.properties.rainfall_mm.toFixed(0)}mm</p>
                   </div>
                 )}
                 <p className="text-[9px] text-slate-600 italic max-w-[120px] leading-tight">
                    Located {parseFloat(hoverInfo.properties.dist_to_protected_km || 0).toFixed(1)}km from reserve boundary.
                 </p>
             </div>
          </div>
        )}
      </Map>

      {/* Year badge — shown when temporal filtering is active */}
      {!loading && (
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 20,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              padding: '6px 16px',
              background: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid rgba(16,185,129,0.4)',
              borderRadius: '24px',
              fontSize: '11px',
              fontWeight: 700,
              color: '#10b981',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            }}
          >
            {selectedYear} Ecological Snapshot
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-white/95 backdrop-blur-lg animate-in fade-in duration-500">
          <div className="relative w-24 h-24 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
            <div
              className="absolute inset-4 rounded-full border-4 border-emerald-500/10 border-b-emerald-400 animate-spin"
              style={{ animationDirection: 'reverse' }}
            />
            <ShieldCheck className="w-8 h-8 text-emerald-600 animate-pulse" />
          </div>
          <div className="mt-8 text-center space-y-2">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-[0.3em] leading-none">
              {selectedYear !== sliderToYear(66) ? `Loading ${selectedYear} data…` : 'Initializing Hub'}
            </h2>
            <p className="text-[10px] text-slate-600 font-mono tracking-widest uppercase">
              Connecting to SekaNet Gateway v2.1.0
            </p>
          </div>
        </div>
      )}

      {/* Regional Overview Control */}
      <div 
        className="absolute top-16 right-4 z-30 flex flex-col gap-2"
        style={{ pointerEvents: 'auto' }}
      >
        {/* Regional Overview Button */}
        <div className="p-2 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200 min-w-[160px]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[9px] text-slate-700 font-medium tracking-wider uppercase">Regional Overview</span>
            <button
              onClick={handleOverviewClick}
              className="px-2 py-0.5 text-[7px] font-bold uppercase tracking-widest rounded border bg-emerald-100 border-emerald-300 text-emerald-700 hover:bg-emerald-200 transition-all"
              title="Reset to regional overview"
            >
              <Target className="w-2.5 h-2.5 inline mr-1" />
              Reset View
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {Object.entries(CONSERVANCY_COORDS).map(([unit]) => (
              <button
                key={unit}
                onClick={() => onUnitChange?.(unit)}
                className={`px-1.5 py-1.5 text-[8px] rounded border transition-all relative overflow-hidden ${
                  selectedUnit === unit
                    ? 'bg-emerald-100 border-emerald-400 text-emerald-800 shadow-[0_0_8px_rgba(16,185,129,0.15)]'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-emerald-300'
                }`}
              >
                {selectedUnit === unit && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-100/50 to-transparent animate-pulse" />
                )}
                {unit}
              </button>
            ))}
          </div>
          {/* Status indicator */}
          <div className="mt-3 flex items-center justify-between gap-2 text-[7px] text-slate-600">
            <div className="flex items-center gap-1">
              <div className={`w-1.5 h-1.5 rounded-full ${selectedUnit ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              <span>{selectedUnit ? `${selectedUnit} selected` : 'Regional view'}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-slate-500">Click to view</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Map Legend ────────────────────────────────────────────── */}
      <MapLegend 
        hasScenario={!!onScenarioRunResult?.scenario_geojson} 
        isPrey={showPreyDensity} 
        filteredBins={filteredBins}
        onToggleBin={(bin) => {
          setFilteredBins(current => 
            current.includes(bin) ? current.filter(b => b !== bin) : [...current, bin]
          );
        }}
      />

      <style dangerouslySetInnerHTML={{
        __html: `
          .maplibregl-ctrl-attrib { display: none !important; }
          .maplibregl-canvas { outline: none !important; }
        `,
      }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// MapLegend — collapsible legend overlay with drag support
// ---------------------------------------------------------------------------

const DENSITY_RAMP = [
  { color: '#fef3c7', label: 'Very low  (0–5)' },
  { color: '#fbbf24', label: 'Low       (5–15)' },
  { color: '#f59e0b', label: 'Moderate  (15–30)' },
  { color: '#d97706', label: 'High      (30+)' },
];

const PREY_RAMP = [
  { color: '#f0fdf4', label: 'Sparse (0–5)' },
  { color: '#bbf7d0', label: 'Common (5–15)' },
  { color: '#4ade80', label: 'Dense  (15–30)' },
  { color: '#16a34a', label: 'High   (30+)' },
];

function MapLegend({ 
  hasScenario, 
  isPrey, 
  filteredBins, 
  onToggleBin 
}: { 
  hasScenario: boolean; 
  isPrey: boolean;
  filteredBins: string[];
  onToggleBin: (bin: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [overlapping, setOverlapping] = useState<string[]>([]);
  const RAMP = isPrey ? PREY_RAMP.map(r => ({ ...r, label: r.label.replace('Sparse', 'Very low').replace('Common', 'Low').replace('Dense', 'Moderate') })) : DENSITY_RAMP;
  const normalizedLabels = ['Very low  (0–5)', 'Low       (5–15)', 'Moderate  (15–30)', 'High      (30+)'];

  return (
    <DraggablePanel 
      id="map-legend" 
      defaultPosition={{ x: 32, y: 200 }}
      defaultSize={{ width: 240, height: 320 }}
      onCollision={(overlappingIds) => setOverlapping(overlappingIds)}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'rgba(255, 255, 255, 0.96)',
          backdropFilter: 'blur(16px)',
          border: '0.5px solid rgba(0, 0, 0, 0.1)',
          borderRadius: '8px 8px 0 0',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          fontFamily: 'inherit',
        }}
      >
        {/* Header */}
        <button
          onClick={() => setCollapsed(c => !c)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            padding: '10px 14px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: '#1a1c1e',
          }}
          className="no-drag"
        >
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Spatial Legend
          </span>
          <span style={{ fontSize: 10, opacity: 0.4 }}>{collapsed ? '▲' : '▼'}</span>
        </button>

        {!collapsed && (
          <div style={{ padding: '0 14px 14px' }}>
            {/* Lion/Prey Density Ramp */}
            <p style={{ fontSize: 8, color: '#64748b', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>
              {isPrey ? 'Prey base (GBIF)' : 'Lion Density (lions/km²)'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
              {RAMP.map(({ color, label }, idx) => {
                const filterLabel = normalizedLabels[idx];
                const isSelected = filteredBins.includes(filterLabel);
                return (
                  <div 
                    key={color} 
                    onClick={() => onToggleBin(filterLabel)}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 10, 
                      cursor: 'pointer',
                      opacity: filteredBins.length === 0 || isSelected ? 1 : 0.3,
                      transition: 'opacity 0.2s'
                    }}
                    className="no-drag"
                  >
                    <div style={{ width: 12, height: 12, borderRadius: 3, background: color, border: isSelected ? '1px solid #000' : '1px solid rgba(0,0,0,0.05)', flexShrink: 0 }} />
                    <span style={{ fontSize: 10, color: '#475569', fontWeight: isSelected ? 700 : 500 }}>{label}</span>
                  </div>
                );
              })}
            </div>

            {/* Protected Areas */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: '#059669', opacity: 0.6, border: '1px solid rgba(0,0,0,0.05)', flexShrink: 0 }} />
              <span style={{ fontSize: 10, color: '#475569', fontWeight: 500 }}>Protected zones</span>
            </div>

            {/* Scenario layer — only shown after a run */}
            {hasScenario && (
              <>
                <div style={{ height: 1, background: 'rgba(0,0,0,0.05)', margin: '10px 0' }} />
                <p style={{ fontSize: 8, color: '#b45309', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>
                  Scenario Projection
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: '#f59e0b', border: '2px solid #fff', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', flexShrink: 0 }} />
                  <span style={{ fontSize: 10, color: '#475569', fontWeight: 500 }}>Predicted future</span>
                </div>
              </>
            )}

            {/* Overlap warning */}
            {overlapping.length > 0 && (
              <div style={{ 
                marginTop: 12, 
                padding: 8, 
                background: 'rgba(251, 191, 36, 0.1)', 
                borderRadius: 4,
                border: '1px solid rgba(251, 191, 36, 0.2)'
              }}>
                <p style={{ fontSize: 7, color: '#d97706', margin: 0, textAlign: 'center' }}>
                  {overlapping.length} panel{overlapping.length === 1 ? '' : 's'} overlapping — drag to reposition
                </p>
              </div>
            )}

            {/* Attribution */}
            <div style={{ marginTop: 12, borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: 10 }}>
              <span style={{ fontSize: 8, color: '#94a3b8', letterSpacing: '0.02em', fontStyle: 'italic' }}>
                SekaNet v2.1 (XGBoost)
              </span>
            </div>
          </div>
        )}
      </div>
    </DraggablePanel>
  );
}

// ---------------------------------------------------------------------------
// Utility — filter a GeoJSON FeatureCollection by year property
// ---------------------------------------------------------------------------

function filterByYear(geojson: any, year: number): any {
  if (!geojson?.features) return geojson;

  // If none of the features carry a `year` property, return as-is
  const hasYearProp = geojson.features.some(
    (f: any) => f.properties?.year != null,
  );
  if (!hasYearProp) return geojson;

  // Keep features whose year matches, or features with no year (always shown)
  const filtered = geojson.features.filter(
    (f: any) => f.properties?.year == null || f.properties.year === year,
  );

  return { ...geojson, features: filtered };
}

// ---------------------------------------------------------------------------
// LegendItem (used by dashboard overlay)
// ---------------------------------------------------------------------------

export function LegendItem({
  color,
  label,
  opacity = 1,
  bordered = false,
}: {
  color: string;
  label: string;
  opacity?: number;
  bordered?: boolean;
}) {
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
