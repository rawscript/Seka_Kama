'use client';

import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Map, Layers, Maximize, Compass } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function GeospatialPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const features = [
    {
      title: 'Ultra-High Resolution',
      desc: '30-arcsecond (~1km²) spatial grid resolution for precise ecological modeling.',
      icon: Maximize
    },
    {
      title: 'Layer Synthesis',
      desc: 'Seamless integration of VIIRS DNB, LandDX, and ESA WorldCover datasets.',
      icon: Layers
    },
    {
      title: 'Environment Fidelity',
      desc: '99.8% accuracy in terrain representation for migratory path simulations.',
      icon: Compass
    }
  ];

  return (
    <div className="bg-[#f9f9f9] min-h-screen flex flex-col selection:bg-[#775a19]/10 selection:text-[#4e3700]">
      <Navbar />

      <main className="max-w-[1440px] mx-auto px-6 md:px-20 py-24 flex-grow w-full">
        <section className={`max-w-4xl mb-24 ${mounted ? 'animate-in' : 'opacity-0'}`}>
          <p className="text-[11px] font-bold text-[#775a19] mb-4 tracking-[0.3em] uppercase">
            SPATIAL SYNTHESIS
          </p>
          <h1 className="text-5xl md:text-[68px] leading-tight text-[#1a1c1c] mb-8 font-normal tracking-tight">
            Advanced <span className="italic font-light text-[#4e3700]">Geospatial Intelligence</span>
          </h1>
          <p className="text-lg md:text-xl leading-relaxed text-[#4e4639] font-light max-w-2xl">
            Seka Kama utilizes world-class spatial engineering to mirror the complexity of the natural world. The Seka Kama geospatial engine converts raw telemetry into actionable conservation insights.
          </p>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-32">
          {features.map((feature, idx) => (
            <div 
              key={feature.title} 
              className={`enterprise-card bg-white p-10 flex flex-col gap-8 transition-all hover:-translate-y-2 ${mounted ? 'animate-in' : 'opacity-0'}`}
              style={{ animationDelay: `${idx * 150}ms`, animationFillMode: 'both' }}
            >
              <div className="w-14 h-14 bg-[#775a19]/5 border border-[#775a19]/10 flex items-center justify-center">
                <feature.icon className="w-7 h-7 text-[#775a19]" />
              </div>
              <div className="space-y-4">
                <h3 className="text-xl font-serif font-medium text-[#1a1c1c]">{feature.title}</h3>
                <p className="text-sm text-[#4e4639] leading-relaxed font-light">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <section className={`grid grid-cols-1 lg:grid-cols-2 gap-20 items-center border-t border-[#d1c5b4]/60 pt-24 ${mounted ? 'animate-in' : 'opacity-0'}`} style={{ animationDelay: '500ms', animationFillMode: 'both' }}>
           <div className="space-y-8">
              <h2 className="text-4xl font-serif font-medium text-[#1a1c1c] tracking-tight leading-snug">
                Precision Mapping for <br />
                <span className="italic font-light text-[#4e3700]">Critical Corridors</span>
              </h2>
              <p className="text-base text-[#4e4639] font-light leading-relaxed">
                By integrating PostGIS spatial databases with Kepler.gl visualization pipelines, Seka Kama enables conservationists to identify and protect vital wildlife corridors that are often invisible to the naked eye.
              </p>
              <div className="space-y-4">
                <div className="flex gap-4 items-start">
                  <div className="w-2 h-2 rounded-full bg-[#775a19] mt-2 flex-shrink-0" />
                  <p className="text-sm text-[#4e4639] font-light">Real-time vector tiling for responsive global-scale exploration.</p>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="w-2 h-2 rounded-full bg-[#775a19] mt-2 flex-shrink-0" />
                  <p className="text-sm text-[#4e4639] font-light">Custom GPU-accelerated rendering for temporal analysis.</p>
                </div>
              </div>
           </div>
           <div className="relative group overflow-hidden">
              <div className="absolute -inset-3 border border-[#775a19] opacity-10 group-hover:opacity-25 transition-opacity duration-700" />
              <img 
                src="/kepler_gl_3.png" 
                alt="Geospatial Visualization" 
                className="w-full h-auto object-cover filter contrast-[1.05] grayscale-[0.2] transition-all duration-700 group-hover:scale-105"
              />
              <div className="absolute bottom-6 right-6 bg-white/95 backdrop-blur-md p-5 shadow-xl border border-[#d1c5b4]/80">
                <p className="text-[10px] font-mono font-bold text-[#1a1c1c] mb-1 tracking-widest uppercase">ENGINE: KEPLER.GL CORE</p>
                <p className="text-[10px] text-[#775a19] font-bold">SPATIAL ACCURACY: 99.8%</p>
              </div>
           </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
