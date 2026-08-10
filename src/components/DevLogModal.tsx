import React, { useState } from 'react';
import { X, Rss } from 'lucide-react';
import { LOG_ENTRIES, setLogPref, type LogPref } from '../lib/devLog';

function renderContent(text: string): React.ReactNode {
  // Tokenize on **bold** and [label](url) links, keeping the delimiters.
  const parts = text.split(/(\*\*.+?\*\*|\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, i) => {
    const bold = /^\*\*(.+)\*\*$/.exec(part);
    if (bold) return <strong key={i}>{bold[1]}</strong>;
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (link) return (
      <a key={i} href={link[2]} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', fontWeight: 600 }}>
        {link[1]}
      </a>
    );
    return part;
  });
}

interface DevLogModalProps {
  onClose: () => void;
}

type DismissChoice = 'until-new' | 'never';

const DevLogModal: React.FC<DevLogModalProps> = ({ onClose }) => {
  const [choice, setChoice] = useState<DismissChoice>('until-new');

  const latest = LOG_ENTRIES[LOG_ENTRIES.length - 1];
  const older = [...LOG_ENTRIES].reverse().slice(1);

  function formatDate(iso: string) {
    return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
    });
  }

  function handleDismiss() {
    if (choice === 'never') {
      setLogPref({ mode: 'never' });
    } else {
      setLogPref({ mode: 'until-new', lastSeenId: latest.id } satisfies LogPref);
    }
    onClose();
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '16px',
        boxSizing: 'border-box',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '360px',
          background: '#fff',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '85vh',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px 12px',
            borderBottom: '1px solid #e5e7eb',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '6px',
                background: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Rss size={14} color="#fff" strokeWidth={2} />
            </div>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
              Developer's Log
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              color: '#9ca3af',
            }}
            aria-label="Close without saving preference"
            onMouseEnter={(e) => { e.currentTarget.style.background = '#f3f4f6'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        {/* Scrollable entries */}
        <div
          style={{
            flex: '1 1 auto',
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            minHeight: 0,
            maxHeight: 'min(52vh, 420px)',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {/* Latest entry */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#2563eb' }}>
                Latest
              </span>
              <span style={{ fontSize: '10px', color: '#9ca3af' }}>{formatDate(latest.date)}</span>
            </div>
            <p style={{ fontSize: '14px', color: '#1f2937', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-line' }}>
              {renderContent(latest.content)}
            </p>
          </div>

          {/* Older entries */}
          {older.map((entry) => (
            <div
              key={entry.id}
              style={{ paddingTop: '12px', borderTop: '1px solid #f3f4f6' }}
            >
              <span style={{ fontSize: '10px', color: '#9ca3af', display: 'block', marginBottom: '6px' }}>
                {formatDate(entry.date)}
              </span>
              <p style={{ fontSize: '14px', color: '#6b7280', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-line' }}>
                {renderContent(entry.content)}
              </p>
            </div>
          ))}
        </div>

        {/* Dismiss options */}
        <div
          style={{
            padding: '16px 20px',
            borderTop: '1px solid #e5e7eb',
            flexShrink: 0,
          }}
        >
          <p style={{ fontSize: '12px', fontWeight: 500, color: '#6b7280', margin: '0 0 8px 0' }}>
            When would you like to see this again?
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
              <input
                type="radio"
                name="log-dismiss"
                checked={choice === 'until-new'}
                onChange={() => setChoice('until-new')}
                style={{ marginTop: '2px', accentColor: '#2563eb' }}
              />
              <span style={{ fontSize: '12px', color: '#374151', lineHeight: 1.5 }}>
                Only when there's something new
              </span>
            </label>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
              <input
                type="radio"
                name="log-dismiss"
                checked={choice === 'never'}
                onChange={() => setChoice('never')}
                style={{ marginTop: '2px', accentColor: '#2563eb' }}
              />
              <span style={{ fontSize: '12px', color: '#374151', lineHeight: 1.5 }}>
                Never — don't show again
                <span style={{ display: 'block', fontSize: '10px', color: '#9ca3af' }}>
                  Restore anytime in the About card
                </span>
              </span>
            </label>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={handleDismiss}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '6px',
                background: '#2563eb',
                border: 'none',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#1d4ed8'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#2563eb'; }}
            >
              Got it
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                background: 'none',
                border: 'none',
                fontSize: '12px',
                color: '#6b7280',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#f3f4f6'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DevLogModal;
