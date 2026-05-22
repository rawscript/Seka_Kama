'use client';

import { useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import dynamic from 'next/dynamic';
import { MapProvider, useMap } from 'react-map-gl/maplibre';

const SekaMap = dynamic(() => import('@/components/SekaMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-900/10 animate-pulse">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-[#775a19]/20 border-t-[#775a19] animate-spin" />
        <p className="text-slate-500 font-medium text-xs uppercase tracking-widest">Initialising Spatial Engine...</p>
      </div>
    </div>
  )
});

const ScenarioResultPanel = dynamic(() => import('@/components/ScenarioResultPanel'), { ssr: false });

export default function DashboardPage() {
  return (
    <MapProvider>
      <DashboardContent />
    </MapProvider>
  );
}

function DashboardContent() {
  const { 'main-map': mapMain } = useMap();
  const [scenarioResult, setScenarioResult] = useState<any>(null);
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [isZoneMenuOpen, setIsZoneMenuOpen] = useState(false);
  const [currentCoords, setCurrentCoords] = useState({ lat: -1.25, lng: 35.1 });
  const [activeLayer, setActiveLayer] = useState('SATELLITE (TRUE COLOR)');
  const [timeValue, setTimeValue] = useState(66); // Default slider %

  const units = ['Mara North', 'Olare-Motorogi', 'Naboisho', 'Ol Kinyei'];

  const handleZoomIn = () => {
    mapMain?.zoomIn();
  };

  const handleZoomOut = () => {
    mapMain?.zoomOut();
  };

  const handleViewStateChange = (viewState: any) => {
    setCurrentCoords({
      lat: viewState.latitude,
      lng: viewState.longitude
    });
  };

  return (
    <ProtectedRoute>
      <style dangerouslySetInnerHTML={{
        __html: `
        .map-overlay-card {
            background: rgba(255, 255, 255, 0.85);
            backdrop-filter: blur(16px);
            border: 0.5px solid var(--outline-variant);
        }

        .premium-gradient-bar {
            background: linear-gradient(to right, #775a19 0%, #ffdea5 50%, #ba1a1a 100%);
        }

        .time-slider-track {
            background: linear-gradient(to right, #e2dfde 0%, #775a19 100%);
        }

        .toggle-switch-ball {
            transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}} />

      <div className="relative w-full h-full bg-[#dadada]">
        <SekaMap
          selectedUnit={selectedUnit}
          onUnitChange={setSelectedUnit}
          onViewStateChange={handleViewStateChange}
          onScenarioRun={(result) => setScenarioResult(result)}
          activeLayer={activeLayer}
        />

        {/* Top Left Status */}
        <div className="absolute top-8 left-8 flex items-center gap-3 px-4 py-2 bg-[#1a1c1c]/80 backdrop-blur-md rounded-full z-10">
          <div className="w-2 h-2 rounded-full bg-[#1db954]"></div>
          <span className="text-[10px] font-bold text-white uppercase tracking-widest">DIGITAL TWIN ACTIVE</span>
          <span className="text-[10px] font-bold text-[#1db954] ml-2 opacity-80 uppercase tracking-widest">FPS: 60.0</span>
        </div>

        {/* Existing Scenario Result Panel (if active) */}
        {scenarioResult && (
          <div className="absolute top-24 left-8 z-[100]">
            <ScenarioResultPanel
              result={scenarioResult}
              onClose={() => setScenarioResult(null)}
            />
          </div>
        )}

        {/* Right Side Panels (Scrollable Container) */}
        <div className="absolute top-8 right-8 flex flex-col gap-6 w-[380px] max-h-[calc(100vh-180px)] overflow-y-auto pr-2 pb-8 z-20 custom-scrollbar">

          {/* Zone Selection Panel - FUNCTIONAL */}
          <div className="map-overlay-card p-6 shadow-sm rounded-sm">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2 text-primary font-bold">
                <span className="material-symbols-outlined text-[20px]">location_on</span>
                <h4 className="text-[12px] uppercase tracking-[0.15em] text-on-surface">ZONE SELECTION</h4>
              </div>
              <span className="material-symbols-outlined text-secondary text-[18px] cursor-pointer hover:text-primary transition-colors">open_in_full</span>
            </div>
            <div className="relative">
              <button
                onClick={() => setIsZoneMenuOpen(!isZoneMenuOpen)}
                className="w-full text-left flex justify-between items-center border-b border-outline-variant pb-2 text-[24px] headline-font font-medium text-on-surface hover:text-primary transition-colors"
              >
                {selectedUnit || 'Regional Overview'}
                <span className={`material-symbols-outlined text-outline transition-transform ${isZoneMenuOpen ? 'rotate-180' : ''}`}>keyboard_arrow_down</span>
              </button>

              {isZoneMenuOpen && (
                <div className="absolute top-full left-0 w-full mt-2 bg-white/95 backdrop-blur-md border border-outline-variant shadow-xl z-50 py-2 rounded-sm animate-in fade-in slide-in-from-top-2">
                  <button
                    onClick={() => { setSelectedUnit(''); setIsZoneMenuOpen(false); }}
                    className="w-full text-left px-4 py-2 text-sm text-secondary hover:bg-surface-container-low hover:text-primary transition-colors font-medium border-b border-outline-variant/30"
                  >
                    Regional Overview
                  </button>
                  {units.map(u => (
                    <button
                      key={u}
                      onClick={() => { setSelectedUnit(u); setIsZoneMenuOpen(false); }}
                      className="w-full text-left px-4 py-2 text-sm text-secondary hover:bg-surface-container-low hover:text-primary transition-colors font-medium last:border-0"
                    >
                      {u}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Scenario Simulation Panel */}
          {/*
          <div className="map-overlay-card p-6 shadow-sm rounded-sm">
            <div className="flex items-center gap-2 mb-6 text-primary font-bold">
              <span className="material-symbols-outlined text-[20px]">model_training</span>
              <h4 className="text-[12px] uppercase tracking-[0.15em] text-on-surface">SIMULATION CONTROL</h4>
            </div>
            <div className="space-y-6">
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-outline tracking-wider uppercase">SIMULATE INFRASTRUCTURE</p>
                <label className="flex items-center justify-between group cursor-pointer">
                  <span className="text-[16px] text-secondary group-hover:text-on-surface transition-colors">Proposed Road Networks</span>
                  <div className="w-8 h-4 bg-outline-variant rounded-full relative flex items-center transition-all">
                    <div className="absolute left-0.5 w-3 h-3 bg-white rounded-full toggle-switch-ball"></div>
                  </div>
                </label>
                <label className="flex items-center justify-between group cursor-pointer">
                  <span className="text-[16px] text-secondary group-hover:text-on-surface transition-colors">Anti-Poaching Outposts</span>
                  <div className="w-8 h-4 bg-primary rounded-full relative flex items-center transition-all">
                    <div className="absolute right-0.5 w-3 h-3 bg-white rounded-full toggle-switch-ball"></div>
                  </div>
                </label>
              </div>
              <button className="w-full bg-[#1a1c1c] text-white py-3 font-bold text-[11px] tracking-[0.2em] hover:bg-primary transition-colors flex items-center justify-center gap-2 uppercase opacity-50 cursor-not-allowed">
                <span className="material-symbols-outlined text-[18px]">play_arrow</span> Use Map Proposer
              </button>
              <p className="text-[10px] text-center text-outline uppercase font-bold tracking-tighter">Use the central Propose Scenario button on map</p>
            </div>
          </div>
 */}
          {/* Ecosystem Indicators Panel */}
          <div className="map-overlay-card p-6 shadow-sm rounded-sm">
            <div className="flex items-center gap-2 mb-8 text-primary font-bold">
              <span className="material-symbols-outlined text-[20px]">eco</span>
              <h4 className="text-[12px] uppercase tracking-[0.15em] text-on-surface">ECOSYSTEM INDICATORS</h4>
            </div>
            <div className="space-y-10">
              <div>
                <div className="flex justify-between items-end mb-3">
                  <span className="text-[11px] font-bold text-secondary tracking-wider">LION DENSITY GRID (XGB)</span>
                </div>
                <div className="h-1.5 w-full premium-gradient-bar rounded-full"></div>
                <div className="flex justify-between mt-2">
                  <span className="text-[9px] font-bold text-outline uppercase tracking-widest">Baseline</span>
                  <span className="text-[9px] font-bold text-outline uppercase tracking-widest">High</span>
                </div>
              </div>
              <div className="space-y-4">
                <label className="flex items-center justify-between group cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-[#1db954] border border-white/50"></div>
                    <span className="text-[16px] text-secondary group-hover:text-on-surface transition-colors">Protected Wildlife Zones</span>
                  </div>
                  <div className="w-8 h-4 bg-primary rounded-full relative flex items-center transition-all">
                    <div className="absolute right-0.5 w-3 h-3 bg-white rounded-full toggle-switch-ball"></div>
                  </div>
                </label>
                <label className="flex items-center justify-between group cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-[#e9c176] border border-white/50"></div>
                    <span className="text-[16px] text-secondary group-hover:text-on-surface transition-colors">Land-X Admin Boundary</span>
                  </div>
                  <div className="w-8 h-4 bg-outline-variant rounded-full relative flex items-center transition-all">
                    <div className="absolute left-0.5 w-3 h-3 bg-white rounded-full toggle-switch-ball"></div>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Temporal Controls (Time Slider) */}
        <div className="absolute bottom-8 right-[420px] w-[500px] z-30">
          <div className="map-overlay-card p-4 shadow-lg rounded-sm">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2 text-primary font-bold">
                <span className="material-symbols-outlined text-[18px]">schedule</span>
                <span className="text-[10px] uppercase tracking-[0.15em] text-on-surface">TEMPORAL ANALYSIS</span>
              </div>
              <div className="flex items-center gap-3">
                <button className="text-secondary hover:text-primary transition-colors"><span className="material-symbols-outlined text-[18px]">fast_rewind</span></button>
                <button className="text-primary hover:opacity-80 transition-opacity"><span className="material-symbols-outlined text-[24px]">play_circle</span></button>
                <button className="text-secondary hover:text-primary transition-colors"><span className="material-symbols-outlined text-[18px]">fast_forward</span></button>
              </div>
            </div>
            <div className="relative pt-1">
              <div className="h-1 w-full bg-surface-container rounded-full overflow-hidden relative">
                <div className="absolute left-0 top-0 h-full time-slider-track" style={{ width: `${timeValue}%` }}></div>
              </div>
              <input
                type="range"
                min="0" max="100"
                value={timeValue}
                onChange={(e) => setTimeValue(parseInt(e.target.value))}
                className="absolute top-[-5px] left-0 w-full opacity-0 cursor-pointer h-4 z-40"
              />
              <div
                className="absolute top-[-5px] w-3.5 h-3.5 bg-primary border-2 border-white rounded-full shadow-md pointer-events-none transition-all"
                style={{ left: `calc(${timeValue}% - 7px)` }}
              ></div>
              <div className="flex justify-between mt-2 px-1">
                <div className="text-center">
                  <p className="text-[8px] font-bold text-outline uppercase tracking-widest leading-none">JAN 20</p>
                </div>
                <div className="text-center bg-[#c5a059]/10 px-1 py-0.5 rounded-sm">
                  <p className="text-[9px] text-primary font-bold uppercase tracking-widest leading-none">MAR 24</p>
                </div>
                <div className="text-center">
                  <p className="text-[8px] font-bold text-outline uppercase tracking-widest leading-none">DEC 26</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Map Legend / Controls Bottom Left */}
        <div className="absolute bottom-8 left-8 flex flex-col gap-4 z-20">
          <div className="map-overlay-card p-2 flex flex-col gap-2 rounded-lg">
            <button
              onClick={handleZoomIn}
              className="w-8 h-8 flex items-center justify-center text-on-surface hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
            </button>
            <div className="w-full h-[1px] bg-outline-variant"></div>
            <button
              onClick={handleZoomOut}
              className="w-8 h-8 flex items-center justify-center text-on-surface hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">remove</span>
            </button>
          </div>
          <div
            onClick={() => setActiveLayer(activeLayer === 'SATELLITE (TRUE COLOR)' ? 'VECTOR (TOPOGRAPHIC)' : 'SATELLITE (TRUE COLOR)')}
            className="map-overlay-card px-4 py-2 flex items-center gap-4 rounded-lg cursor-pointer hover:border-primary transition-colors"
          >
            <span className="material-symbols-outlined text-secondary text-[20px]">layers</span>
            <div className="h-4 w-[1px] bg-outline-variant"></div>
            <span className="text-[11px] font-bold text-on-surface uppercase tracking-widest">{activeLayer}</span>
          </div>
        </div>

        {/* Coordinate Display Bottom Right */}
        <div className="absolute bottom-8 right-8 z-20">
          <div className="map-overlay-card px-4 py-2 flex gap-8 rounded-lg shadow-sm">
            <div className="flex flex-col min-w-[80px]">
              <span className="text-[9px] font-bold text-outline uppercase tracking-widest leading-normal">Latitude</span>
              <span className="text-[12px] font-bold text-on-surface tracking-tight">
                {Math.abs(currentCoords.lat).toFixed(4)}° {currentCoords.lat >= 0 ? 'N' : 'S'}
              </span>
            </div>
            <div className="flex flex-col min-w-[80px]">
              <span className="text-[9px] font-bold text-outline uppercase tracking-widest leading-normal">Longitude</span>
              <span className="text-[12px] font-bold text-on-surface tracking-tight">
                {Math.abs(currentCoords.lng).toFixed(4)}° {currentCoords.lng >= 0 ? 'E' : 'W'}
              </span>
            </div>
          </div>
        </div>

      </div>
    </ProtectedRoute>
  );
}