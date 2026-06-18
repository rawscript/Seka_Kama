'use client';

import React, { useCallback } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, info: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorCount: number;
  lastErrorTime: number;
}

/**
 * GlobalErrorBoundary — Production-grade error boundary for the entire application.
 * Captures render errors, provides recovery UI, and prevents error loops.
 *
 * Features:
 * - Graceful error recovery
 * - Error loop detection (prevents cascade failures)
 * - Structured error logging to Sentry
 * - User-friendly error messaging
 * - One-click recovery
 */
export default class GlobalErrorBoundary extends React.Component<Props, State> {
  private readonly ERROR_THRESHOLD = 3;
  private readonly ERROR_WINDOW_MS = 60000; // 1 minute

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorCount: 0,
      lastErrorTime: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    const now = Date.now();
    const timeSinceLastError = now - this.state.lastErrorTime;
    const isWithinWindow = timeSinceLastError < this.ERROR_WINDOW_MS;
    const newErrorCount = isWithinWindow ? this.state.errorCount + 1 : 1;

    // Update error count and time
    this.setState({
      errorCount: newErrorCount,
      lastErrorTime: now,
    });

    // Log to console and external services
    console.error('[GlobalErrorBoundary]', error, info.componentStack);

    // Report to Sentry if available
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: info.componentStack,
          },
        },
        tags: {
          error_boundary: 'global',
          error_count: newErrorCount.toString(),
        },
      });
    }

    // Fire custom callback
    this.props.onError?.(error, info);

    // Check for error loop
    if (newErrorCount >= this.ERROR_THRESHOLD) {
      console.error(
        `[GlobalErrorBoundary] Error threshold exceeded (${newErrorCount}/${this.ERROR_THRESHOLD} in ${this.ERROR_WINDOW_MS}ms). Application may be in a crash loop.`
      );
    }
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  private handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const isErrorLoop = this.state.errorCount >= this.ERROR_THRESHOLD;
    const errorMessage = this.state.error?.message || 'An unexpected error occurred';

    if (isErrorLoop && this.props.fallback) {
      return this.props.fallback;
    }

    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          padding: '20px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div
          style={{
            maxWidth: '500px',
            background: 'rgba(30, 41, 59, 0.8)',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            borderRadius: '12px',
            padding: '40px',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
          }}
        >
          {/* Icon */}
          <div style={{ marginBottom: '24px', textAlign: 'center' }}>
            <AlertCircle
              size={48}
              color="#ef4444"
              style={{ margin: '0 auto' }}
            />
          </div>

          {/* Heading */}
          <h1
            style={{
              margin: '0 0 16px',
              fontSize: '20px',
              fontWeight: 700,
              color: '#f1f5f9',
            }}
          >
            {isErrorLoop
              ? 'Application Recovery Needed'
              : 'Something Went Wrong'}
          </h1>

          {/* Description */}
          <p
            style={{
              margin: '0 0 24px',
              fontSize: '14px',
              color: '#cbd5e1',
              lineHeight: 1.6,
            }}
          >
            {isErrorLoop
              ? 'The application encountered a critical error and needs to be reloaded. Your data is safe.'
              : errorMessage}
          </p>

          {/* Error details (debug mode) */}
          {process.env.NODE_ENV === 'development' && (
            <details
              style={{
                marginBottom: '24px',
                padding: '12px',
                background: 'rgba(15, 23, 42, 0.5)',
                border: '1px solid rgba(148, 163, 184, 0.1)',
                borderRadius: '6px',
                fontSize: '12px',
                color: '#94a3b8',
              }}
            >
              <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
                Error Details
              </summary>
              <pre
                style={{
                  marginTop: '8px',
                  overflow: 'auto',
                  maxHeight: '200px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {this.state.error?.toString()}
              </pre>
            </details>
          )}

          {/* Actions */}
          <div
            style={{
              display: 'flex',
              gap: '12px',
              flexDirection: isErrorLoop ? 'column' : 'row',
            }}
          >
            {!isErrorLoop && (
              <button
                onClick={this.handleReset}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  background: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: '6px',
                  color: '#3b82f6',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                }}
              >
                <RefreshCw size={16} />
                Try Again
              </button>
            )}

            <button
              onClick={this.handleReload}
              style={{
                flex: 1,
                padding: '12px 24px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '6px',
                color: '#ef4444',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
              }}
            >
              Reload Page
            </button>
          </div>

          {/* Support link */}
          <p
            style={{
              margin: '24px 0 0',
              padding: '16px 0 0',
              borderTop: '1px solid rgba(148, 163, 184, 0.1)',
              fontSize: '12px',
              color: '#64748b',
              textAlign: 'center',
            }}
          >
            If the problem persists, please{' '}
            <a
              href="mailto:support@seka-kama.io"
              style={{
                color: '#3b82f6',
                textDecoration: 'none',
              }}
            >
              contact support
            </a>
            .
          </p>
        </div>
      </div>
    );
  }
}
