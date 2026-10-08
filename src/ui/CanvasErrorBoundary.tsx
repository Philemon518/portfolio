import { Component, type ErrorInfo, type ReactNode } from 'react';

export class CanvasErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Garage scene failed to render.', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          role="alert"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            padding: 24,
            textAlign: 'center',
            color: '#e8ecf4',
            background: '#0a0c12',
            zIndex: 0,
          }}
        >
          <div style={{ maxWidth: 520 }}>
            <h2 style={{ margin: '0 0 12px' }}>The 3D scene could not load.</h2>
            <p style={{ margin: 0, color: '#94a3b8', lineHeight: 1.5 }}>
              The welcome UI is still available. Check the browser console for the scene error.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
