'use client';

import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Cpu, Brain, Zap, ShieldAlert } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function IntelligencePage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const capabilities = [
    {
      title: 'Neural Defense',
      desc: 'AI-driven threat detection identifying poaching activities before they enter the perimeter.',
      icon: ShieldAlert
    },
    {
      title: 'Predictive Modeling',
      desc: 'XGBoost ensemble methods predictive of population shifts with 84% statistical confidence.',
      icon: Brain
    },
    {
      title: 'Real-time Processing',
      desc: 'Instant computation of "What-If" scenarios across 271,000+ individual grid cells.',
      icon: Zap
    }
  ];

  return (
    <div className="bg-[#f9f9f9] min-h-screen flex flex-col selection:bg-[#775a19]/10 selection:text-[#4e3700]">
      <Navbar />

      <main className="max-w-[1440px] mx-auto px-6 md:px-20 py-24 flex-grow w-full">
        <section className={`max-w-4xl mb-24 ${mounted ? 'animate-in' : 'opacity-0'}`}>
          <p className="text-[11px] font-bold text-[#775a19] mb-4 tracking-[0.3em] uppercase">
            COMPUTATIONAL ECOLOGY
          </p>
          <h1 className="text-5xl md:text-[68px] leading-tight text-[#1a1c1c] mb-8 font-normal tracking-tight">
            The <span className="italic font-light text-[#4e3700]">Intelligence Layer</span>
          </h1>
          <p className="text-lg md:text-xl leading-relaxed text-[#4e4639] font-light max-w-2xl">
            SekaNet is the neural backbone of our digital twin. Utilizing gradient-boosted tree architectures to predict biodiversity trends and simulate the impact of human expansion.
          </p>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-32">
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

        <section className={`grid grid-cols-1 lg:grid-cols-2 gap-20 items-center border-t border-[#d1c5b4]/60 pt-24 ${mounted ? 'animate-in' : 'opacity-0'}`} style={{ animationDelay: '500ms', animationFillMode: 'both' }}>
           <div className="relative group p-4">
              <div className="absolute inset-0 bg-[#d1c5b4]/20 blur-2xl opacity-50 group-hover:opacity-100 transition-opacity" />
              <div className="relative bg-white border border-[#d1c5b4]/60 p-8 shadow-enterprise">
                <div className="flex justify-between items-center mb-10">
                   <div className="flex gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#ba1a1a]" />
                      <div className="w-3 h-3 rounded-full bg-[#e9c176]" />
                      <div className="w-3 h-3 rounded-full bg-[#1db954]" />
                   </div>
                   <span className="text-[10px] font-mono font-bold text-[#7f7667] uppercase tracking-widest leading-none">Status: Optimising</span>
                </div>
                <div className="space-y-6">
                   <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-bold text-[#775a19] uppercase tracking-widest">
                         <span>XGB Ensemble Confidence</span>
                         <span>94.2%</span>
                      </div>
                      <div className="h-1.5 w-full bg-[#f3f3f3] overflow-hidden">
                         <div className="h-full bg-[#775a19] w-[94.2%]" />
                      </div>
                   </div>
                   <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-bold text-[#775a19] uppercase tracking-widest">
                         <span>Spatial Data Ingestion</span>
                         <span>Synchronized</span>
                      </div>
                      <div className="h-1.5 w-full bg-[#f3f3f3] overflow-hidden">
                         <div className="h-full bg-[#775a19] w-full" />
                      </div>
                   </div>
                   <div className="pt-6 border-t border-[#d1c5b4]/40 font-mono text-[11px] text-[#4e4639]">
                      <p className="text-[#ba1a1a] mb-1">{`[CRITICAL] Corridor-7 Path Obstructed`}</p>
                      <p>{`> Rerunning Simulation...`}</p>
                      <p className="text-[#1db954]">{`> Alternative Path Identified (99.1% Suitabilty)`}</p>
                   </div>
                </div>
              </div>
           </div>

           <div className="space-y-8">
              <h2 className="text-4xl font-serif font-medium text-[#1a1c1c] tracking-tight leading-snug">
                Engineered for <br />
                <span className="italic font-light text-[#4e3700]">Actionable Foresight</span>
              </h2>
              <p className="text-base text-[#4e4639] font-light leading-relaxed">
                We believe that data without intelligence is noise. SekaNet processes millions of data points annually—from vegetation indices to nightlight trends—providing conservancy managers with the "What-If" capabilities needed to make informed decisions for a shared future.
              </p>
              <div className="flex gap-10 pt-4">
                 <div>
                    <p className="text-[28px] font-serif text-[#1a1c1c] mb-1">0.15s</p>
                    <p className="text-[10px] font-bold text-[#775a19] uppercase tracking-widest">Inference Latency</p>
                 </div>
                 <div>
                    <p className="text-[28px] font-serif text-[#1a1c1c] mb-1">10yr</p>
                    <p className="text-[10px] font-bold text-[#775a19] uppercase tracking-widest">Historical Baseline</p>
                 </div>
              </div>
           </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
