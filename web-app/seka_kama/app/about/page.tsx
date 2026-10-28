'use client';

import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Target, Globe, Shield } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function AboutPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="bg-[#f9f9f9] min-h-screen flex flex-col selection:bg-[#775a19]/10 selection:text-[#4e3700] w-full">
      <Navbar />

      <main className="w-full px-6 lg:px-12 py-16 flex-grow">
        <section className={`mb-16 ${mounted ? 'animate-in' : 'opacity-0'}`}>
          <p className="text-[11px] font-bold text-[#775a19] mb-4 tracking-[0.3em] uppercase">
            ESTABLISHED 2026
          </p>
          <h1 className="text-5xl md:text-[64px] leading-tight text-[#1a1c1c] mb-6 font-normal tracking-tight">
            Protecting the Pride through <br />
            <span className="italic font-light text-[#4e3700]">Digital Intelligence</span>
          </h1>
          <p className="text-lg md:text-xl leading-relaxed text-[#4e4639] font-light max-w-4xl">
            Seka Kama is a next-generation conservation platform that harmonizes advanced geospatial data 
            with machine learning to protect lion populations in the Greater Mara ecosystem.
          </p>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-16 border-t border-[#d1c5b4]/60 w-full">
          <div className={`space-y-6 ${mounted ? 'animate-in' : 'opacity-0'}`} style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
            <div className="flex items-center gap-3 text-[#775a19]">
               <Target className="w-5 h-5" />
               <h3 className="text-[11px] font-bold uppercase tracking-[0.2em]">The Mission</h3>
            </div>
            <p className="text-[#4e4639] leading-relaxed font-light">
              Seka Kama provides conservancy managers and researchers with the "What-If" capabilities needed to 
              navigate the complex balance between human development and wildlife preservation.
            </p>
          </div>
          <div className={`space-y-6 ${mounted ? 'animate-in' : 'opacity-0'}`} style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
            <div className="flex items-center gap-3 text-[#775a19]">
               <Globe className="w-5 h-5" />
               <h3 className="text-[11px] font-bold uppercase tracking-[0.2em]">The Digital Twin</h3>
            </div>
            <p className="text-[#4e4639] leading-relaxed font-light">
              Seka Kama leverages VIIRS DNB, LandDX, and WDPA datasets to simulate 271,211 individual 1km² 
              grid cells, ensuring a granular understanding of every acre in the ecosystem.
            </p>
          </div>
        </div>

        <div className="mt-16 pt-16 border-t border-[#d1c5b4]/60 grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
          <div className="p-8 bg-white border border-[#d1c5b4]/50">
            <span className="text-[10px] font-bold text-[#775a19] uppercase tracking-widest block mb-2">Scope</span>
            <p className="text-2xl font-serif text-[#1a1c1c] mb-2">Greater Mara</p>
            <p className="text-xs text-[#4e4639] font-light">Cross-boundary ecological monitoring spanning community conservancies and national reserves.</p>
          </div>
          <div className="p-8 bg-white border border-[#d1c5b4]/50">
            <span className="text-[10px] font-bold text-[#775a19] uppercase tracking-widest block mb-2">Resolution</span>
            <p className="text-2xl font-serif text-[#1a1c1c] mb-2">1 km² Grids</p>
            <p className="text-xs text-[#4e4639] font-light">Granular environmental modeling incorporating nightlight, land cover, and infrastructure pressure.</p>
          </div>
          <div className="p-8 bg-white border border-[#d1c5b4]/50">
            <span className="text-[10px] font-bold text-[#775a19] uppercase tracking-widest block mb-2">Architecture</span>
            <p className="text-2xl font-serif text-[#1a1c1c] mb-2">PostGIS + XGBoost</p>
            <p className="text-xs text-[#4e4639] font-light">Real-time simulation engine generating ecological counterfactuals for adaptive management.</p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
