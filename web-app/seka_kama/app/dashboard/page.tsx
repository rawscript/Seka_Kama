'use client';

import { useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import dynamic from 'next/dynamic';

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
  const [scenarioResult, setScenarioResult] = useState<any>(null);

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
        <SekaMap onScenarioRun={(result) => setScenarioResult(result)} />
        
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
          
          {/* Zone Selection Panel */}
          <div className="map-overlay-card p-6 shadow-sm rounded-sm">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2 text-primary font-bold">
                <span className="material-symbols-outlined text-[20px]">location_on</span>
                <h4 className="text-[12px] uppercase tracking-[0.15em] text-on-surface">ZONE SELECTION</h4>
              </div>
              <span className="material-symbols-outlined text-secondary text-[18px] cursor-pointer hover:text-primary transition-colors">open_in_full</span>
            </div>
            <div>
              <button className="w-full text-left flex justify-between items-center border-b border-outline-variant pb-2 text-[24px] headline-font font-medium text-on-surface hover:text-primary transition-colors">
                Regional Overview
                <span className="material-symbols-outlined text-outline">keyboard_arrow_down</span>
              </button>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="px-2 py-1 bg-surface-container text-on-surface-variant text-[10px] font-bold rounded-sm border border-outline-variant uppercase">NORTH SECTOR</span>
                <span className="px-2 py-1 bg-surface-container text-on-surface-variant text-[10px] font-bold rounded-sm border border-outline-variant uppercase">MARA RIVER DELTA</span>
              </div>
            </div>
          </div>

          {/* AI Insights Panel */}
          <div className="map-overlay-card p-6 shadow-sm border-l-4 border-l-primary rounded-sm">
            <div className="flex items-center gap-2 mb-4 text-primary font-bold">
              <span className="material-symbols-outlined text-[20px]">psychology</span>
              <h4 className="text-[12px] uppercase tracking-[0.15em] text-on-surface">AI INSIGHTS</h4>
            </div>
            <div className="bg-[#775a19]/5 p-4 rounded-sm italic text-[16px] text-on-surface-variant leading-relaxed">
              "Increasing moisture levels in the Mara River Delta are correlating with a 5% rise in ungulate movement. Lion pride 'Kekope' observed moving toward the Western corridor..."
            </div>
            <button className="mt-4 text-primary text-[10px] font-bold flex items-center gap-1 hover:underline tracking-widest uppercase">
              EXPAND FULL NARRATIVE <span className="material-symbols-outlined text-xs">arrow_forward</span>
            </button>
          </div>

          {/* Scenario Simulation Panel */}
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
              <button className="w-full bg-[#1a1c1c] text-white py-3 font-bold text-[11px] tracking-[0.2em] hover:bg-primary transition-colors flex items-center justify-center gap-2 uppercase">
                <span className="material-symbols-outlined text-[18px]">play_arrow</span> RUN SIMULATION
              </button>
            </div>
          </div>

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
            <div className="mt-8 pt-6 border-t border-outline-variant">
              <div className="flex justify-between items-center text-secondary">
                <span className="text-[10px] font-bold tracking-widest">LAST DATA REFRESH</span>
                <span className="text-[10px] font-bold tracking-widest">12S AGO</span>
              </div>
            </div>
          </div>
        </div>

        {/* Temporal Controls (Time Slider) */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[640px] z-30">
          <div className="map-overlay-card p-6 shadow-lg rounded-sm">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2 text-primary font-bold">
                <span className="material-symbols-outlined">schedule</span>
                <span className="text-[12px] uppercase tracking-[0.15em] text-on-surface">TEMPORAL ANALYSIS</span>
              </div>
              <div className="flex items-center gap-4">
                <button className="text-secondary hover:text-primary transition-colors"><span className="material-symbols-outlined text-[20px]">fast_rewind</span></button>
                <button className="text-primary hover:opacity-80 transition-opacity"><span className="material-symbols-outlined text-[32px]">play_circle</span></button>
                <button className="text-secondary hover:text-primary transition-colors"><span className="material-symbols-outlined text-[20px]">fast_forward</span></button>
              </div>
            </div>
            <div className="relative pt-2">
              <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden relative">
                <div className="absolute left-0 top-0 h-full w-2/3 time-slider-track"></div>
              </div>
              <div className="absolute top-[-4px] left-[66%] w-4 h-4 bg-primary border-2 border-white rounded-full shadow-md cursor-pointer hover:scale-110 transition-transform"></div>
              <div className="flex justify-between mt-4 px-1">
                <div className="text-center">
                  <p className="text-[9px] font-bold text-outline uppercase tracking-widest">JAN 2020</p>
                </div>
                <div className="text-center bg-[#c5a059]/20 px-2 py-0.5 rounded-sm">
                  <p className="text-[11px] text-primary font-bold uppercase tracking-widest">MAR 2024</p>
                </div>
                <div className="text-center">
                  <p className="text-[9px] font-bold text-outline uppercase tracking-widest">DEC 2026</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Map Legend / Controls Bottom Left */}
        <div className="absolute bottom-8 left-8 flex flex-col gap-4 z-20">
          <div className="map-overlay-card p-2 flex flex-col gap-2 rounded-lg">
            <button className="w-8 h-8 flex items-center justify-center text-on-surface hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-[20px]">add</span>
            </button>
            <div className="w-full h-[1px] bg-outline-variant"></div>
            <button className="w-8 h-8 flex items-center justify-center text-on-surface hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-[20px]">remove</span>
            </button>
          </div>
          <div className="map-overlay-card px-4 py-2 flex items-center gap-4 rounded-lg">
            <span className="material-symbols-outlined text-secondary text-[20px]">layers</span>
            <div className="h-4 w-[1px] bg-outline-variant"></div>
            <span className="text-[11px] font-bold text-on-surface uppercase tracking-widest">SATELLITE (TRUE COLOR)</span>
          </div>
        </div>

        {/* Coordinate Display Bottom Right */}
        <div className="absolute bottom-8 right-8 z-20">
          <div className="map-overlay-card px-4 py-2 flex gap-8 rounded-lg shadow-sm">
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-outline uppercase tracking-widest leading-normal">Latitude</span>
              <span className="text-[12px] font-bold text-on-surface tracking-tight">1.3521° S</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-outline uppercase tracking-widest leading-normal">Longitude</span>
              <span className="text-[12px] font-bold text-on-surface tracking-tight">34.9382° E</span>
            </div>
          </div>
        </div>

      </div>
    </ProtectedRoute>
  );
}