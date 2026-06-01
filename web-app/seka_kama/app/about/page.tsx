'use client';

import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Target, Globe, Shield } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function AboutPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="bg-[#f9f9f9] min-h-screen flex flex-col selection:bg-[#775a19]/10 selection:text-[#4e3700]">
      <Navbar />

      <main className="max-w-[1440px] mx-auto px-6 md:px-20 py-24 flex-grow w-full">
        <section className={`max-w-3xl mb-24 ${mounted ? 'animate-in' : 'opacity-0'}`}>
          <p className="text-[11px] font-bold text-[#775a19] mb-4 tracking-[0.3em] uppercase">
            ESTABLISHED 2026
          </p>
          <h1 className="text-5xl md:text-[64px] leading-tight text-[#1a1c1c] mb-8 font-normal tracking-tight">
            Protecting the Pride through <br />
            <span className="italic font-light text-[#4e3700]">Digital Intelligence</span>
          </h1>
          <p className="text-lg md:text-xl leading-relaxed text-[#4e4639] font-light">
            Seka Kama is a next-generation conservation platform that harmonizes advanced geospatial data 
            with machine learning to protect lion populations in the Greater Mara ecosystem.
          </p>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-16 border-t border-[#d1c5b4]/60">
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

        <section className={`mt-32 p-12 bg-white enterprise-card border-[#d1c5b4]/40 flex flex-col md:flex-row items-center justify-between gap-8 ${mounted ? 'animate-in' : 'opacity-0'}`} style={{ animationDelay: '300ms', animationFillMode: 'both' }}>
           <div className="max-w-xl text-center md:text-left">
              <h2 className="text-2xl md:text-3xl font-serif font-medium text-[#1a1c1c] mb-4">Join the New Era of Conservation</h2>
              <p className="text-sm text-[#4e4639] font-light">Experience the power of predictive ecology and spatial synthesis.</p>
           </div>
           <div className="flex gap-4">
              <a href="/register" className="bg-[#775a19] text-white px-8 py-4 text-[11px] font-bold tracking-widest uppercase hover:bg-[#4e3700] transition-colors shadow-sm">
                Create Account
              </a>
              <a href="/contact" className="border border-[#777667] text-[#1a1c1c] px-8 py-4 text-[11px] font-bold tracking-widest uppercase hover:bg-black/5 transition-colors">
                Contact Us
              </a>
           </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
