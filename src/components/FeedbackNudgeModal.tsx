// src/components/FeedbackNudgeModal.tsx
import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { Send, X } from 'lucide-react';
import { sendFeedback } from '../utils/feedbackUtils';

interface FeedbackNudgeModalProps {
  latitude?: number;
  longitude?: number;
  locationName?: string;
  onClose: () => void;
}

// Shown once per session, after the user's *second* successful export/print — the moment
// of highest engagement, once they've had a chance to open and review a printout. Reuses
// the same sendFeedback() pipeline as the About card's feedback form.
const FeedbackNudgeModal: React.FC<FeedbackNudgeModalProps> = ({
  latitude,
  longitude,
  locationName,
  onClose,
}) => {
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) return;

    setStatus('sending');
    setError('');

    const result = await sendFeedback({
      message: trimmed,
      latitude: latitude ?? 0,
      longitude: longitude ?? 0,
      locationName: locationName ?? '',
    });

    if (result.success) {
      setMessage('');
      setStatus('success');
    } else {
      setStatus('error');
      setError(result.error || 'Failed to send feedback.');
    }
  };

  return ReactDOM.createPortal(
    <div
      style={{
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
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 8,
          padding: 24,
          minWidth: 340,
          maxWidth: 'min(90vw, 460px)',
          boxShadow: '0 2px 16px rgba(0,0,0,0.2)',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
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

        {status === 'success' ? (
          <div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', color: '#111827' }}>
              Thank you! 🌞
            </h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '0.9rem', lineHeight: 1.45, color: '#059669' }}>
              Your feedback was sent — I really appreciate it.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#2563eb',
                  border: '1px solid #2563eb',
                  color: 'white',
                  cursor: 'pointer',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                }}
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h3 style={{ margin: '0 24px 8px 0', fontSize: '1.1rem', color: '#111827' }}>
              Nice — your sundial is ready to build!
            </h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.9rem', lineHeight: 1.45, color: '#4b5563' }}>
              I'd love to hear how it goes. Bugs, ideas, or just how it turned out — anything
              helps. (Feel free to include your email if you'd like a reply.)
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
              placeholder="How did it go? What could be better?"
              disabled={status === 'sending'}
              maxLength={5000}
              style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical' }}
            />
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '0.75rem',
                gap: '0.75rem',
              }}
            >
              <div style={{ fontSize: '0.8rem', color: '#718096', minHeight: '1.25rem' }}>
                {status === 'error' && <span style={{ color: '#dc2626' }}>{error}</span>}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#f3f4f6',
                    border: '1px solid #d1d5db',
                    color: '#374151',
                    cursor: 'pointer',
                    borderRadius: '6px',
                    fontSize: '0.9rem',
                  }}
                >
                  Maybe later
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={status === 'sending' || !message.trim()}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Send size={16} />
                  {status === 'sending' ? 'Sending…' : 'Send'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
};

export default FeedbackNudgeModal;
