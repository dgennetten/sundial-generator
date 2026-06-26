import React, { useState, useRef, useEffect } from 'react';
import { Text } from 'lucide-react';
import { languages } from './WelcomeDialog';

interface Props {
  dialTextBlock: string;
  setDialTextBlock: (v: string) => void;
  dialTextBlockFontSize: number;
  setDialTextBlockFontSize: (v: number) => void;
  dialTextBlockFontFamily: string;
  setDialTextBlockFontFamily: (v: string) => void;
  sundialNotesMode: string;
  setSundialNotesMode: (v: string) => void;
  sundialNotesPositionMode: 'auto' | 'manual';
  setSundialNotesPositionMode: (v: 'auto' | 'manual') => void;
  sundialNotesOffset: number;
  setSundialNotesOffset: (v: number) => void;
  sundialNotesOffsetHorizontal: number;
  setSundialNotesOffsetHorizontal: (v: number) => void;
  language: string;
  setLanguage: (v: string) => void;
}

const LanguagePicker: React.FC<{ language: string; setLanguage: (v: string) => void }> = ({ language, setLanguage }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = languages.find(l => l.code === language) ?? languages[0];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '5px 8px', border: '1px solid #d1d5db', borderRadius: '6px',
          background: '#fff', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap',
          minWidth: '130px',
        }}
      >
        <img
          src={`https://flagicons.lipis.dev/flags/4x3/${current.countryCode}.svg`}
          alt={current.name}
          style={{ width: '20px', height: '15px', objectFit: 'cover', borderRadius: '2px' }}
        />
        {current.name}
        <span style={{ marginLeft: 'auto', fontSize: '10px', color: '#6b7280' }}>▾</span>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, zIndex: 100,
          background: '#fff', border: '1px solid #d1d5db', borderRadius: '6px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.12)', marginTop: '2px',
          minWidth: '150px', maxHeight: '260px', overflowY: 'auto',
        }}>
          {languages.map(l => (
            <button
              key={l.code}
              type="button"
              onClick={() => { setLanguage(l.code); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                width: '100%', padding: '6px 10px', border: 'none', textAlign: 'left',
                background: l.code === language ? '#eff6ff' : 'transparent',
                cursor: 'pointer', fontSize: '13px',
              }}
            >
              <img
                src={`https://flagicons.lipis.dev/flags/4x3/${l.countryCode}.svg`}
                alt={l.name}
                style={{ width: '20px', height: '15px', objectFit: 'cover', borderRadius: '2px' }}
              />
              {l.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const DialTextBlockSettings: React.FC<Props> = ({
  dialTextBlock,
  setDialTextBlock,
  dialTextBlockFontSize,
  setDialTextBlockFontSize,
  dialTextBlockFontFamily,
  setDialTextBlockFontFamily,
  sundialNotesMode,
  setSundialNotesMode,
  sundialNotesPositionMode,
  setSundialNotesPositionMode,
  sundialNotesOffset,
  setSundialNotesOffset,
  sundialNotesOffsetHorizontal,
  setSundialNotesOffsetHorizontal,
  language,
  setLanguage,
}) => {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">
          <Text color="#2563eb" size={20} style={{ marginRight: 6 }} /> Decoration
        </h3>
      </div>
      <div className="card-content">
        <div className="form-group">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label className="form-radio">
              <input
                type="radio"
                name="sundialNotesMode"
                value="none"
                checked={sundialNotesMode === 'none'}
                onChange={(e) => setSundialNotesMode(e.target.value)}
              />
              None
            </label>
            <label className="form-radio">
              <input
                type="radio"
                name="sundialNotesMode"
                value="northPoint"
                checked={sundialNotesMode === 'northPoint'}
                onChange={(e) => setSundialNotesMode(e.target.value)}
              />
              Compass Rose
            </label>
            <label className="form-radio">
              <input
                type="radio"
                name="sundialNotesMode"
                value="seasonsGuide"
                checked={sundialNotesMode === 'seasonsGuide'}
                onChange={(e) => setSundialNotesMode(e.target.value)}
              />
              Seasons Guide
            </label>
            <label className="form-radio">
              <input
                type="radio"
                name="sundialNotesMode"
                value="textBlock"
                checked={sundialNotesMode === 'textBlock'}
                onChange={(e) => setSundialNotesMode(e.target.value)}
              />
              Text Block
            </label>
          </div>
        </div>

        {/* Position controls - shown for all modes except 'none' */}
        {sundialNotesMode !== 'none' && (
          <div className="form-group">
            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-end' }}>
              <div className="form-group" style={{ flex: '0 0 auto' }}>
                <label className="form-label">Position</label>
                <select
                  className="form-select"
                  value={sundialNotesPositionMode}
                  onChange={(e) => setSundialNotesPositionMode(e.target.value as 'auto' | 'manual')}
                  style={{
                    width: '100px',
                    backgroundColor: sundialNotesPositionMode === 'manual' ? '#dbeafe' : undefined,
                  }}
                >
                  <option value="auto">Auto</option>
                  <option value="manual">Manual</option>
                </select>
              </div>
              {sundialNotesPositionMode === 'manual' && (
                <>
                  <div className="form-group" style={{ flex: '0 0 auto' }}>
                    <label className="form-label">Vertical (mm)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={sundialNotesOffset}
                      onChange={(e) => setSundialNotesOffset(Number(e.target.value))}
                      step={1}
                      style={{ width: '80px' }}
                    />
                  </div>
                  <div className="form-group" style={{ flex: '0 0 auto' }}>
                    <label className="form-label">Horizontal (mm)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={sundialNotesOffsetHorizontal}
                      onChange={(e) => setSundialNotesOffsetHorizontal(Number(e.target.value))}
                      step={1}
                      style={{ width: '80px' }}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {sundialNotesMode === 'seasonsGuide' && (
          <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ flex: '0 0 auto' }}>
              <label className="form-label">Font Size (pt)</label>
              <input
                type="number"
                className="form-input"
                min={4}
                max={24}
                value={dialTextBlockFontSize}
                onChange={(e) => setDialTextBlockFontSize(Number(e.target.value))}
                style={{ width: '80px' }}
              />
            </div>
            <div className="form-group" style={{ flex: '1 1 auto' }}>
              <label className="form-label">Font Family</label>
              <select
                className="form-select"
                value={dialTextBlockFontFamily}
                onChange={(e) => setDialTextBlockFontFamily(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="sans-serif">Sans-serif</option>
                <option value="serif">Serif</option>
                <option value="monospace">Monospace</option>
                <option value="Arial">Arial</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Georgia">Georgia</option>
                <option value="Courier New">Courier New</option>
              </select>
            </div>
            <div className="form-group" style={{ flex: '0 0 auto' }}>
              <label className="form-label">Language</label>
              <LanguagePicker language={language} setLanguage={setLanguage} />
            </div>
          </div>
        )}

        {sundialNotesMode === 'textBlock' && (
          <>
            <div className="form-group">
              <label className="form-label">
                <span>Text Content</span>{' '}
                <span style={{ fontSize: '0.9em', color: '#718096' }}>
                  (supports {"{location}"}, {"{latitude}"}, {"{longitude}"}, {"{half-year}"}, {"{gnomon}"}, {"{incline}"}, {"{decline}"}, {"{today}"}; markup: **bold**, *italic*; color prefix: [red], [blue], [teal]…), or any text you desire.
                </span>
              </label>
              <textarea
                className="form-input"
                rows={5}
                value={dialTextBlock}
                onChange={(e) => setDialTextBlock(e.target.value)}
                style={{
                  width: '100%',
                  fontFamily: dialTextBlockFontFamily,
                  fontSize: '12pt',
                  maxWidth: '100%',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-end' }}>
              <div className="form-group" style={{ flex: '0 0 auto' }}>
                <label className="form-label">Font Size (pt)</label>
                <input
                  type="number"
                  className="form-input"
                  min={4}
                  max={24}
                  value={dialTextBlockFontSize}
                  onChange={(e) => setDialTextBlockFontSize(Number(e.target.value))}
                  style={{ width: '80px' }}
                />
              </div>
              <div className="form-group" style={{ flex: '1 1 auto' }}>
                <label className="form-label">Font Family</label>
                <select
                  className="form-select"
                  value={dialTextBlockFontFamily}
                  onChange={(e) => setDialTextBlockFontFamily(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="sans-serif">Sans-serif</option>
                  <option value="serif">Serif</option>
                  <option value="monospace">Monospace</option>
                  <option value="Arial">Arial</option>
                  <option value="Times New Roman">Times New Roman</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Courier New">Courier New</option>
                </select>
              </div>
              <div className="form-group" style={{ flex: '0 0 auto' }}>
                <label className="form-label">Language</label>
                <LanguagePicker language={language} setLanguage={setLanguage} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default React.memo(DialTextBlockSettings);
