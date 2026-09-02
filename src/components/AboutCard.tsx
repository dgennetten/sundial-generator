import React, { useState } from 'react';
import { Info, Instagram, Mail, Coffee, Github, Globe, Send, Rss } from 'lucide-react';
import BuildDate from './BuildDate';
import { sendFeedback } from '../utils/feedbackUtils';

interface AboutCardProps {
  latitude: number;
  longitude: number;
  locationName: string;
  onShowDevLog?: () => void;
}

const FEEDBACK_PLACEHOLDER =
  "Tell me what you like, want to see, etc. Include your email if you'd like to start up a conversation.";

const AboutCard: React.FC<AboutCardProps> = ({
  latitude,
  longitude,
  locationName,
  onShowDevLog,
}) => {
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackStatus, setFeedbackStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [feedbackError, setFeedbackError] = useState('');

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = feedbackMessage.trim();
    if (!trimmed) return;

    setFeedbackStatus('sending');
    setFeedbackError('');

    const result = await sendFeedback({
      message: trimmed,
      latitude,
      longitude,
      locationName,
    });

    if (result.success) {
      setFeedbackMessage('');
      setFeedbackStatus('success');
    } else {
      setFeedbackStatus('error');
      setFeedbackError(result.error || 'Failed to send feedback.');
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">
          <Info color="#2563eb" size={20} style={{ marginRight: 6 }} /> About
        </h3>
      </div>
      <div className="card-content">
        <form
          onSubmit={handleFeedbackSubmit}
          style={{
            width: '100%',
            marginBottom: '1rem',
            paddingBottom: '1rem',
            borderBottom: '1px solid #e2e8f0',
            boxSizing: 'border-box',
          }}
        >
          <div className="form-group" style={{ width: '100%' }}>
            <label className="form-label" htmlFor="feedback-message">
              Send Feedback
            </label>
            <textarea
              id="feedback-message"
              className="form-input form-textarea"
              rows={2}
              value={feedbackMessage}
              onChange={(e) => {
                setFeedbackMessage(e.target.value);
                if (feedbackStatus === 'success' || feedbackStatus === 'error') {
                  setFeedbackStatus('idle');
                  setFeedbackError('');
                }
              }}
              placeholder={FEEDBACK_PLACEHOLDER}
              disabled={feedbackStatus === 'sending'}
              maxLength={5000}
            />
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '0.5rem',
              gap: '0.75rem',
            }}
          >
            <div style={{ fontSize: '0.8rem', color: '#718096', minHeight: '1.25rem' }}>
              {feedbackStatus === 'success' && (
                <span style={{ color: '#059669' }}>Thanks — your feedback was sent.</span>
              )}
              {feedbackStatus === 'error' && (
                <span style={{ color: '#dc2626' }}>{feedbackError}</span>
              )}
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={feedbackStatus === 'sending' || !feedbackMessage.trim()}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Send size={16} />
              {feedbackStatus === 'sending' ? 'Sending…' : 'Send'}
            </button>
          </div>
        </form>
        <div
          style={{
            backgroundColor: '#fefce8',
            color: '#7c2d12',
            padding: '8px 12px',
            borderRadius: '6px',
            marginBottom: '16px',
            fontSize: '14px',
            fontWeight: '500',
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: '13px',
              fontWeight: 500,
              lineHeight: 1.45,
            }}
          >
            My recently recorded talk for the{' '}
            <a
              href="https://www.youtube.com/playlist?list=PLXnHqH5AQBFzrIZiU6j2GuJqNQylxht3w"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#b45309', textDecoration: 'underline', fontWeight: 600 }}
            >
              World Sundial Day / Global Sundial Day online conference
            </a>{' '}
            is available in the official YouTube playlist.
          </p>
          <p
            style={{
              margin: '8px 0 0 0',
              fontSize: '13px',
              fontWeight: 500,
              lineHeight: 1.45,
            }}
          >
            My 2026 NASS Talk:{' '}
            <a
              href="https://www.youtube.com/watch?v=4yRfAHHYbLI"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#b45309', textDecoration: 'underline', fontWeight: 600 }}
            >
              &ldquo;Public Nodus: Everything You Know about Precision is Pointless&rdquo;
            </a>
          </p>
        </div>
        <div
          dangerouslySetInnerHTML={{
            __html: `
  This App traces its origins back to a gloriously nerdy gem—the
  <a href="https://precisionsundial.com/docs/1980-12-SundialArticle.pdf" target="_blank" rel="noopener noreferrer">Amateur Scientist column</a>
  from the December 1980 issue of Scientific American.
  Back then, my first sundial app was coded with love (and
  <a href="https://www.hp9845.net/9845/software/basic/" target="_blank" rel="noopener noreferrer">Rocky Mountain Basic</a>
  ) on an
  <a href="https://www.hp9845.net/" target="_blank" rel="noopener noreferrer">HP9845</a>
    desktop workstation, which was basically a space shuttle cockpit compared to the future IBM PC toddlers.

  Not content with digital wizardry alone,
  like a caffinated Da Vinci, I scribbled out two pages of hand-drawn
  <a href="https://precisionsundial.com/docs/AnalemmaIllustrationFromJune1985.pdf" target="_blank" rel="noopener noreferrer">instructional</a>,
  <a href="https://precisionsundial.com/docs/SundialIllustrationFromJune1985.pdf" target="_blank" rel="noopener noreferrer">illustrations</a>.
</p>
<p>The sundial generator uses the
<a href="https://academic.oup.com/mnras/article/238/4/1529/1037665" target="_blank" rel="noopener noreferrer">Hughes, Yallop & Hohenkerk</a>
algorithm which "enables it to be calculated for any epoch within 30 centuries of the present day, to a precision of about 3 seconds of time."
</p>
`,
          }}
        />
        {/* Developer's Log */}
        {onShowDevLog && (
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={onShowDevLog}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  fontSize: '13px',
                  color: '#2563eb',
                  textDecoration: 'underline',
                }}
              >
                <Rss size={14} color="#2563eb" />
                Developer's Log
              </button>
            </div>
          </div>
        )}

        {/* Bottom row with build date and social icons */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '1rem',
          }}
        >
          <BuildDate />
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <a
              href="https://buymeacoffee.com/dgennetten"
              target="_blank"
              rel="noopener noreferrer"
              title="Buy me a Coffee!"
              style={{
                color: '#2563eb',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              <Coffee size={22} color="#2563eb" style={{ verticalAlign: 'middle' }} />
            </a>
            <a
              href="https://github.com/dgennetten/sundial-generator"
              target="_blank"
              rel="noopener noreferrer"
              title="View Source Code on GitHub"
              style={{
                color: '#2563eb',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              <Github size={22} color="#2563eb" style={{ verticalAlign: 'middle' }} />
            </a>
            <a
              href="https://douglas.gennetten.com"
              target="_blank"
              rel="noopener noreferrer"
              title="Douglas Gennetten — douglas.gennetten.com"
              style={{
                color: '#2563eb',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              <Globe size={22} color="#2563eb" style={{ verticalAlign: 'middle' }} />
            </a>
            <a
              href="mailto:douglas@gennetten.org?subject=Sundial%20Feedback"
              title="eMail the Author"
              style={{
                color: '#2563eb',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              <Mail size={22} color="#2563eb" style={{ verticalAlign: 'middle' }} />
            </a>
            <a
              href="https://instagram.com/dgennetten"
              target="_blank"
              rel="noopener noreferrer"
              title="Follow @dgennetten on Instagram"
              style={{
                color: '#2563eb',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              <Instagram size={22} color="#2563eb" style={{ verticalAlign: 'middle' }} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(AboutCard);
