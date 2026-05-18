// web-app/seka_kama/components/DashboardTabs.tsx
'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
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
    <div className="w-full h-screen flex flex-col bg-[#020617] text-white">
      {/* Tab Bar */}
      <div className="flex bg-black/40 backdrop-blur-md border-b border-white/10 px-6 gap-2 z-50">
        <TabButton 
          active={activeTab === 'analysis'} 
          onClick={() => setActiveTab('analysis')}
          icon="🗺️"
          label="Spatial Analysis"
        />
        <TabButton 
          active={activeTab === 'kepler'} 
          onClick={() => setActiveTab('kepler')}
          icon="📊"
          label="Kepler.gl Explorer"
        />
        <TabButton 
          active={activeTab === 'scenarios'} 
          onClick={() => setActiveTab('scenarios')}
          icon="🔮"
          label="Scenario History"
        />
      </div>

      {/* Tab Content */}
      <div className="flex-1 relative bg-[#0a0a20]">
        <div 
          className={`absolute inset-0 transition-opacity duration-500 ${activeTab === 'analysis' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`} 
          style={{ height: '100%', width: '100%' }}
        >
          <SekaMap onScenarioRun={onScenarioRun} />
        </div>
        
        <div 
          className={`absolute inset-0 transition-opacity duration-500 flex flex-col ${activeTab === 'kepler' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}
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
          className={`absolute inset-0 transition-opacity duration-500 overflow-y-auto ${activeTab === 'scenarios' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}
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
}: { active: boolean; onClick: () => void; icon: string; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`
        px-6 py-4 flex items-center gap-2 text-sm font-bold tracking-tight transition-all relative
        ${active ? 'text-white' : 'text-gray-400 hover:text-gray-200'}
      `}
    >
      <span className="text-base">{icon}</span>
      <span className="uppercase tracking-[0.1em]">{label}</span>
      {active && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)]" />
      )}
    </button>
  );
}