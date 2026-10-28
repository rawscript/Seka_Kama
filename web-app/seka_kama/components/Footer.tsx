'use client';

import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-[#d1c5b4]/80 mt-auto w-full">
      <div className="w-full px-6 lg:px-12 py-12 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex flex-col items-start gap-1">
          <div className="font-serif text-2xl text-[#1a1c1c] italic font-normal tracking-tight">Seka Kama</div>
          <p className="text-[10px] text-[#7f7667]/70 font-mono tracking-tight">
            Telemetry Inputs: VIIRS DNB, LandDX, ESA WorldCover, WDPA Ecosystem Core
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
          <Link href="/about" className="text-[11px] font-bold uppercase tracking-widest text-[#7f7667] hover:text-[#775a19] transition-colors">About</Link>
          <Link href="/documentation" className="text-[11px] font-bold uppercase tracking-widest text-[#7f7667] hover:text-[#775a19] transition-colors">Documentation</Link>
          <Link href="/data-standards" className="text-[11px] font-bold uppercase tracking-widest text-[#7f7667] hover:text-[#775a19] transition-colors">Data Standards</Link>
          <Link href="/privacy" className="text-[11px] font-bold uppercase tracking-widest text-[#7f7667] hover:text-[#775a19] transition-colors">Privacy Policy</Link>
          <Link href="/contact" className="text-[11px] font-bold uppercase tracking-widest text-[#7f7667] hover:text-[#775a19] transition-colors">Contact</Link>
        </div>

        <div className="text-right">
          <p className="text-[11px] font-semibold tracking-wider text-[#7f7667] uppercase">
            &copy; 2026 Seka Kama Conservancy
          </p>
          <p className="text-[10px] text-emerald-700 font-mono">
            All pipelines operational
          </p>
        </div>
      </div>
    </footer>
  );
}
