// src/components/gallery/PhotoUploadModal.tsx
import React, { useEffect, useRef, useState, type FormEvent } from 'react';
import { X, Loader2, ImagePlus, CheckCircle2 } from 'lucide-react';
import type { Language } from '../WelcomeDialog';
import type { GalleryPhoto } from '../../types/gallery';
import { uploadGalleryPhoto, GalleryNetworkError } from '../../services/galleryApi';
import { prepareImageForUpload } from './imageResize';
import {
  galleryTranslations,
  GALLERY_ALLOWED_TYPES,
  GALLERY_MAX_UPLOAD_BYTES,
} from './galleryTranslations';

interface PhotoUploadModalProps {
  language: Language;
  token: string;
  email: string;
  onClose: () => void;
  onUploaded: (photo: GalleryPhoto) => void;
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.72rem',
  fontWeight: 600,
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: '6px',
};

const PhotoUploadModal: React.FC<PhotoUploadModalProps> = ({
  language,
  token,
  email,
  onClose,
  onUploaded,
}) => {
  const t = galleryTranslations[language];
  const isRTL = language === 'ar';

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  // 'approved' when the uploader is the moderator (published immediately).
  const [doneStatus, setDoneStatus] = useState<GalleryPhoto['status']>('pending');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Object URLs must be revoked or the blob leaks for the page's lifetime.
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !uploading) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, uploading]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setError('');

    if (!GALLERY_ALLOWED_TYPES.includes(selected.type)) {
      setError(t.fileWrongType);
      setFile(null);
      return;
    }
    if (selected.size > GALLERY_MAX_UPLOAD_BYTES) {
      setError(t.fileTooLarge);
      setFile(null);
      return;
    }
    setFile(selected);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      // Shrink full-resolution phone photos before sending so the upload is
      // small and fast; falls back to the original file on any failure.
      setPreparing(true);
      const prepared = await prepareImageForUpload(file);
      setPreparing(false);

      const photo = await uploadGalleryPhoto(prepared, caption.trim(), token);
      onUploaded(photo);
      setDoneStatus(photo.status);
      setDone(true);
    } catch (err) {
      if (err instanceof GalleryNetworkError) {
        setError(t.networkError);
      } else {
        setError(err instanceof Error ? err.message : t.genericError);
      }
    } finally {
      setPreparing(false);
      setUploading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10030,
        padding: '16px',
      }}
      onClick={() => { if (!uploading) onClose(); }}
    >
      <div
        dir={isRTL ? 'rtl' : 'ltr'}
        role="dialog"
        aria-modal="true"
        aria-label={t.uploadTitle}
        style={{
          background: '#fff',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '440px',
          maxHeight: '92vh',
          overflowY: 'auto',
          boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid #e5e7eb',
            position: 'sticky',
            top: 0,
            background: '#fff',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#1f2937' }}>
            {t.uploadTitle}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            aria-label={t.close}
            style={{
              background: 'none',
              border: 'none',
              cursor: uploading ? 'default' : 'pointer',
              padding: '4px',
              display: 'flex',
              opacity: uploading ? 0.4 : 1,
            }}
          >
            <X size={18} color="#6b7280" />
          </button>
        </div>

        {done ? (
          <div style={{ padding: '28px 20px', textAlign: 'center' }}>
            <CheckCircle2 size={44} color="#16a34a" style={{ margin: '0 auto 12px' }} />
            <p style={{ margin: '0 0 20px', fontSize: '0.95rem', color: '#4b5563', lineHeight: 1.55 }}>
              {doneStatus === 'approved' ? t.uploadPublished : t.uploadSuccess}
            </p>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 24px',
                background: '#2563eb',
                border: 'none',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '0.95rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              {t.close}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: '20px', display: 'grid', gap: '14px' }}>
            <p style={{ margin: 0, fontSize: '0.88rem', color: '#6b7280', lineHeight: 1.5 }}>
              {t.uploadBlurb}
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept={GALLERY_ALLOWED_TYPES.join(',')}
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />

            {previewUrl ? (
              <div>
                <img
                  src={previewUrl}
                  alt=""
                  style={{
                    display: 'block',
                    width: '100%',
                    maxHeight: '260px',
                    objectFit: 'contain',
                    background: '#f3f4f6',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  style={{
                    marginTop: '8px',
                    background: 'none',
                    border: 'none',
                    color: '#2563eb',
                    fontSize: '0.85rem',
                    cursor: uploading ? 'default' : 'pointer',
                    padding: 0,
                  }}
                >
                  {t.changePhoto}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '32px 16px',
                  background: '#f9fafb',
                  border: '2px dashed #d1d5db',
                  borderRadius: '8px',
                  color: '#6b7280',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#2563eb';
                  e.currentTarget.style.background = '#eff6ff';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#d1d5db';
                  e.currentTarget.style.background = '#f9fafb';
                }}
              >
                <ImagePlus size={26} />
                {t.choosePhoto}
              </button>
            )}

            <div>
              <label htmlFor="gallery-caption" style={labelStyle}>
                {t.captionLabel}{' '}
                <span style={{ textTransform: 'none', fontWeight: 400, color: '#9ca3af' }}>
                  ({t.captionOptional})
                </span>
              </label>
              <textarea
                id="gallery-caption"
                value={caption}
                onChange={e => setCaption(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder={t.captionPlaceholder}
                style={{
                  width: '100%',
                  padding: '9px 11px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  color: '#1f2937',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = '#2563eb'; }}
                onBlur={e => { e.currentTarget.style.borderColor = '#d1d5db'; }}
              />
            </div>

            <p style={{ margin: 0, fontSize: '0.75rem', color: '#9ca3af' }}>
              {t.signedInAs} <span dir="ltr">{email}</span>
            </p>

            {error && <p style={{ margin: 0, fontSize: '0.85rem', color: '#dc2626' }}>{error}</p>}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={onClose}
                disabled={uploading}
                style={{
                  flex: '0 0 auto',
                  padding: '10px 18px',
                  background: '#fff',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  color: '#4b5563',
                  fontSize: '0.95rem',
                  cursor: uploading ? 'default' : 'pointer',
                  opacity: uploading ? 0.5 : 1,
                }}
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                disabled={!file || uploading}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  background: '#2563eb',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '0.95rem',
                  fontWeight: 500,
                  cursor: !file || uploading ? 'default' : 'pointer',
                  opacity: !file || uploading ? 0.6 : 1,
                }}
              >
                {uploading && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
                {uploading ? (preparing ? t.preparing : t.uploading) : t.submit}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default PhotoUploadModal;
