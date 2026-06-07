'use client';

import { useState, useEffect } from 'react';
import { 
  Droplets, 
  TreePine, 
  Shield, 
  AlertTriangle, 
  Network, 
  Zap, 
  MapPin, 
  CloudRain,
  Thermometer,
  Wind,
  Moon,
  Sun,
  Gauge,
  Activity,
  ChevronRight,
  ChevronLeft,
  Maximize2,
  Minimize2,
  RefreshCw,
  Info
} from 'lucide-react';
import { api } from '@/services/api';
import { useUsabilityTracking } from '@/services/usabilityService';
import DraggablePanel from './DraggablePanel';

interface EcosystemIndicatorsPanelProps {
  selectedUnit?: string;
  year: number;
  isLiveMode?: boolean;
}

interface EcosystemIndicator {
  id: string;
  name: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  changePercentage: number;
  status: 'optimal' | 'good' | 'warning' | 'critical';
  description: string;
  icon: React.ReactNode;
  color: string;
  dataSource: string;
  lastUpdated: string;
}

interface EnvironmentalConditions {
  temperature: number;
  humidity: number;
  windSpeed: number;
  precipitation: number;
  cloudCover: number;
  uvIndex: number;
  daylightHours: number;
  soilMoisture: number;
}

export default function EcosystemIndicatorsPanel({ 
  selectedUnit, 
  year, 
  isLiveMode = false 
}: EcosystemIndicatorsPanelProps) {
  const [indicators, setIndicators] = useState<EcosystemIndicator[]>([
    // Initial placeholder indicators
    {
      id: 'habitat_suitability',
      name: 'Habitat Suitability',
      value: 0.85,
      unit: '%',
      trend: 'stable',
      changePercentage: 1.2,
      status: 'good',
      description: 'Overall habitat quality for target species',
      icon: <TreePine className="w-4 h-4" />,
      color: '#10b981',
      dataSource: 'SekaNet Model',
      lastUpdated: '2026-06-07T10:30:00Z'
    },
    {
      id: 'threat_level',
      name: 'Threat Level',
      value: 0.12,
      unit: '%',
      trend: 'down',
      changePercentage: -2.4,
      status: 'good',
      description: 'Human-wildlife conflict risk assessment',
      icon: <AlertTriangle className="w-4 h-4" />,
      color: '#f59e0b',
      dataSource: 'HWC Monitoring',
      lastUpdated: '2026-06-07T10:30:00Z'
    },
    {
      id: 'connectivity',
      name: 'Connectivity',
      value: 0.78,
      unit: '%',
      trend: 'up',
      changePercentage: 3.6,
      status: 'optimal',
      description: 'Ecological corridor effectiveness',
      icon: <Network className="w-4 h-4" />,
      color: '#8b5cf6',
      dataSource: 'Corridor Analysis',
      lastUpdated: '2026-06-07T10:30:00Z'
    },
    {
      id: 'rainfall',
      name: 'Rainfall',
      value: 920,
      unit: 'mm',
      trend: 'up',
      changePercentage: 5.2,
      status: 'optimal',
      description: 'Annual precipitation accumulation',
      icon: <Droplets className="w-4 h-4" />,
      color: '#0ea5e9',
      dataSource: 'CHIRPS Satellite',
      lastUpdated: '2026-06-07T10:30:00Z'
    },
    {
      id: 'vegetation',
      name: 'Vegetation Cover',
      value: 72,
      unit: '%',
      trend: 'stable',
      changePercentage: 0.8,
      status: 'good',
      description: 'Percentage of land with vegetation',
      icon: <Shield className="w-4 h-4" />,
      color: '#22c55e',
      dataSource: 'Sentinel-2 NDVI',
      lastUpdated: '2026-06-07T10:30:00Z'
    },
    {
      id: 'hwc_risk',
      name: 'HWC Risk',
      value: 0.08,
      unit: '%',
      trend: 'down',
      changePercentage: -1.8,
      status: 'good',
      description: 'Probability of human-wildlife conflict',
      icon: <Zap className="w-4 h-4" />,
      color: '#ec4899',
      dataSource: 'Neural Prediction',
      lastUpdated: '2026-06-07T10:30:00Z'
    },
    {
      id: 'corridor_health',
      name: 'Corridor Health',
      value: 0.82,
      unit: '%',
      trend: 'up',
      changePercentage: 2.1,
      status: 'optimal',
      description: 'Biological corridor functionality',
      icon: <MapPin className="w-4 h-4" />,
      color: '#6366f1',
      dataSource: 'Spatial Analysis',
      lastUpdated: '2026-06-07T10:30:00Z'
    },
    {
      id: 'soil_moisture',
      name: 'Soil Moisture',
      value: 0.65,
      unit: '%',
      trend: 'down',
      changePercentage: -3.2,
      status: 'warning',
      description: 'Available soil water content',
      icon: <CloudRain className="w-4 h-4" />,
      color: '#0d9488',
      dataSource: 'SMAP Satellite',
      lastUpdated: '2026-06-07T10:30:00Z'
    }
  ]);

  const [environmentalConditions, setEnvironmentalConditions] = useState<EnvironmentalConditions>({
    temperature: 24.5,
    humidity: 65,
    windSpeed: 3.2,
    precipitation: 2.4,
    cloudCover: 45,
    uvIndex: 6,
    daylightHours: 12.2,
    soilMoisture: 0.65
  });

  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeView, setActiveView] = useState<'indicators' | 'environment' | 'trends'>('indicators');
  const [selectedIndicator, setSelectedIndicator] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Usability tracking
  const { trackAnalystInteraction, hasConsent } = useUsabilityTracking();

  const fetchEcosystemData = async () => {
    setLoading(true);
    
    if (hasConsent()) {
      trackAnalystInteraction('ecosystem-panel-fetch-start', 'click', {
        panelAction: 'fetch_indicators',
        insightType: 'ecosystem_data'
      });
    }

    try {
      // Try to fetch ecosystem indicators from API
      try {
        const indicatorsData = await api.getEcosystemIndicators(selectedUnit || undefined, year);
        
        if (indicatorsData && indicatorsData.indicators) {
          // Transform API data to indicator format
          const transformedIndicators: EcosystemIndicator[] = indicatorsData.indicators.map((indicator: any) => ({
            id: indicator.id,
            name: indicator.name,
            value: indicator.value,
            unit: indicator.unit,
            trend: indicator.trend,
            changePercentage: indicator.change_percentage,
            status: indicator.status,
            description: indicator.description,
            icon: getIconForIndicator(indicator.id),
            color: indicator.color,
            dataSource: indicator.data_source,
            lastUpdated: indicator.last_updated
          }));
          
          setIndicators(transformedIndicators);
          
          if (hasConsent()) {
            trackAnalystInteraction('ecosystem-panel-fetch-success', 'click', {
              panelAction: 'indicators_loaded',
              insightType: 'api_success'
            });
          }
        }
      } catch (apiError) {
        console.warn('Ecosystem indicators API not available, using default data:', apiError);
        // Use default indicators - API will be implemented later
        if (hasConsent()) {
          trackAnalystInteraction('ecosystem-panel-fallback', 'click', {
            panelAction: 'fallback_indicators',
            insightType: 'default_data'
          });
        }
      }
      
      // Fetch environmental conditions
      try {
        const envData = await api.getEnvironmentalConditions(selectedUnit || undefined);
        if (envData) {
          setEnvironmentalConditions({
            temperature: envData.temperature || 24.5,
            humidity: envData.humidity || 65,
            windSpeed: envData.wind_speed || 3.2,
            precipitation: envData.precipitation || 2.4,
            cloudCover: envData.cloud_cover || 45,
            uvIndex: envData.uv_index || 6,
            daylightHours: envData.daylight_hours || 12.2,
            soilMoisture: envData.soil_moisture || 0.65
          });
        }
      } catch (error) {
        console.warn('Could not fetch environmental conditions, using defaults:', error);
        // Use default environmental conditions
      }
      
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch ecosystem data:', error);
      
      if (hasConsent()) {
        trackAnalystInteraction('ecosystem-panel-fetch-failed', 'click', {
          panelAction: 'fetch_failed',
          insightType: 'error'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusFromValue = (value: number, threshold: number): 'optimal' | 'good' | 'warning' | 'critical' => {
    if (value >= 0.8) return 'optimal';
    if (value >= 0.6) return 'good';
    if (value >= 0.4) return 'warning';
    return 'critical';
  };

  const getIconForIndicator = (indicatorId: string): React.ReactNode => {
    switch (indicatorId) {
      case 'habitat_suitability': return <TreePine className="w-4 h-4" />;
      case 'threat_level': return <AlertTriangle className="w-4 h-4" />;
      case 'connectivity': return <Network className="w-4 h-4" />;
      case 'rainfall': return <Droplets className="w-4 h-4" />;
      case 'vegetation': return <Shield className="w-4 h-4" />;
      case 'hwc_risk': return <Zap className="w-4 h-4" />;
      case 'corridor_health': return <MapPin className="w-4 h-4" />;
      case 'soil_moisture': return <CloudRain className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'optimal': return '#10b981';
      case 'good': return '#0ea5e9';
      case 'warning': return '#f59e0b';
      case 'critical': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <ChevronRight className="w-3 h-3 text-emerald-500" />;
      case 'down': return <ChevronLeft className="w-3 h-3 text-rose-500" />;
      default: return <span className="w-3 h-3 text-slate-500">—</span>;
    }
  };

  const getTrendText = (trend: string, percentage: number) => {
    const absPerc = Math.abs(percentage);
    switch (trend) {
      case 'up': return `${absPerc.toFixed(1)}% increase`;
      case 'down': return `${absPerc.toFixed(1)}% decrease`;
      default: return `${absPerc.toFixed(1)}% change`;
    }
  };

  const handleRefresh = () => {
    if (hasConsent()) {
      trackAnalystInteraction('ecosystem-panel-refresh', 'click', {
        panelAction: 'refresh_indicators',
        insightType: 'manual_refresh'
      });
    }
    fetchEcosystemData();
  };

  const handleIndicatorClick = (indicator: EcosystemIndicator) => {
    setSelectedIndicator(indicator.id);
    
    if (hasConsent()) {
      trackAnalystInteraction(`ecosystem-indicator-${indicator.id}`, 'click', {
        panelAction: 'select_indicator',
        insightType: indicator.name
      });
    }
  };

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  };

  useEffect(() => {
    fetchEcosystemData();
    
    // Refresh data every 10 minutes
    const interval = setInterval(fetchEcosystemData, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [selectedUnit, year]);

  const IndicatorCard = ({ indicator }: { indicator: EcosystemIndicator }) => (
    <div 
      className={`p-3 rounded-lg border transition-all cursor-pointer hover:shadow-md ${
        selectedIndicator === indicator.id 
          ? 'bg-slate-50 border-slate-300 shadow-sm' 
          : 'bg-white border-slate-200'
      }`}
      onClick={() => handleIndicatorClick(indicator)}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div 
            className="p-1.5 rounded-md"
            style={{ backgroundColor: `${indicator.color}15` }}
          >
            <div style={{ color: indicator.color }}>
              {indicator.icon}
            </div>
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800">{indicator.name}</h4>
            <div className="flex items-center gap-1 mt-0.5">
              <div 
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: getStatusColor(indicator.status) }}
              />
              <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: getStatusColor(indicator.status) }}>
                {indicator.status}
              </span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-slate-900">
            {typeof indicator.value === 'number' && indicator.value % 1 === 0 
              ? indicator.value 
              : indicator.value.toFixed(2)}
            <span className="text-xs font-normal text-slate-600 ml-0.5">{indicator.unit}</span>
          </div>
          <div className="flex items-center justify-end gap-1 mt-0.5">
            {getTrendIcon(indicator.trend)}
            <span className={`text-[10px] font-medium ${
              indicator.trend === 'up' ? 'text-emerald-600' :
              indicator.trend === 'down' ? 'text-rose-600' : 'text-slate-600'
            }`}>
              {getTrendText(indicator.trend, indicator.changePercentage)}
            </span>
          </div>
        </div>
      </div>
      <p className="text-[11px] text-slate-600 mt-2 leading-tight">{indicator.description}</p>
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
        <span className="text-[9px] text-slate-500 font-medium">{indicator.dataSource}</span>
        <span className="text-[8px] text-slate-400">
          {new Date(indicator.lastUpdated).toLocaleDateString()}
        </span>
      </div>
    </div>
  );

  const EnvironmentalConditionsCard = () => (
    <div className="p-4 rounded-lg bg-gradient-to-br from-slate-50 to-blue-50 border border-blue-100">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Thermometer className="w-4 h-4 text-blue-600" />
          <h4 className="text-xs font-bold text-slate-800">Environmental Conditions</h4>
        </div>
        <div className="flex items-center gap-2">
          <Sun className="w-3 h-3 text-amber-500" />
          <span className="text-[10px] text-slate-600">{environmentalConditions.daylightHours.toFixed(1)}h daylight</span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-600">Temperature</span>
            <span className="text-xs font-bold text-slate-800">{environmentalConditions.temperature}°C</span>
          </div>
          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-400 to-red-400"
              style={{ width: `${Math.min(100, (environmentalConditions.temperature / 40) * 100)}%` }}
            />
          </div>
        </div>
        
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-600">Humidity</span>
            <span className="text-xs font-bold text-slate-800">{environmentalConditions.humidity}%</span>
          </div>
          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-cyan-400 to-blue-600"
              style={{ width: `${environmentalConditions.humidity}%` }}
            />
          </div>
        </div>
        
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-600">Wind Speed</span>
            <span className="text-xs font-bold text-slate-800">{environmentalConditions.windSpeed}m/s</span>
          </div>
          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-slate-400 to-slate-600"
              style={{ width: `${Math.min(100, (environmentalConditions.windSpeed / 10) * 100)}%` }}
            />
          </div>
        </div>
        
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-600">Precipitation</span>
            <span className="text-xs font-bold text-slate-800">{environmentalConditions.precipitation}mm</span>
          </div>
          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-200 to-blue-500"
              style={{ width: `${Math.min(100, (environmentalConditions.precipitation / 20) * 100)}%` }}
            />
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-200">
        <div className="text-center">
          <CloudRain className="w-3 h-3 text-slate-600 mx-auto mb-1" />
          <span className="text-[10px] text-slate-700 font-medium">Cloud Cover</span>
          <div className="text-xs font-bold text-slate-900">{environmentalConditions.cloudCover}%</div>
        </div>
        <div className="text-center">
          <Sun className="w-3 h-3 text-amber-500 mx-auto mb-1" />
          <span className="text-[10px] text-slate-700 font-medium">UV Index</span>
          <div className="text-xs font-bold text-slate-900">{environmentalConditions.uvIndex}</div>
        </div>
        <div className="text-center">
          <Gauge className="w-3 h-3 text-emerald-600 mx-auto mb-1" />
          <span className="text-[10px] text-slate-700 font-medium">Soil Moisture</span>
          <div className="text-xs font-bold text-slate-900">{(environmentalConditions.soilMoisture * 100).toFixed(0)}%</div>
        </div>
      </div>
    </div>
  );

  const StatusOverview = () => (
    <div className="p-3 rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-700" />
          <h4 className="text-xs font-bold text-emerald-900">Ecosystem Health Overview</h4>
        </div>
        <div className="px-2 py-0.5 bg-emerald-500 text-white text-[9px] font-bold rounded-full">
          {selectedUnit || 'Regional'}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="flex items-center gap-1 mb-1">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[10px] text-emerald-800 font-medium">Optimal</span>
          </div>
          <div className="text-lg font-bold text-emerald-900">
            {indicators.filter(i => i.status === 'optimal').length}
            <span className="text-xs font-normal text-emerald-700 ml-1">indicators</span>
          </div>
        </div>
        
        <div>
          <div className="flex items-center gap-1 mb-1">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-[10px] text-blue-800 font-medium">Good</span>
          </div>
          <div className="text-lg font-bold text-blue-900">
            {indicators.filter(i => i.status === 'good').length}
            <span className="text-xs font-normal text-blue-700 ml-1">indicators</span>
          </div>
        </div>
        
        <div>
          <div className="flex items-center gap-1 mb-1">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-[10px] text-amber-800 font-medium">Warning</span>
          </div>
          <div className="text-lg font-bold text-amber-900">
            {indicators.filter(i => i.status === 'warning').length}
            <span className="text-xs font-normal text-amber-700 ml-1">indicators</span>
          </div>
        </div>
        
        <div>
          <div className="flex items-center gap-1 mb-1">
            <div className="w-2 h-2 rounded-full bg-rose-500" />
            <span className="text-[10px] text-rose-800 font-medium">Critical</span>
          </div>
          <div className="text-lg font-bold text-rose-900">
            {indicators.filter(i => i.status === 'critical').length}
            <span className="text-xs font-normal text-rose-700 ml-1">indicators</span>
          </div>
        </div>
      </div>
      
      <div className="mt-3 pt-2 border-t border-emerald-200">
        <p className="text-[11px] text-emerald-800 text-center">
          Overall ecosystem health: <span className="font-bold">Good</span>
        </p>
      </div>
    </div>
  );

  return (
    <DraggablePanel 
      id="ecosystem-indicators-panel"
      defaultPosition={{ x: 380, y: 16 }}
      defaultSize={{ width: 360, height: 500 }}
      minWidth={340}
      minHeight={400}
    >
      <div className="flex flex-col h-full bg-white/95 backdrop-blur-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Activity className="w-5 h-5 text-emerald-600" />
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            </div>
            <div>
              <h3 className="text-[11px] font-bold text-slate-800 uppercase tracking-[0.2em]">
                Ecosystem Indicators
              </h3>
              <div className="flex items-center gap-1 text-[8px] text-slate-500">
                <span>Updated {formatTimeAgo(lastUpdated)}</span>
                <span>•</span>
                <span>{isLiveMode ? 'Live Mode' : 'Historical'}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <button
              onClick={handleRefresh}
              className="p-1 hover:bg-slate-100 rounded transition-colors"
              title="Refresh indicators"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 hover:bg-slate-100 rounded transition-colors"
              title={isExpanded ? 'Collapse panel' : 'Expand panel'}
            >
              {isExpanded ? <Minimize2 className="w-3.5 h-3.5 text-slate-500" /> : <Maximize2 className="w-3.5 h-3.5 text-slate-500" />}
            </button>
          </div>
        </div>

        {/* View Toggle */}
        {isExpanded && (
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveView('indicators')}
              className={`flex-1 py-2 text-[10px] font-medium transition-colors ${
                activeView === 'indicators' 
                  ? 'bg-slate-100 text-slate-800 border-b-2 border-emerald-500' 
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Indicators
            </button>
            <button
              onClick={() => setActiveView('environment')}
              className={`flex-1 py-2 text-[10px] font-medium transition-colors ${
                activeView === 'environment' 
                  ? 'bg-slate-100 text-slate-800 border-b-2 border-blue-500' 
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Environment
            </button>
            <button
              onClick={() => setActiveView('trends')}
              className={`flex-1 py-2 text-[10px] font-medium transition-colors ${
                activeView === 'trends' 
                  ? 'bg-slate-100 text-slate-800 border-b-2 border-purple-500' 
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Trends
            </button>
          </div>
        )}

        {/* Content */}
        {isExpanded && (
          <div className="p-4 flex-1 overflow-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="relative w-12 h-12 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
                </div>
                <p className="mt-4 text-xs text-slate-600">Loading ecosystem indicators...</p>
              </div>
            ) : (
              <>
                {activeView === 'indicators' && (
                  <div className="space-y-3">
                    <StatusOverview />
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-700">Key Ecosystem Metrics</h4>
                        <span className="text-[10px] text-slate-500">
                          {indicators.length} indicators
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-2">
                        {indicators.map((indicator) => (
                          <IndicatorCard key={indicator.id} indicator={indicator} />
                        ))}
                      </div>
                    </div>
                    
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex items-center gap-2">
                        <Info className="w-3 h-3 text-slate-500" />
                        <p className="text-[10px] text-slate-600">
                          Click on any indicator for detailed analysis and historical trends.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {activeView === 'environment' && (
                  <div className="space-y-4">
                    <EnvironmentalConditionsCard />
                    
                    <div className="p-3 rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-bold text-slate-800">Seasonal Context</h4>
                        <span className="text-[10px] text-slate-600 px-2 py-0.5 bg-slate-200 rounded-full">
                          Dry Season
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-tight">
                        Current environmental conditions are typical for the dry season in {selectedUnit || 'the region'}. 
                        Reduced rainfall and moderate temperatures create optimal conditions for wildlife movement 
                        but increase HWC risk near water sources.
                      </p>
                    </div>
                  </div>
                )}
                
                {activeView === 'trends' && (
                  <div className="space-y-4">
                    <div className="p-3 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Activity className="w-4 h-4 text-purple-600" />
                        <h4 className="text-xs font-bold text-purple-900">Historical Trends</h4>
                      </div>
                      <p className="text-[11px] text-purple-800 leading-tight">
                        Trend analysis for {selectedUnit || 'the region'} shows overall improvement in ecosystem health 
                        over the past 5 years, with connectivity and habitat suitability showing the most significant gains.
                      </p>
                    </div>
                    
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-700">Top Improving Indicators</h4>
                      {indicators
                        .filter(i => i.trend === 'up')
                        .sort((a, b) => b.changePercentage - a.changePercentage)
                        .slice(0, 3)
                        .map((indicator) => (
                          <div key={indicator.id} className="flex items-center justify-between p-2 bg-emerald-50 rounded border border-emerald-100">
                            <div className="flex items-center gap-2">
                              {indicator.icon}
                              <span className="text-[11px] font-medium text-emerald-800">{indicator.name}</span>
                            </div>
                            <span className="text-xs font-bold text-emerald-700">+{indicator.changePercentage.toFixed(1)}%</span>
                          </div>
                        ))}
                    </div>
                    
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-700">Indicators Needing Attention</h4>
                      {indicators
                        .filter(i => i.status === 'warning' || i.status === 'critical')
                        .map((indicator) => (
                          <div key={indicator.id} className="flex items-center justify-between p-2 bg-rose-50 rounded border border-rose-100">
                            <div className="flex items-center gap-2">
                              {indicator.icon}
                              <span className="text-[11px] font-medium text-rose-800">{indicator.name}</span>
                            </div>
                            <span className="text-xs font-bold text-rose-700">
                              {indicator.status === 'critical' ? 'Critical' : 'Warning'}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </>
            )}
            
            {/* Footer */}
            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between text-[8px] text-slate-500">
                <div className="flex items-center gap-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${loading ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                  <span>{loading ? 'Updating...' : 'Live Data'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>SekaNet v2.1.0</span>
                  <span>•</span>
                  <span>Ecology Dashboard</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DraggablePanel>
  );
}