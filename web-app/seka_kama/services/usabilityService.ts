// Usability Tracking Service for UI/UX Improvements
// Implementation of Task 1.1: Set Up Usability Tracking Infrastructure

import { getApiUrl } from './config';

// ---------------------------------------------------------------------------
// Types and Interfaces
// ---------------------------------------------------------------------------

export interface InteractionEvent {
  timestamp: number;
  elementId: string;
  interactionType: 'click' | 'hover' | 'drag' | 'scroll' | 'keypress' | 'focus' | 'blur' | 'change';
  duration?: number;
  context: {
    component: string;
    action?: string;
    ecologicalContext?: Record<string, any>;
    deviceInfo?: DeviceInfo;
    networkConditions?: NetworkConditions;
    [key: string]: any;
  };
  metadata?: Record<string, any>;
}

export interface DeviceInfo {
  type: 'desktop' | 'tablet' | 'phone';
  screenSize: { width: number; height: number };
  browser: string;
  os: string;
  userAgent?: string;
}

export interface NetworkConditions {
  connectionType?: string;
  effectiveType?: string;
  rtt?: number;
  downlink?: number;
  saveData?: boolean;
}

export interface UsabilitySession {
  sessionId: string;
  userId?: string;
  startTime: number;
  endTime?: number;
  deviceInfo: DeviceInfo;
  networkConditions: NetworkConditions;
  conservationContext?: {
    conservationArea?: string;
    timePeriod?: string;
    speciesFocus?: string[];
    analysisType?: string;
  };
  consentGranted: boolean;
  anonymized: boolean;
}

export interface UsabilityMetrics {
  sessionId: string;
  totalInteractions: number;
  interactionSuccessRate: number;
  averageCompletionTime: number;
  errorRate: number;
  confusionIndicators: string[];
  identifiedIssues: UsabilityIssue[];
  recommendations: ImprovementRecommendation[];
  calculatedAt: number;
}

export interface UsabilityIssue {
  id: string;
  sessionId: string;
  type: 'confusion' | 'friction' | 'accessibility' | 'performance' | 'error';
  severity: 'low' | 'medium' | 'high' | 'critical';
  location: string;
  description: string;
  reproductionSteps: string[];
  affectedUsers: number;
  timestamp: number;
  ecologicalContext?: Record<string, any>;
}

export interface ImprovementRecommendation {
  issueId: string;
  priority: number;
  implementationComplexity: number;
  conservationImpact: number;
  suggestedSolution: string;
  estimatedEffort: number; // in hours
}

export interface PrivacyPreferences {
  trackInteractions: boolean;
  trackPerformance: boolean;
  trackEcologicalContext: boolean;
  anonymizeData: boolean;
  dataRetentionDays: number;
}

// ---------------------------------------------------------------------------
// Session Management
// ---------------------------------------------------------------------------

class UsabilitySessionManager {
  private currentSession: UsabilitySession | null = null;
  private interactionBuffer: InteractionEvent[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private privacyPreferences: PrivacyPreferences = {
    trackInteractions: true,
    trackPerformance: true,
    trackEcologicalContext: false,
    anonymizeData: true,
    dataRetentionDays: 30
  };

  async startSession(userId?: string): Promise<UsabilitySession> {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Detect device and network information
    const deviceInfo = this.detectDeviceInfo();
    const networkConditions = this.detectNetworkConditions();
    
    this.currentSession = {
      sessionId,
      userId: this.privacyPreferences.anonymizeData ? undefined : userId,
      startTime: Date.now(),
      deviceInfo,
      networkConditions,
      consentGranted: this.hasConsent(),
      anonymized: this.privacyPreferences.anonymizeData
    };

    // Start periodic flush of interaction buffer
    this.flushInterval = setInterval(() => this.flushInteractions(), 10000); // Flush every 10 seconds
    
    return this.currentSession;
  }

  async endSession(): Promise<void> {
    if (!this.currentSession) return;

    this.currentSession.endTime = Date.now();
    
    // Flush any remaining interactions
    await this.flushInteractions();
    
    // Clear flush interval
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }

    // Send session summary to backend
    if (this.privacyPreferences.trackInteractions) {
      await this.sendSessionSummary(this.currentSession);
    }

    this.currentSession = null;
  }

  async trackInteraction(event: Partial<InteractionEvent>): Promise<void> {
    if (!this.currentSession || !this.privacyPreferences.trackInteractions) return;

    const fullEvent: InteractionEvent = {
      timestamp: Date.now(),
      elementId: event.elementId || 'unknown',
      interactionType: event.interactionType || 'click',
      duration: event.duration,
      context: {
        component: event.context?.component || 'unknown',
        action: event.context?.action,
        ecologicalContext: this.privacyPreferences.trackEcologicalContext 
          ? event.context?.ecologicalContext 
          : undefined,
        deviceInfo: this.currentSession.deviceInfo,
        networkConditions: this.currentSession.networkConditions,
        ...(event.context || {})
      },
      metadata: {
        sessionId: this.currentSession.sessionId,
        timestamp: Date.now(),
        ...(event.metadata || {})
      }
    };

    this.interactionBuffer.push(fullEvent);

    // If buffer reaches threshold, flush immediately
    if (this.interactionBuffer.length >= 50) {
      await this.flushInteractions();
    }
  }

  async flushInteractions(): Promise<void> {
    if (this.interactionBuffer.length === 0 || !this.privacyPreferences.trackInteractions) return;

    const batch = [...this.interactionBuffer];
    this.interactionBuffer = [];

    try {
      await usabilityService.sendInteractionBatch(batch);
    } catch (error) {
      console.warn('Failed to send interaction batch:', error);
      // Re-add to buffer for retry (with deduplication check)
      this.interactionBuffer.unshift(...batch.filter(event => 
        !this.interactionBuffer.some(existing => 
          existing.timestamp === event.timestamp && existing.elementId === event.elementId
        )
      ));
    }
  }

  setPrivacyPreferences(preferences: Partial<PrivacyPreferences>): void {
    this.privacyPreferences = { ...this.privacyPreferences, ...preferences };
  }

  getPrivacyPreferences(): PrivacyPreferences {
    return { ...this.privacyPreferences };
  }

  hasConsent(): boolean {
    const storedConsent = localStorage.getItem('seka-kama-ux-consent');
    return storedConsent === 'granted';
  }

  setConsent(granted: boolean): void {
    localStorage.setItem('seka-kama-ux-consent', granted ? 'granted' : 'denied');
    this.privacyPreferences.trackInteractions = granted;
  }

  private detectDeviceInfo(): DeviceInfo {
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
      os,
      userAgent: this.privacyPreferences.anonymizeData ? undefined : ua
    };
  }

  private detectNetworkConditions(): NetworkConditions {
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

  private async sendSessionSummary(session: UsabilitySession): Promise<void> {
    try {
      await usabilityService.recordSession(session);
    } catch (error) {
      console.warn('Failed to send session summary:', error);
    }
  }
}

// ---------------------------------------------------------------------------
// Usability Service API
// ---------------------------------------------------------------------------

export const usabilityService = {
  sessionManager: new UsabilitySessionManager(),

  /**
   * Start a new usability tracking session
   */
  async startSession(userId?: string): Promise<UsabilitySession> {
    return this.sessionManager.startSession(userId);
  },

  /**
   * End the current usability tracking session
   */
  async endSession(): Promise<void> {
    return this.sessionManager.endSession();
  },

  /**
   * Track a user interaction
   */
  async trackInteraction(event: Partial<InteractionEvent>): Promise<void> {
    return this.sessionManager.trackInteraction(event);
  },

  /**
   * Set privacy preferences for usability tracking
   */
  setPrivacyPreferences(preferences: Partial<PrivacyPreferences>): void {
    this.sessionManager.setPrivacyPreferences(preferences);
  },

  /**
   * Get current privacy preferences
   */
  getPrivacyPreferences(): PrivacyPreferences {
    return this.sessionManager.getPrivacyPreferences();
  },

  /**
   * Set user consent for usability tracking
   */
  setConsent(granted: boolean): void {
    this.sessionManager.setConsent(granted);
  },

  /**
   * Check if user has given consent for usability tracking
   */
  hasConsent(): boolean {
    return this.sessionManager.hasConsent();
  },

  // -------------------------------------------------------------------------
  // API Methods (Communication with backend)
  // -------------------------------------------------------------------------

  async sendInteractionBatch(interactions: InteractionEvent[]): Promise<void> {
    try {
      await fetch(`${getApiUrl()}/usability/interactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ interactions })
      });
    } catch (error) {
      console.error('Failed to send interaction batch:', error);
      throw error;
    }
  },

  async recordSession(session: UsabilitySession): Promise<void> {
    try {
      await fetch(`${getApiUrl()}/usability/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ session })
      });
    } catch (error) {
      console.error('Failed to record session:', error);
      throw error;
    }
  },

  async getUsabilityMetrics(sessionId: string): Promise<UsabilityMetrics> {
    try {
      const response = await fetch(`${getApiUrl()}/usability/metrics/${sessionId}`);
      if (!response.ok) throw new Error('Failed to fetch usability metrics');
      return response.json();
    } catch (error) {
      console.error('Failed to get usability metrics:', error);
      throw error;
    }
  },

  async getIdentifiedIssues(sessionId?: string): Promise<UsabilityIssue[]> {
    try {
      const url = sessionId 
        ? `${getApiUrl()}/usability/issues/${sessionId}`
        : `${getApiUrl()}/usability/issues`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch identified issues');
      return response.json();
    } catch (error) {
      console.error('Failed to get identified issues:', error);
      throw error;
    }
  },

  async getRecommendations(issueId: string): Promise<ImprovementRecommendation[]> {
    try {
      const response = await fetch(`${getApiUrl()}/usability/recommendations/${issueId}`);
      if (!response.ok) throw new Error('Failed to fetch recommendations');
      return response.json();
    } catch (error) {
      console.error('Failed to get recommendations:', error);
      throw error;
    }
  },

  async optOut(): Promise<void> {
    try {
      await fetch(`${getApiUrl()}/usability/opt-out`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      // Clear local consent
      this.sessionManager.setConsent(false);
      localStorage.removeItem('seka-kama-ux-consent');
    } catch (error) {
      console.error('Failed to opt out:', error);
      throw error;
    }
  },

  // -------------------------------------------------------------------------
  // Helper Methods for Common Interactions
  // -------------------------------------------------------------------------

  /**
   * Track map interaction (SekaMap component)
   */
  async trackMapInteraction(
    elementId: string, 
    interactionType: InteractionEvent['interactionType'],
    context: {
      mapAction: string;
      layerType?: string;
      ecologicalContext?: Record<string, any>;
    }
  ): Promise<void> {
    return this.trackInteraction({
      elementId,
      interactionType,
      context: {
        component: 'SekaMap',
        action: context.mapAction,
        ecologicalContext: context.ecologicalContext,
        mapContext: {
          layerType: context.layerType
        }
      }
    });
  },

  /**
   * Track analyst panel interaction
   */
  async trackAnalystInteraction(
    elementId: string,
    interactionType: InteractionEvent['interactionType'],
    context: {
      panelAction: string;
      insightType?: string;
      recommendationId?: string;
      year?: number;
    }
  ): Promise<void> {
    return this.trackInteraction({
      elementId,
      interactionType,
      context: {
        component: 'AnalystPanel',
        action: context.panelAction,
        panelContext: {
          insightType: context.insightType,
          recommendationId: context.recommendationId,
          year: context.year
        }
      }
    });
  },

  /**
   * Track scenario simulation interaction
   */
  async trackScenarioInteraction(
    elementId: string,
    interactionType: InteractionEvent['interactionType'],
    context: {
      scenarioAction: string;
      scenarioType?: string;
      parameters?: Record<string, any>;
    }
  ): Promise<void> {
    return this.trackInteraction({
      elementId,
      interactionType,
      context: {
        component: 'ScenarioSimulation',
        action: context.scenarioAction,
        scenarioContext: {
          scenarioType: context.scenarioType,
          parameters: context.parameters
        }
      }
    });
  },

  /**
   * Track navigation between components
   */
  async trackNavigation(
    fromComponent: string,
    toComponent: string,
    navigationType: 'click' | 'menu' | 'breadcrumb' | 'auto'
  ): Promise<void> {
    return this.trackInteraction({
      elementId: `navigation_${fromComponent}_to_${toComponent}`,
      interactionType: 'click',
      context: {
        component: 'Navigation',
        action: 'navigate',
        navigationContext: {
          from: fromComponent,
          to: toComponent,
          type: navigationType
        }
      }
    });
  },

  /**
   * Track time-based control interaction
   */
  async trackTimeControl(
    elementId: string,
    interactionType: InteractionEvent['interactionType'],
    context: {
      timeAction: string;
      year?: number;
      timeRange?: [number, number];
    }
  ): Promise<void> {
    return this.trackInteraction({
      elementId,
      interactionType,
      context: {
        component: 'TimeControls',
        action: context.timeAction,
        timeContext: {
          year: context.year,
          timeRange: context.timeRange
        }
      }
    });
  }
};

// ---------------------------------------------------------------------------
// React Hook for Usability Tracking
// ---------------------------------------------------------------------------

export function useUsabilityTracking() {
  return {
    // Session Management
    startSession: (userId?: string) => usabilityService.startSession(userId),
    endSession: () => usabilityService.endSession(),
    
    // Interaction Tracking
    trackInteraction: (event: Partial<InteractionEvent>) => 
      usabilityService.trackInteraction(event),
    
    trackMapInteraction: (
      elementId: string, 
      interactionType: InteractionEvent['interactionType'],
      context: {
        mapAction: string;
        layerType?: string;
        ecologicalContext?: Record<string, any>;
      }
    ) => usabilityService.trackMapInteraction(elementId, interactionType, context),
    
    trackAnalystInteraction: (
      elementId: string,
      interactionType: InteractionEvent['interactionType'],
      context: {
        panelAction: string;
        insightType?: string;
        recommendationId?: string;
        year?: number;
      }
    ) => usabilityService.trackAnalystInteraction(elementId, interactionType, context),
    
    trackScenarioInteraction: (
      elementId: string,
      interactionType: InteractionEvent['interactionType'],
      context: {
        scenarioAction: string;
        scenarioType?: string;
        parameters?: Record<string, any>;
      }
    ) => usabilityService.trackScenarioInteraction(elementId, interactionType, context),
    
    trackNavigation: (
      fromComponent: string,
      toComponent: string,
      navigationType: 'click' | 'menu' | 'breadcrumb' | 'auto'
    ) => usabilityService.trackNavigation(fromComponent, toComponent, navigationType),
    
    trackTimeControl: (
      elementId: string,
      interactionType: InteractionEvent['interactionType'],
      context: {
        timeAction: string;
        year?: number;
        timeRange?: [number, number];
      }
    ) => usabilityService.trackTimeControl(elementId, interactionType, context),
    
    // Privacy and Consent
    setPrivacyPreferences: (preferences: Partial<PrivacyPreferences>) => 
      usabilityService.setPrivacyPreferences(preferences),
    
    getPrivacyPreferences: () => usabilityService.getPrivacyPreferences(),
    
    setConsent: (granted: boolean) => usabilityService.setConsent(granted),
    
    hasConsent: () => usabilityService.hasConsent(),
    
    optOut: () => usabilityService.optOut(),
    
    // Data Access
    getUsabilityMetrics: (sessionId: string) => usabilityService.getUsabilityMetrics(sessionId),
    
    getIdentifiedIssues: (sessionId?: string) => usabilityService.getIdentifiedIssues(sessionId),
    
    getRecommendations: (issueId: string) => usabilityService.getRecommendations(issueId)
  };
}

// ---------------------------------------------------------------------------
// Default export
// ---------------------------------------------------------------------------

export default usabilityService;