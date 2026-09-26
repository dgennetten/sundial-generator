// src/components/FeedbackNudgeModal.tsx
import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { Camera, Send, X } from 'lucide-react';
import { sendFeedback, type FeedbackRating } from '../utils/feedbackUtils';

interface FeedbackNudgeModalProps {
  latitude?: number;
  longitude?: number;
  locationName?: string;
  format?: string;
  onClose: () => void;
  onDismiss: () => void;
  onSubmitted: () => void;
  onOpenPhotos: () => void;
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  background: 'rgba(0,0,0,0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  fontFamily: 'system-ui, Avenir, Helvetica, Arial, sans-serif',
};

const cardStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: 8,
  padding: 24,
  minWidth: 320,
  maxWidth: 'min(90vw, 460px)',
  width: '100%',
  boxShadow: '0 2px 16px rgba(0,0,0,0.2)',
  position: 'relative',
  boxSizing: 'border-box',
};

const primaryButtonStyle: React.CSSProperties = {
  padding: '8px 16px',
  backgroundColor: '#2563eb',
  border: '1px solid #2563eb',
  color: 'white',
  cursor: 'pointer',
  borderRadius: 6,
  fontSize: '0.9rem',
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: '8px 16px',
  backgroundColor: '#f3f4f6',
  border: '1px solid #d1d5db',
  color: '#374151',
  cursor: 'pointer',
  borderRadius: 6,
  fontSize: '0.9rem',
};

const FeedbackNudgeModal: React.FC<FeedbackNudgeModalProps> = ({
  latitude,
  longitude,
  locationName,
  format,
  onClose,
  onDismiss,
  onSubmitted,
  onOpenPhotos,
}) => {
  const [step, setStep] = useState<'rate' | 'details' | 'done'>('rate');
  const [rating, setRating] = useState<FeedbackRating | null>(null);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [followUp, setFollowUp] = useState(true);
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');
  const [didSubmit, setDidSubmit] = useState(false);

  const context = {
    latitude: latitude ?? 0,
    longitude: longitude ?? 0,
    locationName: locationName ?? '',
    format: format ?? '',
    source: 'export-nudge' as const,
  };

  const handleRating = async (nextRating: FeedbackRating) => {
    setRating(nextRating);
    setStatus('sending');
    setError('');

    const result = await sendFeedback({
      ...context,
      rating: nextRating,
      event: 'nudge_rated',
    });

    if (result.success) {
      setDidSubmit(true);
      onSubmitted();
      setStatus('idle');
      setStep('details');
    } else {
      setStatus('error');
      setError(result.error || 'Failed to send feedback.');
    }
  };

  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedMessage = message.trim();
    const trimmedEmail = email.trim();
    if (!trimmedMessage && !trimmedEmail) {
      setStep('done');
      return;
    }

    setStatus('sending');
    setError('');

    const result = await sendFeedback({
      ...context,
      rating: rating ?? undefined,
      message: trimmedMessage,
      email: trimmedEmail,
      followUp: Boolean(trimmedEmail && followUp),
      event: trimmedMessage ? 'nudge_commented' : 'nudge_rated',
    });

    if (result.success) {
      setDidSubmit(true);
      onSubmitted();
      setStatus('success');
      setStep('done');
    } else {
      setStatus('error');
      setError(result.error || 'Failed to send feedback.');
    }
  };

  const handleRequestClose = () => {
    if (!didSubmit) {
      onDismiss();
    }
    onClose();
  };

  return ReactDOM.createPortal(
    <div style={overlayStyle} onClick={handleRequestClose}>
      <div style={cardStyle} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={handleRequestClose}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: '#9ca3af',
            padding: 4,
            lineHeight: 0,
          }}
        >
          <X size={18} />
        </button>

        {step === 'rate' && (
          <div>
            <h3 style={{ margin: '0 24px 8px 0', fontSize: '1.1rem', color: '#111827' }}>
              Did the file look right?
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '0.9rem', lineHeight: 1.45, color: '#4b5563' }}>
              A one-tap answer helps a lot. You can add details next if you want.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button
                type="button"
                style={primaryButtonStyle}
                disabled={status === 'sending'}
                onClick={() => void handleRating('worked')}
              >
                {status === 'sending' ? 'Sending…' : 'It worked'}
              </button>
              <button
                type="button"
                style={{ ...secondaryButtonStyle, borderColor: '#fca5a5', color: '#b91c1c' }}
                disabled={status === 'sending'}
                onClick={() => void handleRating('problem')}
              >
                Had a problem
              </button>
              <button type="button" style={secondaryButtonStyle} onClick={handleRequestClose}>
                Skip
              </button>
            </div>
            {status === 'error' && (
              <p style={{ margin: '12px 0 0 0', fontSize: '0.8rem', color: '#dc2626' }}>{error}</p>
            )}
          </div>
        )}

        {step === 'details' && (
          <form onSubmit={handleDetailsSubmit}>
            <h3 style={{ margin: '0 24px 8px 0', fontSize: '1.1rem', color: '#111827' }}>
              {rating === 'problem' ? 'What went wrong?' : 'Anything I should know?'}
            </h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.9rem', lineHeight: 1.45, color: '#4b5563' }}>
              Optional — a note, your email if you want a reply, or a photo once you build it.
            </p>
            <textarea
              className="form-input form-textarea"
              rows={3}
              autoFocus
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                if (status === 'error') {
                  setStatus('idle');
                  setError('');
                }
              }}
              placeholder={rating === 'problem' ? 'What should I look at?' : 'Ideas, praise, or a quick note…'}
              disabled={status === 'sending'}
              maxLength={5000}
              style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical' }}
            />
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email (optional)"
              disabled={status === 'sending'}
              autoComplete="email"
              style={{ width: '100%', boxSizing: 'border-box', marginTop: 8 }}
            />
            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                marginTop: 10,
                fontSize: '0.85rem',
                color: '#4b5563',
                cursor: email.trim() ? 'pointer' : 'default',
              }}
            >
              <input
                type="checkbox"
                checked={followUp && Boolean(email.trim())}
                disabled={!email.trim() || status === 'sending'}
                onChange={(e) => setFollowUp(e.target.checked)}
                style={{ marginTop: 2 }}
              />
              Remind me in a few days how the sundial turned out
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '0.75rem',
                gap: '0.75rem',
                flexWrap: 'wrap',
              }}
            >
              <button
                type="button"
                onClick={onOpenPhotos}
                style={{
                  ...secondaryButtonStyle,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Camera size={16} />
                Photos
              </button>
              <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                  }}
                  style={secondaryButtonStyle}
                >
                  Done
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={status === 'sending' || (!message.trim() && !email.trim())}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Send size={16} />
                  {status === 'sending' ? 'Sending…' : 'Send'}
                </button>
              </div>
            </div>
            {status === 'error' && (
              <p style={{ margin: '8px 0 0 0', fontSize: '0.8rem', color: '#dc2626' }}>{error}</p>
            )}
          </form>
        )}

        {step === 'done' && (
          <div>
            <h3 style={{ margin: '0 24px 8px 0', fontSize: '1.1rem', color: '#111827' }}>
              Thank you
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '0.9rem', lineHeight: 1.45, color: '#059669' }}>
              {rating === 'problem'
                ? 'Got it — I will take a look.'
                : 'Your note was sent. When you build the dial, a photo is the nicest follow-up.'}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={onOpenPhotos}
                style={{ ...secondaryButtonStyle, display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Camera size={16} />
                Add a photo
              </button>
              <button type="button" onClick={onClose} style={primaryButtonStyle}>
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};

export default FeedbackNudgeModal;
