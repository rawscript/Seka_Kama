'use client';

import React, { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Activity, 
  Bot, 
  History, 
  Layers, 
  ShieldAlert,
  Layout
} from 'lucide-react';

interface SideDockProps {
  panels: {
    id: string;
    label: string;
    icon: React.ReactNode;
    isVisible: boolean;
    onToggle: () => void;
  }[];
}

export default function SideDock({ panels }: SideDockProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div 
      className={`fixed left-0 top-0 h-full z-[10000] transition-all duration-300 ease-in-out flex ${
        isExpanded ? 'w-64' : 'w-16'
      }`}
    >
      {/* SideDock Content */}
      <div className="flex-1 bg-white/90 backdrop-blur-xl border-r border-slate-200 flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="h-16 flex items-center px-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3 w-full">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center flex-shrink-0">
              <Layout className="w-5 h-5 text-white" />
            </div>
            {isExpanded && (
              <span className="text-sm font-black text-slate-800 uppercase tracking-tighter">
                Control Hub
              </span>
            )}
          </div>
        </div>

        {/* Panel List */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-6 px-3 space-y-2">
          {panels.map((panel) => (
            <button
              key={panel.id}
              onClick={panel.onToggle}
              className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all group ${
                panel.isVisible 
                  ? 'bg-emerald-50 text-emerald-700 font-bold border border-emerald-100/50' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}
              title={panel.label}
            >
              <div className={`p-2 rounded-lg transition-colors ${
                panel.isVisible ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-600'
              }`}>
                {panel.icon}
              </div>
              {isExpanded && (
                <div className="flex flex-col items-start min-w-0">
                  <span className="text-xs uppercase tracking-wider truncate w-full">
                    {panel.label}
                  </span>
                  <span className={`text-[9px] font-medium leading-none mt-1 ${
                    panel.isVisible ? 'text-emerald-500' : 'text-slate-400'
                  }`}>
                    {panel.isVisible ? 'Active' : 'Click to show'}
                  </span>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Footer info */}
        {isExpanded && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex-shrink-0">
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Platform Status</span>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <span className="text-[10px] text-slate-600 font-medium">Digital Twin Live</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Expand/Collapse Trigger */}
      <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white border border-slate-200 shadow-lg flex items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors z-10"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? <ChevronLeft className="w-4 h-4 text-slate-600" /> : <ChevronRight className="w-4 h-4 text-slate-600" />}
      </div>
    </div>
  );
}
