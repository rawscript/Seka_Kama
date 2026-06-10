'use client';

import React, { useState, useRef } from 'react';
import { 
  X, 
  TrendingDown, 
  TrendingUp, 
  Info, 
  MapPin, 
  Users, 
  Activity,
  ShieldAlert,
  Brain,
  Download,
  GitCompare,
  ChevronRight,
  BarChart3,
  ArrowRight,
  ClipboardCheck,
  Copy,
} from 'lucide-react';
import { exportScenarioResult } from '../services/exportService';

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

// -- Normalize: accept both live ScenarioResponse and history shapes --
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
  const eco = result.ecological_context ?? null;

  return {
    isSelection, delta, deltaPercent, predictedTotal, baselineTotal,
    affectedUnits, narrative, title, affectedCells, eco,
  };
}

// -- Comparison queue (module-level store, simple approach without Redux) --
let compareQueue: any[] = [];

export default function ScenarioResultPanel({ result, onClose }: ScenarioResultPanelProps) {
  const { isSelection, delta, deltaPercent, predictedTotal, baselineTotal, affectedUnits, narrative, title, affectedCells, eco } = normalize(result);
  const [showCompare, setShowCompare] = useState(false);
  const [queueSize, setQueueSize] = useState(compareQueue.length);

  const isNegative = delta != null && delta < 0;
  const accentColor = isNegative ? 'text-rose-400' : 'text-emerald-400';
  const accentBg = isNegative ? 'bg-rose-500/10' : 'bg-emerald-500/10';
  const accentBorder = isNegative ? 'border-rose-500/20' : 'border-emerald-500/20';

  const handleAddToCompare = () => {
    const alreadyIn = compareQueue.some(s => s.scenario_id === result.scenario_id && result.scenario_id !== undefined);
    if (!alreadyIn) {
      compareQueue = [...compareQueue, result];
      setQueueSize(compareQueue.length);
    }
    setShowCompare(true);
  };

  if (showCompare && compareQueue.length >= 1) {
    return (
      <ComparePanel
        scenarios={compareQueue}
        onClose={() => { setShowCompare(false); compareQueue = []; setQueueSize(0); }}
      />
    );
  }

  return (
    <div className="w-[400px] shadow-xl rounded-xl overflow-hidden flex flex-col p-0 animate-in fade-in slide-in-from-right-8 duration-500 bg-white">
      {/* Header Section */}
      <div className="p-5 border-b border-slate-200 flex justify-between items-start bg-slate-50">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className={`enterprise-badge ${accentColor} ${accentBg} ${accentBorder} border`}>
              {isSelection ? 'Spatial Probe' : 'Intelligence Brief'}
            </div>
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-tighter">SEC_ID: {result.scenario_id || 'TEMP'}</span>
          </div>
          <h3 className="text-lg font-bold text-slate-800 truncate leading-tight">
            {isSelection ? `${result.cells?.length ?? 0} Grid Cells Selected` : title}
          </h3>
        </div>
        <button 
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-all ml-4"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar max-h-[60vh] bg-white">
        {isSelection ? (
            /* -- Spatial Selection Info -- */
            <div className="space-y-4">
               <div className="grid grid-cols-2 gap-3">
                  <StatItem icon={MapPin} label="Total Cells" value={result.cells?.length?.toLocaleString() ?? '—'} />
                  <StatItem icon={Users} label="Current Lions" value={safeFixedAbs(result.cells?.reduce((s: any, c: any) => s + (c.properties?.lion_density ?? 0), 0), 1)} />
               </div>
               
                <div className="p-4 bg-white border border-amber-300 rounded-xl space-y-2 shadow-sm">
                   <div className="flex items-center gap-2 text-amber-700">
                     <Info className="w-4 h-4" />
                     <span className="text-[11px] font-bold uppercase tracking-wider">Spatial Insights</span>
                   </div>
                   <p className="text-xs text-slate-600 leading-relaxed">
                     {(() => {
                       const cell = result.cells?.[0]?.properties;
                       if (!cell) return "Analyzing selected coordinates...";
                       const trend = cell.nightlight_trend || 0;
                       const dist = cell.distance_to_protected_km || 0;
                       
                       if (trend > 0.05) return `High settlement pressure detected (trend: ${trend.toFixed(3)}). Habitat conversion risk is elevated in this locale.`;
                       if (dist < 2) return `Critical buffer zone identified. High probability of human-wildlife encounters due to reserve proximity (${dist.toFixed(1)} km).`;
                       return `Stable ecological zone. Low immediate evidence of anthropogenic encroachment based on nightlight longitudinal analysis.`;
                     })()}
                   </p>
                </div>
            </div>
        ) : (
            /* -- Simulation Intelligence -- */
            <div className="space-y-5">
              {/* Massive Impact Indicator */}
              {delta != null && (
                <div className={`p-6 rounded-2xl ${accentBg.replace('500/10', '200/20')} border ${accentBorder.replace('500/20', '200/30')} flex items-center justify-between shadow-sm`}>
                  <div className="space-y-1">
                    <p className={`text-[10px] font-bold uppercase tracking-[0.2em] opacity-80 ${accentColor.replace('400', '600')}`}>Population Delta</p>
                    <div className="flex items-baseline gap-2">
                       <span className={`text-4xl font-extrabold tracking-tighter ${accentColor.replace('400', '600')}`}>{safeFixed(delta, 1)}</span>
                       <span className="text-sm font-medium opacity-60">Lions</span>
                    </div>
                  </div>
                  <div className={`p-4 rounded-xl ${accentBg.replace('500/10', '200/20')} border ${accentBorder.replace('500/20', '200/30')}`}>
                     {isNegative ? <TrendingDown className={`w-8 h-8 ${accentColor.replace('400', '600')}`} /> : <TrendingUp className={`w-8 h-8 ${accentColor.replace('400', '600')}`} />}
                  </div>
                </div>
              )}

              {/* Grid of secondary metrics */}
              <div className="grid grid-cols-2 gap-4">
                 <MiniStat label="Baseline Population" value={safeInt(baselineTotal)} unit="Lions" />
                 <MiniStat label="Scenario Population" value={safeInt(predictedTotal)} unit="Lions" />
                 <MiniStat label="Impact Area" value={affectedCells != null ? safeInt(affectedCells) : '—'} unit="cells" />
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

              {/* Ecological context */}
              {eco && (
                <div className="p-4 bg-white border border-emerald-300 rounded-xl space-y-3 shadow-sm">
                  <div className="flex items-center gap-2 text-emerald-700 mb-1">
                    <Activity className="w-3 h-3" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Live Ecological Context</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <EcoStat label="Prey Density" value={eco.avg_prey_density.toFixed(3)} unit="/km²" tooltip="Data Source: GBIF Occurrence API. Normalized herbivore records within study radius." />
                    <EcoStat label="Rainfall" value={Math.round(eco.avg_rainfall_mm).toString()} unit="mm/yr" tooltip="Data Source: NASA POWER PRECTOTCORR. Real-time annual precipitation." />
                    <EcoStat label="HWC Risk" value={`${(eco.avg_hwc_risk * 100).toFixed(0)}%`} unit="" tooltip="Model: SekaNet v2.1 Derivative. Calculated from nightlight gradient + edge proximity + rainfall stress." />
                  </div>
                </div>
              )}

              {/* Geographic Breakdown */}
              {Object.keys(affectedUnits).length > 0 && (
                <div className="space-y-3">
                   <h4 className="text-[10px] font-bold text-slate-700 uppercase tracking-widest pl-1 flex items-center gap-2">
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
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/20 group-hover:bg-emerald-500 transition-colors" />
                  <div className="flex items-center gap-2">
                    <Brain className="w-3 h-3 text-emerald-600 animate-pulse" />
                    <p className="text-[10px] font-bold text-slate-700 uppercase tracking-widest leading-none">AI Insight Engine</p>
                  </div>
                  <p className="text-xs text-slate-600 italic leading-relaxed">"{narrative}"</p>
                </div>
              )}
            </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-600 font-mono">
         <span className="flex items-center gap-1.5"><Activity className="w-3 h-3" /> Real-time Compute</span>
         
         <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              const summary = `SCENARIO REPORT: ${title}\n` +
                `----------------------------------\n` +
                `Delta: ${safeFixed(delta, 1)} Lions (${deltaPercent?.toFixed(1)}%)\n` +
                `Predictive Total: ${safeInt(predictedTotal)} Lions\n` +
                `Affected Area: ${affectedCells} cells\n` +
                `Narrative: ${narrative}`;
              navigator.clipboard.writeText(summary);
            }}
            title="Copy plain-text summary"
            className="flex items-center gap-1.5 hover:text-emerald-600 transition-colors cursor-pointer"
          >
            <Copy className="w-3 h-3" /> Copy
          </button>

          <ExportMenu result={result} />
         </div>

         <button 
           onClick={handleAddToCompare}
           className="flex items-center gap-1.5 hover:text-amber-600 transition-colors cursor-pointer relative"
         >
           <GitCompare className="w-3 h-3" />
           Compare
           {queueSize > 0 && (
             <span className="absolute -top-2 -right-2 w-3.5 h-3.5 bg-amber-500 rounded-full text-[8px] text-white font-bold flex items-center justify-center">
               {queueSize}
             </span>
           )}
         </button>
         <span>v2.1.0-Release</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ComparePanel — side-by-side scenario comparison view
// ---------------------------------------------------------------------------

function ComparePanel({ scenarios, onClose }: { scenarios: any[]; onClose: () => void }) {
  const a = normalize(scenarios[0]);
  const b = scenarios[1] ? normalize(scenarios[1]) : null;

  return (
    <div className="w-[520px] shadow-xl rounded-xl overflow-hidden flex flex-col p-0 animate-in fade-in slide-in-from-right-8 duration-500 bg-white">
      <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-amber-600" />
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Scenario Comparison</h3>
          <span className="text-[9px] font-mono text-slate-600 bg-slate-200 px-2 py-0.5 rounded">
            {scenarios.length} scenario{scenarios.length !== 1 ? 's' : ''} queued
          </span>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 hover:text-slate-800 transition-all">
          <X className="w-4 h-4" />
        </button>
      </div>

      {b ? (
        <div className="p-5 space-y-5 overflow-y-auto custom-scrollbar max-h-[70vh] bg-white">
          {/* Header row */}
          <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
            <ScenarioLabel result={scenarios[0]} index="A" />
            <ArrowRight className="w-4 h-4 text-slate-600" />
            <ScenarioLabel result={scenarios[1]} index="B" />
          </div>

          {/* Delta comparison */}
          <CompareRow
            label="Population Δ (Lions)"
            aVal={a.delta}
            bVal={b.delta}
            format={(v) => (v != null ? safeFixed(v, 1) : '—')}
            higherIsBetter={true}
          />
          <CompareRow
            label="Baseline Population"
            aVal={a.baselineTotal}
            bVal={b.baselineTotal}
            format={safeInt}
          />
          <CompareRow
            label="Predicted Population"
            aVal={a.predictedTotal}
            bVal={b.predictedTotal}
            format={safeInt}
            higherIsBetter={true}
          />
          <CompareRow
            label="Impact Area (cells)"
            aVal={a.affectedCells}
            bVal={b.affectedCells}
            format={safeInt}
          />
          <CompareRow
            label="Δ Percent"
            aVal={a.deltaPercent}
            bVal={b.deltaPercent}
            format={(v) => (v != null ? `${v >= 0 ? '+' : ''}${v.toFixed(1)}%` : '—')}
            higherIsBetter={true}
          />

          {/* Narratives */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
            {[a, b].map((s, i) => s.narrative && (
              <div key={i} className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <p className="text-[9px] font-bold text-slate-700 uppercase tracking-widest mb-2">
                  Scenario {i === 0 ? 'A' : 'B'} — AI Narrative
                </p>
                <p className="text-[10px] text-slate-600 italic leading-relaxed line-clamp-5">"{s.narrative}"</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Waiting for second scenario */
        <div className="p-10 flex flex-col items-center justify-center gap-4 text-center bg-white">
          <div className="w-12 h-12 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center">
            <GitCompare className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800 mb-1">Scenario A Queued</p>
            <p className="text-xs text-slate-600 leading-relaxed max-w-[200px]">
              Close this panel, run another scenario, then click <strong className="text-amber-600">Compare</strong> to see a side-by-side analysis.
            </p>
          </div>
          <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-xl w-full">
            <p className="text-[9px] font-mono text-amber-700 uppercase tracking-widest mb-1">Queued: Scenario A</p>
            <p className="text-xs text-slate-700 truncate">{a.title}</p>
            <p className="text-[10px] font-mono text-emerald-600 mt-1">
              Δ {a.delta != null ? safeFixed(a.delta, 1) : '—'} Lions
            </p>
          </div>
        </div>
      )}

      <div className="p-3 border-t border-white/5 bg-black/40 text-[9px] font-mono text-slate-600 text-center">
        SekaNet Comparison Engine · Base model XGBoost v2.1.0
      </div>
    </div>
  );
}

function ScenarioLabel({ result, index }: { result: any; index: string }) {
  const n = normalize(result);
  return (
    <div className={`p-3 rounded-xl bg-white/3 border border-white/5 ${index === 'B' ? 'text-right' : ''}`}>
      <span className="text-[9px] font-bold text-amber-400 uppercase tracking-widest">Scenario {index}</span>
      <p className="text-xs text-white font-semibold truncate mt-0.5">{n.title}</p>
      <p className="text-[10px] font-mono text-slate-400">
        Δ {n.delta != null ? safeFixed(n.delta, 1) : '—'} Lions
      </p>
    </div>
  );
}

function CompareRow({
  label, aVal, bVal, format, higherIsBetter = false
}: {
  label: string;
  aVal: any;
  bVal: any;
  format: (v: any) => string;
  higherIsBetter?: boolean;
}) {
  const aNum = typeof aVal === 'number' ? aVal : parseFloat(aVal);
  const bNum = typeof bVal === 'number' ? bVal : parseFloat(bVal);
  const aWins = isFinite(aNum) && isFinite(bNum) && (higherIsBetter ? aNum > bNum : aNum < bNum);
  const bWins = isFinite(aNum) && isFinite(bNum) && (higherIsBetter ? bNum > aNum : bNum < aNum);

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
      <span className={`text-right text-sm font-mono font-bold ${aWins ? 'text-emerald-400' : 'text-slate-300'}`}>
        {format(aVal)}
      </span>
      <span className="text-[9px] text-slate-600 uppercase tracking-widest text-center min-w-[90px]">{label}</span>
      <span className={`text-sm font-mono font-bold ${bWins ? 'text-emerald-400' : 'text-slate-300'}`}>
        {format(bVal)}
      </span>
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

// -- Export Dropdown --

function ExportMenu({ result }: { result: any }) {
  const [open, setOpen] = useState(false);

  const options: { label: string; format: 'csv' | 'json' | 'geojson'; desc: string }[] = [
    { label: 'CSV',     format: 'csv',     desc: 'Spreadsheet-ready data' },
    { label: 'JSON',    format: 'json',    desc: 'Full metadata + provenance' },
    { label: 'GeoJSON', format: 'geojson', desc: 'Spatial features for GIS' },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
      >
        <Download className="w-3 h-3" />
        Export ▾
      </button>

      {open && (
        <div className="absolute bottom-full right-0 mb-2 w-44 bg-[#0b0f1a] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150 z-50">
          {options.map(opt => (
            <button
              key={opt.format}
              onClick={() => {
                exportScenarioResult(result, opt.format);
                setOpen(false);
              }}
              className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors group"
            >
              <p className="text-[11px] font-bold text-slate-200 group-hover:text-white">{opt.label}</p>
              <p className="text-[9px] text-slate-600 group-hover:text-slate-400">{opt.desc}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}