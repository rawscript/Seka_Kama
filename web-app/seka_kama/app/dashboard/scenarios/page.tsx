'use client';

import { useState, useEffect, useCallback } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { api, Scenario } from '@/services/api';
import { 
  History, 
  RefreshCw, 
  ExternalLink, 
  ChevronDown, 
  ChevronUp, 
  Layers,
  Calendar,
  Activity,
  AlertCircle
} from 'lucide-react';
import { useRouter } from 'next/navigation';

// ── helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-KE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function safeFixed(val: any, digits = 1): string {
  const n = typeof val === 'number' ? val : parseFloat(val);
  if (isNaN(n)) return '—';
  return n.toFixed(digits);
}

// ── component ─────────────────────────────────────────────────────────────────

export default function ScenariosPage() {
  const router = useRouter();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getScenarioHistory(100);
      setScenarios(Array.isArray(data) ? data : (data as any).scenarios ?? []);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load scenarios.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = (id: number) => setExpanded(prev => (prev === id ? null : id));

  const analyzeInKepler = (id: number) => {
    router.push(`/dashboard/kepler?scenario=${id}`);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#f9f9f9] p-8 md:p-12">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-[#775a19]/10 rounded-sm">
                  <History className="w-5 h-5 text-[#775a19]" />
                </div>
                <span className="text-[10px] font-bold text-[#775a19] uppercase tracking-[0.3em]">Temporal Records</span>
              </div>
              <h1 className="text-4xl font-normal text-[#1a1c1c] tracking-tight">Scenario History</h1>
              <p className="text-sm text-[#4e4639] mt-2 font-light max-w-xl">
                Review and analyze historical what-if simulations run against the SekaNet predictive architecture.
              </p>
            </div>
            <button 
              onClick={load} 
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-white border border-[#d1c5b4] text-[11px] font-bold uppercase tracking-widest text-[#1a1c1c] hover:bg-slate-50 transition-colors sharp-edge shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Synchronizing...' : 'Refresh Logs'}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-8 p-4 bg-rose-50 border border-rose-200 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 text-rose-500 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-rose-800 uppercase tracking-wider">System Exception</p>
                <p className="text-sm text-rose-600 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && scenarios.length === 0 && (
            <div className="py-24 text-center enterprise-card bg-white">
              <div className="w-16 h-16 bg-[#f3f3f3] rounded-full flex items-center justify-center mx-auto mb-6">
                <History className="w-8 h-8 text-[#d1c5b4]" />
              </div>
              <h2 className="text-xl font-medium text-[#1a1c1c] mb-2 uppercase tracking-wide">No Simulation Records</h2>
              <p className="text-sm text-[#4e4639] font-light max-w-sm mx-auto mb-8">
                Your historical simulation vault is empty. Launch a new what-if analysis from the Spatial dashboard to begin your predictive narrative.
              </p>
              <button 
                onClick={() => router.push('/dashboard')}
                className="bg-[#775a19] text-white px-8 py-4 text-[10px] font-bold uppercase tracking-widest hover:bg-[#4e3700] transition-colors"
              >
                Return to Analysis
              </button>
            </div>
          )}

          {/* List */}
          {!loading && scenarios.length > 0 && (
            <div className="grid grid-cols-1 gap-4">
              {scenarios.map((s, idx) => {
                const isOpen = expanded === s.scenario_id;
                const isPositive = (s.delta_lions ?? 0) >= 0;
                
                return (
                  <div 
                    key={s.scenario_id} 
                    className={`enterprise-card bg-white transition-all duration-500 overflow-hidden ${isOpen ? 'ring-2 ring-[#775a19]/20 translate-x-1' : 'hover:translate-x-1'} animate-in fade-in slide-in-from-bottom-4`}
                    style={{ animationDelay: `${idx * 50}ms`, animationFillMode: 'both' }}
                  >
                    {/* Card Header Section */}
                    <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex items-center gap-6">
                        <div className={`w-12 h-12 flex items-center justify-center border font-mono font-bold text-xs ${isOpen ? 'bg-[#775a19] text-white border-[#775a19]' : 'bg-[#f9f9f9] text-[#7f7667] border-[#d1c5b4]'}`}>
                          #{s.scenario_id}
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                             <Calendar className="w-3.5 h-3.5 text-[#7f7667]" />
                             <span className="text-[10px] font-bold text-[#7f7667] uppercase tracking-widest">{formatDate(s.created_at)}</span>
                          </div>
                          <h3 className="text-lg font-medium text-[#1a1c1c] truncate max-w-md">
                            {s.user_description || 'Unnamed Simulation Sequence'}
                          </h3>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right mr-4">
                          <span className="text-[10px] font-bold text-[#7f7667] uppercase tracking-widest block mb-1">Predicted Delta</span>
                          <span className={`text-xl font-bold tracking-tight ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {isPositive ? '+' : ''}{safeFixed(s.delta_lions)} <span className="text-sm font-normal text-slate-400 ml-1">Lions</span>
                          </span>
                        </div>
                        <div className="flex flex-col gap-2">
                          <button 
                            onClick={(e) => { e.stopPropagation(); analyzeInKepler(s.scenario_id); }}
                            className="bg-[#1a1c1c] text-white p-3 hover:bg-[#775a19] transition-colors rounded-none group relative shadow-lg"
                            title="Analyze in Kepler workspace"
                          >
                            <Layers className="w-4 h-4" />
                            <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 bg-[#1a1c1c] text-white text-[9px] font-bold px-2 py-1 uppercase tracking-widest whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                               Workspace View
                            </div>
                          </button>
                          <button 
                            onClick={() => toggle(s.scenario_id)}
                            className={`p-3 border transition-colors ${isOpen ? 'bg-[#775a19]/10 border-[#775a19]/30 text-[#775a19]' : 'border-[#d1c5b4] text-[#7f7667] hover:bg-slate-50'}`}
                          >
                            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Detailed Body Area (Expanded) */}
                    {isOpen && (
                      <div className="bg-[#f9f9f9] border-t border-[#d1c5b4]/40 p-8 md:p-10 animate-in slide-in-from-top-4 duration-500">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                          {/* Narrative / Description */}
                          <div className="lg:col-span-2 space-y-6">
                            <div>
                               <span className="text-[10px] font-bold text-[#775a19] uppercase tracking-[0.2em] mb-3 block">Neural Narrative</span>
                               <div className="bg-white p-6 border border-[#d1c5b4]/60 shadow-sm">
                                 <p className="text-sm text-[#4e4639] leading-relaxed italic font-light">
                                   "{s.llm_narrative || 'No qualitative analysis available for this simulation.'}"
                                 </p>
                               </div>
                            </div>
                            
                            {s.request_data?.feature_modifications && (
                              <div>
                                <span className="text-[10px] font-bold text-[#775a19] uppercase tracking-[0.2em] mb-3 block">Applied Modifications</span>
                                <div className="flex flex-wrap gap-2">
                                  {Object.entries(s.request_data.feature_modifications).map(([key, val]) => (
                                    <div key={key} className="bg-white px-3 py-2 border border-[#d1c5b4]/40 flex items-center gap-3">
                                      <span className="text-[10px] font-mono font-bold text-[#7f7667]">{key.replace(/_/g, ' ')}</span>
                                      <span className={`text-[10px] font-mono font-bold ${(val as number) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {(val as number) >= 0 ? '+' : ''}{safeFixed(val, 3)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Stats Sidebar */}
                          <div className="space-y-4">
                            <span className="text-[10px] font-bold text-[#775a19] uppercase tracking-[0.2em] mb-3 block">Computational Metrics</span>
                            <MetricBox label="Baseline Population" value={safeFixed(s.baseline_total_lions)} unit="Lions" />
                            <MetricBox label="Simulation Drift" value={`${(s.delta_percent ?? 0) >= 0 ? '+' : ''}${safeFixed(s.delta_percent)}`} unit="%" />
                            <MetricBox label="Affected Habitates" value={(s.affected_cells || 0).toString()} unit="Grid Cells" />
                            
                            <button 
                              onClick={() => analyzeInKepler(s.scenario_id)}
                              className="w-full mt-6 flex items-center justify-center gap-3 bg-[#775a19] text-white py-4 text-[10px] font-bold uppercase tracking-widest hover:bg-[#4e3700] transition-all"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              Launch Deep-Analysis
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Loading skeleton */}
          {loading && (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-white border border-[#d1c5b4]/40 animate-pulse" />
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}

function MetricBox({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="bg-white p-4 border border-[#d1c5b4]/40 flex justify-between items-end">
      <div>
        <span className="text-[9px] font-bold text-[#7f7667] uppercase tracking-wider block mb-1">{label}</span>
        <span className="text-xl font-bold text-[#1a1c1c] tracking-tighter">{value}</span>
      </div>
      <span className="text-[10px] font-bold text-[#d1c5b4] uppercase mb-1">{unit}</span>
    </div>
  );
}
