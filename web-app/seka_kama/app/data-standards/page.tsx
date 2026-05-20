'use client';

import Link from 'next/link';
import { ShieldCheck, Ruler, Table, FileJson, CheckCircle2 } from 'lucide-react';

export default function DataStandardsPage() {
  const standards = [
    {
      title: 'Spatial Resolution',
      desc: 'The Digital Twin operates on a 1km² (30 arc-second) resolution using the WGS84 (EPSG:4326) coordinate system.',
      icon: Ruler
    },
    {
      title: 'Data Formats',
      desc: 'Native support for GeoJSON, TopoJSON, and Cloud Optimized GeoTIFFs (COG) for ecological raster layers.',
      icon: FileJson
    },
    {
      title: 'Attribute Schema',
      desc: 'Standardized field naming (snake_case) for population densities, vegetation indices, and human footprint metrics.',
      icon: Table
    }
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200">
      <nav className="h-16 flex items-center justify-between px-8 border-b border-white/5 glass-effect sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.4)]">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-white tracking-tight">Seka Kama</span>
        </Link>
      </nav>

      <main className="max-w-4xl mx-auto py-24 px-8 space-y-16 animate-in fade-in slide-in-from-bottom-8">
        <div className="space-y-4">
           <h1 className="text-4xl font-extrabold text-white tracking-tight leading-tight">
             Ecosystem Data <br />
             <span className="text-emerald-500">Standards & Integrity.</span>
           </h1>
           <p className="text-lg text-slate-400 leading-relaxed font-light">
             At Seka Kama, we adhere to strict international standards for geospatial and ecological data to 
             ensure interoperability between conservation agencies and our predictive engine.
           </p>
        </div>

        <div className="grid grid-cols-1 gap-6">
           {standards.map(standard => (
             <div key={standard.title} className="p-6 enterprise-card flex gap-6 items-start">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                   <standard.icon className="w-6 h-6 text-emerald-500" />
                </div>
                <div className="space-y-2">
                   <h3 className="text-lg font-bold text-white">{standard.title}</h3>
                   <p className="text-sm text-slate-400 leading-relaxed">{standard.desc}</p>
                </div>
             </div>
           ))}
        </div>

        <section className="p-8 bg-white/2 border border-white/5 rounded-2xl space-y-4">
           <div className="flex items-center gap-2 text-emerald-500">
              <CheckCircle2 className="w-5 h-5" />
              <h2 className="text-lg font-bold text-white tracking-tight">Validation Protocol</h2>
           </div>
           <p className="text-sm text-slate-400 leading-relaxed">
             Before any dataset is ingested into the SekaNet Oracle, it undergoes a three-stage validation 
             process: Coordinate validation, Schema matching, and Statistical outlier detection. This 
             ensures that our simulations remain grounded in high-quality empirical data.
           </p>
        </section>

        <footer className="pt-12 text-center">
           <Link href="/about" className="text-xs font-bold text-slate-500 hover:text-emerald-400 uppercase tracking-widest transition-colors">Learn more about our methodology</Link>
        </footer>
      </main>
    </div>
  );
}
