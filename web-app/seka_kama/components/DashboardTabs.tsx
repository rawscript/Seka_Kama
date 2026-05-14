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
    <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Tab Bar */}
      <div style={{
        display: 'flex',
        backgroundColor: '#2c3e50',
        padding: '0 20px',
        gap: 4,
        zIndex: 100,
      }}>
        <button
          onClick={() => setActiveTab('analysis')}
          style={{
            padding: '12px 24px',
            backgroundColor: activeTab === 'analysis' ? '#34495e' : 'transparent',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            fontSize: 16,
            fontWeight: activeTab === 'analysis' ? 'bold' : 'normal',
            borderBottom: activeTab === 'analysis' ? '3px solid #4CAF50' : 'none',
          }}
        >
          🗺️ Spatial Analysis
        </button>
        <button
          onClick={() => setActiveTab('kepler')}
          style={{
            padding: '12px 24px',
            backgroundColor: activeTab === 'kepler' ? '#34495e' : 'transparent',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            fontSize: 16,
            fontWeight: activeTab === 'kepler' ? 'bold' : 'normal',
            borderBottom: activeTab === 'kepler' ? '3px solid #4CAF50' : 'none',
          }}
        >
          📊 Kepler.gl Explorer
        </button>
        <button
          onClick={() => setActiveTab('scenarios')}
          style={{
            padding: '12px 24px',
            backgroundColor: activeTab === 'scenarios' ? '#34495e' : 'transparent',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            fontSize: 16,
            fontWeight: activeTab === 'scenarios' ? 'bold' : 'normal',
            borderBottom: activeTab === 'scenarios' ? '3px solid #4CAF50' : 'none',
          }}
        >
          🔮 Scenario History
        </button>
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, position: 'relative' }}>
        {activeTab === 'analysis' && (
          <SekaMap onScenarioRun={onScenarioRun} />
        )}
        
        {activeTab === 'kepler' && (
          <KeplerMapNoSSR
            onCellSelect={(cellId) => console.log('Selected cell:', cellId)}
            onScenarioApply={(cells, modifications) => {
              setSelectedCells(cells);
              // Trigger scenario with selected cells
              onScenarioRun({
                type: 'selection',
                cells: cells,
                modifications: modifications,
              });
            }}
          />
        )}
        
        {activeTab === 'scenarios' && (
          <ScenarioPanel onScenarioSelect={(scenario) => {
            // Load and display previous scenario
            console.log('Loading scenario:', scenario);
          }} />
        )}
      </div>
    </div>
  );
}