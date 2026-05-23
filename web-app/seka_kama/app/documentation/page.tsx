'use client';

import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Book, Terminal, Code2, Database, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function DocumentationPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const sections = [
    {
      title: 'Quick Start',
      icon: Terminal,
      items: ['Authentication', 'Dashboard Overview', 'Drawing Your First Scenario']
    },
    {
      title: 'Data Engine',
      icon: Database,
      items: ['VIIRS Nightlight Trends', 'Grid Cell Calibration', 'LandDX Integration']
    },
    {
      title: 'API Reference',
      icon: Code2,
      items: ['REST Endpoints', 'WebSocket Ingestion', 'Authentication Headers']
    },
  ];

  return (
    <div className="bg-[#f9f9f9] min-h-screen flex flex-col selection:bg-[#775a19]/10 selection:text-[#4e3700]">
      <Navbar />

      <div className="max-w-[1440px] mx-auto flex flex-col lg:flex-row gap-16 py-20 px-6 md:px-20 w-full flex-grow">
        <aside className={`w-full lg:w-72 flex-shrink-0 space-y-10 ${mounted ? 'animate-in' : 'opacity-0'}`}>
          {sections.map((section, idx) => (
            <div key={section.title} className="space-y-5">
              <h4 className="text-[11px] font-bold text-[#775a19] uppercase tracking-[0.2em] flex items-center gap-3">
                <section.icon className="w-4 h-4" /> {section.title}
              </h4>
              <ul className="space-y-3">
                {section.items.map(item => (
                  <li key={item} className="group flex items-center justify-between text-sm text-[#4e4639] hover:text-[#1a1c1c] cursor-pointer transition-colors font-light">
                    {item}
                    <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-[#775a19]" />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </aside>

        <main className={`flex-1 space-y-16 ${mounted ? 'animate-in' : 'opacity-0'}`} style={{ animationDelay: '200ms', fillMode: 'both' }}>
          <div className="space-y-4">
             <p className="text-[11px] font-bold text-[#775a19] mb-4 tracking-[0.3em] uppercase">REFERENCE</p>
             <h1 className="text-5xl font-normal text-[#1a1c1c] tracking-tight leading-tight">Technical <span className="italic font-light text-[#4e3700]">Documentation</span></h1>
             <p className="text-[#4e4639] text-lg leading-relaxed max-w-2xl font-light">
               Welcome to the Seka Kama Technical Reference. This guide covers the integration of the SekaNet 
               XGBoost model and our spatial analysis engine.
             </p>
          </div>

          <div className="p-10 bg-white enterprise-card border-[#d1c5b4]/40 group">
             <h2 className="text-2xl font-serif font-medium text-[#1a1c1c] mb-6 flex items-center gap-3 group-hover:text-[#775a19] transition-colors">
                <Book className="w-6 h-6" /> The SekaNet core model
             </h2>
             <p className="text-base text-[#4e4639] leading-relaxed mb-10 font-light">
                Our model utilizes a gradient-boosted tree architecture trained on a decade of 
                spatiotemporal data. It predicts lion abundance based on habitat suitability indices, 
                human footprint (VIIRS), and distance to water sources.
             </p>
             <div className="bg-[#1a1c1c] p-6 rounded-sm font-mono text-[13px] text-[#ffdea5] border border-[#775a19]/30 shadow-inner overflow-x-auto">
                <p className="text-[#7f7667] mb-2">// POST Scenario Simulation</p>
                <p><span className="text-[#c5a059]">POST</span> /api/v4/simulation/scenario</p>
                <p className="mt-4 text-[#7f7667]">// Payload Structure</p>
                <div className="text-white/90">
                  {`{`} <br />
                  &nbsp;&nbsp;<span className="text-[#775a19]">"geometry"</span>: <span className="text-[#71c562]">"Polygon((...))"</span>, <br />
                  &nbsp;&nbsp;<span className="text-[#775a19]">"features"</span>: {`{`} <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-[#775a19]">"light_offset"</span>: <span className="text-[#1db954]">0.15</span>, <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-[#775a19]">"barrier_type"</span>: <span className="text-[#71c562]">"fence"</span> <br />
                  &nbsp;&nbsp;{`}`} <br />
                  {`}`}
                </div>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-12 border-t border-[#d1c5b4]/60">
             <div className="space-y-4">
                <h3 className="text-lg font-serif font-medium text-[#1a1c1c]">Spatial Accuracy</h3>
                <p className="text-sm text-[#4e4639] leading-relaxed font-light">
                   The Digital Twin operates at a 30arcsecond resolution (~1km²). Predictions are most accurate within 
                   well-monitored conservancy boundaries.
                </p>
             </div>
             <div className="space-y-4">
                <h3 className="text-lg font-serif font-medium text-[#1a1c1c]">Update Frequency</h3>
                <p className="text-sm text-[#4e4639] leading-relaxed font-light">
                   Vegetation indices (NDVI) are ingested monthly. Nightlight trends are updated annually 
                   following the NASA/NOAA VIIRS release cycle.
                </p>
             </div>
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
}
