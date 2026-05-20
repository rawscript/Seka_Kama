'use client';

import Link from 'next/link';
import { ShieldCheck, Play, ArrowRight, Zap, Globe, BarChart3 } from 'lucide-react';

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-[#020617] text-slate-200">
      <nav className="h-16 flex items-center justify-between px-8 border-b border-white/5 glass-effect sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.4)]">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-white tracking-tight">Seka Kama</span>
        </Link>
        <Link href="/login" className="px-4 py-1.5 bg-emerald-500 text-white text-xs font-bold rounded-lg hover:bg-emerald-400 transition-all uppercase tracking-widest">Login</Link>
      </nav>

      <main className="max-w-6xl mx-auto py-20 px-8 text-center space-y-16">
        <div className="space-y-6 animate-in fade-in slide-in-from-top-8 duration-700">
           <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-bold uppercase tracking-widest">
             Interactive Preview
           </div>
           <h1 className="text-6xl font-extrabold text-white tracking-tighter max-w-4xl mx-auto">
             Experience the <span className="text-emerald-500">Greater Mara</span> like never before.
           </h1>
           <p className="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed font-light">
             Our demo allows you to explore the baseline lion density and see how SekaNet interprets 
             environmental shifts in real-time.
           </p>
        </div>

        {/* Video Placeholder / Big visual */}
        <div className="relative aspect-video w-full max-w-4xl mx-auto rounded-[2.5rem] overflow-hidden border border-white/10 shadow-[0_40px_120px_rgba(0,0,0,0.9)] group">
           <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1546182990-dffeafbe841d?auto=format&fit=crop&q=80&w=2000')] bg-cover bg-center opacity-40 grayscale group-hover:grayscale-0 transition-all duration-1000 group-hover:scale-105" />
           <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-transparent" />
           
           <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
              <div className="w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center shadow-2xl shadow-emerald-500/40 relative">
                 <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-20" />
                 <Play className="w-8 h-8 text-white fill-current ml-1" />
              </div>
              <p className="text-sm font-bold uppercase tracking-[0.3em] text-white">Watch Platform Walkthrough</p>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-12">
           <DemoFeature icon={Globe} title="Regional Insights" desc="Explore 271,000+ cells of ecological data at 1km² resolution." />
           <DemoFeature icon={Zap} title="Predictive AI" desc="Simulate impacts of infrastructure on wildlife with 84% accuracy." />
           <DemoFeature icon={BarChart3} title="Risk Matrices" desc="Identify high-priority conservation corridors automatically." />
        </div>

        <section className="py-20 border-t border-white/5 space-y-8">
           <h2 className="text-3xl font-bold text-white tracking-tight">Ready to start simulating?</h2>
           <Link href="/register" className="inline-flex items-center gap-3 px-10 py-5 bg-white text-[#020617] font-black rounded-2xl hover:bg-emerald-500 hover:text-white transition-all group scale-105">
              GET FULL ACCESS <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
           </Link>
        </section>
      </main>
    </div>
  );
}

function DemoFeature({ icon: Icon, title, desc }: { icon: any, title: string, desc: string }) {
  return (
    <div className="p-8 enterprise-card transition-all hover:-translate-y-2 hover:border-emerald-500/30">
       <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6 mx-auto">
          <Icon className="w-6 h-6 text-emerald-500" />
       </div>
       <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
       <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
    </div>
  );
}
