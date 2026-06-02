'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import ErrorBoundary from '@/components/ErrorBoundary';
import dynamic from 'next/dynamic';
import { MapProvider, useMap } from 'react-map-gl/maplibre';
import { api, type LandscapeStats, type HistoricalTrend } from '@/services/api';

// ── Dynamic imports (browser-only) ───────────────────────────────────────────
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
const TrendChart = dynamic(() => import('@/components/TrendChart'), { ssr: false });
const NotificationPanel = dynamic(() => import('@/components/NotificationPanel'), { ssr: false });

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
  const [selectedUnit, setSelectedUnit]     = useState('');
  const [isZoneMenuOpen, setIsZoneMenuOpen] = useState(false);
  const [currentCoords, setCurrentCoords]   = useState({ lat: -1.25, lng: 35.1 });
  const [activeLayer, setActiveLayer]       = useState('SATELLITE (TRUE COLOR)');
  const [showProtectedAreas, setShowProtectedAreas] = useState(true);
  const [showLandXBoundary, setShowLandXBoundary]   = useState(false);
  const [showTrends, setShowTrends]         = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

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
  }, [showTrends, selectedUnit]);

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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <ProtectedRoute>
      <style dangerouslySetInnerHTML={{ __html: `
        .map-overlay-card {
          background: rgba(255,255,255,0.85);
          backdrop-filter: blur(16px);
          border: 0.5px solid var(--outline-variant);
        }
        .premium-gradient-bar {
          background: linear-gradient(to right, #775a19 0%, #ffdea5 50%, #ba1a1a 100%);
        }
        .time-slider-track {
          background: linear-gradient(to right, #e2dfde 0%, #775a19 100%);
        }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 4px; }
      `}} />

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
          />
        </ErrorBoundary>

        {/* ── Status pill ── */}
        <div className="absolute top-8 left-8 flex items-center gap-3 z-10">
          <div className="flex items-center gap-3 px-4 py-2 bg-[#1a1c1c]/80 backdrop-blur-md rounded-full pointer-events-none">
            <div className="w-2 h-2 rounded-full bg-[#1db954]" />
            <span className="text-[10px] font-bold text-white uppercase tracking-widest">DIGITAL TWIN ACTIVE</span>
            <span className="text-[10px] font-bold text-[#1db954] ml-2 opacity-80 uppercase tracking-widest">{selectedYear}</span>
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
        </div>

        {/* ── Landscape stats strip (Gap 1) ── */}
        {!statsLoading && stats && (
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
          <div className="absolute top-24 left-8 z-[100]">
            <ErrorBoundary label="Scenario Panel">
              <ScenarioResultPanel
                result={scenarioResult}
                onClose={() => setScenarioResult(null)}
              />
            </ErrorBoundary>
          </div>
        )}

        {/* ── Right side panels ── */}
        <div className="absolute top-8 right-8 flex flex-col gap-6 w-[380px] max-h-[calc(100vh-180px)] overflow-y-auto pr-2 pb-8 z-20 custom-scrollbar">

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

          {/* Ecosystem Indicators */}
          <div className="map-overlay-card p-6 shadow-sm rounded-sm relative z-10">
            <div className="flex items-center gap-2 mb-8 text-primary font-bold">
              <span className="material-symbols-outlined text-[20px]">eco</span>
              <h4 className="text-[12px] uppercase tracking-[0.15em] text-on-surface">ECOSYSTEM INDICATORS</h4>
            </div>
            <div className="space-y-10">
              <div>
                <div className="flex justify-between items-end mb-3">
                  <span className="text-[11px] font-bold text-secondary tracking-wider">
                    LION DENSITY GRID (XGB) — {selectedYear}
                  </span>
                </div>
                <div className="h-1.5 w-full premium-gradient-bar rounded-full" />
                <div className="flex justify-between mt-2">
                  <span className="text-[9px] font-bold text-outline uppercase tracking-widest">Baseline</span>
                  <span className="text-[9px] font-bold text-outline uppercase tracking-widest">High</span>
                </div>
              </div>
              <div className="space-y-4">
                <LayerToggle
                  enabled={showProtectedAreas}
                  onToggle={() => setShowProtectedAreas((v) => !v)}
                  color="#1db954"
                  label="Protected Wildlife Zones"
                />
                <LayerToggle
                  enabled={showLandXBoundary}
                  onToggle={() => setShowLandXBoundary((v) => !v)}
                  color="#e9c176"
                  label="Land-X Admin Boundary"
                />
              </div>
            </div>
          </div>

          {/* Historical Trends panel (Gap 2) */}
          <div className="map-overlay-card shadow-sm rounded-sm overflow-hidden">
            <button
              onClick={() => setShowTrends((v) => !v)}
              className="w-full flex items-center justify-between p-5 text-left hover:bg-black/5 transition-colors"
            >
              <div className="flex items-center gap-2 text-primary font-bold">
                <span className="material-symbols-outlined text-[20px]">show_chart</span>
                <h4 className="text-[12px] uppercase tracking-[0.15em] text-on-surface">HISTORICAL TRENDS</h4>
              </div>
              <span className={`material-symbols-outlined text-outline transition-transform duration-200 ${showTrends ? 'rotate-180' : ''}`}>
                keyboard_arrow_down
              </span>
            </button>

            {showTrends && (
              <div className="px-4 pb-5 bg-[#0b0f1a]">
                {trendsLoading ? (
                  <div className="flex items-center justify-center py-10 gap-3">
                    <div className="w-4 h-4 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
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
        <div className="absolute bottom-8 right-[420px] w-[500px] z-30">
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

        {/* ── Zoom + Layer toggle ── */}
        <div className="absolute bottom-8 left-8 flex flex-col gap-4 z-20">
          <div className="map-overlay-card p-2 flex flex-col gap-2 rounded-lg">
            <button onClick={handleZoomIn} className="w-8 h-8 flex items-center justify-center text-on-surface hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-[20px]">add</span>
            </button>
            <div className="w-full h-[1px] bg-outline-variant" />
            <button onClick={handleZoomOut} className="w-8 h-8 flex items-center justify-center text-on-surface hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-[20px]">remove</span>
            </button>
          </div>
          <div
            onClick={() => setActiveLayer((l) => l === 'SATELLITE (TRUE COLOR)' ? 'VECTOR (TOPOGRAPHIC)' : 'SATELLITE (TRUE COLOR)')}
            className="map-overlay-card px-4 py-2 flex items-center gap-4 rounded-lg cursor-pointer hover:border-primary transition-colors"
          >
            <span className="material-symbols-outlined text-secondary text-[20px]">layers</span>
            <div className="h-4 w-[1px] bg-outline-variant" />
            <span className="text-[11px] font-bold text-on-surface uppercase tracking-widest">{activeLayer}</span>
          </div>
        </div>

        {/* ── Coordinate display ── */}
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
