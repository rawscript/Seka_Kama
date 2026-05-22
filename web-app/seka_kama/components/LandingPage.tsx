'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

interface Statistic {
  label: string;
  value: string;
  change: string;
  changeType: 'negative' | 'positive' | 'neutral';
  delay: string;
}

const statistics: Statistic[] = [
  { label: 'Lion Population', value: '465', change: '-3.1%', changeType: 'negative', delay: '0ms' },
  { label: 'Protected Area', value: '1,511 km²', change: '+2.4%', changeType: 'positive', delay: '100ms' },
  { label: 'Active Conservancies', value: '17', change: 'Stable', changeType: 'neutral', delay: '200ms' },
  { label: 'Nightlight Trend', value: '+4.2%', change: '+0.8% YoY', changeType: 'positive', delay: '300ms' },
];

const capabilities = [
  {
    num: '01',
    title: 'Sentinel Analytics',
    description: 'Real-time biological monitoring using satellite telemetry and on-ground acoustic sensors to track keystone species. Analyze distribution across 271,211 grid cells.',
    delay: '0ms',
    // Microscope/Biotech alternative path
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
    description: 'Ultra-high resolution terrain mapping that simulates migratory paths and infrastructure impacts with 99.8% environmental fidelity.',
    delay: '150ms',
    // Landscape/Mountains alternative path
    icon: (
      <svg className="w-9 h-9 text-[#775a19]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="m8 3 4 8 5-5 5 15H2L8 3z" />
      </svg>
    )
  },
  {
    num: '03',
    title: 'Neural Defense',
    description: 'AI-driven threat detection identifying poaching activities before they enter the protected perimeter using predictive ecological narratives.',
    delay: '300ms',
    // Security/Shield alternative path
    icon: (
      <svg className="w-9 h-9 text-[#775a19]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    )
  }
];

export default function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  // Setup intersection observer to trigger typography & block reveal fades smoothly
  useEffect(() => {
    const observerOptions = {
      threshold: 0.15,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
        }
      });
    }, observerOptions);

    const elements = containerRef.current?.querySelectorAll('.reveal-item');
    elements?.forEach((el) => observer.observe(el));

    return () => {
      elements?.forEach((el) => observer.unobserve(el));
    };
  }, []);

  return (
    <div ref={containerRef} className="bg-[#f9f9f9] text-[#1a1c1c] font-['Hanken_Grotesk'] overflow-x-hidden antialiased">

      {/* Injecting external Google fonts directly into layout context dynamically */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Hanken+Grotesk:wght@400;500;600&display=swap');
        
        .font-serif-display { font-family: 'Playfair Display', serif; }
        .hero-custom-gradient {
          background: linear-gradient(to right, rgba(255,255,255,0.9) 30%, rgba(255,255,255,0) 100%);
        }
        .reveal-item {
          opacity: 0;
          transform: translateY(30px);
          transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .reveal-item.active {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>

      {/* Top Navigation */}
      <nav className="top-0 bg-[#f9f9f9] border-b border-[#d1c5b4] z-50 sticky w-full">
        <div className="flex justify-between items-center w-full px-6 md:px-20 py-6 max-w-[1440px] mx-auto">
          <div className="font-serif-display text-2xl text-[#1a1c1c] italic tracking-tight font-medium">
            Seka Kama
          </div>
          <div className="hidden md:flex gap-10">
            <Link href="#" className="font-['Hanken_Grotesk'] text-[12px] uppercase tracking-[0.15em] text-[#775a19] font-semibold border-b border-[#775a19] pb-1">
              Capabilities
            </Link>
            <Link href="#" className="font-['Hanken_Grotesk'] text-[12px] uppercase tracking-[0.15em] text-[#4e4639] hover:text-[#1a1c1c] transition-colors duration-300 font-semibold">
              Geospatial
            </Link>
            <Link href="#" className="font-['Hanken_Grotesk'] text-[12px] uppercase tracking-[0.15em] text-[#4e4639] hover:text-[#1a1c1c] transition-colors duration-300 font-semibold">
              Intelligence
            </Link>
            <Link href="#" className="font-['Hanken_Grotesk'] text-[12px] uppercase tracking-[0.15em] text-[#4e4639] hover:text-[#1a1c1c] transition-colors duration-300 font-semibold">
              Documentation
            </Link>
          </div>
          <button className="font-['Hanken_Grotesk'] text-[12px] font-semibold uppercase tracking-[0.15em] px-6 py-2 border border-[#777667] hover:bg-[#c5a059] hover:text-[#4e3700] transition-all duration-300">
            Launch Console
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative w-full h-[90vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            alt="Majestic Lion in Savanna"
            className="w-full h-full object-cover object-center"
            src="https://lh3.googleusercontent.com/aida/ADBb0ugLJHpQP28XrUtF2yN3Rx6qiVEqWBhrJHQD8Tpojaky6reqpddr7ZjSc5uNDHMmhNBE46PNMn1-hgkJjfvW_Z-zNgyfqtTD4Q44whA9399itcGYEEnoAaQLa4cXy5RIzct1wUTkt8Ob2qHg5rsI8ZZrKfPSwWnm2V3_hH7k8Ih-VE3kQ2EnQLR9nc-_6HUOCdfY1MOxuPH-HVx7P_-cAD2nAm6NFtxT6YisVGzz8DI5EolS1wmaTV8srw"
          />
          <div className="absolute inset-0 hero-custom-gradient" />
        </div>
        <div className="relative z-10 w-full max-w-[1440px] mx-auto px-6 md:px-20">
          <div className="max-w-2xl reveal-item">
            <p className="font-['Hanken_Grotesk'] text-[12px] font-semibold text-[#775a19] mb-6 tracking-[0.3em] uppercase">
              CONSERVATION REIMAGINED
            </p>
            <h1 className="font-serif-display text-5xl md:text-[72px] md:leading-[80px] text-[#1a1c1c] mb-8 font-bold tracking-tight">
              Seka Kama: <br />
              <span className="italic font-normal">The Digital Twin</span>
            </h1>
            <p className="font-['Hanken_Grotesk'] text-18px md:text-[18px] leading-[28px] text-[#4e4639] mb-10 max-w-lg font-normal">
              Orchestrating the future of biodiversity through real-time geospatial intelligence and predictive ecology for the Greater Mara.
            </p>
            <div className="flex gap-6">
              <button className="bg-[#775a19] text-white px-8 py-4 font-['Hanken_Grotesk'] text-[12px] font-semibold tracking-widest uppercase hover:bg-[#c5a059] hover:text-[#4e3700] transition-colors shadow-sm">
                Explore Ecosystem
              </button>
              <button className="border border-[#777667] px-8 py-4 font-['Hanken_Grotesk'] text-[12px] font-semibold tracking-widest uppercase hover:bg-[#e8e8e8] transition-colors">
                Read Whitepaper
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Metrics Section */}
      <section className="bg-white py-20 border-b border-[#d1c5b4]">
        <div className="max-w-[1440px] mx-auto px-6 md:px-20 grid grid-cols-2 lg:grid-cols-4 gap-6">
          {statistics.map((stat) => (
            <div
              key={stat.label}
              className="reveal-item flex flex-col items-center text-center p-6 border-r border-[#d1c5b4] last:border-0"
              style={{ transitionDelay: stat.delay }}
            >
              <span className="font-['Hanken_Grotesk'] text-[12px] font-semibold text-[#775a19] mb-2 uppercase tracking-wider">{stat.label}</span>
              <span className="font-serif-display text-[48px] leading-[56px] text-[#1a1c1c] font-semibold">{stat.value}</span>
              <span className={`font-['Hanken_Grotesk'] text-[11px] font-medium mt-1 ${stat.changeType === 'negative' ? 'text-[#ba1a1a]' :
                  stat.changeType === 'positive' ? 'text-[#775a19]' : 'text-[#4e4639]'
                }`}>
                {stat.change}
              </span>
              <div className="w-8 h-[1px] bg-[#775a19] mt-4" />
            </div>
          ))}
        </div>
      </section>

      {/* Quote Section */}
      <section className="bg-[#f9f9f9] py-[120px] flex flex-col items-center text-center px-6 overflow-hidden">
        <div className="max-w-4xl reveal-item">
          <span className="text-[#c5a059] text-5xl block mb-6 font-serif-display font-black leading-none select-none">“</span>
          <h2 className="font-serif-display text-4xl md:text-[48px] md:leading-[56px] italic text-[#1a1c1c] font-semibold max-w-3xl mx-auto">
            "Intelligence is the silent guardian of the wild."
          </h2>
          <div className="mt-8 flex items-center justify-center gap-4">
            <div className="h-[1px] w-12 bg-[#d1c5b4]" />
            <span className="font-['Hanken_Grotesk'] text-[12px] font-semibold tracking-widest text-[#4e4639] uppercase">THE SEKA KAMA MANIFESTO</span>
            <div className="h-[1px] w-12 bg-[#d1c5b4]" />
          </div>
        </div>
      </section>

      {/* Capabilities Grid */}
      <section className="bg-[#f3f3f3] py-[120px]">
        <div className="max-w-[1440px] mx-auto px-6 md:px-20">
          <div className="flex justify-between items-end mb-12 border-b border-[#d1c5b4] pb-8 reveal-item">
            <div>
              <span className="font-['Hanken_Grotesk'] text-[12px] font-semibold text-[#775a19] tracking-widest uppercase">ECOSYSTEM</span>
              <h3 className="font-serif-display text-[32px] leading-[40px] font-semibold mt-2">Platform Capabilities</h3>
            </div>
            <div className="hidden md:block">
              <p className="font-['Hanken_Grotesk'] text-[16px] text-[#4e4639] max-w-xs text-right">
                Advanced biological computation meeting world-class surveillance.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {capabilities.map((item) => (
              <div
                key={item.num}
                className="reveal-item bg-white border border-[#d1c5b4] p-10 hover:border-[#775a19] transition-all duration-500 group flex flex-col justify-between"
                style={{ transitionDelay: item.delay }}
              >
                <div>
                  <div className="flex justify-between items-start mb-12">
                    {item.icon}
                    <span className="font-['Hanken_Grotesk'] text-[11px] font-medium text-[#7f7667]">{item.num}</span>
                  </div>
                  <h4 className="font-serif-display text-[24px] leading-[32px] text-[#1a1c1c] font-medium mb-6">
                    {item.title}
                  </h4>
                  <p className="font-['Hanken_Grotesk'] text-[16px] leading-[24px] text-[#4e4639] mb-8">
                    {item.description}
                  </p>
                </div>
                <Link href="#" className="font-['Hanken_Grotesk'] text-[12px] font-semibold text-[#775a19] border-b border-transparent group-hover:border-[#775a19] transition-all inline-block pb-1 self-start tracking-wider">
                  LEARN MORE
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Infrastructure Section */}
      <section className="bg-[#f9f9f9] py-[120px] overflow-hidden">
        <div className="max-w-[1440px] mx-auto px-6 md:px-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div className="reveal-item">
              <span className="font-['Hanken_Grotesk'] text-[12px] font-semibold text-[#775a19] tracking-widest mb-4 block uppercase">THE ARCHITECTURE</span>
              <h2 className="font-serif-display text-4xl md:text-[48px] md:leading-[56px] text-[#1a1c1c] font-semibold mb-8 leading-tight">
                Engineered with Precision
              </h2>
              <p className="font-['Hanken_Grotesk'] text-[18px] leading-[28px] text-[#4e4639] mb-12">
                Our underlying framework mirrors the complexity of the natural world. Utilizing XGBoost modeling and PostGIS spatial databases to protect biodiversity.
              </p>

              <div className="space-y-8">
                <div className="flex gap-6 pb-6 border-b border-[#d1c5b4]">
                  <div className="font-['Hanken_Grotesk'] text-[12px] font-semibold text-[#775a19] pt-1 tracking-wider">TECH-A</div>
                  <div>
                    <h5 className="font-serif-display text-[24px] leading-[32px] font-medium text-[#1a1c1c] mb-2">Geospatial Analytics</h5>
                    <p className="text-[#4e4639] font-['Hanken_Grotesk'] text-[16px]">High-performance Kepler.gl visualization for complex interactive spatial exploration.</p>
                  </div>
                </div>
                <div className="flex gap-6 pb-6 border-b border-[#d1c5b4]">
                  <div className="font-['Hanken_Grotesk'] text-[12px] font-semibold text-[#775a19] pt-1 tracking-wider">TECH-B</div>
                  <div>
                    <h5 className="font-serif-display text-[24px] leading-[32px] font-medium text-[#1a1c1c] mb-2">Intelligence Core</h5>
                    <p className="text-[#4e4639] font-['Hanken_Grotesk'] text-[16px]">FastAPI framework integrated with StepFun AI for deep ecological interpretations.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="reveal-item relative group">
              <div className="absolute -inset-4 border border-[#775a19] opacity-20 group-hover:opacity-40 transition-opacity" />
              <img
                alt="High-tech conservation outpost"
                className="w-full h-[600px] object-cover grayscale hover:grayscale-0 transition-all duration-1000"
                src="https://lh3.googleusercontent.com/aida/ADBb0ujjSjkRp9Jb551KPzT8I5-PKodLluB7t0nG_MGTL2Yra0oom8aRVQvGl7PmcoZA-V8T1Ayef5iI2ZsY-WAMefYMHDE7Ll2rEqVlKOcWE02P8VmjNBOmyzhoD5YpljSQjjECKXtaqh_HaSnn3xtZ6RWBnc0Q4MHrY_TGHg7Ma_P-MDx5xMObpIxkuhWZ74vVdVU3yC9yjIT9gZ4A3wQwTmmcdHW0kDg-ImAe_4rmek3LJ_RaxeVesIqafpg"
              />
              <div className="absolute bottom-8 right-8 bg-[#f9f9f9] p-6 shadow-2xl border border-[#d1c5b4]">
                <p className="font-['Hanken_Grotesk'] text-[12px] font-semibold text-[#1a1c1c] mb-2 tracking-wider">STATUS: OPTIMAL</p>
                <p className="font-['Hanken_Grotesk'] text-[16px] text-[#4e4639]">Seka Kama Core Interface v4.2</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-[#d1c5b4]">
        <div className="w-full px-6 md:px-20 py-20 flex flex-col items-center gap-6 max-w-[1440px] mx-auto text-center">
          <div className="font-serif-display text-[24px] text-[#1a1c1c] italic font-medium mb-4">Seka Kama</div>
          <div className="flex flex-wrap justify-center gap-8 md:gap-16 mb-8">
            <Link href="#" className="font-['Hanken_Grotesk'] text-[12px] font-semibold uppercase tracking-widest text-[#5f5e5e] hover:text-[#1a1c1c] transition-colors duration-200">About</Link>
            <Link href="#" className="font-['Hanken_Grotesk'] text-[12px] font-semibold uppercase tracking-widest text-[#5f5e5e] hover:text-[#1a1c1c] transition-colors duration-200">Documentation</Link>
            <Link href="#" className="font-['Hanken_Grotesk'] text-[12px] font-semibold uppercase tracking-widest text-[#5f5e5e] hover:text-[#1a1c1c] transition-colors duration-200">Data Standards</Link>
            <Link href="#" className="font-['Hanken_Grotesk'] text-[12px] font-semibold uppercase tracking-widest text-[#5f5e5e] hover:text-[#1a1c1c] transition-colors duration-200">Privacy Policy</Link>
            <Link href="#" className="font-['Hanken_Grotesk'] text-[12px] font-semibold uppercase tracking-widest text-[#5f5e5e] hover:text-[#1a1c1c] transition-colors duration-200">Contact</Link>
          </div>
          <div className="w-24 h-[1px] bg-[#d1c5b4] mb-6" />
          <p className="font-['Hanken_Grotesk'] text-[12px] font-semibold tracking-wider text-[#d1c5b4] mb-2 uppercase">
            © 2026 Seka Kama Conservancy. All rights reserved.
          </p>
          <p className="font-['Hanken_Grotesk'] text-[11px] font-medium text-[#7f7667] opacity-60 tracking-wide">
            Data sources: VIIRS DNB, LandDX, ESA WorldCover, WDPA
          </p>
        </div>
      </footer>
    </div>
  );
}