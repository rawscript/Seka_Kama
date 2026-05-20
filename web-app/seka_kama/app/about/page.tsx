'use client';

import Link from 'next/link';
import { ShieldCheck, Users, Target, Globe } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 selection:bg-emerald-500/30">
      {/* Simple Header */}
      <nav className="h-16 flex items-center justify-between px-8 border-b border-white/5 glass-effect sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-2 group text-decoration-none">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.4)]">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-white tracking-tight group-hover:text-emerald-400 transition-colors">Seka Kama</span>
        </Link>
        <Link href="/login" className="text-xs font-bold uppercase tracking-widest text-emerald-500 hover:text-emerald-400">Launch Twin</Link>
      </nav>

      <main className="max-w-4xl mx-auto py-24 px-8 space-y-16 animate-in fade-in slide-in-from-bottom-8">
        <section className="space-y-6">
          <h1 className="text-5xl font-extrabold text-white tracking-tight leading-tight">
            Protecting the Pride through <br />
            <span className="text-emerald-500">Digital Intelligence.</span>
          </h1>
          <p className="text-xl text-slate-400 leading-relaxed font-light">
            Seka Kama is a next-generation conservation platform that harmonizes advanced geospatial data 
            with machine learning to protect lion populations in the Greater Mara ecosystem.
          </p>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-12 border-t border-white/5">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-emerald-500">
               <Target className="w-5 h-5" />
               <h3 className="font-bold uppercase tracking-widest text-xs">Our Mission</h3>
            </div>
            <p className="text-slate-400 leading-relaxed">
              To provide conservancy managers and researchers with the "What-If" capabilities needed to 
              navigate the complex balance between human development and wildlife preservation.
            </p>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-emerald-500">
               <Globe className="w-5 h-5" />
               <h3 className="font-bold uppercase tracking-widest text-xs">The Digital Twin</h3>
            </div>
            <p className="text-slate-400 leading-relaxed">
              We leverage VIIRS DNB, LandDX, and WDPA datasets to simulate 271,211 individual 1km² 
              grid cells, ensuring a granular understanding of every acre in the ecosystem.
            </p>
          </div>
        </div>

        <section className="py-20 text-center space-y-8 border-t border-white/5">
           <h2 className="text-2xl font-bold text-white">Join the New Era of Conservation</h2>
           <div className="flex justify-center gap-4">
              <Link href="/register" className="px-8 py-3 bg-emerald-500 text-white font-bold rounded-xl shadow-lg hover:bg-emerald-400 transition-all">Create Account</Link>
              <Link href="/contact" className="px-8 py-3 bg-white/5 border border-white/10 text-white font-bold rounded-xl hover:bg-white/10 transition-all">Get in Touch</Link>
           </div>
        </section>
      </main>

      <footer className="py-12 border-t border-white/5 text-center text-slate-600 text-[10px] font-bold uppercase tracking-widest">
         &copy; 2026 Seka Kama Conservancy · Nairobi · Kenya
      </footer>
    </div>
  );
}
