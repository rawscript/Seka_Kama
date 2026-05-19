'use client';

import dynamic from 'next/dynamic';
import ProtectedRoute from '@/components/ProtectedRoute';

const KeplerMap = dynamic(() => import('@/components/KeplerMap'), { ssr: false });

export default function KeplerPage() {
  return (
    <ProtectedRoute>
      <div style={{ width: '100%', height: 'calc(100vh - 58px)', position: 'relative', overflow: 'hidden' }}>
        <KeplerMap />
      </div>
    </ProtectedRoute>
  );
}
