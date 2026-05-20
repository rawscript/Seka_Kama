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
      <section className="min-h-[80vh] flex items-center justify-center text-center px-8 py-16">
        <div className="max-w-3xl">
          <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-white to-emerald-500 bg-clip-text text-transparent">
            Seka Kama
            <span className="block text-2xl text-emerald-500 mt-2">Digital Twin</span>
          </h1>
          <p className="text-xl text-slate-400 mb-8 leading-relaxed">
            Advanced geospatial analytics for lion conservation.
            Predict, simulate, and visualize the impact of human infrastructure on wildlife.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/login" className="px-8 py-3 bg-emerald-500 rounded-xl font-bold hover:bg-emerald-400 transition-all">
              Launch Application
            </Link>
            <Link href="/demo" className="px-8 py-3 border-2 border-emerald-500 rounded-xl font-bold hover:bg-emerald-500/10 transition-all">
              View Demo
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
              { name: 'Llama 3', desc: 'LLM Integration' }
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