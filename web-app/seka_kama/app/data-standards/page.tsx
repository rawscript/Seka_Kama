'use client';

import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Ruler, Table, FileJson, CheckCircle2 } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function DataStandardsPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const standards = [
    {
      title: 'Spatial Resolution',
      desc: 'The Digital Twin operates on a 1km² (30 arc-second) resolution using the WGS84 (EPSG:4326) coordinate system.',
      icon: Ruler
    },
    {
      title: 'Data Formats',
      desc: 'Native support for GeoJSON, TopoJSON, and Cloud Optimized GeoTIFFs (COG) for ecological raster layers.',
      icon: FileJson
    },
    {
      title: 'Attribute Schema',
      desc: 'Standardized field naming (snake_case) for population densities, vegetation indices, and human footprint metrics.',
      icon: Table
    }
  ];

  return (
    <div className="bg-[#f9f9f9] min-h-screen flex flex-col selection:bg-[#775a19]/10 selection:text-[#4e3700]">
      <Navbar />

      <main className="max-w-[1440px] mx-auto px-6 md:px-20 py-24 flex-grow w-full">
        <section className={`max-w-3xl mb-16 ${mounted ? 'animate-in' : 'opacity-0'}`}>
          <p className="text-[11px] font-bold text-[#775a19] mb-4 tracking-[0.3em] uppercase">
            TECHNICAL INTEGRITY
          </p>
          <h1 className="text-5xl md:text-6xl font-normal text-[#1a1c1c] tracking-tight leading-tight mb-8">
            Ecosystem Data <br />
            <span className="italic font-light text-[#4e3700]">Standards & Integrity</span>
          </h1>
          <p className="text-lg text-[#4e4639] leading-relaxed font-light">
            At Seka Kama, we adhere to strict international standards for geospatial and ecological data to 
            ensure interoperability between conservation agencies and our predictive engine.
          </p>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          {standards.map((standard, idx) => (
            <div 
              key={standard.title} 
              className={`enterprise-card bg-white flex flex-col gap-6 ${mounted ? 'animate-in' : 'opacity-0'}`}
              style={{ animationDelay: `${idx * 100}ms`, fillMode: 'both' }}
            >
              <div className="w-14 h-14 bg-[#775a19]/5 border border-[#775a19]/10 flex items-center justify-center">
                <standard.icon className="w-6 h-6 text-[#775a19]" />
              </div>
              <div className="space-y-3">
                <h3 className="text-lg font-serif font-medium text-[#1a1c1c]">{standard.title}</h3>
                <p className="text-sm text-[#4e4639] leading-relaxed font-light">{standard.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <section className={`p-10 bg-white enterprise-card border-[#d1c5b4]/40 flex flex-col md:flex-row gap-10 items-start ${mounted ? 'animate-in' : 'opacity-0'}`} style={{ animationDelay: '400ms', fillMode: 'both' }}>
           <div className="w-14 h-14 bg-[#775a19] flex items-center justify-center flex-shrink-0 shadow-lg">
              <CheckCircle2 className="w-7 h-7 text-white" />
           </div>
           <div className="space-y-4">
              <h2 className="text-2xl font-serif font-medium text-[#1a1c1c] tracking-tight">Validation Protocol</h2>
              <p className="text-base text-[#4e4639] leading-relaxed font-light">
                Before any dataset is ingested into the SekaNet Oracle, it undergoes a three-stage validation 
                process: Coordinate validation, Schema matching, and Statistical outlier detection. This 
                ensures that our simulations remain grounded in high-quality empirical data.
              </p>
           </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
