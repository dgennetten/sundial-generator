// src/components/gallery/GalleryErrorBoundary.tsx
import React from 'react';
import { isStaleChunkError, recoverFromStaleChunk } from '../../utils/staleChunk';
import { log } from '../../utils/logger';

interface Props {
  onClose: () => void;
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Catches failures from lazy-loading the PhotoGallery chunk. A dynamic import()
 * that 404s (the app was redeployed since the page loaded) throws into React's
 * render, which — with only a Suspense spinner and no boundary — would leave the
 * user staring at an endless spinner or a blank screen. On a stale-chunk error we
 * reload once to pull fresh chunks; otherwise we show a recoverable error card.
 */
class GalleryErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    if (isStaleChunkError(error)) {
      // Reloads the page (guarded against loops). If it returns false we've
      // already reloaded this session, so fall through to the error card.
      recoverFromStaleChunk();
      return;
    }
    log.error('Photo gallery failed to load:', error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        role="alertdialog"
        aria-label="Gallery failed to load"
        style={{
          position: 'fixed',
          inset: 0,
          background: '#f9fafb',
          zIndex: 10020,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <p style={{ margin: 0, color: '#4b5563', fontSize: '1rem', maxWidth: '360px' }}>
          The photo gallery couldn&rsquo;t be loaded. Your connection may have dropped, or the app
          was just updated.
        </p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              padding: '9px 20px',
              background: '#2563eb',
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '0.9rem',
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
          <button
            type="button"
            onClick={this.props.onClose}
            style={{
              padding: '9px 20px',
              background: 'transparent',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              color: '#4b5563',
              fontSize: '0.9rem',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    );
  }
}

export default GalleryErrorBoundary;
