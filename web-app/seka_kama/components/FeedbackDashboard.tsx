'use client';

import { useState, useEffect } from 'react';
import { 
  MessageSquare, Filter, CheckCircle, XCircle, Clock, AlertTriangle, 
  Zap, Sparkles, Accessibility, Bug, TrendingUp, BarChart3, RefreshCw,
  ChevronDown, ChevronUp, ExternalLink, Mail, Calendar
} from 'lucide-react';
import { useFeedbackCollection } from '@/services/feedbackService';
import { UserFeedback, FeedbackStats } from '@/services/feedbackService';

interface FeedbackDashboardProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function FeedbackDashboard({ isOpen = true, onClose }: FeedbackDashboardProps) {
  const [feedbackList, setFeedbackList] = useState<UserFeedback[]>([]);
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFeedback, setSelectedFeedback] = useState<UserFeedback | null>(null);
  const [filters, setFilters] = useState({
    status: 'all' as 'all' | 'new' | 'reviewed' | 'in_progress' | 'resolved',
    type: 'all' as 'all' | 'bug' | 'feature' | 'improvement' | 'accessibility' | 'performance',
    component: 'all' as 'all' | 'SekaMap' | 'AnalystPanel' | 'ScenarioSimulation' | 'Global',
    severity: 'all' as 'all' | 'low' | 'medium' | 'high' | 'critical'
  });
  const [sortBy, setSortBy] = useState<'timestamp' | 'severity' | 'component'>('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const {
    getPendingFeedback,
    getFeedbackStats,
    updateFeedbackStatus,
    addConservationImpact
  } = useFeedbackCollection();

  const loadFeedback = () => {
    setLoading(true);
    try {
      const feedback = getPendingFeedback();
      const stats = getFeedbackStats();
      
      setFeedbackList(feedback);
      setStats(stats);
    } catch (error) {
      console.error('Failed to load feedback:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeedback();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadFeedback, 30000);
    return () => clearInterval(interval);
  }, []);

  const filteredFeedback = feedbackList.filter(feedback => {
    if (filters.status !== 'all' && feedback.status !== filters.status) return false;
    if (filters.type !== 'all' && feedback.feedbackType !== filters.type) return false;
    if (filters.component !== 'all' && feedback.component !== filters.component) return false;
    if (filters.severity !== 'all' && feedback.severity !== filters.severity) return false;
    return true;
  }).sort((a, b) => {
    const multiplier = sortOrder === 'desc' ? -1 : 1;
    
    switch (sortBy) {
      case 'timestamp':
        return (b.timestamp - a.timestamp) * multiplier;
      case 'severity':
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return (severityOrder[b.severity] - severityOrder[a.severity]) * multiplier;
      case 'component':
        return a.component.localeCompare(b.component) * multiplier;
      default:
        return 0;
    }
  });

  const handleStatusUpdate = (feedbackId: string, status: UserFeedback['status']) => {
    const success = updateFeedbackStatus(feedbackId, status);
    if (success) {
      loadFeedback();
      if (selectedFeedback?.id === feedbackId) {
        setSelectedFeedback(prev => prev ? { ...prev, status } : null);
      }
    }
  };

  const handleAddConservationImpact = (feedbackId: string) => {
    const score = 75; // Example score
    const description = "This issue affects habitat analysis workflows";
    const affectedWorkflows = ["Habitat Suitability Analysis", "Corridor Planning"];
    
    const success = addConservationImpact(feedbackId, score, description, affectedWorkflows);
    if (success) {
      loadFeedback();
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffHours < 168) return `${Math.floor(diffHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  const getStatusIcon = (status: UserFeedback['status']) => {
    switch (status) {
      case 'new': return <Clock className="w-4 h-4 text-blue-500" />;
      case 'reviewed': return <MessageSquare className="w-4 h-4 text-purple-500" />;
      case 'in_progress': return <Zap className="w-4 h-4 text-amber-500" />;
      case 'resolved': return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'wont_fix': return <XCircle className="w-4 h-4 text-rose-500" />;
      case 'duplicate': return <Filter className="w-4 h-4 text-slate-500" />;
      default: return <Clock className="w-4 h-4 text-slate-500" />;
    }
  };

  const getTypeIcon = (type: UserFeedback['feedbackType']) => {
    switch (type) {
      case 'bug': return <Bug className="w-4 h-4 text-rose-500" />;
      case 'feature': return <Sparkles className="w-4 h-4 text-purple-500" />;
      case 'improvement': return <TrendingUp className="w-4 h-4 text-blue-500" />;
      case 'accessibility': return <Accessibility className="w-4 h-4 text-emerald-500" />;
      case 'performance': return <Zap className="w-4 h-4 text-amber-500" />;
      default: return <MessageSquare className="w-4 h-4 text-slate-500" />;
    }
  };

  const getSeverityColor = (severity: UserFeedback['severity']) => {
    switch (severity) {
      case 'critical': return 'bg-rose-100 text-rose-700 border-rose-300';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'medium': return 'bg-amber-100 text-amber-700 border-amber-300';
      case 'low': return 'bg-emerald-100 text-emerald-700 border-emerald-300';
      default: return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  const getStatusColor = (status: UserFeedback['status']) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'reviewed': return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'in_progress': return 'bg-amber-100 text-amber-700 border-amber-300';
      case 'resolved': return 'bg-emerald-100 text-emerald-700 border-emerald-300';
      case 'wont_fix': return 'bg-rose-100 text-rose-700 border-rose-300';
      case 'duplicate': return 'bg-slate-100 text-slate-700 border-slate-300';
      default: return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-emerald-50 to-blue-50 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <MessageSquare className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Feedback Dashboard</h2>
              <p className="text-sm text-slate-600">Review and manage user feedback</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadFeedback}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-5 h-5 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              title="Close"
            >
              <XCircle className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        {stats && (
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
            <div className="grid grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-800">{stats.total}</div>
                <div className="text-xs text-slate-600">Total Feedback</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-rose-600">{stats.openIssues}</div>
                <div className="text-xs text-slate-600">Open Issues</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-600">{stats.resolutionRate.toFixed(0)}%</div>
                <div className="text-xs text-slate-600">Resolution Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-600">{stats.avgResponseTime.toFixed(0)}h</div>
                <div className="text-xs text-slate-600">Avg Response Time</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.byType.feature || 0}</div>
                <div className="text-xs text-slate-600">Feature Requests</div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel - Feedback List */}
          <div className="w-2/3 border-r border-slate-200 flex flex-col">
            {/* Filters */}
            <div className="p-4 border-b border-slate-200">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-700 mb-2">Filters</div>
                  <div className="flex flex-wrap gap-2">
                    <select
                      value={filters.status}
                      onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as any }))}
                      className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Status</option>
                      <option value="new">New</option>
                      <option value="reviewed">Reviewed</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                    </select>
                    
                    <select
                      value={filters.type}
                      onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value as any }))}
                      className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Types</option>
                      <option value="bug">Bug Reports</option>
                      <option value="feature">Feature Requests</option>
                      <option value="improvement">Improvements</option>
                      <option value="accessibility">Accessibility</option>
                      <option value="performance">Performance</option>
                    </select>
                    
                    <select
                      value={filters.component}
                      onChange={(e) => setFilters(prev => ({ ...prev, component: e.target.value as any }))}
                      className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Components</option>
                      <option value="SekaMap">SekaMap</option>
                      <option value="AnalystPanel">Analyst Panel</option>
                      <option value="ScenarioSimulation">Scenario Simulation</option>
                      <option value="Global">Global</option>
                    </select>
                    
                    <select
                      value={filters.severity}
                      onChange={(e) => setFilters(prev => ({ ...prev, severity: e.target.value as any }))}
                      className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Severity</option>
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <div className="text-sm font-medium text-slate-700 mb-2">Sort By</div>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="timestamp">Date</option>
                    <option value="severity">Severity</option>
                    <option value="component">Component</option>
                  </select>
                  <button
                    onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                    className="ml-2 p-1.5 border border-slate-300 rounded-lg hover:bg-slate-50"
                  >
                    {sortOrder === 'desc' ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Feedback List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <RefreshCw className="w-8 h-8 text-slate-400 animate-spin mx-auto mb-2" />
                    <p className="text-sm text-slate-500">Loading feedback...</p>
                  </div>
                </div>
              ) : filteredFeedback.length === 0 ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-slate-700 mb-1">No feedback found</h3>
                    <p className="text-sm text-slate-500">Try adjusting your filters</p>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredFeedback.map(feedback => (
                    <div
                      key={feedback.id}
                      onClick={() => setSelectedFeedback(feedback)}
                      className={`p-4 cursor-pointer transition-colors hover:bg-slate-50 ${selectedFeedback?.id === feedback.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          {getTypeIcon(feedback.feedbackType)}
                          <h3 className="font-medium text-slate-800">{feedback.title}</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs rounded-full border ${getSeverityColor(feedback.severity)}`}>
                            {feedback.severity}
                          </span>
                          <span className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(feedback.status)}`}>
                            {feedback.status}
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-sm text-slate-600 mb-3 line-clamp-2">{feedback.description}</p>
                      
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatTimestamp(feedback.timestamp)}
                          </span>
                          <span className="flex items-center gap-1">
                            <ExternalLink className="w-3 h-3" />
                            {feedback.component}
                          </span>
                          {feedback.conservationImpact && (
                            <span className="flex items-center gap-1 text-emerald-600">
                              <TrendingUp className="w-3 h-3" />
                              Impact: {feedback.conservationImpact.score}/100
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(feedback.status)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Feedback Details */}
          <div className="w-1/3 flex flex-col">
            {selectedFeedback ? (
              <>
                <div className="p-6 border-b border-slate-200">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        {getTypeIcon(selectedFeedback.feedbackType)}
                        <h3 className="text-lg font-bold text-slate-800">{selectedFeedback.title}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs rounded-full border ${getSeverityColor(selectedFeedback.severity)}`}>
                          {selectedFeedback.severity}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(selectedFeedback.status)}`}>
                          {selectedFeedback.status}
                        </span>
                        <span className="px-2 py-1 text-xs bg-slate-100 text-slate-700 rounded-full border border-slate-300">
                          {selectedFeedback.component}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-slate-500">
                      {formatTimestamp(selectedFeedback.timestamp)}
                    </div>
                  </div>

                  <p className="text-sm text-slate-700 mb-6">{selectedFeedback.description}</p>

                  {selectedFeedback.ecologicalContext && (
                    <div className="mb-6 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                      <h4 className="text-sm font-medium text-emerald-800 mb-2">Ecological Context</h4>
                      <div className="text-xs text-emerald-700 space-y-1">
                        {selectedFeedback.ecologicalContext.conservationArea && (
                          <div>Area: {selectedFeedback.ecologicalContext.conservationArea}</div>
                        )}
                        {selectedFeedback.ecologicalContext.timePeriod && (
                          <div>Time Period: {selectedFeedback.ecologicalContext.timePeriod}</div>
                        )}
                        {selectedFeedback.ecologicalContext.analysisType && (
                          <div>Analysis: {selectedFeedback.ecologicalContext.analysisType}</div>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedFeedback.reproductionSteps && selectedFeedback.reproductionSteps.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-sm font-medium text-slate-700 mb-2">Reproduction Steps</h4>
                      <ol className="text-sm text-slate-600 space-y-1">
                        {selectedFeedback.reproductionSteps.map((step, index) => (
                          <li key={index} className="flex gap-2">
                            <span className="text-slate-500">{index + 1}.</span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {selectedFeedback.expectedBehavior && (
                    <div className="mb-6 p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <h4 className="text-sm font-medium text-blue-800 mb-2">Expected Behavior</h4>
                      <p className="text-sm text-blue-700">{selectedFeedback.expectedBehavior}</p>
                    </div>
                  )}

                  {selectedFeedback.actualBehavior && (
                    <div className="mb-6 p-3 bg-rose-50 rounded-lg border border-rose-100">
                      <h4 className="text-sm font-medium text-rose-800 mb-2">Actual Behavior</h4>
                      <p className="text-sm text-rose-700">{selectedFeedback.actualBehavior}</p>
                    </div>
                  )}

                  {selectedFeedback.conservationImpact && (
                    <div className="mb-6 p-3 bg-purple-50 rounded-lg border border-purple-100">
                      <h4 className="text-sm font-medium text-purple-800 mb-2">Conservation Impact</h4>
                      <div className="mb-2">
                        <div className="flex items-center justify-between text-xs text-purple-700 mb-1">
                          <span>Impact Score</span>
                          <span className="font-bold">{selectedFeedback.conservationImpact.score}/100</span>
                        </div>
                        <div className="w-full bg-purple-200 rounded-full h-2">
                          <div 
                            className="bg-purple-600 rounded-full h-2 transition-all duration-300"
                            style={{ width: `${selectedFeedback.conservationImpact.score}%` }}
                          />
                        </div>
                      </div>
                      <p className="text-sm text-purple-700 mb-2">{selectedFeedback.conservationImpact.description}</p>
                      <div className="text-xs text-purple-600">
                        Affected workflows: {selectedFeedback.conservationImpact.affectedWorkflows.join(', ')}
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-200">
                  <h4 className="text-sm font-medium text-slate-700 mb-4">Actions</h4>
                  
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <button
                      onClick={() => handleStatusUpdate(selectedFeedback.id, 'reviewed')}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                      disabled={selectedFeedback.status === 'reviewed'}
                    >
                      Mark Reviewed
                    </button>
                    
                    <button
                      onClick={() => handleStatusUpdate(selectedFeedback.id, 'in_progress')}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors text-sm"
                      disabled={selectedFeedback.status === 'in_progress'}
                    >
                      Start Progress
                    </button>
                    
                    <button
                      onClick={() => handleStatusUpdate(selectedFeedback.id, 'resolved')}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors text-sm"
                      disabled={selectedFeedback.status === 'resolved'}
                    >
                      Mark Resolved
                    </button>
                    
                    <button
                      onClick={() => handleStatusUpdate(selectedFeedback.id, 'wont_fix')}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors text-sm"
                      disabled={selectedFeedback.status === 'wont_fix'}
                    >
                      Won't Fix
                    </button>
                  </div>

                  {!selectedFeedback.conservationImpact && (
                    <button
                      onClick={() => handleAddConservationImpact(selectedFeedback.id)}
                      className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm mb-3"
                    >
                      Add Conservation Impact
                    </button>
                  )}

                  <div className="text-xs text-slate-500 mt-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Mail className="w-3 h-3" />
                      <span>Feedback ID: {selectedFeedback.id}</span>
                    </div>
                    {selectedFeedback.deviceInfo && (
                      <div>
                        Device: {selectedFeedback.deviceInfo.type} • {selectedFeedback.deviceInfo.browser} • {selectedFeedback.deviceInfo.os}
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center p-6">
                <div className="text-center">
                  <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-slate-700 mb-1">Select Feedback</h3>
                  <p className="text-sm text-slate-500">Choose a feedback item from the list to view details</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}