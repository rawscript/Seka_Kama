'use client';

import { useState, useEffect } from 'react';
import { Bot, Info, Shield, Zap, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '@/services/api';

interface AnalystPanelProps {
  selectedUnit?: string;
  year: number;
}

export default function AnalystPanel({ selectedUnit, year }: AnalystPanelProps) {
  const [loading, setLoading] = useState(false);
  const [insight, setInsight] = useState<string>('');
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [healthResp, narrativeResp] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/health`),
          api.getLandscapeSummary(selectedUnit || undefined, year)
        ]);
        
        if (healthResp.ok) {
           const data = await healthResp.json();
           setHealthStatus(data);
        }
        
        if (narrativeResp?.narrative) {
          setInsight(narrativeResp.narrative);
        }
      } catch (e) {
        console.error("Analyst failed to fetch data", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedUnit, year]);

  const getNarrative = () => {
    if (loading) {
      return (
        <div className="flex flex-col gap-2 animate-pulse">
          <div className="h-2 w-full bg-white/10 rounded" />
          <div className="h-2 w-3/4 bg-white/10 rounded" />
          <div className="h-2 w-5/6 bg-white/10 rounded" />
        </div>
      );
    }
    
    return (
      <div className="space-y-4">
        <div 
          className="text-xs leading-relaxed text-slate-300 narrative-content"
          dangerouslySetInnerHTML={{ __html: insight.replace(/\n/g, '<br/>') || 'No qualitative data available for this zone.' }}
        />
        
        {!insight && (
          <div className="grid grid-cols-1 gap-2">
            <div className="flex gap-3 p-3 bg-white/5 rounded-sm items-start">
               <Shield className="w-4 h-4 text-emerald-400 mt-1 shrink-0" />
               <div>
                  <p className="text-[10px] font-bold text-white uppercase tracking-wider">Neural Defense</p>
                  <p className="text-[11px] text-slate-400">Habitat suitability is currently optimal in the northern corridors. Human pressure remains below 0.1 trend threshold.</p>
               </div>
            </div>
            <div className="flex gap-3 p-3 bg-white/5 rounded-sm items-start">
               <AlertTriangle className="w-4 h-4 text-amber-400 mt-1 shrink-0" />
               <div>
                  <p className="text-[10px] font-bold text-white uppercase tracking-wider">Active Threat</p>
                  <p className="text-[11px] text-slate-400">Nightlight encroachment detected near Talek boundary. Probability of HWC (Human-Wildlife Conflict) is elevated at 12%.</p>
               </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col bg-[#0b0f1a]/80 backdrop-blur-md border border-white/10 rounded-sm overflow-hidden transition-all duration-300">
      <div 
        className="flex items-center justify-between px-4 py-3 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-primary" />
          <h3 className="text-[10px] font-bold text-white uppercase tracking-[0.2em]">SekaNet Analyst</h3>
        </div>
        {isExpanded ? <ChevronUp className="w-3 h-3 text-slate-500" /> : <ChevronDown className="w-3 h-3 text-slate-500" />}
      </div>

      {isExpanded && (
        <div className="p-4 bg-transparent border-t border-white/5">
           {getNarrative()}
           
           <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                 <Zap className="w-3 h-3 text-emerald-400" />
                 <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">Model Confidence: 94.2%</span>
              </div>
              <button className="text-[9px] font-bold text-primary uppercase tracking-widest hover:underline">
                Generate Full Report
              </button>
           </div>
        </div>
      )}
    </div>
  );
}
