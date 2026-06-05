'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { getApiUrl } from '@/services/config';
import NotificationPanel from '@/components/NotificationPanel';

interface User {
  id: number;
  email: string;
  full_name: string;
  organization: string;
  role: string;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        router.push('/login');
        return;
      }
      try {
        const response = await fetch(`${getApiUrl()}/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (response.ok) {
          setUser(await response.json());
        } else {
          router.push('/login');
        }
      } catch {
        router.push('/login');
      }
    };
    fetchUser();
  }, [router]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setIsNotificationOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    router.push('/login');
  };

  const navLinks = [
    { href: '/dashboard', label: 'Spatial Analysis', icon: 'map' },
    { href: '/dashboard/kepler', label: 'Kepler Explorer', icon: 'analytics' },
    { href: '/dashboard/scenarios', label: 'Scenario History', icon: 'history' },
    { href: '/dashboard/reports', label: 'Reports', icon: 'description' },
  ];

  const adminLinks = [
    { href: '/dashboard/api-keys', label: 'API Management', icon: 'api' },
    { href: '/dashboard/profile', label: 'Account Settings', icon: 'settings' },
  ];

  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'JD';

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        @import url('https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&family=Playfair+Display:wght@500;600;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

        :root {
          --primary: #775a19;
          --on-primary: #ffffff;
          --surface-container-lowest: #ffffff;
          --surface-container: #eeeeee;
          --surface-container-low: #f3f3f3;
          --outline-variant: #d1c5b4;
          --on-surface: #1a1c1c;
          --on-surface-variant: #4e4639;
          --secondary: #5f5e5e;
          --outline: #7f7667;
          --surface-bright: #f9f9f9;
          --primary-container: #c5a059;
          --on-primary-container: #4e3700;
          --error: #ba1a1a;
        }

        .dashboard-container {
          font-family: 'Hanken Grotesk', sans-serif;
          background-color: var(--surface-bright);
          color: var(--on-surface);
        }

        .headline-font {
          font-family: 'Playfair Display', serif;
        }

        .material-symbols-outlined {
          font-variation-settings: 'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24;
          vertical-align: middle;
        }

        .glass-header {
          background: rgba(249, 249, 249, 0.8);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid var(--outline-variant);
        }

        .sidebar-link {
          transition: all 0.3s ease;
        }

        .sidebar-link.active {
          color: var(--primary);
          background-color: var(--surface-container);
          border-right: 2px solid var(--primary);
        }

        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #d1c5b4; border-radius: 10px; }
      `}} />

      <div className="dashboard-container flex h-screen overflow-hidden">
        {/* Sidebar Navigation */}
        <aside className="fixed left-0 top-0 h-full w-72 border-r border-outline-variant bg-surface-container-lowest flex flex-col pt-8 pb-6 px-6 z-50">
          <div className="mb-10 flex flex-col">
            <span className="headline-font text-2xl font-semibold text-primary uppercase tracking-widest leading-none">Seka Kama</span>
            <span className="text-[12px] font-semibold text-secondary tracking-[0.3em] mt-1">ENTERPRISE</span>
          </div>

          <div className="flex flex-col gap-y-8 flex-grow overflow-y-auto custom-scrollbar">
            <div>
              <h3 className="text-[12px] font-semibold text-outline mb-4 px-2 tracking-[0.15em] uppercase">MAIN INTELLIGENCE</h3>
              <nav className="space-y-1">
                {navLinks.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-sm ${
                        isActive 
                          ? 'active font-semibold' 
                          : 'text-secondary hover:text-primary hover:bg-surface-container-low'
                      }`}
                    >
                      <span className="material-symbols-outlined">{link.icon}</span>
                      <span className="text-[16px] tracking-tight">{link.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div>
              <h3 className="text-[12px] font-semibold text-outline mb-4 px-2 tracking-[0.15em] uppercase">SYSTEM CONTROL</h3>
              <nav className="space-y-1">
                {adminLinks.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-sm ${
                        isActive 
                          ? 'active font-semibold' 
                          : 'text-secondary hover:text-primary hover:bg-surface-container-low'
                      }`}
                    >
                      <span className="material-symbols-outlined">{link.icon}</span>
                      <span className="text-[16px] tracking-tight">{link.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>

          <div className="mt-auto pt-6">
            <button className="w-full bg-[#775a19] text-white py-3 px-4 text-[12px] font-semibold uppercase tracking-widest hover:bg-opacity-90 active:scale-[0.98] transition-all">
              New Analysis
            </button>
          </div>
        </aside>

        {/* Main Container */}
        <div className="flex-1 flex flex-col ml-72 relative">
          {/* Superior Header */}
          <header className="fixed top-0 right-0 left-72 h-20 z-40 glass-header flex justify-between items-center px-10">
            <div className="flex items-center gap-6">
              <h1 className="headline-font text-2xl text-on-surface">
                {navLinks.find(l => pathname === l.href)?.label || 'Spatial Analysis'}
              </h1>
              <div className="h-4 w-[1px] bg-outline-variant"></div>
              <nav className="flex gap-6">
                <span className="text-[12px] font-semibold text-primary border-b-2 border-primary pb-1 uppercase tracking-widest">Live Environment</span>
                <span className="text-[12px] font-semibold text-secondary hover:text-on-surface transition-opacity uppercase tracking-widest cursor-default">KE_MA</span>
              </nav>
            </div>

            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#1db954] animate-pulse"></div>
                <span className="text-[12px] font-semibold text-secondary uppercase tracking-widest">System Operational</span>
              </div>
              
              <div className="relative" ref={notificationRef}>
                <button 
                  onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                  className={`text-secondary hover:text-on-surface transition-colors relative ${isNotificationOpen ? 'text-primary' : ''}`}
                >
                  <span className="material-symbols-outlined">notifications</span>
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-error rounded-full border border-white"></span>
                </button>
                <NotificationPanel isOpen={isNotificationOpen} onClose={() => setIsNotificationOpen(false)} />
              </div>

              <div className="flex items-center gap-3 pl-4 border-l border-outline-variant relative" ref={userMenuRef}>
                <div className="text-right">
                  <p className="text-[12px] font-semibold text-on-surface leading-none mb-1">{user?.full_name || 'James'}</p>
                  <p className="text-[10px] text-secondary font-medium tracking-wide">{user?.organization || 'Seka Kama'}</p>
                </div>
                <button 
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="w-10 h-10 bg-[#c5a059] rounded-full flex items-center justify-center text-[#4e3700] text-sm font-semibold border border-outline-variant overflow-hidden hover:opacity-90 transition-opacity"
                >
                  {user?.full_name ? initials : (
                    <img 
                      alt="User avatar" 
                      className="w-full h-full object-cover" 
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuAS1mvBOdfYdeZ91WPxVznJY1wXvh_jO-0z86T4lzxH3SrEKCkG_djgxN5dSFRuWc-NUcNfo0CjStIIiMe_G9xdA3zhPoltdII94oYStADZs9iDEA0JwmiTx5HCAD7F_52AgdIEIleCB5lZSvyjBx9KmJV5ke0Dck6-D9HwWlTH-CZITVaYYBxKBnul65BJVPuo_d9dOLXWIAxMwRCobRjrT_PjvRsHwsQzE-DyRoAfbrNqZFLlHgREuIE7PQ9O2lBaQ_rSN_cJiAs" 
                    />
                  )}
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 top-full mt-4 w-64 bg-white/95 backdrop-blur-md border border-outline-variant rounded-sm shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 p-2 z-[100]">
                    <div className="px-4 py-3 mb-2 border-b border-outline-variant">
                      <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">{user?.role || 'Access Tier'}</p>
                      <p className="text-sm font-semibold truncate text-on-surface">{user?.email}</p>
                    </div>
                    <Link href="/settings" className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-secondary hover:text-on-surface hover:bg-surface-container-low transition-colors text-left font-medium block">
                      <span className="material-symbols-outlined text-[20px]">settings</span>
                      System Preferences
                    </Link>
                    <button 
                      onClick={handleLogout}
                      className="flex items-center gap-3 w-full px-3 py-2.5 mt-2 text-sm text-error hover:bg-red-50 transition-colors text-left font-medium"
                    >
                      <span className="material-symbols-outlined text-[20px]">logout</span>
                      Terminate Session
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Content Area */}
          <main className="flex-1 relative overflow-hidden pt-20">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}