'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface DashboardUiContextType {
  visiblePanels: Record<string, boolean>;
  togglePanel: (panelId: string) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
}

const DashboardUiContext = createContext<DashboardUiContextType | undefined>(undefined);

export function DashboardUiProvider({ children }: { children: ReactNode }) {
  const [visiblePanels, setVisiblePanels] = useState<Record<string, boolean>>({
    'analyst': true,
    'indicators': false,
    'layers': false,
    'history': false,
    'trends': false
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const togglePanel = (panelId: string) => {
    setVisiblePanels((prev) => {
      // Map controls behave as one tab group. Showing all of their large,
      // draggable panels at once obscures the analysis surface and creates
      // competing focal points. History remains a separate modal workflow.
      const controlPanels = ['analyst', 'indicators', 'layers', 'trends'];
      if (!controlPanels.includes(panelId)) {
        return { ...prev, [panelId]: !prev[panelId] };
      }

      const next = { ...prev };
      controlPanels.forEach((id) => { next[id] = false; });
      // A tab selection always leaves one control panel visible. This avoids
      // an ambiguous empty state and matches users' expectation of tabs.
      next[panelId] = true;
      return next;
    });
  };

  return (
    <DashboardUiContext.Provider value={{ 
      visiblePanels, 
      togglePanel, 
      isSidebarOpen, 
      setIsSidebarOpen 
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
