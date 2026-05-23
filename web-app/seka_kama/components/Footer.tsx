'use client';

import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-[#d1c5b4]/80 mt-auto">
      <div className="w-full px-6 md:px-20 py-16 flex flex-col items-center gap-6 max-w-[1440px] mx-auto text-center">
        <div className="font-serif text-2xl text-[#1a1c1c] italic font-normal tracking-tight">Seka Kama</div>
        <div className="flex flex-wrap justify-center gap-x-10 gap-y-3 mb-6">
          <Link href="/about" className="text-[11px] font-bold uppercase tracking-widest text-[#7f7667] hover:text-[#775a19] transition-colors">About</Link>
          <Link href="/documentation" className="text-[11px] font-bold uppercase tracking-widest text-[#7f7667] hover:text-[#775a19] transition-colors">Documentation</Link>
          <Link href="/data-standards" className="text-[11px] font-bold uppercase tracking-widest text-[#7f7667] hover:text-[#775a19] transition-colors">Data Standards</Link>
          <Link href="/privacy" className="text-[11px] font-bold uppercase tracking-widest text-[#7f7667] hover:text-[#775a19] transition-colors">Privacy Policy</Link>
          <Link href="/contact" className="text-[11px] font-bold uppercase tracking-widest text-[#7f7667] hover:text-[#775a19] transition-colors">Contact</Link>
        </div>
        <div className="w-16 h-[1px] bg-[#d1c5b4]/60 mb-4" />
        <p className="text-[11px] font-semibold tracking-wider text-[#d1c5b4] uppercase">
          &copy; 2026 Seka Kama Conservancy. All pipelines operational.
        </p>
        <p className="text-[10px] text-[#7f7667]/70 font-mono tracking-tight max-w-md">
          Telemetry Inputs: VIIRS DNB, LandDX, ESA WorldCover, WDPA Ecosystem Core
        </p>
      </div>
    </footer>
  );
}
