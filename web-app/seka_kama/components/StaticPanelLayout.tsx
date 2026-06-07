'use client';

import { useState } from 'react';
import { Grid3x3, Sidebar, LayoutDashboard, ChevronUp, ChevronDown, Settings } from 'lucide-react';

interface StaticPanelLayoutProps {
  analystPanel: React.ReactNode;
  ecosystemPanel: React.ReactNode;
  layerPanel: React.ReactNode;
  scenarioPanel?: React.ReactNode;
  trendPanel?: React.ReactNode;
  selectedUnit?: string;
  year: number;
  isLiveMode?: boolean;
}

type PanelLayout = 'grid' | 'sidebar' | 'overlay';

export default function StaticPanelLayout({
  analystPanel,
  ecosystemPanel,
  layerPanel,
  scenarioPanel,
  trendPanel,
  selectedUnit,
  year,
  isLiveMode = false
}: StaticPanelLayoutProps) {
  const [layout, setLayout] = useState<PanelLayout>('grid');
  const [isExpanded, setIsExpanded] = useState(true);

  // Grid Layout - Clean organized grid
  const GridLayout = () => (
    <div className="fixed top-4 right-4 bottom-4 z-40 pointer-events-none">
      <div className="h-full w-[400px] flex flex-col gap-4 pointer-events-auto">
        {/* Layout Controls */}
        <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4 text-slate-600" />
              <span className="text-xs font-medium text-slate-800">Analysis Panels</span>
              <div className={`w-2 h-2 rounded-full ${isLiveMode ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLayout('grid')}
                className={`p-1.5 rounded ${layout === 'grid' ? 'bg-slate-100 text-slate-800' : 'text-slate-600 hover:bg-slate-50'}`}
                title="Grid Layout"
              >
                <Grid3x3 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setLayout('sidebar')}
                className={`p-1.5 rounded ${layout === 'sidebar' ? 'bg-slate-100 text-slate-800' : 'text-slate-600 hover:bg-slate-50'}`}
                title="Sidebar Layout"
              >
                <Sidebar className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 text-slate-600 hover:bg-slate-50 rounded"
                title={isExpanded ? 'Collapse' : 'Expand'}
              >
                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
          {isExpanded && (
            <div className="mt-2 text-center">
              <span className="text-xs text-slate-600">{selectedUnit || 'Regional'} • {year}</span>
            </div>
          )}
        </div>

        {/* Main Content Area - Only show when expanded */}
        {isExpanded && (
          <div className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto custom-scrollbar space-y-4 pr-2 pb-4">
              {/* Analyst Panel */}
              <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">AI Analyst</h3>
                </div>
                <div className="p-4">
                  {analystPanel}
                </div>
              </div>

              {/* Ecosystem Indicators Panel */}
              <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Ecosystem Indicators</h3>
                </div>
                <div className="p-4">
                  {ecosystemPanel}
                </div>
              </div>

              {/* Layer Controls Panel */}
              <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Layer Controls</h3>
                </div>
                <div className="p-4">
                  {layerPanel}
                </div>
              </div>

              {/* Scenario Panel (if exists) */}
              {scenarioPanel && (
                <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-200">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Scenario Results</h3>
                  </div>
                  <div className="p-4">
                    {scenarioPanel}
                  </div>
                </div>
              )}

              {/* Trend Panel (if exists) */}
              {trendPanel && (
                <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-200">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Historical Trends</h3>
                  </div>
                  <div className="p-4">
                    {trendPanel}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Sidebar Layout - Tabbed interface
  const SidebarLayout = () => (
    <div className="fixed top-4 right-4 bottom-4 z-40 pointer-events-none">
      <div className="h-full w-[380px] flex pointer-events-auto">
        {/* Tab Bar */}
        <div className="w-12 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-l-xl shadow-lg flex flex-col items-center py-4">
          <button className="p-2 mb-4" title="Analysis">
            <LayoutDashboard className="w-5 h-5 text-slate-600" />
          </button>
          <button className="p-2 mb-4" title="Indicators">
            <Grid3x3 className="w-5 h-5 text-slate-600" />
          </button>
          <button className="p-2 mb-4" title="Layers">
            <Sidebar className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex-1" />
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-600" /> : <ChevronDown className="w-5 h-5 text-slate-600" />}
          </button>
        </div>

        {/* Content Area */}
        {isExpanded && (
          <div className="flex-1 bg-white/95 backdrop-blur-sm border border-slate-200 border-l-0 rounded-r-xl shadow-lg overflow-hidden">
            <div className="h-full flex flex-col">
              {/* Header */}
              <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Analysis Dashboard</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <div className={`w-2 h-2 rounded-full ${isLiveMode ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                    <span className="text-xs text-slate-600">{selectedUnit || 'Regional'} • {year}</span>
                  </div>
                </div>
                <button 
                  onClick={() => setLayout('grid')}
                  className="p-1.5 text-slate-600 hover:bg-slate-100 rounded"
                  title="Switch to grid layout"
                >
                  <Grid3x3 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
                <div>
                  <h4 className="text-xs font-bold text-slate-700 mb-3 uppercase tracking-wider">AI Analyst Insights</h4>
                  {analystPanel}
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-700 mb-3 uppercase tracking-wider">Ecosystem Health</h4>
                  {ecosystemPanel}
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-700 mb-3 uppercase tracking-wider">Map Layers</h4>
                  {layerPanel}
                </div>

                {scenarioPanel && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 mb-3 uppercase tracking-wider">Scenario Analysis</h4>
                    {scenarioPanel}
                  </div>
                )}

                {trendPanel && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 mb-3 uppercase tracking-wider">Historical Trends</h4>
                    {trendPanel}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Overlay Layout - Minimal floating controls
  const OverlayLayout = () => (
    <div className="fixed top-4 right-4 z-40 pointer-events-auto">
      {!isExpanded ? (
        <button
          onClick={() => setIsExpanded(true)}
          className="p-3 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-lg hover:bg-white transition-colors"
          title="Show analysis panels"
        >
          <Grid3x3 className="w-4 h-4 text-slate-600" />
        </button>
      ) : (
        <div className="w-80 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Quick Analysis</h3>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`w-2 h-2 rounded-full ${isLiveMode ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                  <span className="text-xs text-slate-600">{selectedUnit || 'Regional'} • {year}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setLayout('grid')}
                  className="p-1.5 text-slate-600 hover:bg-slate-100 rounded"
                  title="More options"
                >
                  <Grid3x3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="p-1.5 text-slate-600 hover:bg-slate-100 rounded"
                  title="Hide"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="max-h-40 overflow-y-auto">
                {analystPanel}
              </div>
              
              <div className="space-y-2">
                <button className="w-full p-2 text-left text-xs text-slate-700 hover:bg-slate-50 rounded transition-colors">
                  View Full Ecosystem Indicators
                </button>
                <button className="w-full p-2 text-left text-xs text-slate-700 hover:bg-slate-50 rounded transition-colors">
                  Configure Map Layers
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Return the selected layout
  switch (layout) {
    case 'sidebar':
      return <SidebarLayout />;
    case 'overlay':
      return <OverlayLayout />;
    case 'grid':
    default:
      return <GridLayout />;
  }
}