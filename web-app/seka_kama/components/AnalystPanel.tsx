'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bot, Shield, Zap, AlertTriangle, ChevronDown, ChevronUp, Download, RefreshCw, Info, BarChart3, TrendingUp, Clock, MapPin } from 'lucide-react';
import { api, getCorsErrorStatus, resetCorsError } from '@/services/api';
import { useUsabilityTracking } from '@/services/usabilityService';
import { usePerformanceMonitoring } from '@/services/performanceService';
import { useApiContext } from '@/contexts/ApiContext';
import DraggablePanel from './DraggablePanel';

interface AnalystPanelProps {
  selectedUnit?: string;
  year: number;
}

interface AnalystInsight {
  narrative: string;
  confidence: number;
  key_insights: string[];
  recommendations: string[];
  generated_at: string;
  ecological_metrics?: {
    habitat_suitability: number;
    threat_level: number;
    connectivity_score: number;
    rainfall_mm: number;
    vegetation_cover: number;
  };
}

// Helper components moved outside of main component to avoid re-creation on each render

const LoadingSkeleton = () => (
  <div className="space-y-4 animate-pulse">
    <div className="h-3 w-3/4 bg-slate-200 rounded" />
    <div className="h-3 w-full bg-slate-200 rounded" />
    <div className="h-3 w-5/6 bg-slate-200 rounded" />
    <div className="grid grid-cols-2 gap-3 mt-4">
      <div className="h-16 bg-slate-100 rounded" />
      <div className="h-16 bg-slate-100 rounded" />
    </div>
  </div>
);

interface InsightMetricsProps {
  metrics?: AnalystInsight['ecological_metrics'];
}

const InsightMetrics = ({ metrics }: InsightMetricsProps) => {
  if (!metrics) return null;
  
  const metricItems = [
    { label: 'Habitat Suitability', value: `${(metrics.habitat_suitability * 100).toFixed(0)}%`, icon: <MapPin className="w-3 h-3" />, color: 'text-[#775a19]' },
    { label: 'Threat Level', value: `${(metrics.threat_level * 100).toFixed(0)}%`, icon: <AlertTriangle className="w-3 h-3" />, color: metrics.threat_level > 0.1 ? 'text-amber-600' : 'text-slate-600' },
    { label: 'Connectivity', value: `${(metrics.connectivity_score * 100).toFixed(0)}%`, icon: <TrendingUp className="w-3 h-3" />, color: 'text-blue-600' },
    { label: 'Rainfall', value: `${metrics.rainfall_mm}mm`, icon: <BarChart3 className="w-3 h-3" />, color: 'text-cyan-600' },
    { label: 'Vegetation', value: `${metrics.vegetation_cover}%`, icon: <Shield className="w-3 h-3" />, color: 'text-[#775a19]' },
  ];

  return (
    <div className="grid grid-cols-5 gap-2 mb-4">
      {metricItems.map((metric, index) => (
        <div key={index} className="text-center">
          <div className={`p-1 rounded-none bg-slate-50 mb-1 ${metric.color}`}>
            {metric.icon}
          </div>
          <div className="text-[8px] font-bold text-slate-700">{metric.value}</div>
          <div className="text-[6px] text-slate-500 truncate">{metric.label}</div>
        </div>
      ))}
    </div>
  );
};

interface KeyInsightsProps {
  insights: string[];
}

const KeyInsights = ({ insights }: KeyInsightsProps) => (
  <div className="space-y-2 mb-4">
    <div className="flex items-center gap-1 mb-1">
      <Info className="w-3 h-3 text-blue-500" />
      <span className="text-[9px] font-bold text-slate-700 uppercase tracking-wider">Key Insights</span>
    </div>
    <ul className="space-y-1">
      {insights.map((insight, index) => (
        <li key={index} className="flex items-start gap-1">
          <div className="w-1 h-1 rounded-full bg-blue-500 mt-1 flex-shrink-0" />
          <span className="text-[10px] text-slate-600 leading-tight">{insight}</span>
        </li>
      ))}
    </ul>
  </div>
);

export default function AnalystPanel({ selectedUnit, year }: AnalystPanelProps) {
  const [loading, setLoading] = useState(false);
  const [insight, setInsight] = useState<AnalystInsight | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  
  // Use API context for centralized error handling
  const { 
    shouldAttemptRequest, 
    markApiUnavailable, 
    markApiAvailable,
    apiAvailable,
    corsErrorActive,
    corsErrorMessage 
  } = useApiContext();
  
  // Usability tracking
  const {
    trackAnalystInteraction,
    hasConsent
  } = useUsabilityTracking();
  
  // Performance monitoring
  const {
    startMeasurement
  } = usePerformanceMonitoring();

  const fetchAnalystData = useCallback(async () => {
    // Use context's centralized request control
    if (!shouldAttemptRequest()) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    // Track data fetch start
    if (hasConsent()) {
      trackAnalystInteraction('analyst-panel-fetch-start', 'click', {
        panelAction: 'fetch_insights',
        insightType: 'initial_load'
      });
    }
    
    // Start performance measurement
    const endMeasurement = startMeasurement('AnalystPanel', 'insight_load', {
      conservationArea: selectedUnit,
      timePeriod: year.toString(),
      analysisType: 'ecological_insights'
    });
    
    try {
      // Use a timeout for the health check to fail fast
      const healthPromise = Promise.race([
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/health`),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Health check timeout')), 3000))
      ]).catch(() => null);
      
      const narrativePromise = api.getLandscapeSummary(selectedUnit || undefined, year)
        .catch(() => null);
      
      const [healthResp, narrativeResp] = await Promise.all([
        healthPromise,
        narrativePromise
      ]);
      
      // Check if health endpoint returned non-OK status (CORS issue indicator)
      if (healthResp && typeof healthResp === 'object' && 'ok' in healthResp && !healthResp.ok) {
        const status = (healthResp as any).status;
        console.warn('API returned error status:', status);
        markApiUnavailable('API health check failed');
      }
      
      if (narrativeResp) {
        // API succeeded - reset error state using context
        markApiAvailable();
        
        const insightData: AnalystInsight = {
          narrative: narrativeResp.narrative || '',
          confidence: narrativeResp.confidence || 0.942,
          key_insights: narrativeResp.key_insights || [],
          recommendations: narrativeResp.recommendations || [],
          generated_at: narrativeResp.generated_at || new Date().toISOString(),
          ecological_metrics: narrativeResp.ecological_metrics
        };
        setInsight(insightData);
        
        // Track successful data fetch
        if (hasConsent()) {
          trackAnalystInteraction('analyst-panel-fetch-success', 'click', {
            panelAction: 'insights_loaded',
            insightType: 'api_success',
            recommendationId: `insight_count_${insightData.key_insights?.length || 0}`
          });
        }
      } else {
        // API failed - show user-friendly error instead of silently showing fallback
        console.warn('API unavailable - backend may have CORS issues or connectivity problems.');
        markApiUnavailable('Backend API unavailable');
        
        // Show actual fallback only if this is first load and we have some data
        if (!insight) {
          // Set minimal fallback for first load only
          setInsight({
            narrative: `Loading ecological insights for ${selectedUnit || 'this area'} in ${year}...`,
            confidence: 0,
            key_insights: [],
            recommendations: [],
            generated_at: new Date().toISOString(),
            ecological_metrics: undefined
          });
        }
        
        if (corsErrorActive) {
          setError('CORS ERROR: Backend API is blocking requests. The server is either offline or CORS headers are not configured. Retries paused for 30 seconds.');
        } else {
          setError('Backend API is unavailable. Please ensure the backend server is running and CORS is properly configured.');
        }
        
        // Track fallback data usage
        if (hasConsent()) {
          trackAnalystInteraction('analyst-panel-unavailable', 'click', {
            panelAction: 'api_unavailable',
            insightType: 'backend_error'
          });
        }
      }
      
      setLastUpdated(new Date());
    } catch (e) {
      console.error('Analyst data fetch failed:', e);
      markApiUnavailable('Network connection failed');
      
      if (corsErrorActive) {
        setError('CORS ERROR: Backend API is blocking requests. Retries paused for 30 seconds. Please check server status.');
      } else {
        setError('Unable to connect to backend. Please check your connection and ensure CORS is enabled.');
      }
      
      // Track data fetch failure
      if (hasConsent()) {
        trackAnalystInteraction('analyst-panel-fetch-failed', 'click', {
          panelAction: 'fetch_failed',
          insightType: 'network_error'
        });
      }
    } finally {
      // Always end performance measurement
      endMeasurement();
      setLoading(false);
    }
  }, [selectedUnit, year, hasConsent, trackAnalystInteraction, startMeasurement, shouldAttemptRequest, markApiUnavailable, markApiAvailable, corsErrorActive, insight]);

  useEffect(() => {
    fetchAnalystData();
    
    // Only set up auto-refresh if API is available
    // Stop refreshing if API is marked unavailable to reduce noise
    if (apiAvailable) {
      const interval = setInterval(fetchAnalystData, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [fetchAnalystData, apiAvailable]);

  const handleGenerateReport = async () => {
    // Track report generation
    if (hasConsent()) {
      trackAnalystInteraction('analyst-panel-report-button', 'click', {
        panelAction: 'generate_report',
        insightType: insight?.key_insights?.length ? 'multi_insight' : 'fallback'
      });
    }
    
    // Start performance measurement for report generation
    const endMeasurement = startMeasurement('AnalystPanel', 'report_generation', {
      conservationArea: selectedUnit,
      timePeriod: year.toString(),
      analysisType: 'full_report'
    });
    
    setGeneratingReport(true);
    try {
      // Generate comprehensive report with current insights
      const report = {
        timestamp: new Date().toISOString(),
        conservationArea: selectedUnit || 'Regional Overview',
        timePeriod: year,
        narrative: insight?.narrative || '',
        keyInsights: insight?.key_insights || [],
        recommendations: insight?.recommendations || [],
        ecologicalMetrics: insight?.ecological_metrics,
        confidence: insight?.confidence || 0,
        generatedBy: 'SekaNet Analyst v2.0.0'
      };
      
      // Create downloadable report
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sekanet-report-${selectedUnit || 'regional'}-${year}-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      // Track successful report generation
      if (hasConsent()) {
        trackAnalystInteraction('analyst-panel-report-success', 'click', {
          panelAction: 'report_generated',
          recommendationId: 'full_report'
        });
      }
    } catch (error) {
      console.error('Report generation failed:', error);
      setError('Failed to generate report. Please try again.');
      
      // Track report generation failure
      if (hasConsent()) {
        trackAnalystInteraction('analyst-panel-report-failed', 'click', {
          panelAction: 'report_failed',
          insightType: 'error'
        });
      }
    } finally {
      // Always end performance measurement
      endMeasurement();
      setGeneratingReport(false);
    }
  };

  const handleRefresh = () => {
    // Track refresh action
    if (hasConsent()) {
      trackAnalystInteraction('analyst-panel-refresh-button', 'click', {
        panelAction: 'refresh_insights',
        insightType: insight ? 'existing' : 'initial'
      });
    }
    
    fetchAnalystData();
  };

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  };



  return (
    <DraggablePanel 
      id="analyst-panel"
      defaultPosition={{ x: 16, y: 16 }}
      defaultSize={{ width: 340, height: 460 }}
      minWidth={320}
      minHeight={400}
    >
      <div className="flex flex-col h-full bg-white/95 backdrop-blur-sm">
        {/* Header */}
        <div 
          className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-50/50 transition-colors border-b border-slate-200"
          onClick={() => {
            // Start performance measurement for panel toggle
            const endMeasurement = startMeasurement('AnalystPanel', 'panel_toggle', {
              conservationArea: selectedUnit,
              timePeriod: year.toString(),
              analysisType: 'ui_interaction'
            });
            
            setIsExpanded(!isExpanded);
            
            // Track panel expansion/collapse
            if (hasConsent()) {
              trackAnalystInteraction('analyst-panel-header', 'click', {
                panelAction: isExpanded ? 'collapse_panel' : 'expand_panel',
                insightType: insight ? 'loaded' : 'loading'
              });
            }
            
            // End performance measurement
            endMeasurement();
          }}
        >
          <div className="flex items-center gap-2">
            <div className="relative">
              <Bot className="w-4 h-4 text-[#775a19]" />
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#775a19] rounded-none animate-pulse" />
            </div>
            <div>
              <h3 className="text-[10px] font-bold text-slate-800 uppercase tracking-[0.2em]">SekaNet Analyst</h3>
              {lastUpdated && (
                <div className="flex items-center gap-1 text-[7px] text-slate-500">
                  <Clock className="w-2.5 h-2.5" />
                  Updated {formatTimeAgo(lastUpdated)}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRefresh();
              }}
              className="p-1 hover:bg-slate-100 rounded transition-colors"
              title="Refresh insights"
            >
              <RefreshCw className={`w-3 h-3 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            </button>
            {isExpanded ? <ChevronUp className="w-3 h-3 text-slate-500" /> : <ChevronDown className="w-3 h-3 text-slate-500" />}
          </div>
        </div>

        {/* Content */}
        {isExpanded && (
          <div className="p-4 flex-1 overflow-auto">
            {error && (
              <div className={`p-3 rounded-md mb-3 shadow-sm ${!apiAvailable ? 'bg-rose-50 border border-rose-200' : 'bg-amber-50 border border-amber-200'}`}>
                <p className={`text-[10px] font-medium ${!apiAvailable ? 'text-rose-700' : 'text-amber-700'}`}>{error}</p>
                <button
                  onClick={handleRefresh}
                  className={`flex items-center gap-1 text-[9px] font-medium mt-2 hover:underline ${!apiAvailable ? 'text-rose-800 hover:text-rose-900' : 'text-amber-800 hover:text-amber-900'}`}
                >
                  <RefreshCw className="w-2.5 h-2.5" />
                  Retry Connection
                </button>
                {!apiAvailable && (
                  <div className="mt-2 p-2 bg-rose-50 rounded-none border border-rose-200">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-3 h-3 text-rose-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[8px] text-rose-700 font-medium mb-1">Backend server appears to be offline</p>
                        <ul className="ml-2 space-y-0.5 text-[8px] text-rose-600">
                          <li>• Backend is running on Railway</li>
                          <li>• CORS headers are properly configured</li>
                          <li>• Network connectivity is working</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Metrics Overview */}
            {insight?.ecological_metrics && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-bold text-slate-700 uppercase tracking-wider">
                    Ecological Metrics
                  </span>
                  {selectedUnit && (
                    <span className="text-[8px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                      {selectedUnit}
                    </span>
                  )}
                </div>
                <InsightMetrics metrics={insight.ecological_metrics} />
              </div>
            )}
            
            {/* Narrative */}
            <div className="mb-4">
              {loading ? (
                <LoadingSkeleton />
              ) : insight?.narrative ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-1 mb-1">
                    <Shield className="w-3 h-3 text-[#775a19]" />
                    <span className="text-[9px] font-bold text-slate-700 uppercase tracking-wider">Ecological Analysis</span>
                  </div>
                  <div 
                    className="text-xs leading-relaxed text-slate-700 narrative-content"
                    dangerouslySetInnerHTML={{ __html: insight.narrative.replace(/\n/g, '<br/>') }}
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-2">
                    <div className="flex gap-3 p-3 bg-white rounded-none items-start border border-[#775a19]/20 shadow-sm">
                      <div className="p-1.5 bg-[#775a19]/5 rounded-none">
                        <Shield className="w-3.5 h-3.5 text-[#775a19]" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-[#775a19] uppercase tracking-wider mb-1">Neural Defense</p>
                        <p className="text-[11px] text-slate-800">Habitat suitability is currently optimal in the northern corridors. Human pressure remains below 0.1 trend threshold.</p>
                      </div>
                    </div>
                    <div className="flex gap-3 p-3 bg-white rounded-none items-start border border-amber-200 shadow-sm">
                      <div className="p-1.5 bg-amber-50 rounded-none">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-1">Active Threat</p>
                        <p className="text-[11px] text-slate-800">Nightlight encroachment detected near Talek boundary. Probability of HWC (Human-Wildlife Conflict) is elevated at 12%.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Key Insights */}
            {insight?.key_insights && insight.key_insights.length > 0 && (
              <KeyInsights insights={insight.key_insights} />
            )}
            
            {/* Footer Actions */}
            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Zap className="w-3.5 h-3.5 text-emerald-500" />
                    <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                  </div>
                  <div>
                    <div className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">
                      Model Confidence: {(insight?.confidence || 0.942) * 100}%
                    </div>
                    <div className="text-[7px] text-slate-400">
                      Based on {selectedUnit ? 'local' : 'regional'} ecological data
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleGenerateReport}
                  disabled={generatingReport}
                  className="flex items-center gap-1 px-3 py-1.5 text-[9px] font-bold text-white bg-[#775a19] hover:bg-[#4e3700] rounded-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generatingReport ? (
                    <>
                      <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download className="w-2.5 h-2.5" />
                      Full Report
                    </>
                  )}
                </button>
              </div>
              
              {/* Status Bar */}
              <div className="flex items-center justify-between text-[7px] text-slate-500">
                <div className="flex items-center gap-1">
                  <div className={`w-1.5 h-1.5 rounded-none ${error ? 'bg-rose-500' : loading ? 'bg-amber-500 animate-pulse' : 'bg-[#775a19]'}`} />
                  <span>{error ? 'Error' : loading ? 'Updating...' : 'Online'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>v2.0.0</span>
                  <span>•</span>
                  <span>AI-Powered</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DraggablePanel>
  );
}
