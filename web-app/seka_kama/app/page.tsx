'use client';

import Link from 'next/link';
import { Shield, MapPin, BarChart3, Database, ChevronRight, Globe, Zap, Users } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#020617] text-white">
      {/* Hero Section */}
      <section className="relative h-screen w-full flex items-center justify-center p-6 overflow-hidden">
        {/* Background Image with Gradient Overlay */}
        <div className="absolute inset-0 z-0">
          <img 
            src="/seka_kama_hero_lion_1778841687196.png" 
            alt="Majestic Lion" 
            className="w-full h-full object-cover scale-105 animate-slow-zoom"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#020617]/40 via-[#020617]/80 to-[#020617]" />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto text-center space-y-8 animate-in fade-in slide-in-from-bottom-12 duration-1000">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 backdrop-blur-md text-emerald-400 text-xs font-bold tracking-[0.2em] uppercase">
            <Globe className="w-4 h-4" />
            Empowering Conservation with AI
          </div>
          
          <h1 className="text-6xl md:text-8xl font-black tracking-tight leading-[0.9]">
            SEKA KAMA<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">DIGITAL TWIN</span>
          </h1>

          <p className="max-w-2xl mx-auto text-xl text-gray-400 font-medium leading-relaxed">
            Leading-edge geospatial intelligence for the Greater Mara ecosystem. 
            Simulate human-wildlife encounters, monitor population trends, and predict 
            ecological outcomes using our proprietary SekaNet XGBoost model.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link 
              href="/register"
              className="group relative px-10 py-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-lg transition-all hover:scale-105 hover:shadow-[0_0_50px_rgba(16,185,129,0.5)] flex items-center gap-3 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              Get Started
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link 
              href="/login"
              className="px-10 py-5 glass-effect text-white rounded-2xl font-bold text-lg transition-all hover:bg-white/10"
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Floating Stats */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-6 px-4">
          <StatBox label="Spatial Coverage" value="2,400 km²" />
          <StatBox label="Prediction Accuracy" value="94.2%" />
          <StatBox label="Managed Units" value="12 Districts" />
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <FeatureCard 
            icon={<MapPin className="w-8 h-8 text-emerald-400" />}
            title="Spatial Mapping"
            description="Real-time visualization of 271k+ grid cells with multi-layer nightlight telemetry."
          />
          <FeatureCard 
            icon={<Zap className="w-8 h-8 text-cyan-400" />}
            title="AI Simulations"
            description="Run sophisticated what-if scenarios using the NVIDIA NIM powered SekaNet 2.0."
          />
          <FeatureCard 
            icon={<BarChart3 className="w-8 h-8 text-purple-400" />}
            title="Rich Analytics"
            description="Detailed population reports with automated SHAP-based feature explanations."
          />
          <FeatureCard 
            icon={<Shield className="w-8 h-8 text-rose-400" />}
            title="Policy Support"
            description="Evidence-based insights for conservancy managers and government stakeholders."
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/10 text-center text-gray-500 text-sm">
        <p>&copy; 2026 Seka Kama Conservancy. All rights reserved.</p>
        <div className="flex justify-center gap-6 mt-4">
            <a href="#" className="hover:text-emerald-400 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-emerald-400 transition-colors">Documentation</a>
            <a href="#" className="hover:text-emerald-400 transition-colors">Data Standards</a>
        </div>
      </footer>

      <style jsx global>{`
        @keyframes slow-zoom {
          0% { transform: scale(1.05); }
          100% { transform: scale(1.15); }
        }
        .animate-slow-zoom {
          animation: slow-zoom 20s linear infinite alternate;
        }
      `}</style>
    </div>
  );
}

function StatBox({ label, value }: { label: string, value: string }) {
  return (
    <div className="p-8 rounded-3xl glass-effect text-center group hover:scale-105 transition-all cursor-default">
      <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 mb-2">{value}</div>
      <div className="text-[10px] uppercase tracking-[0.3em] font-black text-white/30 group-hover:text-emerald-400/50 transition-colors">{label}</div>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: any, title: string, description: string }) {
  return (
    <div className="p-8 rounded-[2.5rem] glass-effect hover:border-emerald-500/30 transition-all group hover:-translate-y-2">
      <div className="mb-6 p-4 rounded-3xl bg-white/5 w-fit group-hover:bg-emerald-500/10 transition-colors">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-4 tracking-tight group-hover:text-emerald-400 transition-colors">{title}</h3>
      <p className="text-gray-400 text-sm leading-relaxed group-hover:text-gray-300 transition-colors">{description}</p>
    </div>
  );
}