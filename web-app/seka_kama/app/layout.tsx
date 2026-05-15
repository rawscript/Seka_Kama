import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

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
      <body className={`${inter.className} min-h-full flex flex-col bg-slate-950 text-slate-50`}>
        {/* The min-h-full and flex-col ensures your map dashboard fills the screen properly */}
        <main className="flex-grow">
          {children}
        </main>
        <Analytics />
      </body>
    </html>
  );
}