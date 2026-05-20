'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  Map as MapIcon, 
  History, 
  BarChart3, 
  Key, 
  User as UserIcon, 
  LogOut, 
  Settings,
  ChevronRight,
  Menu,
  X,
  ShieldCheck
} from 'lucide-react';

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        router.push('/login');
        return;
      }
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`, {
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
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    router.push('/login');
  };

  const navLinks = [
    { href: '/dashboard', label: 'Spatial Analysis', icon: MapIcon },
    { href: '/dashboard/kepler', label: 'Kepler Explorer', icon: BarChart3 },
    { href: '/dashboard/scenarios', label: 'Scenario History', icon: History },
    { href: '/dashboard/reports', label: 'Reports', icon: ShieldCheck },
  ];

  const adminLinks = [
    { href: '/dashboard/api-keys', label: 'API Management', icon: Key },
    { href: '/dashboard/profile', label: 'Account Settings', icon: UserIcon },
  ];

  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '...';

  return (
    <div className="flex h-screen bg-[#020617] text-slate-200 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <aside 
        className={`${
          isSidebarOpen ? 'w-64' : 'w-16'
        } flex flex-col glass-effect border-r border-white/5 transition-all duration-300 z-50`}
      >
        <div className="h-16 flex items-center px-4 border-b border-white/5">
          <Link href="/dashboard" className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 flex-shrink-0 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            {isSidebarOpen && (
              <div className="flex flex-col whitespace-nowrap animate-in fade-in">
                <span className="text-sm font-bold tracking-tight">Seka Kama</span>
                <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-widest leading-none">Enterprise</span>
              </div>
            )}
          </Link>
        </div>

        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          <div className={`px-3 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest ${!isSidebarOpen && 'sr-only'}`}>
            Main Intelligence
          </div>
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                  isActive 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                    : 'hover:bg-white/5 text-slate-400 border border-transparent'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-400' : 'group-hover:text-slate-200'}`} />
                {isSidebarOpen && <span className="text-sm font-medium whitespace-nowrap">{link.label}</span>}
                {isActive && isSidebarOpen && <div className="ml-auto w-1 h-1 rounded-full bg-emerald-400" />}
              </Link>
            );
          })}

          <div className={`px-3 mt-8 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest ${!isSidebarOpen && 'sr-only'}`}>
            System Control
          </div>
          {adminLinks.map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                  isActive 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                    : 'hover:bg-white/5 text-slate-400 border border-transparent'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-400' : 'group-hover:text-slate-200'}`} />
                {isSidebarOpen && <span className="text-sm font-medium whitespace-nowrap">{link.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/5 bg-black/20">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="flex items-center gap-3 w-full px-3 py-2 text-slate-500 hover:text-slate-200 transition-colors"
          >
            {isSidebarOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
            {isSidebarOpen && <span className="text-xs font-medium">Collapse Rail</span>}
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Superior Header */}
        <header className="h-16 flex items-center justify-between px-6 glass-effect border-b border-white/5 z-40">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
              {navLinks.find(l => pathname === l.href)?.label || 'Dashboard'}
            </h1>
            <ChevronRight className="w-4 h-4 text-slate-600" />
            <span className="text-xs text-slate-500 font-mono tracking-tighter uppercase">
              Live Environment / KE_MA
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">System Status</span>
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Operational
              </span>
            </div>

            <div className="w-px h-8 bg-white/5 mx-2" />

            <div className="relative" ref={userMenuRef}>
              <button 
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-3 pl-3 pr-1 py-1 rounded-full border border-white/10 hover:border-white/20 transition-all bg-white/5 group"
              >
                <div className="flex flex-col items-end text-[11px] leading-tight mr-1">
                  <span className="font-bold text-slate-200 group-hover:text-emerald-400 transition-colors">{user?.full_name || 'Loading...'}</span>
                  <span className="text-slate-500 text-[9px]">{user?.organization || 'Organization'}</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-700 to-slate-900 border border-white/10 flex items-center justify-center text-xs font-bold ring-2 ring-emerald-500/20 shadow-lg">
                  {initials}
                </div>
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-3 w-64 glass-effect border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 p-2 z-[100]">
                  <div className="px-4 py-3 mb-2 border-b border-white/5">
                    <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest">{user?.role || 'Access Tier'}</p>
                    <p className="text-sm font-semibold truncate">{user?.email}</p>
                  </div>
                  <button className="flex items-center gap-3 w-full px-3 py-2 text-sm text-slate-400 hover:text-slate-200 hover:bg-white/5 rounded-lg transition-colors text-left">
                    <Settings className="w-4 h-4" />
                    System Preferences
                  </button>
                  <button 
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full px-3 py-2 mt-2 text-sm text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    Terminate Session
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 relative overflow-hidden bg-[#020617]/50">
          {children}
        </main>
      </div>
    </div>
  );
}