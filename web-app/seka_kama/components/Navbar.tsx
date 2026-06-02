'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getApiUrl } from '@/services/config';

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
        const response = await fetch(`${getApiUrl()}/auth/me`, {
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
        <Link href="/" className="font-serif font-normal tracking-tight text-2xl text-[#1a1c1c] italic hover:opacity-80 transition-opacity">
          Seka Kama
        </Link>
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
          <NavLink href="/methodology" active={pathname === '/methodology'}>
            Methodology
          </NavLink>
          {isAuthenticated && (
            <NavLink href="/about" active={pathname === '/about'}>
              About
            </NavLink>
          )}
          {!isAuthenticated && (
            <NavLink href="/about" active={pathname === '/about'}>
              About
            </NavLink>
          )}
        </div>
        <div className="flex items-center gap-4">
          {isAuthenticated && (
            <Link href="/settings" title="Settings" className={`text-[#4e4639] hover:text-[#1a1c1c] transition-colors ${pathname === '/settings' ? 'text-[#775a19]' : ''}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </Link>
          )}
          <Link href={consolePath} className="text-[11px] font-bold uppercase tracking-[0.15em] px-6 py-2.5 border border-[#777667] bg-transparent text-[#1a1c1c] hover:bg-[#775a19] hover:text-white hover:border-[#775a19] transition-all duration-300">
            {consoleLabel}
          </Link>
        </div>
      </div>
    </nav>
  );
}

function NavLink({ href, children, active }: { href: string; children: React.ReactNode; active?: boolean }) {
  return (
    <Link 
      href={href} 
      className={`text-[11px] uppercase tracking-[0.2em] font-bold transition-colors ${
        active 
          ? 'text-[#775a19] border-b border-[#775a19] pb-1' 
          : 'text-[#4e4639] hover:text-[#1a1c1c]'
      }`}
    >
      {children}
    </Link>
  );
}
