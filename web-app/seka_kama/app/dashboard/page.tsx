'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {  Download,
  GitCompare,
  ChevronRight,
  BarChart3,
  ArrowRight,
  Search,
  Crosshair,
  HelpCircle,
  Lightbulb,
  History,
} from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import ErrorBoundary from '@/components/ErrorBoundary';
import dynamic from 'next/dynamic';
import { MapProvider, useMap } from 'react-map-gl/maplibre';
import { api, type LandscapeStats, type HistoricalTrend } from '@/services/api';

// ── Dynamic imports (browser-only) ───────────────────────────────────────────
import DraggablePanel from '@/components/DraggablePanel';

const SekaMap = dynamic(() => import('@/components/SekaMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-900/10 animate-pulse">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-[#775a19]/20 border-t-[#775a19] animate-spin" />
        <p className="text-slate-500 font-medium text-xs uppercase tracking-widest">
          Initialising Spatial Engine…
        </p>
      </div>
    </div>
  ),
});

const ScenarioResultPanel = dynamic(() => import('@/components/ScenarioResultPanel'), { ssr: false });
const ScenarioHistoryPanel = dynamic(() => import('@/components/ScenarioHistoryPanel'), { ssr: false });
const TrendChart = dynamic(() => import('@/components/TrendChart'), { ssr: false });
const NotificationPanel = dynamic(() => import('@/components/NotificationPanel'), { ssr: false });
const AnalystPanel = dynamic(() => import('@/components/AnalystPanel'), { ssr: false });
const EcosystemIndicatorsPanel = dynamic(() => import('@/components/EcosystemIndicatorsPanel'), { ssr: false });
const StaticPanelLayout = dynamic(() => import('@/components/StaticPanelLayout'), { ssr: false });

// ── Constants ─────────────────────────────────────────────────────────────────
const MIN_YEAR = 2020;
const MAX_YEAR = 2026;

function sliderToYear(v: number) {
  return Math.round(MIN_YEAR + (v / 100) * (MAX_YEAR - MIN_YEAR));
}

// ── Sub-components ────────────────────────────────────────────────────────────

function LayerToggle({
  enabled, onToggle, color, label,
}: { enabled: boolean; onToggle: () => void; color: string; label: string }) {
  return (
    <label className="flex items-center justify-between group cursor-pointer" onClick={onToggle}>
      <div className="flex items-center gap-3">
        <div
          className="w-3 h-3 rounded-full border border-white/50 transition-opacity"
          style={{ backgroundColor: color, opacity: enabled ? 1 : 0.35 }}
        />
        <span className={`text-[16px] transition-colors ${enabled ? 'text-on-surface' : 'text-outline'} group-hover:text-on-surface`}>
          {label}
        </span>
      </div>
      <div className={`w-8 h-4 rounded-full relative flex items-center transition-colors duration-200 ${enabled ? 'bg-primary' : 'bg-outline-variant'}`}>
        <div className={`absolute w-3 h-3 bg-white rounded-full shadow transition-transform duration-200 ${enabled ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
      </div>
    </label>
  );
}

/** Single stat card used in the landscape summary strip */
function StatCard({
  label, value, sub, accent = false,
}: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="map-overlay-card px-4 py-3 rounded-sm flex flex-col gap-0.5 min-w-[110px]">
      <span className="text-[9px] font-bold text-outline uppercase tracking-widest leading-none">{label}</span>
      <span className={`text-[18px] font-bold tracking-tight leading-tight ${accent ? 'text-primary' : 'text-on-surface'}`}>
        {value}
      </span>
      {sub && <span className="text-[9px] text-outline leading-none">{sub}</span>}
    </div>
  );
}

// ── Page root ─────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  return (
    <MapProvider>
      <DashboardContent />
    </MapProvider>
  );
}

// ── Main dashboard ────────────────────────────────────────────────────────────
function DashboardContent() {
  const { 'main-map': mapMain } = useMap();

  // Map / UI state
  const [scenarioResult, setScenarioResult] = useState<any>(null);
  const [isScenarioHistoryOpen, setIsScenarioHistoryOpen] = useState(false);
  const [selectedUnit, setSelectedUnit]     = useState('');
  const [isZoneMenuOpen, setIsZoneMenuOpen] = useState(false);
  const [currentCoords, setCurrentCoords]   = useState({ lat: -1.25, lng: 35.1 });
  const [activeLayer, setActiveLayer]       = useState('SATELLITE (TRUE COLOR)');
  const [showProtectedAreas, setShowProtectedAreas] = useState(true);
  const [showLandXBoundary, setShowLandXBoundary]   = useState(false);
  const [showTrends, setShowTrends]         = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [showPreyDensity, setShowPreyDensity]       = useState(false);
  const [showCorridors, setShowCorridors]           = useState(false);
  const [showPrediction, setShowPrediction]         = useState(false);
  const [showEncroachment, setShowEncroachment]     = useState(false);
  const [searchQuery, setSearchQuery]               = useState('');
  const [isSidebarOpen, setIsSidebarOpen]           = useState(true);
  const [isMobile, setIsMobile]                     = useState(false);
  const [isWalkthroughOpen, setIsWalkthroughOpen]   = useState(false);
  const [isLiveMode, setIsLiveMode]                 = useState(false);

  // Temporal slider
  const [timeValue, setTimeValue] = useState(66);
  const [isPlaying, setIsPlaying] = useState(false);
  const playRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const selectedYear = sliderToYear(timeValue);

  // Landscape stats (Gap 1)
  const [stats, setStats]           = useState<LandscapeStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Historical trends (Gap 2)
  const [trends, setTrends]         = useState<HistoricalTrend[]>([]);
  const [trendsLoading, setTrendsLoading] = useState(false);

  const [availableUnits, setAvailableUnits] = useState<string[]>([]);

  // ── Fetch available units once on mount ──────────────────────────────────
  useEffect(() => {
    api.getManagementUnits()
      .then(setAvailableUnits)
      .catch(() => { /* non-fatal */ });
  }, []);

  // ── Fetch landscape stats on mount / unit change / year change ──────────
  useEffect(() => {
    let cancelled = false;
    setStatsLoading(true);
    api.getStatistics(selectedUnit || undefined, selectedYear)
      .then((s) => { 
        if (!cancelled) setStats(s);
      })
      .catch(() => { /* non-fatal — stats strip stays hidden */ })
      .finally(() => { if (!cancelled) setStatsLoading(false); });
    return () => { cancelled = true; };
  }, [selectedUnit, selectedYear]);

  // ── Fetch historical trends when panel is opened ──────────────────────────
  useEffect(() => {
    if (!showTrends) return;
    let cancelled = false;
    setTrendsLoading(true);
    api.getHistoricalTrends(selectedUnit || 'Regional Total')
      .then((r) => { if (!cancelled) setTrends(r.trends ?? []); })
      .catch(() => { if (!cancelled) setTrends([]); })
      .finally(() => { if (!cancelled) setTrendsLoading(false); });
    return () => { cancelled = true; };
  }, [showTrends, selectedUnit, selectedYear]);

  // -- Responsive check --
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) setIsSidebarOpen(false);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ── Playback ──────────────────────────────────────────────────────────────
  const stopPlayback = useCallback(() => {
    if (playRef.current) { clearInterval(playRef.current); playRef.current = null; }
    setIsPlaying(false);
  }, []);

  const startPlayback = useCallback(() => {
    setIsPlaying(true);
    playRef.current = setInterval(() => {
      setTimeValue((prev) => {
        if (prev >= 100) { stopPlayback(); return 100; }
        return prev + 3;
      });
    }, 200);
  }, [stopPlayback]);

  const togglePlayback = useCallback(() => {
    isPlaying ? stopPlayback() : startPlayback();
  }, [isPlaying, startPlayback, stopPlayback]);

  useEffect(() => () => stopPlayback(), [stopPlayback]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const handleZoomIn  = () => mapMain?.zoomIn();
  const handleZoomOut = () => mapMain?.zoomOut();
  const handleViewStateChange = (vs: any) =>
    setCurrentCoords({ lat: vs.latitude, lng: vs.longitude });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;

    // Coordinate search (e.g. "-1.2, 35.1")
    const coordMatch = searchQuery.match(/(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lng = parseFloat(coordMatch[2]);
      mapMain?.flyTo({ center: [lng, lat], zoom: 12, duration: 3000 });
      return;
    }

    // Landmark search (Mocked for Mara locations)
    const landmarks: Record<string, [number, number]> = {
      'narok': [35.86, -1.08],
      'musiara': [35.03, -1.29],
      'keekorok': [35.25, -1.58],
      'talek': [35.21, -1.44],
      'sekernani': [35.34, -1.52],
    };

    const target = searchQuery.toLowerCase().trim();
    if (landmarks[target]) {
      mapMain?.flyTo({ center: landmarks[target], zoom: 12, duration: 3000 });
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <ProtectedRoute>
      <style dangerouslySetInnerHTML={{ __html: `
        .map-overlay-card {
          background: rgba(255,255,255,0.92);
          backdrop-filter: blur(16px);
          border: 0.5px solid #d1c5b4;
        }
        .premium-gradient-bar {
          background: linear-gradient(to right, #775a19 0%, #ffdea5 50%, #ba1a1a 100%);
        }
        .time-slider-track {
          background: linear-gradient(to right, #e2dfde 0%, #775a19 100%);
        }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #d1c5b4; border-radius: 4px; }
      `}} />

      {/* Floating layer for draggable panels to escape flex wrappers */}
      <div id="floating-layer" className="fixed inset-0 pointer-events-none z-[9999]" />

      <div className="relative w-full h-full bg-[#dadada]">

        {/* ── Map ── */}
        <ErrorBoundary label="Spatial Map" onRetry={() => window.location.reload()}>
          <SekaMap
            selectedUnit={selectedUnit}
            onUnitChange={setSelectedUnit}
            onViewStateChange={handleViewStateChange}
            onScenarioRun={setScenarioResult}
            activeLayer={activeLayer}
            timeValue={timeValue}
            showProtectedAreas={showProtectedAreas}
            showLandXBoundary={showLandXBoundary}
            showPreyDensity={showPreyDensity}
            showCorridors={showCorridors}
            showPrediction={showPrediction}
            showEncroachment={showEncroachment}
            isLiveMode={isLiveMode}
          />
        </ErrorBoundary>

        {/* ── Status pill ── */}
        <div className="absolute top-8 left-8 flex items-center gap-3 z-10">
          <div className="flex items-center gap-3 px-4 py-2 bg-[#1a1c1c]/80 backdrop-blur-md rounded-full pointer-events-none">
            <div className="w-2 h-2 rounded-full bg-[#1db954]" />
            <span className="text-[10px] font-bold text-white uppercase tracking-widest">DIGITAL TWIN ACTIVE</span>
            <span className="text-[10px] font-bold text-[#1db954] ml-2 opacity-80 uppercase tracking-widest">{selectedYear}</span>
          </div>

          {!isMobile && (
            <button 
              onClick={() => setIsWalkthroughOpen(true)}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/5 backdrop-blur-md rounded-full text-white text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2"
            >
               <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
               How to use
            </button>
          )}
          
          <div className="relative">
            <button 
              onClick={() => setIsScenarioHistoryOpen(!isScenarioHistoryOpen)}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${isScenarioHistoryOpen ? 'bg-purple-600 text-white' : 'bg-white/80 text-secondary hover:bg-white backdrop-blur-md border border-outline-variant'}`}
              title="Scenario History"
            >
              <span className="material-symbols-outlined text-[18px]">history</span>
            </button>
          </div>

          <div className="relative">
            <button 
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${isNotificationsOpen ? 'bg-primary text-white' : 'bg-white/80 text-secondary hover:bg-white backdrop-blur-md border border-outline-variant'}`}
            >
              <span className="material-symbols-outlined text-[18px]">notifications</span>
              <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
            </button>
            <NotificationPanel isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
          </div>

          <button 
            onClick={() => setIsLiveMode(!isLiveMode)}
            className={`px-4 py-2 rounded-full border backdrop-blur-md text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${isLiveMode ? 'bg-emerald-500 text-white border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'bg-white/10 text-white/60 border-white/10 hover:bg-white/20'}`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${isLiveMode ? 'bg-white animate-pulse' : 'bg-white/20'}`} />
            {isLiveMode ? 'Live Twin Active' : 'Enable Live Twin'}
          </button>
        </div>

        {/* ── Landscape stats strip (Gap 1) ── */}
        {!statsLoading && stats && !isMobile && (
          <div className="absolute top-8 left-1/2 -translate-x-1/2 z-10 flex gap-2 pointer-events-none">
            <StatCard
              label="Total Lions"
              value={stats.total_lions.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              sub="baseline estimate"
              accent
            />
            <StatCard
              label="Study Area"
              value={`${stats.total_area_km2.toLocaleString()} km²`}
              sub={`${stats.management_unit_count} units`}
            />
            <StatCard
              label="Protected Cover"
              value={`${stats.protected_area_coverage_km2.toLocaleString(undefined, { maximumFractionDigits: 0 })} km²`}
              sub="WDPA / OECM"
            />
            <StatCard
              label="High-Risk Cells"
              value={stats.high_risk_cell_count.toLocaleString()}
              sub="density < 5 & trend ↑"
            />
            <StatCard
              label="Avg Density"
              value={stats.avg_lion_density.toFixed(3)}
              sub="lions / km²"
            />
          </div>
        )}

        {/* ── Scenario result panel ── */}
        {scenarioResult && (
          <DraggablePanel id="scenario_result" defaultPosition={{ x: 20, y: 80 }} defaultPinned={false}>
            <div className="w-[320px]">
              <ErrorBoundary label="Scenario Panel">
                <ScenarioResultPanel
                  result={scenarioResult}
                  onClose={() => setScenarioResult(null)}
                />
              </ErrorBoundary>
            </div>
          </DraggablePanel>
        )}

        {/* ── Scenario History Panel ── */}
        {isScenarioHistoryOpen && (
          <ScenarioHistoryPanel
            isOpen={isScenarioHistoryOpen}
            onClose={() => setIsScenarioHistoryOpen(false)}
            onLoadScenario={async (scenarioId) => {
              try {
                const scenario = await api.getScenarioById(scenarioId);
                setScenarioResult(scenario);
                setIsScenarioHistoryOpen(false);
              } catch (err) {
                console.error('Failed to load scenario:', err);
              }
            }}
          />
        )}

        {/* -- Mobile Toggle -- */}
        {isMobile && (
           <button 
             onClick={() => setIsSidebarOpen(!isSidebarOpen)}
             className="absolute top-8 right-8 z-50 w-10 h-10 bg-[#1a1c1c] text-white rounded-full flex items-center justify-center shadow-2xl border border-white/10"
           >
              <span className="material-symbols-outlined">{isSidebarOpen ? 'close' : 'menu'}</span>
           </button>
        )}

        {/* ── Clean Panel Layout (Non-draggable, organized) ── */}
        <div className={`absolute top-8 right-8 w-[380px] max-h-[calc(100vh-180px)] z-20 transition-all duration-300 ${isSidebarOpen ? 'translate-x-0 opacity-100' : 'translate-x-[420px] opacity-0 pointer-events-none'}`}>
          
          {/* Search and Zone Selection */}
          <div className="space-y-4 mb-6">
            {/* Search Bar */}
            <div className="map-overlay-card p-4 shadow-sm rounded-sm">
              <form onSubmit={handleSearch} className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Search coords or landmark..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-outline-variant rounded p-2 pl-10 text-xs font-medium text-on-surface focus:outline-none focus:border-primary transition-colors"
                />
                <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary">
                  <Crosshair className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>

            {/* Zone Selection */}
            <div className={`map-overlay-card p-6 shadow-sm rounded-sm relative ${isZoneMenuOpen ? 'z-50' : 'z-20'}`}>
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2 text-primary font-bold">
                  <span className="material-symbols-outlined text-[20px]">location_on</span>
                  <h4 className="text-[12px] uppercase tracking-[0.15em] text-on-surface">ZONE SELECTION</h4>
                </div>
              </div>
              <div className="relative">
                <button
                  onClick={() => setIsZoneMenuOpen(!isZoneMenuOpen)}
                  className="w-full text-left flex justify-between items-center border-b border-outline-variant pb-2 text-[24px] headline-font font-medium text-on-surface hover:text-primary transition-colors"
                >
                  {selectedUnit || 'Regional Overview'}
                  <span className={`material-symbols-outlined text-outline transition-transform ${isZoneMenuOpen ? 'rotate-180' : ''}`}>
                    keyboard_arrow_down
                  </span>
                </button>
                {isZoneMenuOpen && (
                  <div className="absolute top-full left-0 w-full mt-2 bg-white/95 backdrop-blur-md border border-outline-variant shadow-xl z-50 py-2 rounded-sm animate-in fade-in slide-in-from-top-2">
                    <button
                      onClick={() => { setSelectedUnit(''); setIsZoneMenuOpen(false); }}
                      className="w-full text-left px-4 py-2 text-sm text-secondary hover:bg-surface-container-low hover:text-primary transition-colors font-medium border-b border-outline-variant/30"
                    >
                      Regional Overview
                    </button>
                    {availableUnits.map((u) => (
                      <button
                        key={u}
                        onClick={() => { setSelectedUnit(u); setIsZoneMenuOpen(false); }}
                        className="w-full text-left px-4 py-2 text-sm text-secondary hover:bg-surface-container-low hover:text-primary transition-colors font-medium"
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Analysis Panels - Stacked Layout */}
          <div className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto custom-scrollbar pr-2 pb-4">
            
            {/* Analyst Panel */}
            <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-emerald-600">smart_toy</span>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">AI ANALYST</h4>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isLiveMode ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                  <span className="text-[10px] text-slate-600">{selectedUnit || 'Regional'}</span>
                </div>
              </div>
              <div className="p-4">
                <AnalystPanel 
                  selectedUnit={selectedUnit} 
                  year={selectedYear} 
                />
              </div>
            </div>

            {/* Ecosystem Indicators Panel */}
            <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-emerald-600">eco</span>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">ECOSYSTEM INDICATORS</h4>
                </div>
                <span className="text-[10px] text-slate-600">{selectedYear}</span>
              </div>
              <div className="p-4">
                <EcosystemIndicatorsPanel
                  selectedUnit={selectedUnit}
                  year={selectedYear}
                  isLiveMode={isLiveMode}
                />
              </div>
            </div>

            {/* Layer Controls Panel */}
            <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-blue-600">layers</span>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">LAYER CONTROLS</h4>
                </div>
              </div>
              <div className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-amber-400" />
                      <span className="text-sm text-slate-700 font-medium">Lion Abundance (XGB)</span>
                    </div>
                    <button 
                      onClick={() => setShowPreyDensity(false)}
                      className={`w-10 h-5 rounded-full relative transition-colors ${!showPreyDensity ? 'bg-emerald-500' : 'bg-slate-300'}`}
                    >
                      <div className={`absolute w-3 h-3 bg-white rounded-full shadow transition-transform top-1 ${!showPreyDensity ? 'left-6' : 'left-1'}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-500" />
                      <span className="text-sm text-slate-700 font-medium">Ecological Base (Prey)</span>
                    </div>
                    <button 
                      onClick={() => setShowPreyDensity(true)}
                      className={`w-10 h-5 rounded-full relative transition-colors ${showPreyDensity ? 'bg-emerald-500' : 'bg-slate-300'}`}
                    >
                      <div className={`absolute w-3 h-3 bg-white rounded-full shadow transition-transform top-1 ${showPreyDensity ? 'left-6' : 'left-1'}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-400" />
                      <span className="text-sm text-slate-700 font-medium">Neural Landscape Projection</span>
                    </div>
                    <button 
                      onClick={() => setShowPrediction((v) => !v)}
                      className={`w-10 h-5 rounded-full relative transition-colors ${showPrediction ? 'bg-emerald-500' : 'bg-slate-300'}`}
                    >
                      <div className={`absolute w-3 h-3 bg-white rounded-full shadow transition-transform top-1 ${showPrediction ? 'left-6' : 'left-1'}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-amber-500" />
                      <span className="text-sm text-slate-700 font-medium">Human Encroachment (Nightlight)</span>
                    </div>
                    <button 
                      onClick={() => setShowEncroachment((v) => !v)}
                      className={`w-10 h-5 rounded-full relative transition-colors ${showEncroachment ? 'bg-emerald-500' : 'bg-slate-300'}`}
                    >
                      <div className={`absolute w-3 h-3 bg-white rounded-full shadow transition-transform top-1 ${showEncroachment ? 'left-6' : 'left-1'}`} />
                    </button>
                  </div>
                  <div className="h-2" />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-500" />
                      <span className="text-sm text-slate-700 font-medium">Protected Wildlife Zones</span>
                    </div>
                    <button 
                      onClick={() => setShowProtectedAreas((v) => !v)}
                      className={`w-10 h-5 rounded-full relative transition-colors ${showProtectedAreas ? 'bg-emerald-500' : 'bg-slate-300'}`}
                    >
                      <div className={`absolute w-3 h-3 bg-white rounded-full shadow transition-transform top-1 ${showProtectedAreas ? 'left-6' : 'left-1'}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-purple-500" />
                      <span className="text-sm text-slate-700 font-medium">Biological Corridors</span>
                    </div>
                    <button 
                      onClick={() => setShowCorridors((v) => !v)}
                      className={`w-10 h-5 rounded-full relative transition-colors ${showCorridors ? 'bg-emerald-500' : 'bg-slate-300'}`}
                    >
                      <div className={`absolute w-3 h-3 bg-white rounded-full shadow transition-transform top-1 ${showCorridors ? 'left-6' : 'left-1'}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-amber-300" />
                      <span className="text-sm text-slate-700 font-medium">Land-X Admin Boundary</span>
                    </div>
                    <button 
                      onClick={() => setShowLandXBoundary((v) => !v)}
                      className={`w-10 h-5 rounded-full relative transition-colors ${showLandXBoundary ? 'bg-emerald-500' : 'bg-slate-300'}`}
                    >
                      <div className={`absolute w-3 h-3 bg-white rounded-full shadow transition-transform top-1 ${showLandXBoundary ? 'left-6' : 'left-1'}`} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Historical Trends panel (Gap 2) */}
          <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-lg overflow-hidden">
            <button
              onClick={() => setShowTrends((v) => !v)}
              className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-purple-600">show_chart</span>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">HISTORICAL TRENDS</h4>
              </div>
              <span className={`material-symbols-outlined text-slate-600 transition-transform duration-200 ${showTrends ? 'rotate-180' : ''}`}>
                keyboard_arrow_down
              </span>
            </button>

            {showTrends && (
              <div className="px-4 pb-5">
                {trendsLoading ? (
                  <div className="flex items-center justify-center py-10 gap-3">
                    <div className="w-4 h-4 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                    <span className="text-[11px] text-slate-500 uppercase tracking-widest">Loading trends…</span>
                  </div>
                ) : trends.length === 0 ? (
                  <p className="text-[12px] text-slate-600 text-center py-8">
                    No historical data available for {selectedUnit || 'Regional Total'}.
                  </p>
                ) : (
                  <ErrorBoundary label="Trend Chart">
                    <TrendChart
                      trends={trends}
                      unit={selectedUnit || 'Regional Total'}
                    />
                  </ErrorBoundary>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Temporal Controls ── */}
        <div className={`absolute bottom-8 right-[420px] w-[500px] z-30 transition-all duration-300 ${isSidebarOpen && !isMobile ? 'right-[420px]' : 'right-8'} ${isMobile && !isSidebarOpen ? 'opacity-0 translate-y-10' : ''}`}>
          <div className="map-overlay-card p-4 shadow-lg rounded-sm">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2 text-primary font-bold">
                <span className="material-symbols-outlined text-[18px]">schedule</span>
                <span className="text-[10px] uppercase tracking-[0.15em] text-on-surface">TEMPORAL ANALYSIS</span>
              </div>
              <div className="flex items-center gap-3">
                <button title="Rewind to 2020" onClick={() => { stopPlayback(); setTimeValue(0); }} className="text-secondary hover:text-primary transition-colors">
                  <span className="material-symbols-outlined text-[18px]">fast_rewind</span>
                </button>
                <button title={isPlaying ? 'Pause' : 'Play timeline'} onClick={togglePlayback} className="text-primary hover:opacity-80 transition-opacity">
                  <span className="material-symbols-outlined text-[24px]">{isPlaying ? 'pause_circle' : 'play_circle'}</span>
                </button>
                <button title="Jump to 2026" onClick={() => { stopPlayback(); setTimeValue(100); }} className="text-secondary hover:text-primary transition-colors">
                  <span className="material-symbols-outlined text-[18px]">fast_forward</span>
                </button>
              </div>
            </div>

            <div className="relative pt-1">
              <div className="h-1 w-full bg-surface-container rounded-full overflow-hidden relative">
                <div className="absolute left-0 top-0 h-full time-slider-track" style={{ width: `${timeValue}%` }} />
              </div>
              <input
                type="range" min="0" max="100" value={timeValue}
                onChange={(e) => { stopPlayback(); setTimeValue(parseInt(e.target.value)); }}
                className="absolute top-[-5px] left-0 w-full opacity-0 cursor-pointer h-4 z-40"
              />
              <div
                className="absolute top-[-5px] w-3.5 h-3.5 bg-primary border-2 border-white rounded-full shadow-md pointer-events-none transition-all"
                style={{ left: `calc(${timeValue}% - 7px)` }}
              />
              <div className="flex justify-between mt-3 px-1">
                {[2020, 2021, 2022, 2023, 2024, 2025, 2026].map((yr) => {
                  const pct = ((yr - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100;
                  const isActive = yr === selectedYear;
                  return (
                    <button
                      key={yr}
                      title={`Jump to ${yr}`}
                      onClick={() => { stopPlayback(); setTimeValue(Math.round(pct)); }}
                      className={`text-center transition-all ${isActive ? 'bg-[#c5a059]/10 px-1 py-0.5 rounded-sm' : 'hover:opacity-70'}`}
                    >
                      <p className={`text-[8px] font-bold uppercase tracking-widest leading-none ${isActive ? 'text-primary' : 'text-outline'}`}>
                        {yr}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── Left-side controls: Zoom, Layer toggle, and Coordinates ── */}
        <div className="absolute bottom-8 left-8 flex flex-col gap-4 z-20">
          {/* Zoom controls */}
          <div className="map-overlay-card p-2 flex flex-col gap-2 rounded-lg">
            <button onClick={handleZoomIn} className="w-8 h-8 flex items-center justify-center text-on-surface hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-[20px]">add</span>
            </button>
            <div className="w-full h-[1px] bg-outline-variant" />
            <button onClick={handleZoomOut} className="w-8 h-8 flex items-center justify-center text-on-surface hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-[20px]">remove</span>
            </button>
          </div>
          
          {/* Map layer selection */}
          <div
            onClick={() => setActiveLayer((l) => l === 'SATELLITE (TRUE COLOR)' ? 'VECTOR (TOPOGRAPHIC)' : 'SATELLITE (TRUE COLOR)')}
            className="map-overlay-card px-4 py-2 flex items-center gap-4 rounded-lg cursor-pointer hover:border-primary transition-colors"
          >
            <span className="material-symbols-outlined text-secondary text-[20px]">layers</span>
            <div className="h-4 w-[1px] bg-outline-variant" />
            <span className="text-[11px] font-bold text-on-surface uppercase tracking-widest">{activeLayer}</span>
          </div>
          
          {/* Coordinate display - moved to left side */}
          <div className="map-overlay-card px-4 py-2 flex gap-6 rounded-lg shadow-sm">
            <div className="flex flex-col min-w-[70px]">
              <span className="text-[9px] font-bold text-outline uppercase tracking-widest leading-normal">Latitude</span>
              <span className="text-[12px] font-bold text-on-surface tracking-tight">
                {Math.abs(currentCoords.lat).toFixed(4)}° {currentCoords.lat >= 0 ? 'N' : 'S'}
              </span>
            </div>
            <div className="flex flex-col min-w-[70px]">
              <span className="text-[9px] font-bold text-outline uppercase tracking-widest leading-normal">Longitude</span>
              <span className="text-[12px] font-bold text-on-surface tracking-tight">
                {Math.abs(currentCoords.lng).toFixed(4)}° {currentCoords.lng >= 0 ? 'E' : 'W'}
              </span>
            </div>
          </div>
        </div>

        {/* ── Walkthrough Modal ── */}
        {isWalkthroughOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-lg animate-in fade-in duration-300">
             <div className="w-[600px] max-w-full bg-[#020617] border border-white/10 shadow-2xl rounded-[2rem] overflow-hidden">
                <div className="p-10 space-y-8">
                   <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-amber-400">
                           <Lightbulb className="w-5 h-5" />
                           <span className="text-[10px] font-bold uppercase tracking-widest">Platform Guide</span>
                        </div>
                        <h2 className="text-3xl font-black text-white tracking-tight">Master the Digital Twin</h2>
                      </div>
                      <button onClick={() => setIsWalkthroughOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                         <span className="material-symbols-outlined text-[32px]">close</span>
                      </button>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <WalkthroughStep 
                        num="01" 
                        title="Spatial Probing" 
                        text="Long-press or use the Polygon Tool to select specific areas of interest for detailed baseline analysis." 
                      />
                      <WalkthroughStep 
                        num="02" 
                        title="Scenario Testing" 
                        text="Adjust environmental sliders like nightlight trends or cheetah abundance to project future outcomes." 
                      />
                      <WalkthroughStep 
                        num="03" 
                        title="Intelligence Stream" 
                        text="Monitor the Bell icon for real-time compute status and ecological trend notifications." 
                      />
                      <WalkthroughStep 
                        num="04" 
                        title="Temporal Controls" 
                        text="Use the timeline at the bottom to synchronize spatial data between 2020 and 2026." 
                      />
                   </div>

                   <button 
                     onClick={() => setIsWalkthroughOpen(false)}
                     className="w-full py-4 bg-primary text-white font-bold uppercase tracking-widest rounded-2xl hover:opacity-90 transition-opacity"
                   >
                     Initialize Simulation
                   </button>
                </div>
             </div>
          </div>
        )}

      </div>
    </ProtectedRoute>
  );
}

function WalkthroughStep({ num, title, text }: { num: string; title: string, text: string }) {
  return (
    <div className="space-y-2">
       <div className="flex items-center gap-3">
          <span className="text-xs font-mono font-bold text-amber-500/60">{num}</span>
          <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wide">{title}</h4>
       </div>
       <p className="text-[11px] text-slate-500 leading-relaxed font-medium capitalize prose italic">"{text}"</p>
    </div>
  );
}
