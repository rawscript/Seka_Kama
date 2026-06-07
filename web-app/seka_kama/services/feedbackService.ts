// Feedback Collection Service for UI/UX Improvements
// Implementation of Task 1.4: Develop Basic Feedback Collection System

// ---------------------------------------------------------------------------
// Types and Interfaces
// ---------------------------------------------------------------------------

export interface UserFeedback {
  id: string;
  userId?: string;
  timestamp: number;
  feedbackType: 'bug' | 'feature' | 'improvement' | 'general' | 'accessibility' | 'performance';
  component: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'new' | 'reviewed' | 'in_progress' | 'resolved' | 'wont_fix' | 'duplicate';
  ecologicalContext?: {
    conservationArea?: string;
    timePeriod?: string;
    speciesFocus?: string[];
    dataLayers?: string[];
    analysisType?: string;
    scenarioId?: string;
  };
  reproductionSteps?: string[];
  expectedBehavior?: string;
  actualBehavior?: string;
  screenshots?: string[]; // Base64 or URLs
  deviceInfo?: {
    type: 'desktop' | 'tablet' | 'phone';
    screenSize: { width: number; height: number };
    browser: string;
    os: string;
  };
  tags?: string[];
  priority?: 'low' | 'medium' | 'high' | 'critical';
  conservationImpact?: {
    score: number; // 0-100
    description: string;
    affectedWorkflows: string[];
  };
  metadata?: {
    sessionId?: string;
    pageUrl?: string;
    userRole?: string;
    expertiseLevel?: 'novice' | 'intermediate' | 'expert';
    moderationNotes?: string;
  };
}

export interface FeedbackCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  componentFilter?: string[];
}

export interface FeedbackModeration {
  feedbackId: string;
  moderatorId?: string;
  moderationTimestamp: number;
  status: 'approved' | 'rejected' | 'needs_clarification';
  reason?: string;
  notes?: string;
  priorityOverride?: 'low' | 'medium' | 'high' | 'critical';
  assignedTo?: string;
}

export interface FeedbackStats {
  total: number;
  byType: Record<string, number>;
  byComponent: Record<string, number>;
  bySeverity: Record<string, number>;
  byStatus: Record<string, number>;
  openIssues: number;
  avgResponseTime: number; // hours
  resolutionRate: number; // percentage
}

// ---------------------------------------------------------------------------
// Feedback Categories Configuration
// ---------------------------------------------------------------------------

const FEEDBACK_CATEGORIES: FeedbackCategory[] = [
  {
    id: 'bug',
    name: 'Bug Report',
    description: 'Report errors, crashes, or incorrect behavior',
    icon: '🐛',
    color: '#ef4444',
    componentFilter: ['*']
  },
  {
    id: 'feature',
    name: 'Feature Request',
    description: 'Suggest new features or enhancements',
    icon: '✨',
    color: '#8b5cf6',
    componentFilter: ['*']
  },
  {
    id: 'improvement',
    name: 'UI/UX Improvement',
    description: 'Suggest improvements to existing features',
    icon: '🎨',
    color: '#3b82f6',
    componentFilter: ['*']
  },
  {
    id: 'accessibility',
    name: 'Accessibility Issue',
    description: 'Report accessibility barriers',
    icon: '♿',
    color: '#10b981',
    componentFilter: ['*']
  },
  {
    id: 'performance',
    name: 'Performance Issue',
    description: 'Report slow loading or lag',
    icon: '⚡',
    color: '#f59e0b',
    componentFilter: ['*']
  },
  {
    id: 'data',
    name: 'Data Issue',
    description: 'Report incorrect or missing data',
    icon: '📊',
    color: '#6366f1',
    componentFilter: ['SekaMap', 'AnalystPanel', 'ScenarioSimulation']
  },
  {
    id: 'workflow',
    name: 'Workflow Issue',
    description: 'Report problems with analysis workflows',
    icon: '🔄',
    color: '#14b8a6',
    componentFilter: ['AnalystPanel', 'ScenarioSimulation']
  }
];

// ---------------------------------------------------------------------------
// Feedback Collection Service
// ---------------------------------------------------------------------------

class FeedbackService {
  private feedbackBuffer: UserFeedback[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private enabled = true;
  private privacyConsent = true;
  private sessionId: string;

  constructor() {
    this.sessionId = this.generateSessionId();
    
    // Start periodic flush
    if (typeof window !== 'undefined') {
      this.flushInterval = setInterval(() => this.flushFeedback(), 60000); // Flush every minute
    }
  }

  /**
   * Submit new feedback
   */
  async submitFeedback(feedback: Omit<UserFeedback, 'id' | 'timestamp' | 'status'>): Promise<string> {
    if (!this.enabled || !this.privacyConsent) {
      console.warn('Feedback collection is disabled or privacy consent not given');
      return '';
    }

    const feedbackId = this.generateFeedbackId();
    const fullFeedback: UserFeedback = {
      ...feedback,
      id: feedbackId,
      timestamp: Date.now(),
      status: 'new',
      metadata: {
        ...feedback.metadata,
        sessionId: this.sessionId,
        pageUrl: typeof window !== 'undefined' ? window.location.href : undefined
      }
    };

    this.feedbackBuffer.push(fullFeedback);
    
    // If buffer reaches threshold, flush immediately
    if (this.feedbackBuffer.length >= 20) {
      await this.flushFeedback();
    }

    console.log(`Feedback submitted: ${feedbackId} (${feedback.feedbackType})`);
    return feedbackId;
  }

  /**
   * Submit quick feedback (simplified interface)
   */
  async submitQuickFeedback(
    feedbackType: UserFeedback['feedbackType'],
    component: string,
    title: string,
    description: string,
    severity: UserFeedback['severity'] = 'medium',
    ecologicalContext?: UserFeedback['ecologicalContext']
  ): Promise<string> {
    return this.submitFeedback({
      feedbackType,
      component,
      title,
      description,
      severity,
      ecologicalContext,
      deviceInfo: this.getDeviceInfo()
    });
  }

  /**
   * Submit bug report with reproduction steps
   */
  async submitBugReport(
    component: string,
    title: string,
    description: string,
    reproductionSteps: string[],
    expectedBehavior: string,
    actualBehavior: string,
    severity: UserFeedback['severity'] = 'medium',
    ecologicalContext?: UserFeedback['ecologicalContext']
  ): Promise<string> {
    return this.submitFeedback({
      feedbackType: 'bug',
      component,
      title,
      description,
      severity,
      ecologicalContext,
      reproductionSteps,
      expectedBehavior,
      actualBehavior,
      deviceInfo: this.getDeviceInfo()
    });
  }

  /**
   * Submit feature request
   */
  async submitFeatureRequest(
    component: string,
    title: string,
    description: string,
    ecologicalImpact?: string,
    priority: UserFeedback['priority'] = 'medium',
    ecologicalContext?: UserFeedback['ecologicalContext']
  ): Promise<string> {
    const conservationImpact = ecologicalImpact ? {
      score: 50, // Default medium impact
      description: ecologicalImpact,
      affectedWorkflows: [component]
    } : undefined;

    return this.submitFeedback({
      feedbackType: 'feature',
      component,
      title,
      description,
      severity: 'medium',
      ecologicalContext,
      priority,
      conservationImpact,
      deviceInfo: this.getDeviceInfo()
    });
  }

  /**
   * Submit accessibility issue
   */
  async submitAccessibilityIssue(
    component: string,
    title: string,
    description: string,
    wcagGuideline?: string,
    severity: UserFeedback['severity'] = 'medium',
    ecologicalContext?: UserFeedback['ecologicalContext']
  ): Promise<string> {
    const tags = wcagGuideline ? ['accessibility', wcagGuideline] : ['accessibility'];

    return this.submitFeedback({
      feedbackType: 'accessibility',
      component,
      title,
      description,
      severity,
      ecologicalContext,
      tags,
      deviceInfo: this.getDeviceInfo()
    });
  }

  /**
   * Get feedback categories
   */
  getCategories(component?: string): FeedbackCategory[] {
    if (!component) {
      return FEEDBACK_CATEGORIES;
    }

    return FEEDBACK_CATEGORIES.filter(category => 
      !category.componentFilter || 
      category.componentFilter.includes('*') || 
      category.componentFilter.includes(component)
    );
  }

  /**
   * Get feedback by ID
   */
  getFeedback(id: string): UserFeedback | undefined {
    return this.feedbackBuffer.find(feedback => feedback.id === id);
  }

  /**
   * Get all pending feedback
   */
  getPendingFeedback(): UserFeedback[] {
    return [...this.feedbackBuffer];
  }

  /**
   * Get feedback statistics
   */
  getFeedbackStats(): FeedbackStats {
    const stats: FeedbackStats = {
      total: this.feedbackBuffer.length,
      byType: {},
      byComponent: {},
      bySeverity: {},
      byStatus: {},
      openIssues: this.feedbackBuffer.filter(f => f.status === 'new' || f.status === 'in_progress').length,
      avgResponseTime: 0,
      resolutionRate: 0
    };

    this.feedbackBuffer.forEach(feedback => {
      stats.byType[feedback.feedbackType] = (stats.byType[feedback.feedbackType] || 0) + 1;
      stats.byComponent[feedback.component] = (stats.byComponent[feedback.component] || 0) + 1;
      stats.bySeverity[feedback.severity] = (stats.bySeverity[feedback.severity] || 0) + 1;
      stats.byStatus[feedback.status] = (stats.byStatus[feedback.status] || 0) + 1;
    });

    // Calculate resolution rate
    const resolved = this.feedbackBuffer.filter(f => f.status === 'resolved').length;
    stats.resolutionRate = this.feedbackBuffer.length > 0 ? (resolved / this.feedbackBuffer.length) * 100 : 0;

    return stats;
  }

  /**
   * Update feedback status
   */
  updateFeedbackStatus(feedbackId: string, status: UserFeedback['status'], notes?: string): boolean {
    const feedback = this.feedbackBuffer.find(f => f.id === feedbackId);
    if (!feedback) return false;

    feedback.status = status;
    if (notes) {
      feedback.metadata = {
        ...feedback.metadata,
        moderationNotes: notes
      };
    }

    return true;
  }

  /**
   * Add conservation impact assessment
   */
  addConservationImpact(
    feedbackId: string,
    score: number,
    description: string,
    affectedWorkflows: string[]
  ): boolean {
    const feedback = this.feedbackBuffer.find(f => f.id === feedbackId);
    if (!feedback) return false;

    feedback.conservationImpact = {
      score,
      description,
      affectedWorkflows
    };

    return true;
  }

  /**
   * Enable/disable feedback collection
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
   * Clear all feedback (for testing/reset)
   */
  clearFeedback(): void {
    this.feedbackBuffer = [];
  }

  // -------------------------------------------------------------------------
  // Private Methods
  // -------------------------------------------------------------------------

  /**
   * Generate unique feedback ID
   */
  private generateFeedbackId(): string {
    return `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    if (typeof window === 'undefined') {
      return 'server_session';
    }
    
    let sessionId = localStorage.getItem('seka-kama-feedback-session-id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('seka-kama-feedback-session-id', sessionId);
    }
    
    return sessionId;
  }

  /**
   * Get device information
   */
  private getDeviceInfo(): UserFeedback['deviceInfo'] {
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
   * Flush feedback to backend
   */
  private async flushFeedback(): Promise<void> {
    if (this.feedbackBuffer.length === 0) return;

    const batch = [...this.feedbackBuffer];
    this.feedbackBuffer = [];

    try {
      // In a real implementation, this would send to a backend API
      console.log(`Flushing ${batch.length} feedback items`);
      
      // Store locally for development
      if (typeof localStorage !== 'undefined') {
        const existing = JSON.parse(localStorage.getItem('seka-kama-feedback') || '[]');
        localStorage.setItem(
          'seka-kama-feedback',
          JSON.stringify([...existing, ...batch].slice(-100)) // Keep last 100 entries
        );
      }
    } catch (error) {
      console.warn('Failed to flush feedback:', error);
      // Re-add to buffer for retry
      this.feedbackBuffer.unshift(...batch.filter(feedback => 
        !this.feedbackBuffer.some(existing => existing.id === feedback.id)
      ));
    }
  }
}

// ---------------------------------------------------------------------------
// Feedback Service API
// ---------------------------------------------------------------------------

export const feedbackService = {
  service: new FeedbackService(),

  /**
   * Submit new feedback
   */
  submitFeedback: (feedback: Omit<UserFeedback, 'id' | 'timestamp' | 'status'>) => 
    feedbackService.service.submitFeedback(feedback),

  /**
   * Submit quick feedback
   */
  submitQuickFeedback: (
    feedbackType: UserFeedback['feedbackType'],
    component: string,
    title: string,
    description: string,
    severity?: UserFeedback['severity'],
    ecologicalContext?: UserFeedback['ecologicalContext']
  ) => feedbackService.service.submitQuickFeedback(
    feedbackType, component, title, description, severity, ecologicalContext
  ),

  /**
   * Submit bug report
   */
  submitBugReport: (
    component: string,
    title: string,
    description: string,
    reproductionSteps: string[],
    expectedBehavior: string,
    actualBehavior: string,
    severity?: UserFeedback['severity'],
    ecologicalContext?: UserFeedback['ecologicalContext']
  ) => feedbackService.service.submitBugReport(
    component, title, description, reproductionSteps, expectedBehavior, actualBehavior, severity, ecologicalContext
  ),

  /**
   * Submit feature request
   */
  submitFeatureRequest: (
    component: string,
    title: string,
    description: string,
    ecologicalImpact?: string,
    priority?: UserFeedback['priority'],
    ecologicalContext?: UserFeedback['ecologicalContext']
  ) => feedbackService.service.submitFeatureRequest(
    component, title, description, ecologicalImpact, priority, ecologicalContext
  ),

  /**
   * Submit accessibility issue
   */
  submitAccessibilityIssue: (
    component: string,
    title: string,
    description: string,
    wcagGuideline?: string,
    severity?: UserFeedback['severity'],
    ecologicalContext?: UserFeedback['ecologicalContext']
  ) => feedbackService.service.submitAccessibilityIssue(
    component, title, description, wcagGuideline, severity, ecologicalContext
  ),

  /**
   * Get feedback categories
   */
  getCategories: (component?: string) => 
    feedbackService.service.getCategories(component),

  /**
   * Get feedback by ID
   */
  getFeedback: (id: string) => 
    feedbackService.service.getFeedback(id),

  /**
   * Get all pending feedback
   */
  getPendingFeedback: () => 
    feedbackService.service.getPendingFeedback(),

  /**
   * Get feedback statistics
   */
  getFeedbackStats: () => 
    feedbackService.service.getFeedbackStats(),

  /**
   * Update feedback status
   */
  updateFeedbackStatus: (feedbackId: string, status: UserFeedback['status'], notes?: string) => 
    feedbackService.service.updateFeedbackStatus(feedbackId, status, notes),

  /**
   * Add conservation impact assessment
   */
  addConservationImpact: (feedbackId: string, score: number, description: string, affectedWorkflows: string[]) => 
    feedbackService.service.addConservationImpact(feedbackId, score, description, affectedWorkflows),

  /**
   * Enable/disable feedback collection
   */
  setEnabled: (enabled: boolean) => 
    feedbackService.service.setEnabled(enabled),

  /**
   * Set privacy consent
   */
  setPrivacyConsent: (consent: boolean) => 
    feedbackService.service.setPrivacyConsent(consent),

  /**
   * Clear all feedback
   */
  clearFeedback: () => 
    feedbackService.service.clearFeedback()
};

// ---------------------------------------------------------------------------
// React Hook for Feedback Collection
// ---------------------------------------------------------------------------

export function useFeedbackCollection() {
  return {
    // Submission methods
    submitFeedback: (feedback: Omit<UserFeedback, 'id' | 'timestamp' | 'status'>) => 
      feedbackService.submitFeedback(feedback),
    
    submitQuickFeedback: (
      feedbackType: UserFeedback['feedbackType'],
      component: string,
      title: string,
      description: string,
      severity?: UserFeedback['severity'],
      ecologicalContext?: UserFeedback['ecologicalContext']
    ) => feedbackService.submitQuickFeedback(
      feedbackType, component, title, description, severity, ecologicalContext
    ),
    
    submitBugReport: (
      component: string,
      title: string,
      description: string,
      reproductionSteps: string[],
      expectedBehavior: string,
      actualBehavior: string,
      severity?: UserFeedback['severity'],
      ecologicalContext?: UserFeedback['ecologicalContext']
    ) => feedbackService.submitBugReport(
      component, title, description, reproductionSteps, expectedBehavior, actualBehavior, severity, ecologicalContext
    ),
    
    submitFeatureRequest: (
      component: string,
      title: string,
      description: string,
      ecologicalImpact?: string,
      priority?: UserFeedback['priority'],
      ecologicalContext?: UserFeedback['ecologicalContext']
    ) => feedbackService.submitFeatureRequest(
      component, title, description, ecologicalImpact, priority, ecologicalContext
    ),
    
    submitAccessibilityIssue: (
      component: string,
      title: string,
      description: string,
      wcagGuideline?: string,
      severity?: UserFeedback['severity'],
      ecologicalContext?: UserFeedback['ecologicalContext']
    ) => feedbackService.submitAccessibilityIssue(
      component, title, description, wcagGuideline, severity, ecologicalContext
    ),
    
    // Data access methods
    getCategories: (component?: string) => 
      feedbackService.getCategories(component),
    
    getFeedback: (id: string) => 
      feedbackService.getFeedback(id),
    
    getPendingFeedback: () => 
      feedbackService.getPendingFeedback(),
    
    getFeedbackStats: () => 
      feedbackService.getFeedbackStats(),
    
    // Management methods
    updateFeedbackStatus: (feedbackId: string, status: UserFeedback['status'], notes?: string) => 
      feedbackService.updateFeedbackStatus(feedbackId, status, notes),
    
    addConservationImpact: (feedbackId: string, score: number, description: string, affectedWorkflows: string[]) => 
      feedbackService.addConservationImpact(feedbackId, score, description, affectedWorkflows),
    
    // Configuration methods
    setEnabled: (enabled: boolean) => 
      feedbackService.setEnabled(enabled),
    
    setPrivacyConsent: (consent: boolean) => 
      feedbackService.setPrivacyConsent(consent),
    
    clearFeedback: () => 
      feedbackService.clearFeedback()
  };
}

// ---------------------------------------------------------------------------
// Default export
// ---------------------------------------------------------------------------

export default feedbackService;