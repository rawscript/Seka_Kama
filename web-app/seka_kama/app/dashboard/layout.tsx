'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  const [user, setUser] = useState<User | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    router.push('/login');
  };

  return (
    <div className="dashboard-container">
      <nav className="dashboard-nav">
        <div className="nav-brand">
          <Link href="/dashboard">Seka Kama</Link>
          <span className="nav-subtitle">Digital Twin</span>
        </div>

        <div className="nav-links">
          <Link href="/dashboard">Spatial Analysis</Link>
          <Link href="/dashboard/kepler">Kepler Explorer</Link>
          <Link href="/dashboard/scenarios">Scenarios</Link>
          <Link href="/dashboard/reports">Reports</Link>
        </div>

        <div className="nav-user">
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="user-button">
            <span className="user-initial">{user?.full_name?.charAt(0) || 'U'}</span>
            <span className="user-name">{user?.full_name?.split(' ')[0]}</span>
          </button>
          
          {isMenuOpen && (
            <div className="user-menu">
              <div className="user-info">
                <div className="user-fullname">{user?.full_name}</div>
                <div className="user-email">{user?.email}</div>
                <div className="user-role">{user?.role}</div>
              </div>
              <div className="menu-divider"></div>
              <Link href="/dashboard/profile" className="menu-item">Profile Settings</Link>
              <Link href="/dashboard/api-keys" className="menu-item">API Keys</Link>
              <button onClick={handleLogout} className="menu-item logout">Sign Out</button>
            </div>
          )}
        </div>
      </nav>

      <main className="dashboard-main">
        {children}
      </main>

      <style jsx>{`
        .dashboard-container {
          min-height: 100vh;
          background: #f5f5f5;
          display: flex;
          flex-direction: column;
        }

        .dashboard-nav {
          background: white;
          border-bottom: 1px solid #e0e0e0;
          padding: 0 2rem;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .nav-brand {
          display: flex;
          align-items: baseline;
          gap: 0.5rem;
        }

        .nav-brand a {
          font-size: 1.25rem;
          font-weight: 600;
          color: #2c3e50;
          text-decoration: none;
        }

        .nav-subtitle {
          font-size: 0.75rem;
          color: #4CAF50;
        }

        .nav-links {
          display: flex;
          gap: 2rem;
        }

        .nav-links a {
          color: #666;
          text-decoration: none;
          font-size: 0.875rem;
          font-weight: 500;
          transition: color 0.2s ease;
        }

        .nav-links a:hover {
          color: #4CAF50;
        }

        .nav-user {
          position: relative;
        }

        .user-button {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 8px;
          transition: background 0.2s ease;
        }

        .user-button:hover {
          background: #f0f0f0;
        }

        .user-initial {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #4CAF50;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
        }

        .user-name {
          font-size: 0.875rem;
          font-weight: 500;
          color: #333;
        }

        .user-menu {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          width: 280px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          overflow: hidden;
          z-index: 1000;
        }

        .user-info {
          padding: 1rem;
          background: #f8f9fa;
        }

        .user-fullname {
          font-weight: 600;
          color: #333;
          margin-bottom: 0.25rem;
        }

        .user-email {
          font-size: 0.75rem;
          color: #666;
          margin-bottom: 0.25rem;
        }

        .user-role {
          font-size: 0.7rem;
          color: #4CAF50;
          text-transform: uppercase;
        }

        .menu-divider {
          height: 1px;
          background: #e0e0e0;
        }

        .menu-item {
          display: block;
          padding: 0.75rem 1rem;
          color: #333;
          text-decoration: none;
          font-size: 0.875rem;
          transition: background 0.2s ease;
          width: 100%;
          text-align: left;
          background: none;
          border: none;
          cursor: pointer;
        }

        .menu-item:hover {
          background: #f5f5f5;
        }

        .menu-item.logout {
          color: #f44336;
          border-top: 1px solid #e0e0e0;
        }

        .dashboard-main {
          flex: 1;
          position: relative;
          display: flex;
          flex-direction: column;
        }
      `}</style>
    </div>
  );
}