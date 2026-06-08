'use client';

import { useState } from 'react';
import { 
  LayoutGrid, 
  Grid3x3, 
  Sidebar,
  PanelRight,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  X,
  Settings,
  Zap,
  Activity,
  Map,
  Layers,
  TrendingUp
} from 'lucide-react';

interface MapAnalysisLayoutProps {
  children: React.ReactNode;
  selectedUnit?: string;
  year: number;
  isLiveMode?: boolean;
  onLayoutChange?: (layout: 'grid' | 'sidebar' | 'compact') => void;
}

type LayoutMode = 'grid' | 'sidebar' | 'compact';

// Helper layout components moved outside of main component to avoid re-creation on each render

interface GridLayoutProps {
  children: React.ReactNode;
  selectedUnit?: string;
  year: number;
  isLiveMode: boolean;
  layoutMode: LayoutMode;
  isExpanded: boolean;
  onLayoutChange: (mode: LayoutMode) => void;
  onToggleExpanded: () => void;
}

const GridLayout = ({ 
  children, 
  selectedUnit, 
  year, 
  isLiveMode, 
  layoutMode, 
  isExpanded, 
  onLayoutChange, 
  onToggleExpanded 
}: GridLayoutProps) => (
  <div className="fixed inset-0 z-50 pointer-events-none p-4">
    <div className="h-full w-full grid grid-cols-3 grid-rows-3 gap-4 pointer-events-auto">
      {/* Top row - Status and Overview */}
      <div className="col-span-3 row-span-1 grid grid-cols-3 gap-4">
        <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">System Status</h3>
            </div>
            <div className={`w-2 h-2 rounded-full ${isLiveMode ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-slate-800">{isLiveMode ? 'Live Twin Active' : 'Historical Mode'}</div>
            <div className="text-xs text-slate-600 mt-1">{selectedUnit || 'Regional View'} • {year}</div>
          </div>
        </div>
        
        <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Map className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Map Context</h3>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-600">View</span>
              <span className="text-xs font-medium text-slate-800">{selectedUnit || 'Regional'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-600">Year</span>
              <span className="text-xs font-medium text-slate-800">{year}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-600" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Performance</h3>
            </div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-slate-800">Optimal</div>
            <div className="text-xs text-slate-600 mt-1">60 FPS • Low Latency</div>
          </div>
        </div>
      </div>
      
      {/* Middle row - Main Analysis Panels */}
      <div className="col-span-2 row-span-2 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-lg overflow-hidden">
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Analysis Dashboard</h3>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => onLayoutChange('sidebar')}
                className="p-1.5 hover:bg-slate-100 rounded transition-colors"
                title="Switch to sidebar layout"
              >
                <Sidebar className="w-3.5 h-3.5 text-slate-600" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-4">
            {children}
          </div>
        </div>
      </div>
      
      {/* Right column - Quick Actions */}
      <div className="col-span-1 row-span-2 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-lg overflow-hidden">
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-600" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Quick Controls</h3>
            </div>
          </div>
          <div className="flex-1 p-4 space-y-3">
            <button className="w-full p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors text-left">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-medium text-slate-800">Toggle Live Mode</span>
              </div>
              <p className="text-[10px] text-slate-600">Switch between historical and real-time data</p>
            </button>
            
            <button className="w-full p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors text-left">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-xs font-medium text-slate-800">Export Analysis</span>
              </div>
              <p className="text-[10px] text-slate-600">Download current view and data</p>
            </button>
            
            <button className="w-full p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors text-left">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-xs font-medium text-slate-800">Scenario Tools</span>
              </div>
              <p className="text-[10px] text-slate-600">Run predictive scenarios</p>
            </button>
            
            <button className="w-full p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors text-left">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-purple-500" />
                <span className="text-xs font-medium text-slate-800">Layer Manager</span>
              </div>
              <p className="text-[10px] text-slate-600">Configure map layers and visibility</p>
            </button>
          </div>
        </div>
      </div>
    </div>
    
    {/* Layout Controls */}
    <div className="absolute top-4 right-4 pointer-events-auto">
      <div className="flex items-center gap-2 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-lg p-2">
        <button
          onClick={() => onLayoutChange('grid')}
          className={`p-2 rounded-lg transition-colors ${layoutMode === 'grid' ? 'bg-slate-100 text-slate-800' : 'text-slate-600 hover:bg-slate-50'}`}
          title="Grid Layout"
        >
          <LayoutGrid className="w-4 h-4" />
        </button>
        <button
          onClick={() => onLayoutChange('sidebar')}
          className={`p-2 rounded-lg transition-colors ${layoutMode === 'sidebar' ? 'bg-slate-100 text-slate-800' : 'text-slate-600 hover:bg-slate-50'}`}
          title="Sidebar Layout"
        >
          <PanelRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => onLayoutChange('compact')}
          className={`p-2 rounded-lg transition-colors ${layoutMode === 'compact' ? 'bg-slate-100 text-slate-800' : 'text-slate-600 hover:bg-slate-50'}`}
          title="Compact Layout"
        >
          <Grid3x3 className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-slate-200 mx-1" />
        <button
          onClick={onToggleExpanded}
          className="p-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
          title={isExpanded ? 'Collapse panels' : 'Expand panels'}
        >
          {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>
    </div>
  </div>
);

interface SidebarLayoutProps {
  children: React.ReactNode;
  selectedUnit?: string;
  year: number;
  isLiveMode: boolean;
  activeTab: 'analysis' | 'indicators' | 'layers';
  onLayoutChange: (mode: LayoutMode) => void;
  onToggleExpanded: () => void;
  onTabChange: (tab: 'analysis' | 'indicators' | 'layers') => void;
}

const SidebarLayout = ({ 
  children, 
  selectedUnit, 
  year, 
  isLiveMode, 
  activeTab, 
  onLayoutChange, 
  onToggleExpanded,
  onTabChange
}: SidebarLayoutProps) => (
  <div className="fixed right-0 top-0 h-full z-50 pointer-events-none p-4">
    <div className="h-full w-96 flex flex-col gap-4 pointer-events-auto">
      {/* Layout Controls */}
      <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-lg p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PanelRight className="w-4 h-4 text-slate-600" />
            <span className="text-xs font-medium text-slate-800">Analysis Panels</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onLayoutChange('grid')}
              className="p-1.5 text-slate-600 hover:bg-slate-100 rounded transition-colors"
              title="Switch to grid layout"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onToggleExpanded}
              className="p-1.5 text-slate-600 hover:bg-slate-100 rounded transition-colors"
              title="Collapse"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Tab Navigation */}
      <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-lg p-2">
        <div className="flex">
          <button
            onClick={() => onTabChange('analysis')}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${activeTab === 'analysis' ? 'bg-slate-100 text-slate-800' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            Analysis
          </button>
          <button
            onClick={() => onTabChange('indicators')}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${activeTab === 'indicators' ? 'bg-slate-100 text-slate-800' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            Indicators
          </button>
          <button
            onClick={() => onTabChange('layers')}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${activeTab === 'layers' ? 'bg-slate-100 text-slate-800' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            Layers
          </button>
        </div>
      </div>
      
      {/* Main Content Area */}
      <div className="flex-1 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-lg overflow-hidden">
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              {activeTab === 'analysis' ? 'Analysis Dashboard' : 
               activeTab === 'indicators' ? 'Ecosystem Indicators' : 
               'Layer Controls'}
            </h3>
            <button className="p-1.5 text-slate-600 hover:bg-slate-100 rounded transition-colors">
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex-1 overflow-auto p-4">
            {activeTab === 'analysis' && children}
            {activeTab === 'indicators' && (
              <div className="space-y-4">
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-medium text-emerald-800">Ecosystem Health</span>
                  </div>
                  <p className="text-[11px] text-emerald-700">Comprehensive ecosystem indicators available in the dedicated panel.</p>
                </div>
              </div>
            )}
            {activeTab === 'layers' && (
              <div className="space-y-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-800">Map Layers</span>
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  </div>
                  <p className="text-[11px] text-slate-600">Configure map visualization layers and overlays.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Status Bar */}
      <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-lg p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isLiveMode ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
            <span className="text-xs text-slate-600">{isLiveMode ? 'Live' : 'Historical'}</span>
          </div>
          <div className="text-xs text-slate-600">{selectedUnit || 'Regional'} • {year}</div>
        </div>
      </div>
    </div>
  </div>
);

interface CompactLayoutProps {
  selectedUnit?: string;
  year: number;
  isExpanded: boolean;
  onLayoutChange: (mode: LayoutMode) => void;
  onToggleExpanded: () => void;
}

const CompactLayout = ({ 
  selectedUnit, 
  year, 
  isExpanded, 
  onLayoutChange, 
  onToggleExpanded 
}: CompactLayoutProps) => (
  <div className="fixed bottom-4 right-4 z-50 pointer-events-none">
    <div className="flex flex-col items-end gap-2 pointer-events-auto">
      {/* Expand/Collapse Button */}
      <button
        onClick={onToggleExpanded}
        className="p-3 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-lg hover:bg-white transition-colors"
        title={isExpanded ? 'Hide panels' : 'Show panels'}
      >
        {isExpanded ? <X className="w-4 h-4 text-slate-600" /> : <Grid3x3 className="w-4 h-4 text-slate-600" />}
      </button>
      
      {/* Expanded Panel */}
      {isExpanded && (
        <div className="w-80 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Quick Analysis</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onLayoutChange('grid')}
                  className="p-1.5 text-slate-600 hover:bg-slate-100 rounded transition-colors"
                  title="More options"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-xs font-medium text-slate-800">Current Analysis</span>
                </div>
                <p className="text-[11px] text-slate-600">View: {selectedUnit || 'Regional'} • Year: {year}</p>
              </div>
              
              <div className="space-y-2">
                <button className="w-full p-2 text-left text-xs text-slate-700 hover:bg-slate-50 rounded transition-colors">
                  View Ecosystem Indicators
                </button>
                <button className="w-full p-2 text-left text-xs text-slate-700 hover:bg-slate-50 rounded transition-colors">
                  Run Scenario Analysis
                </button>
                <button className="w-full p-2 text-left text-xs text-slate-700 hover:bg-slate-50 rounded transition-colors">
                  Export Current View
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
);

export default function MapAnalysisLayout({
  children,
  selectedUnit,
  year,
  isLiveMode = false,
  onLayoutChange
}: MapAnalysisLayoutProps) {
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('grid');
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<'analysis' | 'indicators' | 'layers'>('analysis');
  
  // Handle layout mode changes
  const handleLayoutChange = (mode: LayoutMode) => {
    setLayoutMode(mode);
    onLayoutChange?.(mode);
  };



  // Return the appropriate layout based on mode
  if (!isExpanded && layoutMode !== 'compact') {
    return (
      <div className="fixed top-4 right-4 z-50 pointer-events-auto">
        <button
          onClick={() => setIsExpanded(true)}
          className="p-3 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-lg hover:bg-white transition-colors"
          title="Show analysis panels"
        >
          <Grid3x3 className="w-4 h-4 text-slate-600" />
        </button>
      </div>
    );
  }

  switch (layoutMode) {
    case 'sidebar':
      return (
        <SidebarLayout
          selectedUnit={selectedUnit}
          year={year}
          isLiveMode={isLiveMode}
          activeTab={activeTab}
          onLayoutChange={handleLayoutChange}
          onToggleExpanded={() => setIsExpanded(!isExpanded)}
          onTabChange={setActiveTab}
        >
          {children}
        </SidebarLayout>
      );
    case 'compact':
      return (
        <CompactLayout 
          selectedUnit={selectedUnit}
          year={year}
          isExpanded={isExpanded}
          onLayoutChange={handleLayoutChange}
          onToggleExpanded={() => setIsExpanded(!isExpanded)}
        />
      );
    case 'grid':
    default:
      return (
        <GridLayout
          selectedUnit={selectedUnit}
          year={year}
          isLiveMode={isLiveMode}
          layoutMode={layoutMode}
          isExpanded={isExpanded}
          onLayoutChange={handleLayoutChange}
          onToggleExpanded={() => setIsExpanded(!isExpanded)}
        >
          {children}
        </GridLayout>
      );
  }
}