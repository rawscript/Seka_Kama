'use client';

import { useState } from 'react';
import { MessageSquare, X, Send, Bug, Zap, Sparkles, Accessibility, AlertTriangle } from 'lucide-react';
import { useFeedbackCollection } from '@/services/feedbackService';
import { useUsabilityTracking } from '@/services/usabilityService';

interface FeedbackButtonProps {
  component?: string;
  ecologicalContext?: {
    conservationArea?: string;
    timePeriod?: string;
    speciesFocus?: string[];
    dataLayers?: string[];
    analysisType?: string;
  };
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

export default function FeedbackButton({ 
  component = 'Global',
  ecologicalContext,
  position = 'bottom-right'
}: FeedbackButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'quick' | 'bug' | 'feature' | 'accessibility'>('quick');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Feedback service
  const {
    submitQuickFeedback,
    submitBugReport,
    submitFeatureRequest,
    submitAccessibilityIssue,
    getCategories
  } = useFeedbackCollection();
  
  // Usability tracking
  const { trackAnalystInteraction, hasConsent } = useUsabilityTracking();
  
  // Form state
  const [quickFeedback, setQuickFeedback] = useState({
    type: 'improvement' as 'bug' | 'feature' | 'improvement' | 'general' | 'accessibility' | 'performance',
    title: '',
    description: '',
    severity: 'medium' as 'low' | 'medium' | 'high' | 'critical'
  });
  
  const [bugReport, setBugReport] = useState({
    title: '',
    description: '',
    reproductionSteps: [''],
    expectedBehavior: '',
    actualBehavior: '',
    severity: 'medium' as 'low' | 'medium' | 'high' | 'critical'
  });
  
  const [featureRequest, setFeatureRequest] = useState({
    title: '',
    description: '',
    ecologicalImpact: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'critical'
  });
  
  const [accessibilityIssue, setAccessibilityIssue] = useState({
    title: '',
    description: '',
    wcagGuideline: '',
    severity: 'medium' as 'low' | 'medium' | 'high' | 'critical'
  });

  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4'
  };

  const handleOpen = () => {
    setIsOpen(true);
    
    // Track feedback button click
    if (hasConsent()) {
      trackAnalystInteraction('feedback-button-open', 'click', {
        panelAction: 'open_feedback',
        insightType: 'feedback_interaction'
      });
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setSuccess(false);
    
    // Reset forms
    setQuickFeedback({
      type: 'improvement',
      title: '',
      description: '',
      severity: 'medium'
    });
    setBugReport({
      title: '',
      description: '',
      reproductionSteps: [''],
      expectedBehavior: '',
      actualBehavior: '',
      severity: 'medium'
    });
    setFeatureRequest({
      title: '',
      description: '',
      ecologicalImpact: '',
      priority: 'medium'
    });
    setAccessibilityIssue({
      title: '',
      description: '',
      wcagGuideline: '',
      severity: 'medium'
    });
  };

  const handleSubmitQuickFeedback = async () => {
    if (!quickFeedback.title.trim() || !quickFeedback.description.trim()) {
      alert('Please provide both a title and description');
      return;
    }

    setSubmitting(true);
    
    try {
      const feedbackId = await submitQuickFeedback(
        quickFeedback.type,
        component,
        quickFeedback.title,
        quickFeedback.description,
        quickFeedback.severity,
        ecologicalContext
      );
      
      console.log(`Feedback submitted: ${feedbackId}`);
      setSuccess(true);
      
      // Track feedback submission
      if (hasConsent()) {
        trackAnalystInteraction('feedback-submitted', 'click', {
          panelAction: 'submit_feedback',
          insightType: quickFeedback.type,
          recommendationId: feedbackId
        });
      }
      
      // Reset form
      setQuickFeedback({
        type: 'improvement',
        title: '',
        description: '',
        severity: 'medium'
      });
      
      // Auto-close after 2 seconds
      setTimeout(() => {
        setSuccess(false);
        setIsOpen(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      alert('Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitBugReport = async () => {
    if (!bugReport.title.trim() || !bugReport.description.trim()) {
      alert('Please provide both a title and description');
      return;
    }

    setSubmitting(true);
    
    try {
      const feedbackId = await submitBugReport(
        component,
        bugReport.title,
        bugReport.description,
        bugReport.reproductionSteps.filter(step => step.trim()),
        bugReport.expectedBehavior,
        bugReport.actualBehavior,
        bugReport.severity,
        ecologicalContext
      );
      
      console.log(`Bug report submitted: ${feedbackId}`);
      setSuccess(true);
      
      // Track bug report submission
      if (hasConsent()) {
        trackAnalystInteraction('bug-report-submitted', 'click', {
          panelAction: 'submit_bug_report',
          insightType: 'bug_report',
          recommendationId: feedbackId
        });
      }
      
      // Reset form
      setBugReport({
        title: '',
        description: '',
        reproductionSteps: [''],
        expectedBehavior: '',
        actualBehavior: '',
        severity: 'medium'
      });
      
      // Auto-close after 2 seconds
      setTimeout(() => {
        setSuccess(false);
        setIsOpen(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to submit bug report:', error);
      alert('Failed to submit bug report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitFeatureRequest = async () => {
    if (!featureRequest.title.trim() || !featureRequest.description.trim()) {
      alert('Please provide both a title and description');
      return;
    }

    setSubmitting(true);
    
    try {
      const feedbackId = await submitFeatureRequest(
        component,
        featureRequest.title,
        featureRequest.description,
        featureRequest.ecologicalImpact || undefined,
        featureRequest.priority,
        ecologicalContext
      );
      
      console.log(`Feature request submitted: ${feedbackId}`);
      setSuccess(true);
      
      // Track feature request submission
      if (hasConsent()) {
        trackAnalystInteraction('feature-request-submitted', 'click', {
          panelAction: 'submit_feature_request',
          insightType: 'feature_request',
          recommendationId: feedbackId
        });
      }
      
      // Reset form
      setFeatureRequest({
        title: '',
        description: '',
        ecologicalImpact: '',
        priority: 'medium'
      });
      
      // Auto-close after 2 seconds
      setTimeout(() => {
        setSuccess(false);
        setIsOpen(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to submit feature request:', error);
      alert('Failed to submit feature request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitAccessibilityIssue = async () => {
    if (!accessibilityIssue.title.trim() || !accessibilityIssue.description.trim()) {
      alert('Please provide both a title and description');
      return;
    }

    setSubmitting(true);
    
    try {
      const feedbackId = await submitAccessibilityIssue(
        component,
        accessibilityIssue.title,
        accessibilityIssue.description,
        accessibilityIssue.wcagGuideline || undefined,
        accessibilityIssue.severity,
        ecologicalContext
      );
      
      console.log(`Accessibility issue submitted: ${feedbackId}`);
      setSuccess(true);
      
      // Track accessibility issue submission
      if (hasConsent()) {
        trackAnalystInteraction('accessibility-issue-submitted', 'click', {
          panelAction: 'submit_accessibility_issue',
          insightType: 'accessibility_issue',
          recommendationId: feedbackId
        });
      }
      
      // Reset form
      setAccessibilityIssue({
        title: '',
        description: '',
        wcagGuideline: '',
        severity: 'medium'
      });
      
      // Auto-close after 2 seconds
      setTimeout(() => {
        setSuccess(false);
        setIsOpen(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to submit accessibility issue:', error);
      alert('Failed to submit accessibility issue. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const addReproductionStep = () => {
    setBugReport(prev => ({
      ...prev,
      reproductionSteps: [...prev.reproductionSteps, '']
    }));
  };

  const updateReproductionStep = (index: number, value: string) => {
    setBugReport(prev => ({
      ...prev,
      reproductionSteps: prev.reproductionSteps.map((step, i) => 
        i === index ? value : step
      )
    }));
  };

  const removeReproductionStep = (index: number) => {
    setBugReport(prev => ({
      ...prev,
      reproductionSteps: prev.reproductionSteps.filter((_, i) => i !== index)
    }));
  };

  const feedbackTypes = [
    { id: 'improvement', label: 'Improvement', icon: <Sparkles className="w-4 h-4" />, color: 'bg-blue-100 text-blue-700' },
    { id: 'bug', label: 'Bug', icon: <Bug className="w-4 h-4" />, color: 'bg-rose-100 text-rose-700' },
    { id: 'feature', label: 'Feature', icon: <Sparkles className="w-4 h-4" />, color: 'bg-purple-100 text-purple-700' },
    { id: 'accessibility', label: 'Accessibility', icon: <Accessibility className="w-4 h-4" />, color: 'bg-emerald-100 text-emerald-700' },
    { id: 'performance', label: 'Performance', icon: <Zap className="w-4 h-4" />, color: 'bg-amber-100 text-amber-700' },
    { id: 'general', label: 'General', icon: <MessageSquare className="w-4 h-4" />, color: 'bg-slate-100 text-slate-700' }
  ];

  if (!isOpen) {
    return (
      <button
        onClick={handleOpen}
        className={`fixed ${positionClasses[position]} z-40 flex items-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-lg transition-all hover:shadow-xl hover:scale-105`}
        title="Provide feedback"
      >
        <MessageSquare className="w-5 h-5" />
        <span className="text-sm font-medium">Feedback</span>
      </button>
    );
  }

  return (
    <div className={`fixed ${positionClasses[position]} z-50 w-96 max-h-[80vh] overflow-hidden`}>
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-emerald-50 to-blue-50 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <MessageSquare className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Seka Kama Feedback</h3>
              <p className="text-sm text-slate-600">Help us improve the platform</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            title="Close"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {success ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
              <Send className="w-8 h-8 text-emerald-600" />
            </div>
            <h4 className="text-xl font-bold text-slate-800 mb-2">Thank You!</h4>
            <p className="text-slate-600 mb-6">
              Your feedback has been submitted successfully. Our team will review it shortly.
            </p>
            <button
              onClick={handleClose}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex border-b border-slate-200">
              <button
                onClick={() => setActiveTab('quick')}
                className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${activeTab === 'quick' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-500' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                Quick Feedback
              </button>
              <button
                onClick={() => setActiveTab('bug')}
                className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${activeTab === 'bug' ? 'bg-rose-50 text-rose-600 border-b-2 border-rose-500' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <Bug className="w-4 h-4 inline mr-1" />
                Bug Report
              </button>
              <button
                onClick={() => setActiveTab('feature')}
                className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${activeTab === 'feature' ? 'bg-purple-50 text-purple-600 border-b-2 border-purple-500' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <Sparkles className="w-4 h-4 inline mr-1" />
                Feature Request
              </button>
              <button
                onClick={() => setActiveTab('accessibility')}
                className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${activeTab === 'accessibility' ? 'bg-emerald-50 text-emerald-600 border-b-2 border-emerald-500' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <Accessibility className="w-4 h-4 inline mr-1" />
                Accessibility
              </button>
            </div>

            {/* Content */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {/* Quick Feedback Form */}
              {activeTab === 'quick' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Feedback Type
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {feedbackTypes.map(type => (
                        <button
                          key={type.id}
                          onClick={() => setQuickFeedback(prev => ({ ...prev, type: type.id as any }))}
                          className={`p-3 rounded-lg border transition-all flex flex-col items-center gap-2 ${quickFeedback.type === type.id ? `${type.color} border-current` : 'border-slate-200 hover:border-slate-300'}`}
                        >
                          <div className="flex items-center justify-center">{type.icon}</div>
                          <div className="text-xs font-medium">{type.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Severity
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {['low', 'medium', 'high', 'critical'].map(severity => (
                        <button
                          key={severity}
                          onClick={() => setQuickFeedback(prev => ({ ...prev, severity: severity as any }))}
                          className={`p-2 rounded-lg border transition-all ${quickFeedback.severity === severity ? 'bg-slate-100 border-slate-300 font-medium' : 'border-slate-200 hover:border-slate-300'}`}
                        >
                          <div className="text-xs capitalize">{severity}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Title *
                    </label>
                    <input
                      type="text"
                      value={quickFeedback.title}
                      onChange={(e) => setQuickFeedback(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Brief summary of your feedback"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Description *
                    </label>
                    <textarea
                      value={quickFeedback.description}
                      onChange={(e) => setQuickFeedback(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Please provide details about your feedback..."
                      rows={4}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <button
                    onClick={handleSubmitQuickFeedback}
                    disabled={submitting || !quickFeedback.title.trim() || !quickFeedback.description.trim()}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Submit Feedback
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Bug Report Form */}
              {activeTab === 'bug' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-3 bg-rose-50 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-rose-600" />
                    <p className="text-sm text-rose-700">
                      Please provide detailed steps to reproduce the bug for faster resolution.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Title *
                    </label>
                    <input
                      type="text"
                      value={bugReport.title}
                      onChange={(e) => setBugReport(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Brief description of the bug"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Description *
                    </label>
                    <textarea
                      value={bugReport.description}
                      onChange={(e) => setBugReport(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe what happened and when..."
                      rows={3}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-slate-700">
                        Reproduction Steps
                      </label>
                      <button
                        onClick={addReproductionStep}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        + Add Step
                      </button>
                    </div>
                    {bugReport.reproductionSteps.map((step, index) => (
                      <div key={index} className="flex gap-2 mb-2">
                        <span className="mt-2 text-sm text-slate-500">{index + 1}.</span>
                        <input
                          type="text"
                          value={step}
                          onChange={(e) => updateReproductionStep(index, e.target.value)}
                          placeholder={`Step ${index + 1}`}
                          className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                        />
                        {bugReport.reproductionSteps.length > 1 && (
                          <button
                            onClick={() => removeReproductionStep(index)}
                            className="mt-2 px-2 text-rose-600 hover:text-rose-700"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Expected Behavior
                    </label>
                    <textarea
                      value={bugReport.expectedBehavior}
                      onChange={(e) => setBugReport(prev => ({ ...prev, expectedBehavior: e.target.value }))}
                      placeholder="What should have happened?"
                      rows={2}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Actual Behavior
                    </label>
                    <textarea
                      value={bugReport.actualBehavior}
                      onChange={(e) => setBugReport(prev => ({ ...prev, actualBehavior: e.target.value }))}
                      placeholder="What actually happened?"
                      rows={2}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Severity
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {['low', 'medium', 'high', 'critical'].map(severity => (
                        <button
                          key={severity}
                          onClick={() => setBugReport(prev => ({ ...prev, severity: severity as any }))}
                          className={`p-2 rounded-lg border transition-all ${bugReport.severity === severity ? 'bg-rose-100 border-rose-300 font-medium' : 'border-slate-200 hover:border-slate-300'}`}
                        >
                          <div className="text-xs capitalize">{severity}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleSubmitBugReport}
                    disabled={submitting || !bugReport.title.trim() || !bugReport.description.trim()}
                    className="w-full py-3 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Bug className="w-4 h-4" />
                        Submit Bug Report
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Feature Request Form */}
              {activeTab === 'feature' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    <p className="text-sm text-purple-700">
                      Share your ideas for new features that would help your conservation work.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Title *
                    </label>
                    <input
                      type="text"
                      value={featureRequest.title}
                      onChange={(e) => setFeatureRequest(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Name of the feature"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Description *
                    </label>
                    <textarea
                      value={featureRequest.description}
                      onChange={(e) => setFeatureRequest(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe the feature and how it would be used..."
                      rows={4}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Conservation Impact (Optional)
                    </label>
                    <textarea
                      value={featureRequest.ecologicalImpact}
                      onChange={(e) => setFeatureRequest(prev => ({ ...prev, ecologicalImpact: e.target.value }))}
                      placeholder="How would this feature help conservation efforts?"
                      rows={2}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Priority
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {['low', 'medium', 'high', 'critical'].map(priority => (
                        <button
                          key={priority}
                          onClick={() => setFeatureRequest(prev => ({ ...prev, priority: priority as any }))}
                          className={`p-2 rounded-lg border transition-all ${featureRequest.priority === priority ? 'bg-purple-100 border-purple-300 font-medium' : 'border-slate-200 hover:border-slate-300'}`}
                        >
                          <div className="text-xs capitalize">{priority}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleSubmitFeatureRequest}
                    disabled={submitting || !featureRequest.title.trim() || !featureRequest.description.trim()}
                    className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Submit Feature Request
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Accessibility Issue Form */}
              {activeTab === 'accessibility' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-lg">
                    <Accessibility className="w-5 h-5 text-emerald-600" />
                    <p className="text-sm text-emerald-700">
                      Help us make Seka Kama accessible to everyone, including users with disabilities.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Title *
                    </label>
                    <input
                      type="text"
                      value={accessibilityIssue.title}
                      onChange={(e) => setAccessibilityIssue(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Brief description of the accessibility issue"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Description *
                    </label>
                    <textarea
                      value={accessibilityIssue.description}
                      onChange={(e) => setAccessibilityIssue(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe the accessibility barrier..."
                      rows={4}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      WCAG Guideline (Optional)
                    </label>
                    <input
                      type="text"
                      value={accessibilityIssue.wcagGuideline}
                      onChange={(e) => setAccessibilityIssue(prev => ({ ...prev, wcagGuideline: e.target.value }))}
                      placeholder="e.g., WCAG 2.1 AA, 1.4.3 Contrast"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Severity
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {['low', 'medium', 'high', 'critical'].map(severity => (
                        <button
                          key={severity}
                          onClick={() => setAccessibilityIssue(prev => ({ ...prev, severity: severity as any }))}
                          className={`p-2 rounded-lg border transition-all ${accessibilityIssue.severity === severity ? 'bg-emerald-100 border-emerald-300 font-medium' : 'border-slate-200 hover:border-slate-300'}`}
                        >
                          <div className="text-xs capitalize">{severity}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleSubmitAccessibilityIssue}
                    disabled={submitting || !accessibilityIssue.title.trim() || !accessibilityIssue.description.trim()}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Accessibility className="w-4 h-4" />
                        Submit Accessibility Issue
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
              <p className="text-xs text-slate-500 text-center">
                Your feedback helps us improve Seka Kama for conservation professionals worldwide.
                {component !== 'Global' && (
                  <span className="block mt-1">
                    Reporting for: <span className="font-medium">{component}</span>
                  </span>
                )}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}