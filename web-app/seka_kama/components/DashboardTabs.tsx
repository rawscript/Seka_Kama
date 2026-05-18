// web-app/seka_kama/components/DashboardTabs.tsx
'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Map, BarChart2, History } from 'lucide-react';
import SekaMap from './SekaMap';
import KeplerMap from './KeplerMap';
import ScenarioPanel from './ScenarioPanel';

// Dynamically import Kepler to avoid SSR issues
const KeplerMapNoSSR = dynamic(() => import('./KeplerMap'), { ssr: false });

type TabType = 'analysis' | 'kepler' | 'scenarios';

interface DashboardTabsProps {
  onScenarioRun: (result: any) => void;
}

export default function DashboardTabs({ onScenarioRun }: DashboardTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('analysis');
  const [selectedCells, setSelectedCells] = useState<any[]>([]);

  return (
    <div className="w-full h-screen flex flex-col bg-[#0f172a] text-white font-sans overflow-hidden">
      {/* Premium Floating Tab Bar */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[100] flex bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-full p-1.5 shadow-2xl">
        <TabButton 
          active={activeTab === 'analysis'} 
          onClick={() => setActiveTab('analysis')}
          icon={<Map className="w-5 h-5" />}
          label="Spatial Analysis"
        />
        <TabButton 
          active={activeTab === 'kepler'} 
          onClick={() => setActiveTab('kepler')}
          icon={<BarChart2 className="w-5 h-5" />}
          label="Kepler Explorer"
        />
        <TabButton 
          active={activeTab === 'scenarios'} 
          onClick={() => setActiveTab('scenarios')}
          icon={<History className="w-5 h-5" />}
          label="Scenario History"
        />
      </div>

      {/* Tab Content */}
      <div className="flex-1 relative bg-slate-950">
        <div 
          className={`absolute inset-0 transition-all duration-700 ease-in-out ${activeTab === 'analysis' ? 'opacity-100 z-10 scale-100' : 'opacity-0 z-0 scale-95 pointer-events-none'}`} 
          style={{ height: '100%', width: '100%' }}
        >
          <SekaMap onScenarioRun={onScenarioRun} />
        </div>
        
        <div 
          className={`absolute inset-0 transition-all duration-700 ease-in-out flex flex-col ${activeTab === 'kepler' ? 'opacity-100 z-10 scale-100' : 'opacity-0 z-0 scale-95 pointer-events-none'}`}
          style={{ height: '100%', width: '100%' }}
        >
          <KeplerMapNoSSR
            onCellSelect={(cellId) => console.log('Selected cell:', cellId)}
            onScenarioApply={(cells, modifications) => {
              setSelectedCells(cells);
              onScenarioRun({
                type: 'selection',
                cells: cells,
                modifications: modifications,
              });
            }}
          />
        </div>
        
        <div 
          className={`absolute inset-0 transition-all duration-700 ease-in-out overflow-y-auto ${activeTab === 'scenarios' ? 'opacity-100 z-10 scale-100' : 'opacity-0 z-0 scale-95 pointer-events-none'}`}
          style={{ height: '100%', width: '100%' }}
        >
          <ScenarioPanel onScenarioSelect={(scenario) => {
            console.log('Loading scenario:', scenario);
          }} />
        </div>
      </div>
    </div>
  );
}

function TabButton({ 
  active, 
  onClick, 
  icon, 
  label 
}: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`
        px-6 py-3 flex items-center gap-2.5 text-sm font-semibold tracking-wide transition-all rounded-full relative overflow-hidden group
        ${active ? 'text-white bg-emerald-500/10 shadow-[inset_0_0_20px_rgba(16,185,129,0.15)]' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}
      `}
    >
      <span className={`relative z-10 transition-transform duration-300 ${active ? 'scale-110 text-emerald-400' : 'group-hover:scale-110'}`}>{icon}</span>
      <span className="relative z-10 uppercase">{label}</span>
      {active && (
        <div className="absolute inset-0 border border-emerald-500/30 rounded-full" />
      )}
    </button>
  );
}