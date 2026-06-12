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
    'indicators': true,
    'layers': true,
    'history': false,
    'trends': false
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const togglePanel = (panelId: string) => {
    setVisiblePanels(prev => ({ ...prev, [panelId]: !prev[panelId] }));
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
