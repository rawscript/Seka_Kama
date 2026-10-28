'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

export type PanelId = 'analyst' | 'indicators' | 'layers' | 'trends' | 'history';

interface DashboardUiContextType {
  visiblePanels: Record<PanelId, boolean>;
  /** Active right-rail panel (analyst | indicators | layers | trends), or null */
  activeRailPanel: Exclude<PanelId, 'history'> | null;
  togglePanel: (panelId: PanelId) => void;
  closeRailPanel: () => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
}

const DashboardUiContext = createContext<DashboardUiContextType | undefined>(undefined);

export function DashboardUiProvider({ children }: { children: ReactNode }) {
  const [activeRailPanel, setActiveRailPanel] = useState<Exclude<PanelId, 'history'> | null>('analyst');
  const [historyOpen, setHistoryOpen] = useState(false);

  // Derived: visiblePanels kept for backward compat with page.tsx history checks
  const visiblePanels: Record<PanelId, boolean> = {
    analyst:    activeRailPanel === 'analyst',
    indicators: activeRailPanel === 'indicators',
    layers:     activeRailPanel === 'layers',
    trends:     activeRailPanel === 'trends',
    history:    historyOpen,
  };

  const togglePanel = (panelId: PanelId) => {
    if (panelId === 'history') {
      setHistoryOpen((v) => !v);
      return;
    }
    // Rail tab behaviour: clicking active tab closes rail; clicking another opens it
    setActiveRailPanel((prev) => (prev === panelId ? null : panelId));
  };

  const closeRailPanel = () => setActiveRailPanel(null);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <DashboardUiContext.Provider value={{
      visiblePanels,
      activeRailPanel,
      togglePanel,
      closeRailPanel,
      isSidebarOpen,
      setIsSidebarOpen,
    }}>
      {children}
    </DashboardUiContext.Provider>
  );
}

export function useDashboardUi() {
  const context = useContext(DashboardUiContext);
  if (context === undefined) {
    throw new Error('useDashboardUi must be used within a DashboardUiProvider');
  }
  return context;
}
