// src/components/gallery/GalleryLoginModal.tsx
import React, { useEffect, useRef, useState, type FormEvent } from 'react';
import { X, Loader2 } from 'lucide-react';
import type { Language } from '../WelcomeDialog';
import type { GalleryUser } from '../../types/gallery';
import { requestGalleryOtp, verifyGalleryOtp } from '../../services/galleryAuth';
import { galleryTranslations, fillTemplate, GALLERY_OTP_TTL_MINUTES } from './galleryTranslations';

interface GalleryLoginModalProps {
  language: Language;
  onClose: () => void;
  onSuccess: (user: GalleryUser, remember: boolean, expiresAtMs?: number) => void;
}

type Step = 'email' | 'code';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 11px',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  fontSize: '0.95rem',
  color: '#1f2937',
  boxSizing: 'border-box',
  outline: 'none',
};

const primaryButtonStyle: React.CSSProperties = {
  width: '100%',
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
  cursor: 'pointer',
  transition: 'background-color 0.2s',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.72rem',
  fontWeight: 600,
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: '6px',
};

const GalleryLoginModal: React.FC<GalleryLoginModalProps> = ({ language, onClose, onSuccess }) => {
  const t = galleryTranslations[language];
  const isRTL = language === 'ar';

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [step]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await requestGalleryOtp(email.trim());
      setStep('code');
    } catch {
      setError(t.genericError);
    } finally {
      setLoading(false);
    }
  };

  const handleCodeSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await verifyGalleryOtp(email.trim(), code.trim(), remember);
      onSuccess(
        { id: result.id, email: result.email, token: result.token },
        remember,
        result.expiresAt,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t.genericError);
    } finally {
      setLoading(false);
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
      onClick={onClose}
    >
      <div
        dir={isRTL ? 'rtl' : 'ltr'}
        role="dialog"
        aria-modal="true"
        aria-label={t.loginTitle}
        style={{
          background: '#fff',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '380px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
          overflow: 'hidden',
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
          }}
        >
          <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#1f2937' }}>
            {t.loginTitle}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.close}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              borderRadius: '4px',
            }}
          >
            <X size={18} color="#6b7280" />
          </button>
        </div>

        <div style={{ padding: '20px' }}>
          {step === 'email' ? (
            <form onSubmit={handleEmailSubmit} style={{ display: 'grid', gap: '14px' }}>
              <p style={{ margin: 0, fontSize: '0.88rem', color: '#6b7280', lineHeight: 1.5 }}>
                {t.loginBlurb}
              </p>
              <div>
                <label htmlFor="gallery-auth-email" style={labelStyle}>
                  {t.emailLabel}
                </label>
                <input
                  ref={inputRef}
                  id="gallery-auth-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={t.emailPlaceholder}
                  dir="ltr"
                  style={inputStyle}
                  onFocus={e => { e.currentTarget.style.borderColor = '#2563eb'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#d1d5db'; }}
                />
              </div>
              {error && <p style={{ margin: 0, fontSize: '0.85rem', color: '#dc2626' }}>{error}</p>}
              <button
                type="submit"
                disabled={loading}
                style={{ ...primaryButtonStyle, opacity: loading ? 0.6 : 1 }}
              >
                {loading && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
                {loading ? t.sending : t.sendCode}
              </button>
            </form>
          ) : (
            <form onSubmit={handleCodeSubmit} style={{ display: 'grid', gap: '14px' }}>
              <p style={{ margin: 0, fontSize: '0.88rem', color: '#6b7280', lineHeight: 1.5 }}>
                {fillTemplate(t.codeBlurb, { email, minutes: GALLERY_OTP_TTL_MINUTES })}
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: '0.78rem',
                  color: '#92400e',
                  background: '#fffbeb',
                  border: '1px solid #fde68a',
                  borderRadius: '6px',
                  padding: '8px 10px',
                }}
              >
                {t.spamNote}
              </p>
              <div>
                <label htmlFor="gallery-auth-code" style={labelStyle}>
                  {t.codeLabel}
                </label>
                <input
                  ref={inputRef}
                  id="gallery-auth-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]*"
                  maxLength={6}
                  required
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  dir="ltr"
                  style={{
                    ...inputStyle,
                    textAlign: 'center',
                    letterSpacing: '0.4em',
                    fontSize: '1.3rem',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#2563eb'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#d1d5db'; }}
                />
              </div>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  color: '#4b5563',
                }}
              >
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={e => setRemember(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <span>{t.rememberDevice}</span>
              </label>
              {error && <p style={{ margin: 0, fontSize: '0.85rem', color: '#dc2626' }}>{error}</p>}
              <button
                type="submit"
                disabled={loading || code.length !== 6}
                style={{
                  ...primaryButtonStyle,
                  opacity: loading || code.length !== 6 ? 0.6 : 1,
                  cursor: loading || code.length !== 6 ? 'default' : 'pointer',
                }}
              >
                {loading && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
                {loading ? t.verifying : t.verify}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep('email');
                  setCode('');
                  setError('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#6b7280',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  padding: '2px',
                }}
              >
                {isRTL ? `${t.differentEmail} →` : `← ${t.differentEmail}`}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default GalleryLoginModal;
