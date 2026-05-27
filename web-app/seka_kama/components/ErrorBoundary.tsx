'use client';

import React from 'react';

interface Props {
  children: React.ReactNode;
  /** Optional label shown in the error card (e.g. "Spatial Map") */
  label?: string;
  /** Optional callback fired when the user clicks Retry */
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  message: string;
}

/**
 * ErrorBoundary — catches render-time exceptions in any child tree and
 * shows a recovery card instead of a blank screen.
 *
 * Usage:
 *   <ErrorBoundary label="Spatial Map">
 *     <SekaMap ... />
 *   </ErrorBoundary>
 */
export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message ?? 'Unknown error' };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[ErrorBoundary:${this.props.label ?? 'unknown'}]`, error, info.componentStack);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, message: '' });
    this.props.onRetry?.();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          minHeight: '200px',
          background: '#0b0f1a',
        }}
      >
        <div
          style={{
            maxWidth: '420px',
            padding: '32px',
            background: 'rgba(248,113,113,0.05)',
            border: '1px solid rgba(248,113,113,0.2)',
            borderRadius: '16px',
            textAlign: 'center',
          }}
        >
          {/* Icon */}
          <div style={{ marginBottom: '16px' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto' }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>

          <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 700, color: '#f87171' }}>
            {this.props.label ? `${this.props.label} failed to load` : 'Something went wrong'}
          </h3>

          <p style={{ margin: '0 0 24px', fontSize: '12px', color: '#64748b', lineHeight: 1.6, wordBreak: 'break-word' }}>
            {this.state.message}
          </p>

          <button
            onClick={this.handleRetry}
            style={{
              padding: '9px 24px',
              background: 'rgba(248,113,113,0.1)',
              border: '1px solid rgba(248,113,113,0.3)',
              borderRadius: '10px',
              color: '#f87171',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              fontFamily: 'inherit',
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
}
