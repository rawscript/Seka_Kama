'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import dynamic from 'next/dynamic';

const SekaMap = dynamic(() => import('@/components/SekaMap'), { ssr: false });

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <SekaMap />
    </ProtectedRoute>
  );
}