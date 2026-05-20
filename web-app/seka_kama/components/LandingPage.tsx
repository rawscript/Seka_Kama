'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Statistic {
  label: string;
  value: string;
  change?: string;
}

const statistics: Statistic[] = [
  { label: 'Lion Population', value: '465', change: '-3.1%' },
  { label: 'Protected Area Coverage', value: '1,511 km²', change: '+2.4%' },
  { label: 'Active Conservancies', value: '17', change: '0%' },
  { label: 'Nightlight Trend', value: '+4.2%', change: '+0.8%' },
];

const features = [
  {
    title: 'Spatial Analysis',
    description: 'Analyze lion distribution across 271,211 grid cells with real-time density visualization.',
    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  },
  {
    title: 'What-If Scenarios',
    description: 'Simulate infrastructure development and predict impacts on lion abundance.',
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  },
  {
    title: 'Kepler.gl Explorer',
    description: 'Interactive geospatial analytics with professional visualization tools.',
    icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7',
  },
  {
    title: 'AI Narratives',
    description: 'Generate conservation reports and ecological interpretations from model outputs.',
    icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z',
  },
];

export default function LandingPage() {
  const [animatedStats, setAnimatedStats] = useState(statistics.map(() => 0));

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedStats([465, 1511, 17, 4.2]);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="landing-container bg-slate-950 min-h-screen text-white">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center text-center px-8 py-20 overflow-hidden">
        {/* Background Image Layer */}
        <div className="absolute inset-0 z-0">
          <img 
            src="/seka_kama_hero_lion_1778841687196.png" 
            alt="Majestic Lion Background" 
            className="w-full h-full object-cover object-center opacity-40 scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/60 via-slate-950/90 to-slate-950" />
        </div>

        <div className="relative z-10 max-w-4xl">
          <h1 className="text-7xl md:text-8xl font-black mb-6 bg-gradient-to-r from-white via-white to-emerald-500 bg-clip-text text-transparent tracking-tighter">
            Seka Kama
            <span className="block text-3xl text-emerald-400 mt-4 font-bold uppercase tracking-[0.3em]">Digital Twin</span>
          </h1>
          <p className="text-xl md:text-2xl text-slate-300 mb-10 leading-relaxed font-light max-w-2xl mx-auto">
            Advanced geospatial analytics for the Greater Mara. 
            Empowering conservation with predictive intelligence.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Link href="/login" className="px-10 py-4 bg-emerald-500 text-white rounded-2xl font-black text-lg hover:bg-emerald-400 transition-all shadow-[0_20px_50px_rgba(16,185,129,0.3)] hover:-translate-y-1">
              Launch Intelligence Console
            </Link>
            <Link href="/demo" className="px-10 py-4 border-2 border-white/10 backdrop-blur-xl rounded-2xl font-bold text-lg hover:bg-white/5 transition-all">
              Platform Walkthrough
            </Link>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="py-16 bg-white/5">
        <div className="max-w-6xl mx-auto px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          {statistics.map((stat, idx) => (
            <div key={stat.label} className="text-center p-8 bg-white/5 rounded-2xl backdrop-blur-xl">
              <div className="text-4xl font-bold text-emerald-500">{stat.value}</div>
              <div className="text-xs text-slate-500 uppercase tracking-widest mt-2">{stat.label}</div>
              {stat.change && (
                <div className={`text-xs mt-2 ${stat.change.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {stat.change}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-center text-3xl font-bold mb-16">Platform Capabilities</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature) => (
              <div key={feature.title} className="p-8 bg-white/5 rounded-2xl hover:bg-white/10 transition-all group">
                <div className="w-12 h-12 text-emerald-500 mb-4 group-hover:scale-110 transition-transform">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={feature.icon} />
                  </svg>
                </div>
                <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Technology Stack */}
      <section className="py-24 bg-white/5 px-8 text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-12">Engineered with Precision</h2>
          <div className="flex flex-wrap justify-center gap-12">
            {[
              { name: 'XGBoost', desc: 'Predictive Modeling' },
              { name: 'PostGIS', desc: 'Spatial Database' },
              { name: 'Kepler.gl', desc: 'Geospatial Analytics' },
              { name: 'FastAPI', desc: 'API Framework' },
              { name: 'Next.js', desc: 'Frontend Platform' },
              { name: 'StepFun AI', desc: 'LLM Integration' }
            ].map(tech => (
              <div key={tech.name}>
                <span className="block font-bold text-white mb-1 tracking-tight">{tech.name}</span>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest">{tech.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 bg-[#020617]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8 text-center md:text-left">
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">&copy; 2026 Seka Kama Conservancy. All rights reserved.</p>
            <p className="text-[9px] text-slate-600 font-mono italic">Data sources: VIIRS DNB, LandDX, ESA WorldCover, WDPA</p>
          </div>
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-4">
            <Link href="/about" className="text-xs font-bold text-slate-400 hover:text-emerald-500 transition-colors uppercase tracking-widest">About</Link>
            <Link href="/documentation" className="text-xs font-bold text-slate-400 hover:text-emerald-500 transition-colors uppercase tracking-widest">Documentation</Link>
            <Link href="/data-standards" className="text-xs font-bold text-slate-400 hover:text-emerald-500 transition-colors uppercase tracking-widest">Data Standards</Link>
            <Link href="/privacy" className="text-xs font-bold text-slate-400 hover:text-emerald-500 transition-colors uppercase tracking-widest">Privacy Policy</Link>
            <Link href="/contact" className="text-xs font-bold text-slate-400 hover:text-emerald-500 transition-colors uppercase tracking-widest">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}