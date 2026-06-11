import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an unhandled error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          background: '#141f1a',
          fontFamily: 'var(--font-sans)',
          width: '100vw',
          boxSizing: 'border-box',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Static Background mesh blob */}
          <div style={{
            position: 'absolute',
            width: '300px',
            height: '300px',
            background: 'var(--accent-moss)',
            borderRadius: '50%',
            filter: 'blur(100px)',
            opacity: 0.15,
            top: '20%',
            left: '30%'
          }}></div>

          <div className="glass-card flex-col align-center gap-md" style={{
            padding: '2.5rem 2rem',
            textAlign: 'center',
            maxWidth: '500px',
            width: '100%',
            borderTop: '4px solid #d93025',
            zIndex: 1
          }}>
            <div style={{
              background: 'rgba(217, 48, 37, 0.1)',
              border: '1px solid rgba(217, 48, 37, 0.2)',
              borderRadius: '50%',
              width: '56px',
              height: '56px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#e27d7d',
              margin: '0 auto 0.5rem auto'
            }}>
              <AlertTriangle size={28} />
            </div>

            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              Application Error Occurred
            </h2>

            <p style={{
              fontSize: '0.9rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.5,
              margin: '0 auto 0.5rem auto'
            }}>
              An unexpected rendering or logic error crashed the interface. You can reload the app to re-initialize your session.
            </p>

            {this.state.error && (
              <pre style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                color: '#e27d7d',
                background: 'rgba(217, 48, 37, 0.04)',
                border: '1px solid rgba(217, 48, 37, 0.15)',
                padding: '0.85rem',
                borderRadius: '8px',
                width: '100%',
                boxSizing: 'border-box',
                overflowX: 'auto',
                textAlign: 'left',
                margin: '0.5rem 0 1rem 0',
                maxHeight: '150px'
              }}>
                {this.state.error.toString()}
              </pre>
            )}

            <button
              onClick={this.handleReset}
              className="glass-btn glass-btn-primary"
              style={{
                width: '100%',
                padding: '0.85rem',
                fontSize: '0.95rem',
                background: 'var(--accent-moss)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <RotateCcw size={16} />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
