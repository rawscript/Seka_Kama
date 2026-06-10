'use client';

import React, { useState, useEffect } from 'react';
import { 
  History, 
  X, 
  Clock, 
  MapPin, 
  TrendingUp, 
  TrendingDown,
  Eye,
  RefreshCw,
  Download,
  Filter,
  Calendar,
  ChevronRight
} from 'lucide-react';
import { api } from '@/services/api';
import { usePerformanceMonitoring } from '@/services/performanceService';
import DraggablePanel from './DraggablePanel';

interface ScenarioHistoryItem {
  id: number;
  user_description: string;
  created_at: string;
  baseline_total_lions: number;
  predicted_total_lions: number;
  delta_lions: number;
  delta_percent: number;
  affected_cells: number;
  llm_narrative: string;
  modified_features: Record<string, number>;
  request_data?: {
    geometry?: any;
    feature_modifications?: Record<string, number>;
    user_query?: string;
  };
}

interface ScenarioHistoryPanelProps {
  isOpen?: boolean;
  onClose?: () => void;
  onLoadScenario?: (scenarioId: number) => void;
}

export default function ScenarioHistoryPanel({ 
  isOpen = false, 
  onClose, 
  onLoadScenario 
}: ScenarioHistoryPanelProps) {
  const [scenarios, setScenarios] = useState<ScenarioHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterYear, setFilterYear] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedScenario, setExpandedScenario] = useState<number | null>(null);
  
  // Performance monitoring
  const { startMeasurement } = usePerformanceMonitoring();

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    
    const endMeasurement = startMeasurement('ScenarioHistoryPanel', 'history_load', {
      analysisType: 'scenario_history'
    });
    
    try {
      const response = await api.getScenarioHistory(100);
      setScenarios(response.scenarios || []);
    } catch (err: any) {
      console.error('Failed to load scenario history:', err);
      setError(err.message || 'Failed to load scenario history');
    } finally {
      endMeasurement();
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateString);
  };

  const filteredScenarios = scenarios.filter(scenario => {
    // Filter by year
    if (filterYear !== 'all') {
      const scenarioYear = new Date(scenario.created_at).getFullYear().toString();
      if (scenarioYear !== filterYear) return false;
    }
    
    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const description = (scenario.user_description || '').toLowerCase();
      const narrative = (scenario.llm_narrative || '').toLowerCase();
      
      if (!description.includes(query) && !narrative.includes(query)) {
        return false;
      }
    }
    
    return true;
  });

  const availableYears = Array.from(
    new Set(scenarios.map(s => new Date(s.created_at).getFullYear().toString()))
  ).sort((a, b) => parseInt(b) - parseInt(a));

  return (
    <DraggablePanel
      id="scenario-history-panel"
      defaultPosition={{ x: 400, y: 100 }}
      defaultSize={{ width: 420, height: 600 }}
      minWidth={380}
      minHeight={500}
    >
      <div className="flex flex-col h-full bg-white">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <History className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">SCENARIO HISTORY</h3>
              <p className="text-[10px] text-slate-600">Past simulations & analyses</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={fetchHistory}
              disabled={loading}
              className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors"
              title="Refresh history"
            >
              <RefreshCw className={`w-4 h-4 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-slate-600" />
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="px-5 py-3 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search scenarios..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            
            <div className="relative">
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="appearance-none px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-8"
              >
                <option value="all">All years</option>
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <Calendar className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-600">
              {filteredScenarios.length} scenario{filteredScenarios.length !== 1 ? 's' : ''}
            </span>
            {error && (
              <span className="text-xs text-rose-600 font-medium">{error}</span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 bg-white">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 text-purple-500 animate-spin mb-3" />
              <p className="text-sm text-slate-600">Loading scenario history...</p>
            </div>
          ) : filteredScenarios.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <History className="w-12 h-12 text-slate-300 mb-3" />
              <p className="text-sm font-medium text-slate-700 mb-1">No scenarios found</p>
              <p className="text-xs text-slate-500">
                {scenarios.length === 0 
                  ? 'Run your first scenario to see it here' 
                  : 'No scenarios match your filters'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredScenarios.map(scenario => {
                const isNegative = scenario.delta_lions < 0;
                const isExpanded = expandedScenario === scenario.id;
                
                return (
                  <div 
                    key={scenario.id} 
                    className={`border rounded-xl overflow-hidden transition-all duration-200 ${
                      isExpanded 
                        ? 'border-purple-300 shadow-md' 
                        : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                    }`}
                  >
                    {/* Scenario header */}
                    <div 
                      className="p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                      onClick={() => setExpandedScenario(isExpanded ? null : scenario.id)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-slate-800 truncate mb-1">
                            {scenario.user_description || 'Unnamed Scenario'}
                          </h4>
                          <div className="flex items-center gap-3 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatRelativeTime(scenario.created_at)}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {scenario.affected_cells} cells
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end ml-3">
                          <div className={`text-lg font-bold ${isNegative ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {isNegative ? '' : '+'}{scenario.delta_lions.toFixed(1)}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            Lions Δ
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {isNegative ? (
                            <TrendingDown className="w-3 h-3 text-rose-500" />
                          ) : (
                            <TrendingUp className="w-3 h-3 text-emerald-500" />
                          )}
                          <span className={`text-xs font-medium ${isNegative ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {scenario.delta_percent > 0 ? '+' : ''}{scenario.delta_percent.toFixed(1)}%
                          </span>
                        </div>
                        
                        <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      </div>
                    </div>
                    
                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-slate-200 bg-slate-50">
                        {/* Metrics */}
                        <div className="grid grid-cols-2 gap-3 mb-4 pt-3">
                          <div className="bg-white p-3 rounded-lg border border-slate-200">
                            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Baseline</div>
                            <div className="text-lg font-bold text-slate-800">
                              {scenario.baseline_total_lions.toFixed(1)}
                            </div>
                          </div>
                          <div className="bg-white p-3 rounded-lg border border-slate-200">
                            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Predicted</div>
                            <div className="text-lg font-bold text-slate-800">
                              {scenario.predicted_total_lions.toFixed(1)}
                            </div>
                          </div>
                        </div>
                        
                        {/* Narrative */}
                        {scenario.llm_narrative && (
                          <div className="mb-4">
                            <div className="text-xs font-semibold text-slate-700 mb-2">AI Analysis</div>
                            <p className="text-sm text-slate-600 italic leading-relaxed bg-white p-3 rounded-lg border border-slate-200">
                              "{scenario.llm_narrative}"
                            </p>
                          </div>
                        )}
                        
                        {/* Actions */}
                        <div className="flex items-center gap-2 pt-3 border-t border-slate-200">
                          {onLoadScenario && (
                            <button
                              onClick={() => onLoadScenario(scenario.id)}
                              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                              Load Scenario
                            </button>
                          )}
                          
                          <button
                            onClick={() => {
                              const summary = `SCENARIO #${scenario.id}\n${scenario.user_description || 'Unnamed Scenario'}\n\nBaseline: ${scenario.baseline_total_lions.toFixed(1)} lions\nPredicted: ${scenario.predicted_total_lions.toFixed(1)} lions\nDelta: ${scenario.delta_lions > 0 ? '+' : ''}${scenario.delta_lions.toFixed(1)} lions (${scenario.delta_percent > 0 ? '+' : ''}${scenario.delta_percent.toFixed(1)}%)\n\n${scenario.llm_narrative}`;
                              navigator.clipboard.writeText(summary);
                            }}
                            className="px-3 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
                          >
                            Copy
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>SekaNet v2.1.0</span>
            </div>
            <div className="flex items-center gap-3">
              <span>Intelligence Archive</span>
              <span>•</span>
              <span>Secure Storage</span>
            </div>
          </div>
        </div>
      </div>
    </DraggablePanel>
  );
}