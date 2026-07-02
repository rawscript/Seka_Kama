import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import GlobalErrorBoundary from '@/components/GlobalErrorBoundary';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

// Material Symbols configuration
const MATERIAL_SYMBOLS_URL = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap';

export const metadata: Metadata = {
  title: 'Seka Kama Digital Twin',
  description: 'Advanced geospatial analytics for lion conservation in the Greater Mara ecosystem',
  keywords: 'conservation, GIS, lion population, Kenya, digital twin, LandDX, WDPA',
  authors: [{ name: 'Seka Kama Conservancy' }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="stylesheet" href={MATERIAL_SYMBOLS_URL} />
      </head>
      <body className={`${inter.className} min-h-full flex flex-col bg-[#f9f9f9] text-[#1a1c1c]`}>
        <GlobalErrorBoundary>
          {/* Floating layer for draggable panels */}
          <div id="floating-layer" className="fixed inset-0 pointer-events-none z-[9999]" />
          
          {/* The min-h-full and flex-col ensures your map dashboard fills the screen properly */}
          <main className="flex-grow">
            {children}
          </main>
          <Analytics />
        </GlobalErrorBoundary>
      </body>
    </html>
  );
}
