'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from './Navbar';
import Footer from './Footer';
import { getApiUrl } from '@/services/config';

interface Statistic {
  label: string;
  value: string;
  change: string;
  changeType: 'negative' | 'positive' | 'neutral';
}

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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [statsRetry, setStatsRetry] = useState(0);

  const statsList: Statistic[] = stats ? [
    { label: 'Estimated Lions', value: stats.total_lions?.toLocaleString() || '—', change: `${stats.avg_lion_density?.toFixed(2) ?? '—'} lions/km² average`, changeType: 'neutral' },
    { label: 'Protected Area', value: `${stats.protected_area_coverage_km2?.toLocaleString() ?? '—'} km²`, change: 'Mapped coverage', changeType: 'neutral' },
    { label: 'Management Units', value: stats.management_unit_count?.toString() || '—', change: 'Units in dataset', changeType: 'neutral' },
    { label: 'High-Risk Cells', value: stats.high_risk_cell_count?.toLocaleString() || '—', change: 'Modelled cells', changeType: 'neutral' },
  ] : [
    { label: 'Estimated Lions', value: '—', change: 'Unavailable', changeType: 'neutral' },
    { label: 'Protected Area', value: '—', change: 'Unavailable', changeType: 'neutral' },
    { label: 'Management Units', value: '—', change: 'Unavailable', changeType: 'neutral' },
    { label: 'High-Risk Cells', value: '—', change: 'Unavailable', changeType: 'neutral' },
  ];

  useEffect(() => {
    setMounted(true);

    const checkSession = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) return; 

      try {
        const response = await fetch(`${getApiUrl()}/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          setIsAuthenticated(true); 
        } else {
          localStorage.removeItem('access_token');
        }
      } catch (error) {
        console.error("Session verification failed:", error);
      }
    };

    const abortController = new AbortController();

    const loadInitialData = async () => {
      try {
        const response = await fetch(`${getApiUrl()}/statistics`, {
          signal: abortController.signal
        });
        if (response.ok) {
           const data = await response.json();
           setStats(data);
        } else throw new Error(`Statistics unavailable (HTTP ${response.status}).`);
      } catch (error: any) {
        if (error.name === 'AbortError') return;
        console.warn("Failed to load initial stats:", error);
        setStatsError(error instanceof Error ? error.message : 'Could not load landscape statistics.');
      }
    };

    checkSession();
    loadInitialData();

    return () => {
      abortController.abort();
    };
  }, [statsRetry]);

  const consolePath = isAuthenticated ? '/dashboard' : '/login';
  const consoleLabel = isAuthenticated ? 'Dashboard' : 'Launch Console';

  return (
    <div className="bg-[#f9f9f9] text-[#1a1c1c] overflow-x-hidden antialiased selection:bg-[#775a19]/10 selection:text-[#4e3700] w-full">
      <Navbar />

      {/* Hero: edge-to-edge spread */}
      <header className="relative w-full min-h-[85vh] flex items-center overflow-hidden bg-[#f9f9f9] px-6 lg:px-12 py-16">
        <div className="absolute inset-0 z-0 select-none pointer-events-none bg-[#e9e4d8]">
          <div
            className="absolute inset-0 opacity-70"
            style={{
              backgroundImage: "url('landing-pride.jpg')",
              backgroundSize: "cover",
              backgroundPosition: "58% 35%",
              backgroundRepeat: "no-repeat",
              mixBlendMode: "multiply",
            }}
          />
          <div className="absolute inset-0 bg-[#f3f0e8]/45" />
        </div>

        <div className="relative z-10 w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className={`lg:col-span-8 border-l-2 border-[#775a19] bg-[#f9f8f3]/95 p-8 md:p-12 shadow-enterprise backdrop-blur-[2px] ${mounted ? "animate-in" : "opacity-0"}`}>
            <p className="text-[11px] font-bold text-[#775a19] mb-4 tracking-[0.3em] uppercase">
              INTELLIGENCE-DRIVEN CONSERVATION
            </p>
            <h1 className="text-5xl md:text-[68px] md:leading-[76px] text-[#1a1c1c] mb-6 font-normal tracking-tight">
              Seka Kama: <br />
              <span className="italic font-light text-[#4e3700]">
                The Digital Twin
              </span>
            </h1>
            <p className="text-base md:text-lg leading-relaxed text-[#4e4639] mb-10 font-light">
              A precision Digital Twin for the Greater Mara ecosystem,
              leveraging real-time geospatial intelligence and predictive
              ecology to secure future biodiversity across 271,211 spatial cells.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href={consolePath}
                className="bg-[#775a19] text-white px-8 py-4 text-[11px] font-bold tracking-widest uppercase hover:bg-[#4e3700] transition-colors shadow-sm"
              >
                Explore Ecosystem
              </Link>
              <Link
                href="/demo"
                className="border border-[#777667] text-[#1a1c1c] px-8 py-4 text-[11px] font-bold tracking-widest uppercase hover:bg-black/5 transition-colors"
              >
                View Demo
              </Link>
            </div>
          </div>
          <div className="hidden lg:flex lg:col-span-4 flex-col justify-end items-end text-right space-y-4">
            <div className="bg-[#1a1c1c]/90 text-white p-6 backdrop-blur-md border border-white/10 w-full max-w-sm">
              <span className="text-[10px] font-mono text-[#c5a059] uppercase tracking-widest block mb-1">Spatial Framework</span>
              <p className="text-xs text-white/80 font-light">
                Continuous ingestion of telemetry vectors across 1km² resolution grids in Kenya and Tanzania.
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Landscape stats strip: full-bleed grid */}
      <section className="bg-white py-12 border-y border-[#d1c5b4]/60 w-full px-6 lg:px-12">
        <div className="w-full grid grid-cols-2 lg:grid-cols-4 gap-6">
          {statsError && (
            <p
              role="alert"
              aria-live="polite"
              className="col-span-full text-sm text-rose-800"
            >
              {statsError}
              <button
                onClick={() => {
                  setStatsError(null);
                  setStatsRetry((v) => v + 1);
                }}
                className="ml-3 font-semibold underline"
              >
                Retry
              </button>
            </p>
          )}
          {statsList.map((stat, idx) => (
            <div
              key={stat.label}
              className={`flex flex-col items-start text-left p-4 lg:p-6 bg-[#f9f9f9] border border-[#d1c5b4]/40 ${mounted ? "animate-in" : "opacity-0"}`}
              style={{
                animationDelay: `${idx * 75}ms`,
                animationFillMode: "both",
              }}
            >
              <span className="text-[11px] font-bold text-[#775a19] mb-2 uppercase tracking-wider">
                {stat.label}
              </span>
              <span className="font-serif text-4xl md:text-5xl text-[#1a1c1c] font-normal tracking-tight">
                {stat.value}
              </span>
              <span className="mt-2.5">
                <span
                  className={`enterprise-badge ${
                    stat.changeType === "negative"
                      ? "border-rose-200 bg-rose-50/50 text-rose-700"
                      : stat.changeType === "positive"
                        ? "border-amber-200 bg-amber-50/50 text-[#775a19]"
                        : "border-slate-200 bg-slate-50 text-slate-500"
                  }`}
                >
                  {stat.change}
                </span>
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Vision banner: full-bleed */}
      <section className="bg-[#f9f9f9] py-16 px-6 lg:px-12 w-full border-b border-[#d1c5b4]/40">
        <div className="w-full flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <span className="text-[#c5a059]/60 text-4xl font-serif italic select-none">“</span>
            <h2 className="text-2xl md:text-3xl italic text-[#1a1c1c] font-light">
              Intelligence is the silent guardian of the wild.
            </h2>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="h-[1px] w-12 bg-[#d1c5b4]" />
            <span className="text-[10px] font-bold tracking-[0.25em] text-[#7f7667] uppercase">
              THE SCIENTIFIC VISION
            </span>
          </div>
        </div>
      </section>

      {/* Platform Capabilities: full-bleed spread */}
      <section className="bg-[#f3f3f3] py-20 border-b border-[#d1c5b4]/40 w-full px-6 lg:px-12">
        <div className="w-full">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-12 border-b border-[#d1c5b4] pb-6">
            <div>
              <span className="text-[11px] font-bold text-[#775a19] tracking-widest uppercase">
                ECOSYSTEM
              </span>
              <h3 className="text-2xl md:text-3xl mt-1 font-serif font-medium">
                Platform Capabilities
              </h3>
            </div>
            <p className="text-sm text-[#4e4639] mt-3 sm:mt-0 font-light">
              Advanced biological computation meeting world-class surveillance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
            {capabilities.map((item, idx) => (
              <div
                key={item.num}
                className={`enterprise-card bg-white group flex flex-col justify-between p-8 border border-[#d1c5b4]/50 ${mounted ? "animate-in" : "opacity-0"}`}
                style={{
                  animationDelay: `${idx * 100}ms`,
                  animationFillMode: "both",
                }}
              >
                <div>
                  <div className="flex justify-between items-start mb-10">
                    <div className="p-3 bg-[#775a19]/5 border border-[#775a19]/10 rounded-sm group-hover:scale-105 transition-transform duration-300">
                      {item.icon}
                    </div>
                    <span className="text-[11px] font-mono font-bold text-[#7f7667]">
                      {item.num}
                    </span>
                  </div>
                  <h4 className="text-xl font-serif font-medium text-[#1a1c1c] mb-4 group-hover:text-[#775a19] transition-colors">
                    {item.title}
                  </h4>
                  <p className="text-sm leading-relaxed text-[#4e4639] mb-6 font-light">
                    {item.description}
                  </p>
                </div>
                <Link
                  href={
                    item.slug === "spatial-synthesis"
                      ? "/geospatial"
                      : item.slug === "neural-defense"
                        ? "/intelligence"
                        : "/documentation"
                  }
                  className="text-[11px] font-bold text-[#775a19] border-b border-transparent group-hover:border-[#775a19] transition-all inline-block pb-0.5 self-start tracking-wider uppercase"
                >
                  LEARN MORE &rarr;
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Architecture: full-bleed grid */}
      <section className="bg-[#f9f9f9] py-20 w-full px-6 lg:px-12">
        <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className={mounted ? "animate-in" : "opacity-0"}>
            <span className="text-[11px] font-bold text-[#775a19] tracking-widest mb-3 block uppercase">
              THE ARCHITECTURE
            </span>
            <h2 className="text-3xl md:text-4xl text-[#1a1c1c] font-normal mb-6 tracking-tight">
              Engineered with Precision
            </h2>
            <p className="text-base text-[#4e4639] mb-10 font-light leading-relaxed">
              The Seka Kama framework mirrors the complexity of the natural
              world. Utilizing XGBoost modeling and PostGIS spatial databases
              to protect biodiversity vectors.
            </p>

            <div className="space-y-6">
              <div className="flex gap-6 pb-6 border-b border-[#d1c5b4]/60">
                <div className="text-[10px] font-mono font-bold text-[#775a19] pt-1.5 tracking-wider">
                  CORE-A
                </div>
                <div>
                  <h5 className="text-lg font-serif font-medium text-[#1a1c1c] mb-1">
                    Geospatial Analytics
                  </h5>
                  <p className="text-sm text-[#4e4639] font-light">
                    High-performance Kepler.gl visualization layers engineered
                    for spatial exploration pipelines across all regional boundaries.
                  </p>
                </div>
              </div>
              <div className="flex gap-6 pb-6 border-b border-[#d1c5b4]/60">
                <div className="text-[10px] font-mono font-bold text-[#775a19] pt-1.5 tracking-wider">
                  CORE-B
                </div>
                <div>
                  <h5 className="text-lg font-serif font-medium text-[#1a1c1c] mb-1">
                    Intelligence Layer
                  </h5>
                  <p className="text-sm text-[#4e4639] font-light">
                    FastAPI enterprise architecture deeply integrated with
                    StepFun AI contextual mapping solutions.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div
            className={`relative group ${mounted ? "animate-in" : "opacity-0"}`}
            style={{ animationDelay: "150ms", animationFillMode: "both" }}
          >
            <div className="absolute -inset-2 border border-[#775a19] opacity-15 group-hover:opacity-30 transition-opacity duration-500" />
            <img
              alt="High-tech conservation mapping monitor setup"
              className="w-full h-[520px] object-cover filter contrast-[1.02] brightness-[0.98] transition-all duration-700"
              src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=1400"
            />
            <div className="absolute bottom-6 right-6 bg-white/95 backdrop-blur-md p-5 shadow-xl border border-[#d1c5b4]/80">
              <p className="text-[10px] font-mono font-bold text-[#1a1c1c] mb-1 tracking-widest">
                STATUS: SYSTEM OPTIMAL
              </p>
              <p className="text-xs text-[#4e4639] font-light">
                Seka Kama Computational Interface v4.2
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
