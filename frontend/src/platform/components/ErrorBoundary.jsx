import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Captured error in ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="ss-page" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <div
            className="ss-container"
            style={{
              maxWidth: '600px',
              margin: '0 auto',
              background: '#ffffff',
              padding: '32px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
              color: '#0f172a'
            }}
          >
            <h2 style={{ color: '#b91c1c', marginBottom: '12px' }}>An unexpected error occurred</h2>
            <p style={{ color: '#475569', fontSize: '0.9rem', marginBottom: '20px' }}>
              {this.state.error?.message || 'Something went wrong while rendering this section.'}
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                type="button"
                className="ss-btn ss-btn--primary"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.hash = '/';
                  window.location.reload();
                }}
                style={{
                  padding: '8px 16px',
                  background: '#0e9fce',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Return to Home
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
