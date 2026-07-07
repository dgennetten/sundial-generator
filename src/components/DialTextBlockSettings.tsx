import React from 'react';
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
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginTop: '0.25rem'
                }}>
                  <span style={{
                    fontSize: '0.875rem',
                    color: sundialNotesPositionMode === 'auto' ? '#2563eb' : '#9ca3af',
                    fontWeight: sundialNotesPositionMode === 'auto' ? '600' : '400',
                    transition: 'all 0.2s'
                  }}>Auto</span>
                  <label style={{
                    position: 'relative',
                    display: 'inline-block',
                    width: '44px',
                    height: '24px',
                    cursor: 'pointer'
                  }}>
                    <input
                      type="checkbox"
                      checked={sundialNotesPositionMode === 'manual'}
                      onChange={(e) => setSundialNotesPositionMode(e.target.checked ? 'manual' : 'auto')}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: sundialNotesPositionMode === 'manual' ? '#2563eb' : '#cbd5e0',
                      borderRadius: '24px',
                      transition: 'background-color 0.3s',
                      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
                    }}>
                      <span style={{
                        position: 'absolute',
                        content: '""',
                        height: '18px',
                        width: '18px',
                        left: sundialNotesPositionMode === 'manual' ? '22px' : '3px',
                        bottom: '3px',
                        backgroundColor: 'white',
                        borderRadius: '50%',
                        transition: 'left 0.3s',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                      }} />
                    </span>
                  </label>
                  <span style={{
                    fontSize: '0.875rem',
                    color: sundialNotesPositionMode === 'manual' ? '#2563eb' : '#9ca3af',
                    fontWeight: sundialNotesPositionMode === 'manual' ? '600' : '400',
                    transition: 'all 0.2s'
                  }}>Manual</span>
                </div>
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
        
        {/* Conditional content based on selected mode */}
        
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
              <select
                className="form-select"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                {languages.map(l => (
                  <option key={l.code} value={l.code}>{l.flag} {l.name}</option>
                ))}
              </select>
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
                <select
                  className="form-select"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  {languages.map(l => (
                    <option key={l.code} value={l.code}>{l.flag} {l.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default React.memo(DialTextBlockSettings);

