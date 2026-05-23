'use client';

import { useState, useEffect } from 'react';
import Link from 'next/navigation'; // Wait, LandingPage used next/link. Next.js App router uses next/link.
import { usePathname } from 'next/navigation';
import NextLink from 'next/link';

export default function Navbar() {
  const [mounted, setMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
    const checkSession = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (response.ok) {
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem('access_token');
        }
      } catch (error) {
        console.error("Session verification failed:", error);
      }
    };

    checkSession();
  }, []);

  const consolePath = isAuthenticated ? '/dashboard' : '/login';
  const consoleLabel = isAuthenticated ? 'Dashboard' : 'Launch Console';

  if (!mounted) return null;

  return (
    <nav className="top-0 bg-[#f9f9f9]/90 backdrop-blur-md border-b border-[#d1c5b4]/60 z-50 sticky w-full">
      <div className="flex justify-between items-center w-full px-6 md:px-20 py-5 max-w-[1440px] mx-auto">
        <NextLink href="/" className="font-serif font-normal tracking-tight text-2xl text-[#1a1c1c] italic hover:opacity-80 transition-opacity">
          Seka Kama
        </NextLink>
        <div className="hidden md:flex items-center gap-10">
          <NavLink href="/documentation" active={pathname === '/documentation'}>
            Documentation
          </NavLink>
          <NavLink href="/geospatial" active={pathname === '/geospatial'}>
            Geospatial
          </NavLink>
          <NavLink href="/intelligence" active={pathname === '/intelligence'}>
            Intelligence
          </NavLink>
          <NavLink href="/about" active={pathname === '/about'}>
            About
          </NavLink>
        </div>
        <NextLink href={consolePath} className="text-[11px] font-bold uppercase tracking-[0.15em] px-6 py-2.5 border border-[#777667] bg-transparent text-[#1a1c1c] hover:bg-[#775a19] hover:text-white hover:border-[#775a19] transition-all duration-300">
          {consoleLabel}
        </NextLink>
      </div>
    </nav>
  );
}

function NavLink({ href, children, active }: { href: string; children: React.ReactNode; active?: boolean }) {
  return (
    <NextLink 
      href={href} 
      className={`text-[11px] uppercase tracking-[0.2em] font-bold transition-colors ${
        active 
          ? 'text-[#775a19] border-b border-[#775a19] pb-1' 
          : 'text-[#4e4639] hover:text-[#1a1c1c]'
      }`}
    >
      {children}
    </NextLink>
  );
}
