import React from 'react';
import { Text } from 'lucide-react';

interface Props {
  dialTextBlock: string;
  setDialTextBlock: (v: string) => void;
  dialTextBlockFontSize: number;
  setDialTextBlockFontSize: (v: number) => void;
  dialTextBlockFontFamily: string;
  setDialTextBlockFontFamily: (v: string) => void;
  sundialNotesMode: string;
  setSundialNotesMode: (v: string) => void;
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
}) => {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">
          <Text color="#2563eb" size={20} style={{ marginRight: 6 }} /> Sundial Notes
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
          </div>
        )}
        
        {sundialNotesMode === 'textBlock' && (
          <>
            <div className="form-group">
              <label className="form-label">
                Text (supports {"{location}"}, {"{coordinates}"}, {"{half-year}"}, {"{gnomon}"}, {"{today}"} and some Markup codes)
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
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default React.memo(DialTextBlockSettings);

