'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getApiUrl } from '@/services/config';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'analyst';
}

export default function ProtectedRoute({ children, requiredRole = 'analyst' }: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    
    if (!token) {
      setIsAuthenticated(false);
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    const verifyToken = async () => {
      try {
        const response = await fetch(`${getApiUrl()}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Invalid token');
        }

        const user = await response.json();
        setUserRole(user.role);
        setIsAuthenticated(true);

        // admin > analyst; only admin routes require admin
        const roleHierarchy: Record<string, number> = { admin: 2, analyst: 1, researcher: 1 };
        const requiredLevel = roleHierarchy[requiredRole] ?? 1;
        const userLevel = roleHierarchy[user.role] ?? 0;

        if (userLevel < requiredLevel) {
          router.push('/unauthorized');
        }
      } catch {
        localStorage.removeItem('access_token');
        setIsAuthenticated(false);
        router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      }
    };

    verifyToken();
  }, [router, pathname, requiredRole]);

  if (isAuthenticated === null) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <style jsx>{`
          .loading-container {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            background: #0a0a2a;
          }
          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid rgba(76, 175, 80, 0.3);
            border-top-color: #4CAF50;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return <>{children}</>;
}