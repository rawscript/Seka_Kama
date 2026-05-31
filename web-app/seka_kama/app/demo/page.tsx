'use client';

import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Play, ArrowRight, Zap, Globe, BarChart3, Pause } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

export default function DemoPage() {
  const [mounted, setMounted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Set mounted safely after hydration to trigger animations smoothly
  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle play/pause logic via effect to avoid promise interruptions
  useEffect(() => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    
    if (isPlaying) {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          // Ignore AbortError as it's just a promise interruption
          if (error.name !== 'AbortError') {
            console.error("Playback failed:", error);
          }
        });
      }
    } else {
      video.pause();
    }
  }, [isPlaying]);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="bg-[#f9f9f9] min-h-screen flex flex-col selection:bg-[#775a19]/10 selection:text-[#4e3700]">
      <Navbar />

      <main className="max-w-[1440px] mx-auto px-6 md:px-20 py-24 flex-grow w-full text-center">
        {/* Header Hero Section */}
        <div 
          className={`space-y-8 mb-20 transition-all duration-1000 transform ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#775a19]/5 border border-[#775a19]/20 text-[#775a19] text-[11px] font-bold uppercase tracking-[0.2em]">
            INTERACTIVE PREVIEW
          </div>
          <h1 className="text-5xl md:text-7xl font-normal text-[#1a1c1c] tracking-tight max-w-5xl mx-auto leading-tight">
            Experience the <span className="italic font-light text-[#4e3700]">Greater Mara</span> <br /> like never before.
          </h1>
          <p className="text-[#4e4639] text-lg md:text-xl max-w-2xl mx-auto leading-relaxed font-light">
            The demo allows you to explore the baseline lion density and see how SekaNet interprets 
            environmental shifts in real-time.
          </p>
        </div>

        {/* Video Player Section */}
        <div 
          className={`relative aspect-video w-full max-w-5xl mx-auto rounded-sm overflow-hidden border border-[#d1c5b4]/60 shadow-2xl group glass-effect transition-all duration-1000 transform ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`} 
          style={{ transitionDelay: '150ms' }}
        >
           <video 
             ref={videoRef}
             className="w-full h-full object-cover"
             poster="https://images.unsplash.com/photo-1546182990-dffeafbe841d?auto=format&fit=crop&q=80&w=2000"
             loop
             muted={false}
             playsInline
           >
             <source src="https://assets.mixkit.co/videos/preview/mixkit-lion-walking-in-the-grass-4040-large.mp4" type="video/mp4" />
             Your browser does not support the video tag.
           </video>
           
           {/* UI Control Overlay */}
           <div className={`absolute inset-0 bg-black/20 transition-opacity duration-500 ${isPlaying ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}>
             <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
                <button 
                  onClick={togglePlay}
                  aria-label={isPlaying ? 'Pause Overview Video' : 'Play Overview Video'}
                  className="w-24 h-24 rounded-full bg-[#775a19] flex items-center justify-center shadow-2xl text-white hover:scale-110 transition-transform relative group/btn"
                >
                   {isPlaying ? (
                     <Pause className="w-10 h-10 fill-current" />
                   ) : (
                     <>
                       <div className="absolute inset-0 rounded-full bg-[#775a19] animate-ping opacity-20" />
                       <Play className="w-10 h-10 fill-current ml-1" />
                     </>
                   )}
                </button>
                {!isPlaying && (
                  <p className="text-sm font-bold uppercase tracking-[0.4em] text-white drop-shadow-md">Watch Platform Walkthrough</p>
                )}
             </div>
           </div>

           {/* Brand Watermark */}
           <div className="absolute top-8 left-8 flex items-center gap-2 opacity-50 select-none">
              <div className="w-3 h-3 rounded-full bg-[#775a19]" />
              <span className="text-[10px] font-bold text-white uppercase tracking-widest">Seka Kama Intelligence v4.2</span>
           </div>
        </div>

        {/* Features Subgrid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24">
           <DemoFeature icon={Globe} title="Regional Insights" desc="Explore 271,000+ cells of ecological data at 1km² resolution." delay="300ms" mounted={mounted} />
           <DemoFeature icon={Zap} title="Predictive AI" desc="Simulate impacts of infrastructure on wildlife with 84% accuracy." delay="450ms" mounted={mounted} />
           <DemoFeature icon={BarChart3} title="Risk Matrices" desc="Identify high-priority conservation corridors automatically." delay="600ms" mounted={mounted} />
        </div>

        {/* Closing Call To Action Block */}
        <section 
          className={`mt-32 py-24 border-t border-[#d1c5b4]/60 space-y-10 transition-all duration-1000 transform ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`} 
          style={{ transitionDelay: '750ms' }}
        >
           <h2 className="text-4xl font-serif font-medium text-[#1a1c1c] tracking-tight">Ready to start simulating?</h2>
           <a href="/register" className="inline-flex items-center gap-4 px-12 py-6 bg-[#1a1c1c] text-white font-bold hover:bg-[#775a19] transition-all group shadow-xl">
              <span className="text-[12px] tracking-[0.3em] uppercase">GET FULL ACCESS</span> 
              <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
           </a>
        </section>
      </main>

      <Footer />
    </div>
  );
}

interface DemoFeatureProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  delay: string;
  mounted: boolean;
}

function DemoFeature({ icon: Icon, title, desc, delay, mounted }: DemoFeatureProps) {
  return (
    <div 
      className={`p-10 bg-white border border-[#d1c5b4]/30 flex flex-col items-center text-center group transition-all duration-1000 transform ${
        mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`} 
      style={{ transitionDelay: delay }}
    >
       <div className="w-16 h-16 rounded-sm bg-[#775a19]/5 border border-[#775a19]/10 flex items-center justify-center mb-8 group-hover:bg-[#775a19] transition-colors duration-500">
          <Icon className="w-8 h-8 text-[#775a19] group-hover:text-white transition-colors duration-500" />
       </div>
       <h3 className="text-xl font-serif font-medium text-[#1a1c1c] mb-4">{title}</h3>
       <p className="text-sm text-[#4e4639] leading-relaxed font-light">{desc}</p>
    </div>
  );
}
