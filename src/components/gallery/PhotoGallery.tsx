// src/components/gallery/PhotoGallery.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { X, Upload, Expand, Loader2, Camera, LogOut, Trash2 } from 'lucide-react';
import Lightbox from 'yet-another-react-lightbox';
import Fullscreen from 'yet-another-react-lightbox/plugins/fullscreen';
// NOTE: the lightbox stylesheet is imported eagerly in main.tsx, not here — see
// the comment there. Importing it in this lazy chunk made the dynamic import
// wait on the stylesheet <link> load event, which could hang forever on mobile.
import type { Language } from '../WelcomeDialog';
import type { GalleryPhoto, GalleryUser } from '../../types/gallery';
import { fetchGalleryPhotos, deleteGalleryPhoto, galleryImageUrl } from '../../services/galleryApi';
import { galleryTranslations } from './galleryTranslations';
import { useGalleryAuth } from './useGalleryAuth';
import GalleryLoginModal from './GalleryLoginModal';
import PhotoUploadModal from './PhotoUploadModal';

declare module 'yet-another-react-lightbox' {
  interface SlideImage {
    galleryCaption?: string | null;
    galleryPending?: boolean;
  }
}

interface PhotoGalleryProps {
  language: Language;
  onClose: () => void;
}

type GallerySlide = {
  src: string;
  alt?: string;
  galleryCaption?: string | null;
  galleryPending?: boolean;
};

/**
 * Caption panel. Sits beside the image when a portrait photo is shown in a
 * landscape viewport, underneath it otherwise.
 */
const CaptionPanel: React.FC<{ slide: GallerySlide; beside: boolean; pendingLabel: string }> = ({
  slide,
  beside,
  pendingLabel,
}) => (
  <div
    style={{
      color: 'rgba(255,255,255,0.9)',
      flexShrink: 0,
      overflowY: 'auto',
      ...(beside
        ? {
            width: '240px',
            padding: '1.5rem 1.25rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            borderLeft: '1px solid rgba(255,255,255,0.12)',
          }
        : {
            width: '100%',
            padding: '0.75rem 1.5rem 1rem',
            textAlign: 'center',
            borderTop: '1px solid rgba(255,255,255,0.12)',
          }),
    }}
  >
    {slide.galleryPending && (
      <div
        style={{
          fontSize: '0.65rem',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          color: '#fbbf24',
          marginBottom: slide.galleryCaption ? '0.5rem' : 0,
        }}
      >
        {pendingLabel}
      </div>
    )}
    {slide.galleryCaption && (
      <div style={{ fontSize: '0.9rem', opacity: 0.85, lineHeight: 1.55 }}>{slide.galleryCaption}</div>
    )}
  </div>
);

const PhotoSlide: React.FC<{
  slide: GallerySlide;
  rect: { width: number; height: number };
  pendingLabel: string;
}> = ({ slide, rect, pendingLabel }) => {
  const [imageAspect, setImageAspect] = useState<number | null>(null);
  const src = slide.src;

  useEffect(() => {
    if (!src) return;
    setImageAspect(null);
    const img = new Image();
    img.onload = () => setImageAspect(img.naturalWidth / img.naturalHeight);
    img.src = src;
  }, [src]);

  const containerAspect = rect.width / rect.height;
  const hasText = !!(slide.galleryCaption || slide.galleryPending);
  const textBeside = hasText && imageAspect !== null && imageAspect < 1 && containerAspect > 1;

  const image = (
    <img src={src} alt={slide.alt ?? ''} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
  );

  if (textBeside) {
    return (
      <div style={{ display: 'flex', flexDirection: 'row', width: '100%', height: '100%', alignItems: 'stretch' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 0 }}>
          {image}
        </div>
        <CaptionPanel slide={slide} beside pendingLabel={pendingLabel} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', alignItems: 'stretch' }}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
        {image}
      </div>
      {hasText && <CaptionPanel slide={slide} beside={false} pendingLabel={pendingLabel} />}
    </div>
  );
};

const headerButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '7px',
  padding: '8px 14px',
  borderRadius: '6px',
  fontSize: '0.9rem',
  fontWeight: 500,
  cursor: 'pointer',
  border: 'none',
  whiteSpace: 'nowrap',
};

const PhotoGallery: React.FC<PhotoGalleryProps> = ({ language, onClose }) => {
  const t = galleryTranslations[language];
  const isRTL = language === 'ar';
  const { user, signIn, signOut } = useGalleryAuth();

  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const [showLogin, setShowLogin] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  // Set when sign-in was triggered by the upload button, so we can continue
  // straight into the upload form once the code is verified.
  const [uploadAfterLogin, setUploadAfterLogin] = useState(false);

  const loadPhotos = useCallback(async (token?: string | null) => {
    setLoading(true);
    setError(false);
    try {
      setPhotos(await fetchGalleryPhotos(token));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPhotos(user?.token);
  }, [loadPhotos, user?.token]);

  // The page behind a fullscreen gallery shouldn't scroll.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // The lightbox and the child modals handle their own Escape.
      if (e.key === 'Escape' && lightboxIndex < 0 && !showLogin && !showUpload) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, lightboxIndex, showLogin, showUpload]);

  const handleUploadClick = () => {
    if (user) {
      setShowUpload(true);
    } else {
      setUploadAfterLogin(true);
      setShowLogin(true);
    }
  };

  const handleLoginSuccess = (next: GalleryUser, remember: boolean, expiresAtMs?: number) => {
    signIn(next, remember, expiresAtMs);
    setShowLogin(false);
    if (uploadAfterLogin) {
      setUploadAfterLogin(false);
      setShowUpload(true);
    }
  };

  const handleUploaded = (photo: GalleryPhoto) => {
    // Show the pending photo immediately rather than waiting on a refetch.
    setPhotos(current => [photo, ...current]);
  };

  const handleDelete = async (e: React.MouseEvent, photo: GalleryPhoto) => {
    // Tiles open the lightbox on click; keep the delete button from doing that.
    e.stopPropagation();
    if (!user || deletingId !== null) return;
    if (!window.confirm(t.deleteConfirm)) return;

    setDeletingId(photo.id);
    try {
      await deleteGalleryPhoto(photo.id, user.token);
      setPhotos(current => current.filter(p => p.id !== photo.id));
    } catch (err) {
      window.alert(err instanceof Error ? err.message : t.deleteError);
    } finally {
      setDeletingId(null);
    }
  };

  // Memoize so the array keeps a stable reference across unrelated re-renders.
  // yet-another-react-lightbox resets its current slide back to the `index` prop
  // whenever the `slides` prop changes by reference — so a fresh array on every
  // render (e.g. while the location-shadow animation re-renders the tree ~60×/s)
  // would snap the lightbox back to the opened photo every frame, making the
  // ‹ › navigation buttons appear dead.
  const slides: GallerySlide[] = useMemo(
    () =>
      photos.map(p => ({
        src: galleryImageUrl(p.image_src),
        alt: p.caption ?? '',
        galleryCaption: p.caption,
        galleryPending: p.status === 'pending',
      })),
    [photos],
  );

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      role="dialog"
      aria-modal="true"
      aria-label={t.galleryTitle}
      style={{
        position: 'fixed',
        inset: 0,
        background: '#f9fafb',
        zIndex: 10020,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          padding: '14px 20px',
          background: '#fff',
          borderBottom: '1px solid #e5e7eb',
          flexShrink: 0,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: '1.15rem',
            fontWeight: 600,
            color: '#1f2937',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            minWidth: 0,
          }}
        >
          <Camera size={20} color="#2563eb" style={{ flexShrink: 0 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {t.galleryTitle}
          </span>
        </h2>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <button
            type="button"
            onClick={handleUploadClick}
            style={{ ...headerButtonStyle, background: '#2563eb', color: '#fff' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#1d4ed8'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#2563eb'; }}
          >
            <Upload size={16} />
            {t.uploadPhoto}
          </button>

          {user && (
            <button
              type="button"
              onClick={signOut}
              title={`${t.signedInAs} ${user.email}`}
              style={{ ...headerButtonStyle, background: 'transparent', color: '#6b7280' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#f3f4f6'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <LogOut size={16} />
              {t.signOut}
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            aria-label={t.close}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              borderRadius: '4px',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#f3f4f6'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            <X size={20} color="#6b7280" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px 40px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {loading && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                padding: '80px 0',
                color: '#6b7280',
              }}
            >
              <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
              {t.loading}
            </div>
          )}

          {!loading && error && (
            <div style={{ textAlign: 'center', padding: '80px 0' }}>
              <p style={{ color: '#dc2626', marginBottom: '16px' }}>{t.loadError}</p>
              <button
                type="button"
                onClick={() => void loadPhotos(user?.token)}
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
                {t.retry}
              </button>
            </div>
          )}

          {!loading && !error && photos.length === 0 && (
            <div style={{ textAlign: 'center', padding: '80px 20px', color: '#6b7280' }}>
              <Camera size={40} color="#d1d5db" style={{ margin: '0 auto 14px' }} />
              <p style={{ margin: '0 0 6px', fontSize: '1.05rem', fontWeight: 500, color: '#4b5563' }}>
                {t.empty}
              </p>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>{t.emptyHint}</p>
            </div>
          )}

          {!loading && !error && photos.length > 0 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
                gap: '20px',
              }}
            >
              {photos.map((photo, index) => (
                <div
                  key={photo.id}
                  onClick={() => setLightboxIndex(index)}
                  style={{ cursor: 'pointer' }}
                >
                  <div
                    style={{
                      position: 'relative',
                      aspectRatio: '1 / 1',
                      overflow: 'hidden',
                      borderRadius: '8px',
                      background: '#e5e7eb',
                      marginBottom: '8px',
                    }}
                    onMouseEnter={e => {
                      const img = e.currentTarget.querySelector('img');
                      if (img) img.style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={e => {
                      const img = e.currentTarget.querySelector('img');
                      if (img) img.style.transform = 'scale(1)';
                    }}
                  >
                    <img
                      src={galleryImageUrl(photo.image_src)}
                      alt={photo.caption ?? ''}
                      loading="lazy"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transition: 'transform 0.5s',
                        display: 'block',
                      }}
                    />
                    {photo.status === 'pending' && (
                      <span
                        style={{
                          position: 'absolute',
                          top: '8px',
                          insetInlineStart: '8px',
                          background: 'rgba(217,119,6,0.95)',
                          color: '#fff',
                          fontSize: '0.68rem',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          padding: '3px 8px',
                          borderRadius: '4px',
                        }}
                      >
                        {t.pendingBadge}
                      </span>
                    )}
                    <Expand
                      size={14}
                      strokeWidth={2}
                      color="#fff"
                      style={{
                        position: 'absolute',
                        bottom: '8px',
                        insetInlineEnd: '8px',
                        filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.6))',
                        pointerEvents: 'none',
                      }}
                      aria-hidden
                    />
                    {photo.can_delete && (
                      <button
                        type="button"
                        onClick={e => void handleDelete(e, photo)}
                        disabled={deletingId === photo.id}
                        title={t.deletePhoto}
                        aria-label={t.deletePhoto}
                        style={{
                          position: 'absolute',
                          top: '8px',
                          insetInlineEnd: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '30px',
                          height: '30px',
                          border: 'none',
                          borderRadius: '6px',
                          background: 'rgba(220,38,38,0.92)',
                          color: '#fff',
                          cursor: deletingId === photo.id ? 'default' : 'pointer',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                        }}
                        onMouseEnter={ev => { ev.currentTarget.style.background = 'rgba(185,28,28,0.97)'; }}
                        onMouseLeave={ev => { ev.currentTarget.style.background = 'rgba(220,38,38,0.92)'; }}
                      >
                        {deletingId === photo.id
                          ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                          : <Trash2 size={15} />}
                      </button>
                    )}
                  </div>
                  {photo.caption && (
                    <p
                      style={{
                        margin: 0,
                        fontSize: '0.85rem',
                        color: '#4b5563',
                        lineHeight: 1.4,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {photo.caption}
                    </p>
                  )}
                  {photo.status === 'pending' && (
                    <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#d97706' }}>
                      {t.pendingNote}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Lightbox
        open={lightboxIndex >= 0}
        close={() => setLightboxIndex(-1)}
        index={lightboxIndex}
        // Track the current slide so the controlled `index` prop stays in sync
        // with navigation; otherwise any re-render re-pins it to the opened photo.
        on={{ view: ({ index }) => setLightboxIndex(index) }}
        slides={slides}
        plugins={[Fullscreen]}
        // Must clear the gallery shell (10020) and its child modals (10030).
        styles={{ root: { '--yarl__portal_zindex': 10040 } }}
        render={{
          slide: ({ slide, rect }) => (
            <PhotoSlide slide={slide as GallerySlide} rect={rect} pendingLabel={t.pendingBadge} />
          ),
        }}
      />

      {showLogin && (
        <GalleryLoginModal
          language={language}
          onClose={() => {
            setShowLogin(false);
            setUploadAfterLogin(false);
          }}
          onSuccess={handleLoginSuccess}
        />
      )}

      {showUpload && user && (
        <PhotoUploadModal
          language={language}
          token={user.token}
          email={user.email}
          onClose={() => setShowUpload(false)}
          onUploaded={handleUploaded}
        />
      )}
    </div>
  );
};

export default PhotoGallery;
