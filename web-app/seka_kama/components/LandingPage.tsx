'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Statistic {
  label: string;
  value: string;
  change: string;
  changeType: 'negative' | 'positive' | 'neutral';
}

const statistics: Statistic[] = [
  { label: 'Lion Population', value: '465', change: '-3.1%', changeType: 'negative' },
  { label: 'Protected Area', value: '1,511 km²', change: '+2.4%', changeType: 'positive' },
  { label: 'Active Conservancies', value: '17', change: 'Stable', changeType: 'neutral' },
  { label: 'Nightlight Trend', value: '+4.2%', change: '+0.8% YoY', changeType: 'positive' },
];

const capabilities = [
  {
    num: '01',
    title: 'Sentinel Analytics',
    slug: 'sentinel-analytics',
    description: 'Real-time biological monitoring using satellite telemetry and on-ground acoustic sensors to track keystone species. Analyze distribution across 271,211 grid cells.',
    icon: (
      <svg className="w-9 h-9 text-[#775a19]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 18c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2v2" />
        <path d="M10 22a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
        <path d="M14 14l4-4" />
        <path d="M18 6h2" />
        <path d="M14 18h4" />
      </svg>
    )
  },
  {
    num: '02',
    title: 'Spatial Synthesis',
    slug: 'spatial-synthesis',
    description: 'Ultra-high resolution terrain mapping that simulates migratory paths and infrastructure impacts with 99.8% environmental fidelity.',
    icon: (
      <svg className="w-9 h-9 text-[#775a19]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="m8 3 4 8 5-5 5 15H2L8 3z" />
      </svg>
    )
  },
  {
    num: '03',
    title: 'Neural Defense',
    slug: 'neural-defense',
    description: 'AI-driven threat detection identifying poaching activities before they enter the protected perimeter using predictive ecological narratives.',
    icon: (
      <svg className="w-9 h-9 text-[#775a19]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    )
  }
];

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="bg-[#f9f9f9] text-[#1a1c1c] overflow-x-hidden antialiased selection:bg-[#775a19]/10 selection:text-[#4e3700]">

      {/* Top Navigation */}
      <nav className="top-0 bg-[#f9f9f9]/90 backdrop-blur-md border-b border-[#d1c5b4]/60 z-50 sticky w-full">
        <div className="flex justify-between items-center w-full px-6 md:px-20 py-5 max-w-[1440px] mx-auto">
          <Link href="/" className="font-serif font-normal tracking-tight text-2xl text-[#1a1c1c] italic hover:opacity-80 transition-opacity">
            Seka Kama
          </Link>
          <div className="hidden md:flex items-center gap-10">
            <Link href="/capabilities" className="text-[11px] uppercase tracking-[0.2em] text-[#775a19] font-bold border-b border-[#775a19] pb-1">
              Capabilities
            </Link>
            <Link href="/geospatial" className="text-[11px] uppercase tracking-[0.2em] text-[#4e4639] hover:text-[#1a1c1c] transition-colors font-bold">
              Geospatial
            </Link>
            <Link href="/intelligence" className="text-[11px] uppercase tracking-[0.2em] text-[#4e4639] hover:text-[#1a1c1c] transition-colors font-bold">
              Intelligence
            </Link>
            <Link href="/documentation" className="text-[11px] uppercase tracking-[0.2em] text-[#4e4639] hover:text-[#1a1c1c] transition-colors font-bold">
              Documentation
            </Link>
          </div>
          <Link href="/console" className="text-[11px] font-bold uppercase tracking-[0.15em] px-6 py-2.5 border border-[#777667] bg-transparent text-[#1a1c1c] hover:bg-[#775a19] hover:text-white hover:border-[#775a19] transition-all duration-300">
            Launch Console
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative w-full min-h-screen flex items-center overflow-hidden bg-[#f9f9f9]">
        {/* Fixed Background Layer Group — Reconfigured to eliminate anti-aliasing lines */}
        <div className="absolute inset-0 z-0 select-none pointer-events-none bg-[#f9f9f9]">
          <div className="w-full h-full relative mix-blend-multiply opacity-90">
            <img
              alt="Majestic Lion Profile View in Savannah"
              className="w-full h-full object-cover object-[center_35%] transition-transform duration-[20s] ease-out animate-[slow-zoom_20s_linear_infinite_alternate]"
              src="https://lh3.googleusercontent.com/aida/ADBb0ugLJHpQP28XrUtF2yN3Rx6qiVEqWBhrJHQD8Tpojaky6reqpddr7ZjSc5uNDHMmhNBE46PNMn1-hgkJjfvW_Z-zNgyfqtTD4Q44whA9399itcGYEEnoAaQLa4cXy5RIzct1wUTkt8Ob2qHg5rsI8ZZrKfPSwWnm2V3_hH7k8Ih-VE3kQ2EnQLR9nc-_6HUOCdfY1MOxuPH-HVx7P_-cAD2nAm6NFtxT6YisVGzz8DI5EolS1wmaTV8srw"
            />
          </div>
          {/* Typographic contrast gradients shifted directly to a neutral space wrapper */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#f9f9f9] via-[#f9f9f9]/40 to-transparent md:w-2/3 lg:w-1/2" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#f9f9f9] via-transparent to-transparent h-40 bottom-0" />
        </div>

        <div className="relative z-10 w-full max-w-[1440px] mx-auto px-6 md:px-20 py-20">
          <div className={`max-w-2xl ${mounted ? 'animate-in' : 'opacity-0'}`}>
            <p className="text-[11px] font-bold text-[#775a19] mb-4 tracking-[0.3em] uppercase">
              CONSERVATION REIMAGINED
            </p>
            <h1 className="text-5xl md:text-[68px] md:leading-[76px] text-[#1a1c1c] mb-6 font-normal tracking-tight">
              Seka Kama: <br />
              <span className="italic font-light text-[#4e3700]">The Digital Twin</span>
            </h1>
            <p className="text-base md:text-lg leading-relaxed text-[#4e4639] mb-10 max-w-lg font-light">
              Orchestrating the future of biodiversity through real-time geospatial intelligence and predictive ecology for the Greater Mara ecosystem.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/explorer" className="bg-[#775a19] text-white px-8 py-4 text-[11px] font-bold tracking-widest uppercase hover:bg-[#4e3700] transition-colors shadow-sm">
                Explore Ecosystem
              </Link>
              <Link href="/whitepaper" className="border border-[#777667] text-[#1a1c1c] px-8 py-4 text-[11px] font-bold tracking-widest uppercase hover:bg-black/5 transition-colors">
                Read Whitepaper
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Metrics Section */}
      <section className="bg-white py-16 border-y border-[#d1c5b4]/60">
        <div className="max-w-[1440px] mx-auto px-6 md:px-20 grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-6">
          {statistics.map((stat, idx) => (
            <div
              key={stat.label}
              className={`flex flex-col items-center text-center p-4 md:border-r border-[#d1c5b4]/50 last:border-0 ${mounted ? 'animate-in' : 'opacity-0'}`}
              style={{ animationDelay: `${idx * 75}ms`, fillMode: 'both' }}
            >
              <span className="text-[11px] font-bold text-[#775a19] mb-2 uppercase tracking-wider">{stat.label}</span>
              <span className="font-serif text-4xl md:text-5xl text-[#1a1c1c] font-normal tracking-tight">{stat.value}</span>
              <span className="mt-2.5">
                <span className={`enterprise-badge ${stat.changeType === 'negative' ? 'border-rose-200 bg-rose-50/50 text-rose-700' :
                    stat.changeType === 'positive' ? 'border-amber-200 bg-amber-50/50 text-[#775a19]' :
                      'border-slate-200 bg-slate-50 text-slate-500'
                  }`}>
                  {stat.change}
                </span>
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Quote Section */}
      <section className="bg-[#f9f9f9] py-28 flex flex-col items-center text-center px-6 overflow-hidden">
        <div className={`max-w-4xl ${mounted ? 'animate-in' : 'opacity-0'}`} style={{ animationDelay: '200ms', fillMode: 'both' }}>
          <span className="text-[#c5a059]/40 text-6xl block mb-2 font-serif italic select-none">“</span>
          <h2 className="text-3xl md:text-4xl md:leading-relaxed italic text-[#1a1c1c] font-light max-w-3xl mx-auto">
            Intelligence is the silent guardian of the wild.
          </h2>
          <div className="mt-8 flex items-center justify-center gap-4">
            <div className="h-[1px] w-10 bg-[#d1c5b4]" />
            <span className="text-[10px] font-bold tracking-[0.25em] text-[#7f7667] uppercase">THE SEKA KAMA MANIFESTO</span>
            <div className="h-[1px] w-10 bg-[#d1c5b4]" />
          </div>
        </div>
      </section>

      {/* Capabilities Grid */}
      <section className="bg-[#f3f3f3] py-24 border-t border-[#d1c5b4]/40">
        <div className="max-w-[1440px] mx-auto px-6 md:px-20">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-12 border-b border-[#d1c5b4] pb-6">
            <div>
              <span className="text-[11px] font-bold text-[#775a19] tracking-widest uppercase">ECOSYSTEM</span>
              <h3 className="text-2xl md:text-3xl mt-1 font-serif font-medium">Platform Capabilities</h3>
            </div>
            <p className="text-sm text-[#4e4639] max-w-xs mt-3 sm:mt-0 sm:text-right font-light">
              Advanced biological computation meeting world-class surveillance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {capabilities.map((item, idx) => (
              <div
                key={item.num}
                className={`enterprise-card bg-white group flex flex-col justify-between ${mounted ? 'animate-in' : 'opacity-0'}`}
                style={{ animationDelay: `${idx * 100}ms`, fillMode: 'both' }}
              >
                <div>
                  <div className="flex justify-between items-start mb-10">
                    <div className="p-3 bg-[#775a19]/5 border border-[#775a19]/10 rounded-sm group-hover:scale-105 transition-transform duration-300">
                      {item.icon}
                    </div>
                    <span className="text-[11px] font-mono font-bold text-[#7f7667]">{item.num}</span>
                  </div>
                  <h4 className="text-xl font-serif font-medium text-[#1a1c1c] mb-4 group-hover:text-[#775a19] transition-colors">
                    {item.title}
                  </h4>
                  <p className="text-sm leading-relaxed text-[#4e4639] mb-6 font-light">
                    {item.description}
                  </p>
                </div>
                <Link href={`/capabilities/${item.slug}`} className="text-[11px] font-bold text-[#775a19] border-b border-transparent group-hover:border-[#775a19] transition-all inline-block pb-0.5 self-start tracking-wider uppercase">
                  LEARN MORE &rarr;
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Infrastructure Section */}
      <section className="bg-[#f9f9f9] py-24 border-t border-[#d1c5b4]/40 overflow-hidden">
        <div className="max-w-[1440px] mx-auto px-6 md:px-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className={mounted ? 'animate-in' : 'opacity-0'}>
              <span className="text-[11px] font-bold text-[#775a19] tracking-widest mb-3 block uppercase">THE ARCHITECTURE</span>
              <h2 className="text-3xl md:text-4xl text-[#1a1c1c] font-normal mb-6 tracking-tight">
                Engineered with Precision
              </h2>
              <p className="text-base text-[#4e4639] mb-10 font-light leading-relaxed">
                Our underlying framework mirrors the complexity of the natural world. Utilizing XGBoost modeling and PostGIS spatial databases to protect biodiversity vectors.
              </p>

              <div className="space-y-6">
                <div className="flex gap-6 pb-6 border-b border-[#d1c5b4]/60">
                  <div className="text-[10px] font-mono font-bold text-[#775a19] pt-1.5 tracking-wider">CORE-A</div>
                  <div>
                    <h5 className="text-lg font-serif font-medium text-[#1a1c1c] mb-1">Geospatial Analytics</h5>
                    <p className="text-sm text-[#4e4639] font-light">High-performance Kepler.gl visualization layers engineered for spatial exploration pipelines.</p>
                  </div>
                </div>
                <div className="flex gap-6 pb-6 border-b border-[#d1c5b4]/60">
                  <div className="text-[10px] font-mono font-bold text-[#775a19] pt-1.5 tracking-wider">CORE-B</div>
                  <div>
                    <h5 className="text-lg font-serif font-medium text-[#1a1c1c] mb-1">Intelligence Layer</h5>
                    <p className="text-sm text-[#4e4639] font-light">FastAPI enterprise architecture deeply integrated with StepFun AI contextual mapping solutions.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className={`relative group ${mounted ? 'animate-in' : 'opacity-0'}`} style={{ animationDelay: '150ms', fillMode: 'both' }}>
              <div className="absolute -inset-3 border border-[#775a19] opacity-15 group-hover:opacity-30 transition-opacity duration-500" />
              <img
                alt="High-tech conservation mapping monitor setup"
                className="w-full h-[540px] object-cover filter contrast-[1.02] brightness-[0.98] transition-all duration-700"
                src="https://lh3.googleusercontent.com/aida/ADBb0ujjSjkRp9Jb551KPzT8I5-PKodLluB7t0nG_MGTL2Yra0oom8aRVQvGl7PmcoZA-V8T1Ayef5iI2ZsY-WAMefYMHDE7Ll2rEqVlKOcWE02P8VmjNBOmyzhoD5YpljSQjjECKXtaqh_HaSnn3xtZ6RWBnc0Q4MHrY_TGHg7Ma_P-MDx5xMObpIxkuhWZ74vVdVU3yC9yjIT9gZ4A3wQwTmmcdHW0kDg-ImAe_4rmek3LJ_RaxeVesIqafpg"
              />
              <div className="absolute bottom-6 right-6 bg-white/95 backdrop-blur-md p-5 shadow-xl border border-[#d1c5b4]/80">
                <p className="text-[10px] font-mono font-bold text-[#1a1c1c] mb-1 tracking-widest">STATUS: SYSTEM OPTIMAL</p>
                <p className="text-xs text-[#4e4639] font-light">Seka Kama Computational Interface v4.2</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-[#d1c5b4]/80">
        <div className="w-full px-6 md:px-20 py-16 flex flex-col items-center gap-6 max-w-[1440px] mx-auto text-center">
          <div className="font-serif text-2xl text-[#1a1c1c] italic font-normal tracking-tight">Seka Kama</div>
          <div className="flex flex-wrap justify-center gap-x-10 gap-y-3 mb-6">
            <Link href="/about" className="text-[11px] font-bold uppercase tracking-widest text-[#7f7667] hover:text-[#775a19] transition-colors">About</Link>
            <Link href="/documentation" className="text-[11px] font-bold uppercase tracking-widest text-[#7f7667] hover:text-[#775a19] transition-colors">Documentation</Link>
            <Link href="/data-standards" className="text-[11px] font-bold uppercase tracking-widest text-[#7f7667] hover:text-[#775a19] transition-colors">Data Standards</Link>
            <Link href="/privacy" className="text-[11px] font-bold uppercase tracking-widest text-[#7f7667] hover:text-[#775a19] transition-colors">Privacy Policy</Link>
            <Link href="/contact" className="text-[11px] font-bold uppercase tracking-widest text-[#7f7667] hover:text-[#775a19] transition-colors">Contact</Link>
          </div>
          <div className="w-16 h-[1px] bg-[#d1c5b4]/60 mb-4" />
          <p className="text-[11px] font-semibold tracking-wider text-[#d1c5b4] uppercase">
            &copy; 2026 Seka Kama Conservancy. All pipelines operational.
          </p>
          <p className="text-[10px] text-[#7f7667]/70 font-mono tracking-tight max-w-md">
            Telemetry Inputs: VIIRS DNB, LandDX, ESA WorldCover, WDPA Ecosystem Core
          </p>
        </div>
      </footer>
    </div>
  );
}