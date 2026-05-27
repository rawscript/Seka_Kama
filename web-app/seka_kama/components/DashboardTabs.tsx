// web-app/seka_kama/components/DashboardTabs.tsx
'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import ErrorBoundary from './ErrorBoundary';

// Both map components must be dynamically imported (no SSR) — they use browser-only APIs
const SekaMapNoSSR = dynamic(() => import('./SekaMap'), { ssr: false });
const KeplerMapNoSSR = dynamic(() => import('./KeplerMap'), { ssr: false });
const ScenarioPanelNoSSR = dynamic(() => import('./ScenarioPanel'), { ssr: false });

type TabType = 'analysis' | 'kepler' | 'scenarios';

interface DashboardTabsProps {
  onScenarioRun: (result: any) => void;
}

const MapIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
  </svg>
);

const ChartIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);

const HistoryIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3h6l3 9 3-6h6"/>
    <path d="M3 13h6l3 5h9"/>
  </svg>
);

export default function DashboardTabs({ onScenarioRun }: DashboardTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('analysis');

  const tabs = [
    { id: 'analysis' as TabType, label: 'Spatial Analysis', icon: <MapIcon /> },
    { id: 'kepler' as TabType, label: 'Kepler Explorer', icon: <ChartIcon /> },
    { id: 'scenarios' as TabType, label: 'Scenario History', icon: <HistoryIcon /> },
  ];

  return (
    <div style={{ width: '100%', height: 'calc(100vh - 58px)', display: 'flex', flexDirection: 'column', background: '#0b0f1a', overflow: 'hidden' }}>
      {/* Tab Strip */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '2px',
        padding: '0 20px',
        height: '48px',
        background: 'rgba(11,15,26,0.98)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
      }}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                padding: '6px 16px',
                borderRadius: '8px',
                border: isActive ? '1px solid rgba(16,185,129,0.25)' : '1px solid transparent',
                background: isActive ? 'rgba(16,185,129,0.08)' : 'transparent',
                color: isActive ? '#10b981' : '#64748b',
                fontSize: '12.5px',
                fontWeight: isActive ? 600 : 500,
                cursor: 'pointer',
                letterSpacing: '0.01em',
                transition: 'all 0.15s ease',
                fontFamily: 'inherit',
              }}
            >
              <span style={{ color: isActive ? '#10b981' : '#475569', transition: 'color 0.15s' }}>{tab.icon}</span>
              {tab.label}
              {isActive && (
                <span style={{
                  display: 'inline-block',
                  width: '6px', height: '6px',
                  borderRadius: '50%',
                  background: '#10b981',
                  boxShadow: '0 0 6px #10b981',
                  marginLeft: '2px',
                }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* Spatial Analysis */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: activeTab === 'analysis' ? 1 : 0,
            zIndex: activeTab === 'analysis' ? 10 : 0,
            pointerEvents: activeTab === 'analysis' ? 'auto' : 'none',
            transition: 'opacity 0.3s ease',
          }}
        >
          {activeTab === 'analysis' && (
            <ErrorBoundary label="Spatial Analysis">
              <SekaMapNoSSR onScenarioRun={onScenarioRun} />
            </ErrorBoundary>
          )}
        </div>

        {/* Kepler Explorer */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: activeTab === 'kepler' ? 1 : 0,
            zIndex: activeTab === 'kepler' ? 10 : 0,
            pointerEvents: activeTab === 'kepler' ? 'auto' : 'none',
            transition: 'opacity 0.3s ease',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {activeTab === 'kepler' && (
            <ErrorBoundary label="Kepler Explorer">
              <KeplerMapNoSSR
                onCellSelect={(cellId) => console.log('Selected cell:', cellId)}
                onScenarioApply={(cells, modifications) => {
                  onScenarioRun({
                    type: 'selection',
                    cells: cells,
                    modifications: modifications,
                  });
                }}
              />
            </ErrorBoundary>
          )}
        </div>

        {/* Scenario History */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: activeTab === 'scenarios' ? 1 : 0,
            zIndex: activeTab === 'scenarios' ? 10 : 0,
            pointerEvents: activeTab === 'scenarios' ? 'auto' : 'none',
            transition: 'opacity 0.3s ease',
            overflowY: 'auto',
          }}
        >
          <ErrorBoundary label="Scenario History">
            <ScenarioPanelNoSSR onScenarioSelect={(scenario) => {
              setActiveTab('analysis');
              onScenarioRun(scenario);
            }} />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}