'use client';

import Link from 'next/link';
import { ShieldCheck, Book, Terminal, Code2, Database } from 'lucide-react';

export default function DocumentationPage() {
  const sections = [
    {
      title: 'Quick Start',
      icon: Terminal,
      items: ['Authentication', 'Dashboard Overview', 'Drawing Your First Scenario']
    },
    {
      title: 'Data Engine',
      icon: Database,
      items: ['VIIRS Nightlight Trends', 'Grid Cell Calibration', 'LandDX Integration']
    },
    {
      title: 'API Reference',
      icon: Code2,
      items: ['REST Endpoints', 'WebSocket Ingestion', 'Authentication Headers']
    },
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200">
      <nav className="h-16 flex items-center justify-between px-8 border-b border-white/5 glass-effect sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.4)]">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-white tracking-tight">Seka Kama Docs</span>
        </Link>
        <Link href="/dashboard" className="text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-white transition-colors">Go to App</Link>
      </nav>

      <div className="max-w-6xl mx-auto flex gap-12 py-16 px-8">
        <aside className="w-64 flex-shrink-0 hidden lg:block space-y-8">
          {sections.map(section => (
            <div key={section.title} className="space-y-3">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <section.icon className="w-3 h-3" /> {section.title}
              </h4>
              <ul className="space-y-2">
                {section.items.map(item => (
                  <li key={item} className="text-sm text-slate-400 hover:text-emerald-400 cursor-pointer transition-colors leading-none">{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </aside>

        <main className="flex-1 space-y-12 animate-in fade-in duration-700">
          <div className="space-y-4">
             <h1 className="text-4xl font-bold text-white tracking-tight">Technical Documentation</h1>
             <p className="text-slate-400 leading-relaxed max-w-2xl">
               Welcome to the Seka Kama Technical Reference. This guide covers the integration of the SekaNet 
               XGBoost model and our spatial analysis engine.
             </p>
          </div>

          <div className="p-8 enterprise-card bg-emerald-500/5 border-emerald-500/10">
             <h2 className="text-lg font-bold text-emerald-400 mb-4 flex items-center gap-2">
                <Book className="w-5 h-5" /> The SekaNet core model
             </h2>
             <p className="text-sm text-slate-300 leading-relaxed mb-6">
                Our model utilizes a gradient-boosted tree architecture trained on a decade of 
                spatiotemporal data. It predicts lion abundance based on habitat suitability indices, 
                human footprint (VIIRS), and distance to water sources.
             </p>
             <div className="bg-black/50 p-4 rounded-xl font-mono text-xs text-slate-500 border border-white/5">
                # API Example <br />
                POST /api/v4/simulation/scenario <br />
                { JSON.stringify({ geometry: "Polygon(...)", features: { light_offset: 0.15 } }, null, 2) }
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-white/5">
             <div className="space-y-2">
                <h3 className="font-bold text-white">Spatial Accuracy</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                   The Digital Twin operates at a 30arcsecond resolution (~1km²). Predictions are most accurate within 
                   well-monitored conservancy boundaries.
                </p>
             </div>
             <div className="space-y-2">
                <h3 className="font-bold text-white">Update Frequency</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                   Vegetation indices (NDVI) are ingested monthly. Nightlight trends are updated annually 
                   following the NASA/NOAA VIIRS release cycle.
                </p>
             </div>
          </div>
        </main>
      </div>
    </div>
  );
}
