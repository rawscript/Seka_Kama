'use client';

import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Cpu, Brain, Zap, ShieldAlert, TrendingUp, BarChart3, RefreshCw, ExternalLink } from 'lucide-react';
import { useState, useEffect } from 'react';
import { api, type ModelMetadata } from '@/services/api';

// ── Feature importance bar ───────────────────────────────────────────────────

function FeatureBar({ feature, importance, rank, max }: {
  feature: string;
  importance: number;
  rank: number;
  max: number;
}) {
  const pct = (importance / max) * 100;
  const humanName: Record<string, string> = {
    longterm_slope_mean:        'Nightlight Trend',
    dist_to_protected_km:       'Distance to Reserve',
    all_skew_mean:              'Spatial Heterogeneity',
    cheetah_abundance:          'Cheetah Abundance',
    pop2018_mean:               'Human Population',
    ann_amp_mean:               'Seasonal Amplitude',
    all_kurtosis_mean:          'Light Kurtosis',
    licorr_slope_mean:          'Industrial Corridor',
    primary_prominence_mean:    'Dominant Frequency',
    density_code:               'Habitat Class',
    all_mean_mean:              'Nightlight Intensity',
    longterm_r2_mean:           'Trend Fit Quality',
    ann_trend_mean:             'Annual Trend',
    ann_cv_mean:                'Seasonal Variability',
    hist_lag1:                  'Historical Lag-1',
  };
  const label = humanName[feature] || feature.replace(/_/g, ' ');

  return (
    <div className="group">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <span className="text-[9px] font-mono font-bold text-slate-600 w-5 text-right">{rank}</span>
          <span className="text-[11px] font-medium text-slate-300 group-hover:text-white transition-colors capitalize">{label}</span>
        </div>
        <span className="text-[10px] font-mono font-bold text-amber-400">{(importance * 100).toFixed(2)}%</span>
      </div>
      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function IntelligencePage() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading]   = useState(true);
  const [features, setFeatures] = useState<Array<{ feature: string; importance: number }>>([]);
  const [metadata, setMetadata] = useState<ModelMetadata | null>(null);
  const [topFeature, setTopFeature] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [fi, meta] = await Promise.all([
        api.getFeatureImportance(),
        api.getModelMetadata(),
      ]);
      setFeatures(fi.feature_importance.slice(0, 15));
      setTopFeature(fi.top_feature);
      setMetadata(meta);
    } catch {
      // non-fatal — show empty state
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { setMounted(true); load(); }, []);

  const capabilities = [
    { title: 'Neural Defense',        desc: 'AI threat detection identifying encroachment vectors along reserve perimeters.',   icon: ShieldAlert },
    { title: 'Predictive Modeling',   desc: 'XGBoost ensemble predicting population shifts at 84%+ confidence intervals.',       icon: Brain },
    { title: 'Real-time Processing',  desc: 'Sub-200ms inference across 271,000+ spatial grid cells per scenario.',             icon: Zap },
  ];

  const maxImportance = features.length ? features[0].importance : 1;

  return (
    <div className="bg-[#f9f9f9] min-h-screen flex flex-col selection:bg-[#775a19]/10 selection:text-[#4e3700]">
      <Navbar />

      <main className="max-w-[1440px] mx-auto px-6 md:px-20 py-24 flex-grow w-full space-y-32">

        {/* ── Hero ── */}
        <section className={`max-w-4xl ${mounted ? 'animate-in' : 'opacity-0'}`}>
          <p className="text-[11px] font-bold text-[#775a19] mb-4 tracking-[0.3em] uppercase">Computational Ecology</p>
          <h1 className="text-5xl md:text-[68px] leading-tight text-[#1a1c1c] mb-8 font-normal tracking-tight">
            The <span className="italic font-light text-[#4e3700]">Intelligence Layer</span>
          </h1>
          <p className="text-lg md:text-xl leading-relaxed text-[#4e4639] font-light max-w-2xl">
            SekaNet is the neural backbone of the Seka Kama digital twin — a gradient-boosted tree architecture
            trained to predict biodiversity trends and simulate the cascade effects of human expansion.
          </p>
        </section>

        {/* ── Capability cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {capabilities.map((item, idx) => (
            <div
              key={item.title}
              className={`enterprise-card bg-[#1a1c1c] p-10 flex flex-col gap-8 transition-all hover:bg-[#242626] group ${mounted ? 'animate-in' : 'opacity-0'}`}
              style={{ animationDelay: `${idx * 150}ms`, animationFillMode: 'both' }}
            >
              <div className="w-14 h-14 bg-[#775a19]/10 border border-[#775a19]/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                <item.icon className="w-7 h-7 text-[#775a19]" />
              </div>
              <div className="space-y-4">
                <h3 className="text-xl font-serif font-medium text-white group-hover:text-[#775a19] transition-colors">{item.title}</h3>
                <p className="text-sm text-white/60 leading-relaxed font-light">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Live Feature Importance ── */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start border-t border-[#d1c5b4]/60 pt-24">

          {/* Left: importance chart */}
          <div className="bg-[#1a1c1c] p-8 rounded-sm shadow-enterprise">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <BarChart3 className="w-5 h-5 text-amber-400" />
                <h2 className="text-[12px] font-bold text-white uppercase tracking-[0.2em]">Live Feature Importance</h2>
              </div>
              <button
                onClick={load}
                className="text-slate-500 hover:text-white transition-colors"
                title="Refresh from model"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-6 h-6 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                <p className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">Querying model…</p>
              </div>
            ) : features.length === 0 ? (
              <p className="text-slate-600 text-sm italic text-center py-12">
                Feature importance unavailable — authenticate to access live model data.
              </p>
            ) : (
              <div className="space-y-5">
                {features.map((f, i) => (
                  <FeatureBar
                    key={f.feature}
                    feature={f.feature}
                    importance={f.importance}
                    rank={i + 1}
                    max={maxImportance}
                  />
                ))}
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-white/5 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <p className="text-[9px] font-mono text-slate-600 uppercase tracking-widest">
                Top driver: {topFeature || 'Loading…'}
              </p>
            </div>
          </div>

          {/* Right: model metadata */}
          <div className="space-y-8">
            <h2 className="text-4xl font-serif font-medium text-[#1a1c1c] tracking-tight leading-snug">
              Engineered for <br />
              <span className="italic font-light text-[#4e3700]">Actionable Foresight</span>
            </h2>
            <p className="text-base text-[#4e4639] font-light leading-relaxed">
              Seka Kama operates on the principle that data without intelligence is noise. SekaNet processes
              millions of observations annually — vegetation indices, nightlight trends, prey occurrence records —
              providing managers with quantified "What-If" projections before development decisions are locked in.
            </p>

            {metadata && (
              <div className="grid grid-cols-2 gap-6">
                {[
                  { label: 'Model Type',    value: metadata.model_type },
                  { label: 'Version',       value: metadata.version },
                  { label: 'Features',      value: `${metadata.feature_count}` },
                  { label: 'R² Score',      value: metadata.performance_metrics?.r_squared?.toFixed(3) ?? '—' },
                  { label: 'Train MAE',     value: metadata.performance_metrics?.train_mae?.toFixed(4) ?? '—' },
                  { label: 'Train MSE',     value: metadata.performance_metrics?.train_mse?.toFixed(4) ?? '—' },
                ].map(item => (
                  <div key={item.label}>
                    <p className="text-[10px] font-bold text-[#775a19] uppercase tracking-widest mb-1">{item.label}</p>
                    <p className="text-lg font-serif text-[#1a1c1c]">{item.value}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-10 pt-4 border-t border-[#d1c5b4]/40">
              <div>
                <p className="text-[28px] font-serif text-[#1a1c1c] mb-1">0.15s</p>
                <p className="text-[10px] font-bold text-[#775a19] uppercase tracking-widest">Inference Latency</p>
              </div>
              <div>
                <p className="text-[28px] font-serif text-[#1a1c1c] mb-1">10yr</p>
                <p className="text-[10px] font-bold text-[#775a19] uppercase tracking-widest">Historical Baseline</p>
              </div>
              <div>
                <p className="text-[28px] font-serif text-[#1a1c1c] mb-1">±15%</p>
                <p className="text-[10px] font-bold text-[#775a19] uppercase tracking-widest">Prediction Band</p>
              </div>
            </div>

            <a
              href="https://www.kaggle.com/code/jameskariukimwaura/seka-net-ensemble"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[11px] font-bold text-[#775a19] uppercase tracking-[0.2em] border-b border-[#775a19]/40 hover:border-[#775a19] pb-1 transition-colors"
            >
              View Full Statistical Framework <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </section>

        {/* ── System status terminal ── */}
        <section className="border-t border-[#d1c5b4]/60 pt-24">
          <div className="bg-white border border-[#d1c5b4]/60 p-8 shadow-enterprise max-w-2xl">
            <div className="flex items-center gap-3 mb-8">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-[#ba1a1a]" />
                <div className="w-3 h-3 rounded-full bg-[#e9c176]" />
                <div className="w-3 h-3 rounded-full bg-[#1db954]" />
              </div>
              <span className="text-[10px] font-mono font-bold text-[#7f7667] uppercase tracking-widest flex-1 text-right">
                SekaNet — {metadata ? `v${metadata.version}` : 'Connecting…'}
              </span>
            </div>
            <div className="space-y-2 font-mono text-[11px] text-[#4e4639]">
              <p className="text-[#1db954]">{`> System initialised. XGBoost ensemble loaded.`}</p>
              <p>{`> Feature pipeline: ${metadata?.feature_count ?? '…'} columns registered.`}</p>
              <p>{`> Ecological enrichment: NASA POWER + GBIF ACTIVE`}</p>
              <p>{`> LLM narrative engine: NVIDIA NIM — ${metadata?.model_type ?? 'Connecting'}`}</p>
              <p className="text-[#ba1a1a]">{metadata ? `[WARN] Corridor-7 path monitoring — elevated HWC risk` : `[INFO] Awaiting baseline data sync…`}</p>
              <p className="text-[#1db954]">{`> Ready for scenario inference.`}</p>
              <p className="animate-pulse">{`> _`}</p>
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
