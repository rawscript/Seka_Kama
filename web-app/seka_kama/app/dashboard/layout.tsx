'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
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
    { href: '/dashboard', label: 'Spatial Analysis', icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
      </svg>
    )},
    { href: '/dashboard/kepler', label: 'Kepler Explorer', icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    )},
    { href: '/dashboard/scenarios', label: 'Scenarios', icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
      </svg>
    )},
    { href: '/dashboard/reports', label: 'Reports', icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    )},
  ];

  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#0b0f1a', fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {/* Top Navigation Bar */}
      <nav style={{
        background: 'rgba(11, 15, 26, 0.95)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '0 1.5rem',
        height: '58px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 200,
      }}>
        {/* Brand */}
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <div style={{
            width: '32px', height: '32px',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 16px rgba(16,185,129,0.3)',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div>
            <span style={{ fontSize: '15px', fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.3px' }}>Seka Kama</span>
            <span style={{ display: 'block', fontSize: '10px', color: '#10b981', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', lineHeight: 1 }}>Digital Twin</span>
          </div>
        </Link>

        {/* Nav Links */}
        <div style={{ display: 'flex', gap: '2px' }}>
          {navLinks.map(link => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px',
                  padding: '6px 14px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: isActive ? '#10b981' : '#94a3b8',
                  background: isActive ? 'rgba(16,185,129,0.1)' : 'transparent',
                  border: isActive ? '1px solid rgba(16,185,129,0.2)' : '1px solid transparent',
                  transition: 'all 0.15s ease',
                }}
              >
                <span style={{ color: isActive ? '#10b981' : '#64748b' }}>{link.icon}</span>
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* User Menu */}
        <div style={{ position: 'relative' }} ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '10px',
              padding: '6px 12px 6px 6px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{
              width: '28px', height: '28px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #10b981, #0891b2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '11px', fontWeight: 700, color: 'white',
              flexShrink: 0,
            }}>{initials}</div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#e2e8f0' }}>{user?.full_name?.split(' ')[0] || 'User'}</div>
              <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{user?.role || 'Researcher'}</div>
            </div>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {isMenuOpen && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              width: '260px',
              background: '#141824',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
              zIndex: 1000,
            }}>
              <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#f1f5f9', marginBottom: '3px' }}>{user?.full_name}</div>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '3px' }}>{user?.email}</div>
                {user?.organization && (
                  <div style={{ fontSize: '11px', color: '#475569' }}>{user.organization}</div>
                )}
                <div style={{
                  display: 'inline-flex', marginTop: '8px',
                  padding: '2px 8px', borderRadius: '4px',
                  background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)',
                  fontSize: '10px', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.08em',
                }}>{user?.role}</div>
              </div>
              <div style={{ padding: '6px' }}>
                <Link href="/dashboard/profile" onClick={() => setIsMenuOpen(false)} style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '9px 12px', borderRadius: '8px', textDecoration: 'none',
                  fontSize: '13px', color: '#94a3b8',
                  transition: 'all 0.15s ease',
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  Profile Settings
                </Link>
                <Link href="/dashboard/api-keys" onClick={() => setIsMenuOpen(false)} style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '9px 12px', borderRadius: '8px', textDecoration: 'none',
                  fontSize: '13px', color: '#94a3b8',
                  transition: 'all 0.15s ease',
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  API Keys
                </Link>
              </div>
              <div style={{ padding: '6px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <button onClick={handleLogout} style={{
                  display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                  padding: '9px 12px', borderRadius: '8px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: '13px', color: '#f87171', textAlign: 'left',
                  transition: 'all 0.15s ease',
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {children}
      </main>
    </div>
  );
}