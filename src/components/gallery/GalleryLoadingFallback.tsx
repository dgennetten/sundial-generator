// src/components/gallery/GalleryLoadingFallback.tsx
import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Full-screen placeholder shown while the lazy-loaded PhotoGallery chunk
 * downloads. Without it, clicking "Photos" renders nothing until the JS
 * arrives, so on a cold cache the gallery appears not to open at all. This
 * gives an immediate visual response and matches the gallery's own backdrop.
 *
 * If the chunk request stalls (flaky connection — the promise neither resolves
 * nor rejects, so the error boundary can't catch it), reveal a manual reload
 * after a few seconds so the user isn't stuck watching an endless spinner.
 */
const STALL_TIMEOUT_MS = 8000;

const GalleryLoadingFallback: React.FC = () => {
  const [stalled, setStalled] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setStalled(true), STALL_TIMEOUT_MS);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
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
      <Loader2 size={28} color="#2563eb" style={{ animation: 'spin 1s linear infinite' }} />
      {stalled && (
        <>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem' }}>
            Still loading&hellip; this is taking longer than usual.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              padding: '8px 18px',
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
        </>
      )}
    </div>
  );
};

export default GalleryLoadingFallback;
