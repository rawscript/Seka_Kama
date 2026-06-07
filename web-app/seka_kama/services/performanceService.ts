// Performance Monitoring Service for UI/UX Improvements
// Implementation of Task 1.3: Create Performance Monitoring Framework

// ---------------------------------------------------------------------------
// Types and Interfaces
// ---------------------------------------------------------------------------

export interface PerformanceMetrics {
  timestamp: number;
  component: string;
  action: string;
  duration: number;
  success: boolean;
  ecologicalContext?: {
    conservationArea?: string;
    timePeriod?: string;
    speciesFocus?: string[];
    dataLayers?: string[];
    analysisType?: string;
  };
  deviceInfo?: {
    type: 'desktop' | 'tablet' | 'phone';
    screenSize: { width: number; height: number };
    browser: string;
    os: string;
  };
  networkConditions?: {
    connectionType?: string;
    effectiveType?: string;
    rtt?: number;
    downlink?: number;
    saveData?: boolean;
  };
  resourceLoad?: {
    size: number;
    loadTime: number;
    cached: boolean;
  };
}

export interface PerformanceThreshold {
  component: string;
  action: string;
  warningThreshold: number; // ms
  errorThreshold: number; // ms
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface LoadingStrategy {
  priority: 'critical' | 'high' | 'medium' | 'low';
  loadingMethod: 'eager' | 'lazy' | 'progressive';
  placeholderType: 'skeleton' | 'spinner' | 'none';
  estimatedSize?: number; // bytes
}

export interface PerceivedPerformanceScore {
  overallScore: number; // 0-100
  categories: {
    responsiveness: number;
    loading: number;
    smoothness: number;
    reliability: number;
  };
  recommendations: string[];
}

export interface AnimationOptimization {
  elementId: string;
  animationType: string;
  originalDuration: number;
  optimizedDuration: number;
  frameRate: number;
  jankCount: number;
  recommendations: string[];
}

export interface ResourceTiming {
  name: string;
  startTime: number;
  duration: number;
  transferSize: number;
  initiatorType: string;
  cacheStatus: 'hit' | 'miss' | 'revalidated';
}

// ---------------------------------------------------------------------------
// Performance Monitoring Service
// ---------------------------------------------------------------------------

class PerformanceMonitor {
  private metricsBuffer: PerformanceMetrics[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private thresholds: PerformanceThreshold[] = [
    // Map interactions
    { component: 'SekaMap', action: 'layer_switch', warningThreshold: 500, errorThreshold: 2000, priority: 'high' },
    { component: 'SekaMap', action: 'zoom_pan', warningThreshold: 200, errorThreshold: 1000, priority: 'medium' },
    { component: 'SekaMap', action: 'data_load', warningThreshold: 2000, errorThreshold: 5000, priority: 'high' },
    
    // Analyst panel
    { component: 'AnalystPanel', action: 'insight_load', warningThreshold: 1000, errorThreshold: 3000, priority: 'high' },
    { component: 'AnalystPanel', action: 'report_generation', warningThreshold: 2000, errorThreshold: 5000, priority: 'medium' },
    { component: 'AnalystPanel', action: 'refresh', warningThreshold: 500, errorThreshold: 2000, priority: 'medium' },
    
    // Scenario simulation
    { component: 'ScenarioSimulation', action: 'run_scenario', warningThreshold: 3000, errorThreshold: 10000, priority: 'critical' },
    { component: 'ScenarioSimulation', action: 'prediction_calculation', warningThreshold: 2000, errorThreshold: 8000, priority: 'high' },
    
    // General interactions
    { component: '*', action: 'click_response', warningThreshold: 100, errorThreshold: 300, priority: 'high' },
    { component: '*', action: 'hover_feedback', warningThreshold: 50, errorThreshold: 150, priority: 'medium' },
    { component: '*', action: 'navigation', warningThreshold: 1000, errorThreshold: 3000, priority: 'high' }
  ];
  
  private enabled = true;
  private privacyConsent = true;

  constructor() {
    // Start periodic flush
    if (typeof window !== 'undefined') {
      this.flushInterval = setInterval(() => this.flushMetrics(), 30000); // Flush every 30 seconds
    }
  }

  /**
   * Start tracking a performance measurement
   */
  startMeasurement(component: string, action: string, ecologicalContext?: PerformanceMetrics['ecologicalContext']): () => void {
    if (!this.enabled || !this.privacyConsent) {
      return () => {}; // No-op if disabled
    }

    const startTime = performance.now();
    const startMark = `${component}_${action}_${Date.now()}`;
    performance.mark(startMark);

    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      performance.measure(`${component}_${action}_measurement`, startMark);

      const metric: PerformanceMetrics = {
        timestamp: Date.now(),
        component,
        action,
        duration,
        success: true,
        ecologicalContext,
        deviceInfo: this.getDeviceInfo(),
        networkConditions: this.getNetworkConditions()
      };

      // Check thresholds
      const threshold = this.getThreshold(component, action);
      if (threshold) {
        if (duration > threshold.errorThreshold) {
          console.warn(`Performance error: ${component}.${action} took ${duration}ms (threshold: ${threshold.errorThreshold}ms)`);
        } else if (duration > threshold.warningThreshold) {
          console.info(`Performance warning: ${component}.${action} took ${duration}ms (threshold: ${threshold.warningThreshold}ms)`);
        }
      }

      this.metricsBuffer.push(metric);
      
      // If buffer reaches threshold, flush immediately
      if (this.metricsBuffer.length >= 100) {
        this.flushMetrics();
      }
    };
  }

  /**
   * Track resource loading performance
   */
  trackResourceLoad(name: string, size: number, cached: boolean): void {
    if (!this.enabled || !this.privacyConsent) return;

    const loadStart = performance.now();
    
    // Simulate load completion tracking
    setTimeout(() => {
      const loadTime = performance.now() - loadStart;
      
      const metric: PerformanceMetrics = {
        timestamp: Date.now(),
        component: 'ResourceLoader',
        action: 'resource_load',
        duration: loadTime,
        success: true,
        resourceLoad: {
          size,
          loadTime,
          cached
        },
        deviceInfo: this.getDeviceInfo(),
        networkConditions: this.getNetworkConditions()
      };

      this.metricsBuffer.push(metric);
    }, 0);
  }

  /**
   * Calculate perceived performance score
   */
  calculatePerceivedPerformanceScore(): PerceivedPerformanceScore {
    const recentMetrics = this.metricsBuffer.filter(m => 
      Date.now() - m.timestamp < 300000 // Last 5 minutes
    );

    if (recentMetrics.length === 0) {
      return {
        overallScore: 100,
        categories: {
          responsiveness: 100,
          loading: 100,
          smoothness: 100,
          reliability: 100
        },
        recommendations: []
      };
    }

    // Calculate category scores
    const responsivenessMetrics = recentMetrics.filter(m => 
      m.action.includes('click') || m.action.includes('hover') || m.action.includes('navigation')
    );
    const responsivenessScore = responsivenessMetrics.length > 0
      ? Math.max(0, 100 - (responsivenessMetrics.reduce((sum, m) => sum + (m.duration > 300 ? 1 : 0), 0) / responsivenessMetrics.length) * 100)
      : 100;

    const loadingMetrics = recentMetrics.filter(m => 
      m.action.includes('load') || m.action.includes('fetch')
    );
    const loadingScore = loadingMetrics.length > 0
      ? Math.max(0, 100 - (loadingMetrics.reduce((sum, m) => sum + (m.duration > 2000 ? 1 : 0), 0) / loadingMetrics.length) * 100)
      : 100;

    const smoothnessMetrics = recentMetrics.filter(m => 
      m.component === 'SekaMap' && (m.action.includes('zoom') || m.action.includes('pan') || m.action.includes('switch'))
    );
    const smoothnessScore = smoothnessMetrics.length > 0
      ? Math.max(0, 100 - (smoothnessMetrics.reduce((sum, m) => sum + (m.duration > 500 ? 1 : 0), 0) / smoothnessMetrics.length) * 100)
      : 100;

    const reliabilityScore = recentMetrics.length > 0
      ? Math.max(0, 100 - (recentMetrics.filter(m => !m.success).length / recentMetrics.length) * 100)
      : 100;

    const overallScore = Math.round(
      (responsivenessScore * 0.3) +
      (loadingScore * 0.3) +
      (smoothnessScore * 0.2) +
      (reliabilityScore * 0.2)
    );

    // Generate recommendations
    const recommendations: string[] = [];
    
    if (responsivenessScore < 80) {
      recommendations.push('Optimize interaction response times for better user experience');
    }
    
    if (loadingScore < 80) {
      recommendations.push('Implement progressive loading for large ecological datasets');
    }
    
    if (smoothnessScore < 80) {
      recommendations.push('Optimize map rendering performance for smoother interactions');
    }
    
    if (reliabilityScore < 90) {
      recommendations.push('Improve error handling and retry mechanisms');
    }

    return {
      overallScore,
      categories: {
        responsiveness: Math.round(responsivenessScore),
        loading: Math.round(loadingScore),
        smoothness: Math.round(smoothnessScore),
        reliability: Math.round(reliabilityScore)
      },
      recommendations
    };
  }

  /**
   * Optimize animation timing
   */
  optimizeAnimation(elementId: string, animationType: string, originalDuration: number): AnimationOptimization {
    // Calculate optimal duration based on 60fps target
    const frameTime = 1000 / 60; // 16.67ms per frame
    const frameCount = Math.ceil(originalDuration / frameTime);
    const optimizedDuration = frameCount * frameTime;
    
    // Simulate jank detection
    const jankCount = originalDuration > 300 ? Math.floor(originalDuration / 100) : 0;
    
    const recommendations: string[] = [];
    
    if (originalDuration > 300) {
      recommendations.push(`Reduce animation duration from ${originalDuration}ms to ${optimizedDuration}ms`);
    }
    
    if (jankCount > 0) {
      recommendations.push(`Eliminate animation jank (${jankCount} frames affected)`);
    }
    
    if (optimizedDuration > 500) {
      recommendations.push('Consider simplifying animation or using CSS hardware acceleration');
    }

    return {
      elementId,
      animationType,
      originalDuration,
      optimizedDuration,
      frameRate: 60,
      jankCount,
      recommendations
    };
  }

  /**
   * Determine optimal loading strategy
   */
  determineLoadingStrategy(
    component: string,
    ecologicalContext?: PerformanceMetrics['ecologicalContext']
  ): LoadingStrategy {
    const networkConditions = this.getNetworkConditions();
    const deviceInfo = this.getDeviceInfo();
    
    let priority: LoadingStrategy['priority'] = 'medium';
    let loadingMethod: LoadingStrategy['loadingMethod'] = 'lazy';
    let placeholderType: LoadingStrategy['placeholderType'] = 'skeleton';
    
    // Adjust based on component
    if (component === 'SekaMap') {
      priority = 'critical';
      loadingMethod = 'eager';
      placeholderType = 'spinner';
    } else if (component === 'AnalystPanel') {
      priority = 'high';
      loadingMethod = 'progressive';
      placeholderType = 'skeleton';
    }
    
    // Adjust based on network conditions
    if (networkConditions.effectiveType === '4g' || networkConditions.effectiveType === '3g') {
      loadingMethod = 'eager';
    } else if (networkConditions.effectiveType === '2g' || networkConditions.saveData) {
      loadingMethod = 'lazy';
      placeholderType = 'none';
    }
    
    // Adjust based on device
    if (deviceInfo.type === 'phone') {
      placeholderType = 'spinner'; // Simpler on mobile
    }

    return {
      priority,
      loadingMethod,
      placeholderType
    };
  }

  /**
   * Get performance thresholds for a component/action
   */
  private getThreshold(component: string, action: string): PerformanceThreshold | undefined {
    // Exact match
    const exactMatch = this.thresholds.find(t => 
      t.component === component && t.action === action
    );
    
    if (exactMatch) return exactMatch;
    
    // Wildcard component match
    const componentWildcard = this.thresholds.find(t => 
      t.component === '*' && t.action === action
    );
    
    if (componentWildcard) return componentWildcard;
    
    // Wildcard action match
    const actionWildcard = this.thresholds.find(t => 
      t.component === component && t.action === '*'
    );
    
    return actionWildcard;
  }

  /**
   * Get device information
   */
  private getDeviceInfo(): PerformanceMetrics['deviceInfo'] {
    if (typeof window === 'undefined') {
      return {
        type: 'desktop',
        screenSize: { width: 0, height: 0 },
        browser: 'unknown',
        os: 'unknown'
      };
    }

    const ua = navigator.userAgent;
    const screen = window.screen;
    
    // Determine device type
    let type: 'desktop' | 'tablet' | 'phone' = 'desktop';
    if (/mobile/i.test(ua) && /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
      type = screen.width < 768 ? 'phone' : 'tablet';
    }

    // Determine browser
    let browser = 'unknown';
    if (/firefox/i.test(ua)) browser = 'firefox';
    else if (/chrome/i.test(ua) && !/edge/i.test(ua)) browser = 'chrome';
    else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'safari';
    else if (/edge/i.test(ua)) browser = 'edge';
    else if (/opera|opr/i.test(ua)) browser = 'opera';

    // Determine OS
    let os = 'unknown';
    if (/windows/i.test(ua)) os = 'windows';
    else if (/macintosh|mac os x/i.test(ua)) os = 'macos';
    else if (/linux/i.test(ua)) os = 'linux';
    else if (/android/i.test(ua)) os = 'android';
    else if (/ios|iphone|ipad|ipod/i.test(ua)) os = 'ios';

    return {
      type,
      screenSize: { width: screen.width, height: screen.height },
      browser,
      os
    };
  }

  /**
   * Get network conditions
   */
  private getNetworkConditions(): PerformanceMetrics['networkConditions'] {
    if (typeof window === 'undefined' || !('connection' in navigator)) {
      return {};
    }

    const connection = (navigator as any).connection;
    if (!connection) return {};

    return {
      connectionType: connection.type,
      effectiveType: connection.effectiveType,
      rtt: connection.rtt,
      downlink: connection.downlink,
      saveData: connection.saveData
    };
  }

  /**
   * Flush metrics to backend
   */
  private async flushMetrics(): Promise<void> {
    if (this.metricsBuffer.length === 0) return;

    const batch = [...this.metricsBuffer];
    this.metricsBuffer = [];

    try {
      // In a real implementation, this would send to a backend API
      console.log(`Flushing ${batch.length} performance metrics`);
      
      // Store locally for development
      if (typeof localStorage !== 'undefined') {
        const existing = JSON.parse(localStorage.getItem('seka-kama-performance-metrics') || '[]');
        localStorage.setItem(
          'seka-kama-performance-metrics',
          JSON.stringify([...existing, ...batch].slice(-1000)) // Keep last 1000 entries
        );
      }
    } catch (error) {
      console.warn('Failed to flush performance metrics:', error);
      // Re-add to buffer for retry
      this.metricsBuffer.unshift(...batch.filter(metric => 
        !this.metricsBuffer.some(existing => 
          existing.timestamp === metric.timestamp && 
          existing.component === metric.component && 
          existing.action === metric.action
        )
      ));
    }
  }

  /**
   * Enable/disable performance monitoring
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Set privacy consent
   */
  setPrivacyConsent(consent: boolean): void {
    this.privacyConsent = consent;
  }

  /**
   * Get recent performance metrics
   */
  getRecentMetrics(limit = 100): PerformanceMetrics[] {
    return [...this.metricsBuffer]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Get performance statistics
   */
  getPerformanceStatistics(): {
    totalMetrics: number;
    averageDuration: number;
    thresholdViolations: number;
    componentBreakdown: Record<string, number>;
  } {
    if (this.metricsBuffer.length === 0) {
      return {
        totalMetrics: 0,
        averageDuration: 0,
        thresholdViolations: 0,
        componentBreakdown: {}
      };
    }

    const totalDuration = this.metricsBuffer.reduce((sum, m) => sum + m.duration, 0);
    const averageDuration = totalDuration / this.metricsBuffer.length;

    const thresholdViolations = this.metricsBuffer.filter(metric => {
      const threshold = this.getThreshold(metric.component, metric.action);
      return threshold && metric.duration > threshold.warningThreshold;
    }).length;

    const componentBreakdown: Record<string, number> = {};
    this.metricsBuffer.forEach(metric => {
      componentBreakdown[metric.component] = (componentBreakdown[metric.component] || 0) + 1;
    });

    return {
      totalMetrics: this.metricsBuffer.length,
      averageDuration,
      thresholdViolations,
      componentBreakdown
    };
  }
}

// ---------------------------------------------------------------------------
// Performance Service API
// ---------------------------------------------------------------------------

export const performanceService = {
  monitor: new PerformanceMonitor(),

  /**
   * Start performance measurement
   */
  startMeasurement: (
    component: string, 
    action: string, 
    ecologicalContext?: PerformanceMetrics['ecologicalContext']
  ) => performanceService.monitor.startMeasurement(component, action, ecologicalContext),

  /**
   * Track resource loading
   */
  trackResourceLoad: (name: string, size: number, cached: boolean) => 
    performanceService.monitor.trackResourceLoad(name, size, cached),

  /**
   * Calculate perceived performance score
   */
  calculatePerceivedPerformanceScore: () => 
    performanceService.monitor.calculatePerceivedPerformanceScore(),

  /**
   * Optimize animation timing
   */
  optimizeAnimation: (elementId: string, animationType: string, originalDuration: number) => 
    performanceService.monitor.optimizeAnimation(elementId, animationType, originalDuration),

  /**
   * Determine optimal loading strategy
   */
  determineLoadingStrategy: (component: string, ecologicalContext?: PerformanceMetrics['ecologicalContext']) => 
    performanceService.monitor.determineLoadingStrategy(component, ecologicalContext),

  /**
   * Enable/disable performance monitoring
   */
  setEnabled: (enabled: boolean) => 
    performanceService.monitor.setEnabled(enabled),

  /**
   * Set privacy consent
   */
  setPrivacyConsent: (consent: boolean) => 
    performanceService.monitor.setPrivacyConsent(consent),

  /**
   * Get recent performance metrics
   */
  getRecentMetrics: (limit?: number) => 
    performanceService.monitor.getRecentMetrics(limit),

  /**
   * Get performance statistics
   */
  getPerformanceStatistics: () => 
    performanceService.monitor.getPerformanceStatistics(),

  /**
   * Get default performance thresholds
   */
  getThresholds: () => performanceService.monitor['thresholds']
};

// ---------------------------------------------------------------------------
// React Hook for Performance Monitoring
// ---------------------------------------------------------------------------

export function usePerformanceMonitoring() {
  return {
    // Measurement
    startMeasurement: (
      component: string, 
      action: string, 
      ecologicalContext?: PerformanceMetrics['ecologicalContext']
    ) => performanceService.startMeasurement(component, action, ecologicalContext),
    
    trackResourceLoad: (name: string, size: number, cached: boolean) => 
      performanceService.trackResourceLoad(name, size, cached),
    
    // Analysis
    calculatePerceivedPerformanceScore: () => 
      performanceService.calculatePerceivedPerformanceScore(),
    
    optimizeAnimation: (elementId: string, animationType: string, originalDuration: number) => 
      performanceService.optimizeAnimation(elementId, animationType, originalDuration),
    
    determineLoadingStrategy: (component: string, ecologicalContext?: PerformanceMetrics['ecologicalContext']) => 
      performanceService.determineLoadingStrategy(component, ecologicalContext),
    
    // Configuration
    setEnabled: (enabled: boolean) => 
      performanceService.setEnabled(enabled),
    
    setPrivacyConsent: (consent: boolean) => 
      performanceService.setPrivacyConsent(consent),
    
    // Data Access
    getRecentMetrics: (limit?: number) => 
      performanceService.getRecentMetrics(limit),
    
    getPerformanceStatistics: () => 
      performanceService.getPerformanceStatistics(),
    
    getThresholds: () => 
      performanceService.getThresholds()
  };
}

// ---------------------------------------------------------------------------
// Default export
// ---------------------------------------------------------------------------

export default performanceService;