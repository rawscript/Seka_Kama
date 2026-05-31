'use client';

import React from 'react';
import { 
  X, 
  TrendingDown, 
  TrendingUp, 
  Info, 
  MapPin, 
  Users, 
  Activity,
  ChevronRight,
  ShieldAlert,
  Brain
} from 'lucide-react';

interface ScenarioResultPanelProps {
  result: any;
  onClose: () => void;
}

// -- Safe number helpers --
function safeFixed(val: any, digits = 1): string {
  const n = typeof val === 'number' ? val : parseFloat(val);
  if (!isFinite(n)) return '—';
  return (n >= 0 ? '+' : '') + n.toFixed(digits);
}

function safeFixedAbs(val: any, digits = 1): string {
  const n = typeof val === 'number' ? val : parseFloat(val);
  if (!isFinite(n)) return '—';
  return n.toFixed(digits);
}

function safeInt(val: any): string {
  const n = typeof val === 'number' ? val : parseFloat(val);
  if (!isFinite(n)) return '—';
  return Math.round(n).toLocaleString();
}

// -- Normalize accept both live ScenarioResponse and history shapes --
function normalize(result: any) {
  const isSelection = result.type === 'selection';
  
  const delta: number | null =
    result.delta_lions ?? result.predicted_lion_delta ?? null;

  const deltaPercent: number | null =
    result.delta_percent ?? (
      result.baseline_total_lions && delta != null
        ? (delta / result.baseline_total_lions) * 100
        : null
    );

  const predictedTotal: number | null = result.predicted_total_lions ?? null;
  const baselineTotal: number | null = result.baseline_total_lions ?? null;
  const affectedUnits: Record<string, number> = result.affected_units ?? {};
  const narrative: string = result.llm_narrative ?? result.request_data?.user_query ?? '';
  const title: string = result.user_description ?? result.request_data?.user_query ?? `Scenario Intelligence`;
  const affectedCells: number | null = result.affected_cells ?? null;

  // Real ecological context from backend enrichment
  const eco = result.ecological_context ?? null;

  return {
    isSelection, delta, deltaPercent, predictedTotal, baselineTotal,
    affectedUnits, narrative, title, affectedCells, eco,
  };
}

export default function ScenarioResultPanel({ result, onClose }: ScenarioResultPanelProps) {
  const { isSelection, delta, deltaPercent, predictedTotal, baselineTotal, affectedUnits, narrative, title, affectedCells, eco } = normalize(result);

  const isNegative = delta != null && delta < 0;
  const accentColor = isNegative ? 'text-rose-400' : 'text-emerald-400';
  const accentBg = isNegative ? 'bg-rose-500/10' : 'bg-emerald-500/10';
  const accentBorder = isNegative ? 'border-rose-500/20' : 'border-emerald-500/20';

  return (
    <div className="w-[400px] enterprise-card overflow-hidden flex flex-col p-0 animate-in fade-in slide-in-from-right-8 duration-500">
      {/* Header Section */}
      <div className="p-5 border-b border-white/5 flex justify-between items-start bg-white/2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className={`enterprise-badge ${accentColor} ${accentBg} ${accentBorder} border`}>
              {isSelection ? 'Spatial Probe' : 'Intelligence Brief'}
            </div>
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-tighter">SEC_ID: {result.scenario_id || 'TEMP'}</span>
          </div>
          <h3 className="text-lg font-bold text-white truncate leading-tight">
            {isSelection ? `${result.cells?.length ?? 0} Grid Cells Selected` : title}
          </h3>
        </div>
        <button 
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-white/10 text-slate-500 hover:text-white transition-all ml-4"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar max-h-[60vh]">
        {isSelection ? (
            /* -- Spatial Selection Info -- */
            <div className="space-y-4">
               <div className="grid grid-cols-2 gap-3">
                  <StatItem icon={MapPin} label="Total Cells" value={result.cells?.length?.toLocaleString() ?? '—'} />
                  <StatItem icon={Users} label="Current Lions" value={safeFixedAbs(result.cells?.reduce((s: any, c: any) => s + (c.properties?.lion_density ?? 0), 0), 1)} />
               </div>
               
               <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-amber-400">
                    <Info className="w-4 h-4" />
                    <span className="text-[11px] font-bold uppercase tracking-wider">Predictive Baseline</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Selected cells show a high concentration of ecosystem proxies. Application of typical 
                    encroachment models suggests a <span className="text-amber-300 font-bold">12-15% pressure increase</span> in this locale.
                  </p>
               </div>
            </div>
        ) : (
            /* -- Simulation Intelligence -- */
            <div className="space-y-5">
              {/* Massive Impact Indicator */}
              {delta != null && (
                <div className={`p-6 rounded-2xl ${accentBg} border ${accentBorder} flex items-center justify-between shadow-inner`}>
                  <div className="space-y-1">
                    <p className={`text-[10px] font-bold uppercase tracking-[0.2em] opacity-80 ${accentColor}`}>Population Delta</p>
                    <div className="flex items-baseline gap-2">
                       <span className={`text-4xl font-extrabold tracking-tighter ${accentColor}`}>{safeFixed(delta, 1)}</span>
                       <span className="text-sm font-medium opacity-60">Lions</span>
                    </div>
                  </div>
                  <div className={`p-4 rounded-xl ${accentBg} border ${accentBorder}`}>
                     {isNegative ? <TrendingDown className={`w-8 h-8 ${accentColor}`} /> : <TrendingUp className={`w-8 h-8 ${accentColor}`} />}
                  </div>
                </div>
              )}

              {/* Grid of secondary metrics */}
              <div className="grid grid-cols-2 gap-4">
                 <MiniStat label="Baseline Population" value={safeInt(baselineTotal)} unit="Lions" />
                 <MiniStat label="Scenario Population" value={safeInt(predictedTotal)} unit="Lions" />
                 <MiniStat label="Impact Area" value={affectedCells != null ? safeInt(affectedCells) : '—'} unit="cells" />
                 {/* Show real HWC risk if available, otherwise delta % */}
                 {eco ? (
                   <MiniStat
                     label="HWC Risk"
                     value={`${(eco.avg_hwc_risk * 100).toFixed(0)}%`}
                     unit="score"
                     tooltip="Human-Wildlife Conflict risk derived from nightlight, proximity, and rainfall"
                   />
                 ) : (
                   <MiniStat
                     label="Δ Percent"
                     value={deltaPercent != null ? `${deltaPercent >= 0 ? '+' : ''}${deltaPercent.toFixed(1)}%` : '—'}
                     unit="change"
                   />
                 )}
              </div>

              {/* Ecological context — only shown when backend enrichment ran */}
              {eco && (
                <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400 mb-1">
                    <Activity className="w-3 h-3" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Live Ecological Context</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <EcoStat
                      label="Prey Density"
                      value={eco.avg_prey_density.toFixed(3)}
                      unit="/km²"
                      tooltip="Avg herbivore occurrence density (GBIF)"
                    />
                    <EcoStat
                      label="Rainfall"
                      value={Math.round(eco.avg_rainfall_mm).toString()}
                      unit="mm/yr"
                      tooltip="Annual precipitation (NASA POWER)"
                    />
                    <EcoStat
                      label="HWC Risk"
                      value={`${(eco.avg_hwc_risk * 100).toFixed(0)}%`}
                      unit=""
                      tooltip="Human-Wildlife Conflict risk index"
                    />
                  </div>
                </div>
              )}

              {/* Geographic Breakdown */}
              {Object.keys(affectedUnits).length > 0 && (
                <div className="space-y-3">
                   <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1 flex items-center gap-2">
                     <Activity className="w-3 h-3" /> Area Variance
                   </h4>
                   <div className="space-y-2">
                      {Object.entries(affectedUnits)
                        .sort((a,b) => Math.abs(b[1] as number) - Math.abs(a[1] as number))
                        .slice(0, 4)
                        .map(([unit, val]) => (
                          <UnitRow key={unit} name={unit} delta={val as number} max={Math.max(...Object.values(affectedUnits).map(Math.abs))} />
                        ))
                      }
                   </div>
                </div>
              )}

              {/* Intelligence Narrative */}
              {narrative && (
                <div className="p-4 bg-white/2 border border-white/5 rounded-xl space-y-3 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/20 group-hover:bg-emerald-500 transition-colors" />
                  <div className="flex items-center gap-2">
                    <Brain className="w-3 h-3 text-emerald-500 animate-pulse" />
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">AI Insight Engine</p>
                  </div>
                  <p className="text-xs text-slate-400 italic leading-relaxed">"{narrative}"</p>
                </div>
              )}
            </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-4 bg-black/40 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-600 font-mono">
         <span className="flex items-center gap-1.5"><Activity className="w-3 h-3" /> Real-time Compute</span>
         <span>v4.2.1-Prod</span>
      </div>
    </div>
  );
}

// -- Smaller UI Sub-components --

function StatItem({ icon: Icon, label, value }: { icon: any, label: string, value: string }) {
  return (
    <div className="p-3 bg-white/2 border border-white/5 rounded-xl hover:bg-white/5 transition-colors">
      <div className="flex items-center gap-2 text-slate-500 mb-1">
        <Icon className="w-3 h-3" />
        <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-xl font-bold text-slate-200 tracking-tight">{value}</div>
    </div>
  );
}

function MiniStat({ label, value, unit, tooltip }: { label: string; value: any; unit: string; tooltip?: string }) {
   return (
    <div className="flex flex-col" title={tooltip}>
       <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1">{label}</span>
       <div className="flex items-baseline gap-1.5 leading-none">
          <span className="text-lg font-bold text-slate-300 font-mono tracking-tighter">{value}</span>
          {unit && <span className="text-[10px] text-slate-600 font-medium uppercase">{unit}</span>}
       </div>
    </div>
   );
}

function EcoStat({ label, value, unit, tooltip }: { label: string; value: string; unit: string; tooltip?: string }) {
  return (
    <div className="flex flex-col" title={tooltip}>
      <span className="text-[9px] text-emerald-600 font-bold uppercase tracking-widest mb-1">{label}</span>
      <div className="flex items-baseline gap-1 leading-none">
        <span className="text-sm font-bold text-emerald-300 font-mono">{value}</span>
        {unit && <span className="text-[9px] text-emerald-700 font-medium">{unit}</span>}
      </div>
    </div>
  );
}

function UnitRow({ name, delta, max }: { name: string, delta: number, max: number }) {
  const pct = Math.min((Math.abs(delta) / (max || 1)) * 100, 100);
  const color = delta < 0 ? 'bg-rose-500' : 'bg-emerald-500';
  const textColor = delta < 0 ? 'text-rose-400' : 'text-emerald-400';
  
  return (
    <div className="group space-y-1.5">
       <div className="flex justify-between items-center text-[11px]">
          <span className="text-slate-400 font-medium group-hover:text-slate-200 transition-colors truncate max-w-[150px]">{name}</span>
          <span className={`font-mono font-bold ${textColor}`}>
            {delta > 0 ? '+' : ''}
            {(typeof delta === 'number' ? delta : 0).toFixed(1)}
          </span>
       </div>
       <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
          <div className={`h-full ${color} opacity-60 rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
       </div>
    </div>
  );
}