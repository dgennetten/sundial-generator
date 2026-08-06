// src/components/gallery/GalleryLoadingFallback.tsx
import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Full-screen placeholder shown while the lazy-loaded PhotoGallery chunk
 * downloads. Without it, clicking "Photos" renders nothing until the JS
 * arrives, so on a cold cache the gallery appears not to open at all. This
 * gives an immediate visual response and matches the gallery's own backdrop.
 */
const GalleryLoadingFallback: React.FC = () => (
  <div
    role="status"
    aria-live="polite"
    style={{
      position: 'fixed',
      inset: 0,
      background: '#f9fafb',
      zIndex: 10020,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <Loader2 size={28} color="#2563eb" style={{ animation: 'spin 1s linear infinite' }} />
  </div>
);

export default GalleryLoadingFallback;
