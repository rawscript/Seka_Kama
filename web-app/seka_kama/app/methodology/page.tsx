'use client';

import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { 
  Beaker, 
  Database, 
  Map as MapIcon, 
  TrendingUp, 
  ShieldCheck, 
  Info,
  Layers,
  Activity,
  Zap
} from 'lucide-react';

export default function MethodologyPage() {
  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 font-sans selection:bg-emerald-500/30">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(16,185,129,0.1),transparent)] pointer-events-none" />
        <div className="max-w-6xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-effect-light border border-emerald-500/20 mb-8 animate-in fade-in slide-in-from-bottom-4">
            <Beaker className="w-4 h-4 text-emerald-500" />
            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-[0.2em]">Scientific Framework</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight mb-8">
            The Intelligence <span className="text-emerald-500">Methodology</span>
          </h1>
          <p className="text-lg text-slate-400 max-w-3xl mx-auto leading-relaxed">
            Seka Kama utilizes a high-precision Digital Twin architecture, bridging spatial nightlight trends with multi-species predator viability models.
          </p>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-6 py-20 space-y-32">
        
        {/* Core Pillars */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="space-y-6">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Database className="w-6 h-6 text-emerald-500" />
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight">Data Synthesis</h3>
            <p className="text-sm text-slate-400 leading-relaxed italic">
              Integrates 20+ variables including nightlight intensity, human population density (GHSL), NASA POWER precipitation, and GBIF prey distribution.
            </p>
          </div>
          
          <div className="space-y-6">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight">Predictive Engine</h3>
            <p className="text-sm text-slate-400 leading-relaxed italic">
              Powered by an optimized XGBoost Ensemble (v2.1.0) trained on historical lion density and land-cover transition data.
            </p>
          </div>

          <div className="space-y-6">
            <div className="w-12 h-12 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center">
              <Activity className="w-6 h-6 text-pink-400" />
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight">Multi-Species Context</h3>
            <p className="text-sm text-slate-400 leading-relaxed italic">
              Uses herbivore occurrence records as a proxy for ecosystem health, enabling parallel impact analysis for lions and cheetahs.
            </p>
          </div>
        </section>

        {/* Deep Dive: Nightlight Sensitivity */}
        <section className="glass-effect-heavy rounded-[3rem] p-12 md:p-20 border border-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-500/5 blur-[120px] rounded-full -mr-48 -mt-48" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-20 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-bold text-emerald-500 uppercase tracking-widest mb-6">
                Core Logic
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-8 tracking-tight">
                Nightlight Sensitivity & <br />Habitat Fragmentation
              </h2>
              <div className="space-y-8">
                <div className="flex gap-5">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-[10px] font-bold text-emerald-500">1</div>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    <strong className="text-white block mb-1">Temporal Light Trends</strong>
                    Our models analyze the <code className="text-emerald-400">longterm_slope_mean</code> of nightlight data to identify areas of impending urbanization before they become visible to traditional land-cover maps.
                  </p>
                </div>
                <div className="flex gap-5">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-[10px] font-bold text-emerald-500">2</div>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    <strong className="text-white block mb-1">Protection Proximity</strong>
                    The <code className="text-emerald-400">dist_to_protected_km</code> factor quantifies the edge-effect, where predator mortality peaks at the intersection of wild habitat and high-intensity human settlement.
                  </p>
                </div>
                <div className="flex gap-5">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-[10px] font-bold text-emerald-500">3</div>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    <strong className="text-white block mb-1">Entropy & Skew</strong>
                    Spatial heterogeneity measures (<code className="text-emerald-400">all_skew_mean</code>) allow us to differentiate between concentrated urban development and sparse, rural encroachment.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="aspect-square rounded-[2rem] bg-gradient-to-br from-emerald-500/10 to-transparent border border-white/10 p-2 relative group overflow-hidden">
                <div className="absolute inset-0 bg-[#000] rounded-[1.8rem] m-2 overflow-hidden">
                   <div className="absolute inset-0 opacity-40 mix-blend-screen bg-[url('https://images.unsplash.com/photo-1614730321146-b6fa6a46bac4?auto=format&fit=crop&q=80&w=1000')] bg-cover" />
                   <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                </div>
                <div className="relative h-full flex flex-col justify-end p-8">
                   <div className="flex items-center gap-3 mb-4">
                     <Zap className="w-5 h-5 text-emerald-500" />
                     <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white">XGBoost Feature Map</span>
                   </div>
                   <div className="space-y-2 opacity-60 group-hover:opacity-100 transition-opacity">
                      <div className="h-2 w-full bg-emerald-500/20 rounded-full overflow-hidden">
                        <div className="h-full w-[89%] bg-emerald-500 animate-pulse" />
                      </div>
                      <div className="h-2 w-full bg-blue-500/20 rounded-full overflow-hidden">
                        <div className="h-full w-[72%] bg-blue-500 animate-pulse" style={{ animationDelay: '0.2s' }} />
                      </div>
                      <div className="h-2 w-full bg-amber-500/20 rounded-full overflow-hidden">
                        <div className="h-full w-[65%] bg-amber-500 animate-pulse" style={{ animationDelay: '0.4s' }} />
                      </div>
                   </div>
                </div>
              </div>
              <div className="absolute -bottom-6 -right-6 p-6 glass-effect border border-white/10 rounded-2xl shadow-2xl animate-bounce">
                 <ShieldCheck className="w-8 h-8 text-emerald-500" />
              </div>
            </div>
          </div>
        </section>

        {/* Validation Section */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
           <div className="space-y-6">
              <h3 className="text-2xl font-black text-white tracking-tight">Model Validation</h3>
              <p className="text-slate-400 leading-relaxed">
                The SekaNet engine undergoes rigorous cross-validation using the <code className="text-emerald-400">RMSE</code> (Root Mean Square Error) metric against historical census data. Current prediction accuracy for direct land-use change scenarios is <strong>±15%</strong>.
              </p>
              <div className="p-8 rounded-[2rem] bg-emerald-500/5 border border-emerald-500/10 space-y-4">
                 <div className="flex justify-between text-[11px] font-bold text-white uppercase tracking-widest">
                   <span>R² Score</span>
                   <span className="text-emerald-400">0.892</span>
                 </div>
                 <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full w-[89%] bg-emerald-500" />
                 </div>
              </div>
           </div>
           <div className="space-y-6">
              <h3 className="text-2xl font-black text-white tracking-tight">Scientific Ethics</h3>
              <p className="text-slate-400 leading-relaxed italic">
                "Digital Twins for conservation must maintain the highest standard of data provenance. Seka Kama prioritize raw data from open-source scientific portals (NASA, GBIF) to ensure independent reproducibility."
              </p>
              <div className="flex flex-wrap gap-3">
                 {['NASA POWER', 'GBIF', 'GHSL', 'ESA WorldCover', 'Sentinel-2'].map(tag => (
                   <span key={tag} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[9px] font-bold text-slate-300 uppercase tracking-widest">{tag}</span>
                 ))}
              </div>
           </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
