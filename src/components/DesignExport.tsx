// src/components/DesignExport.tsx
import React, { useState } from 'react';
import type { LineStyle } from './LineSettings';
import { Save } from 'lucide-react';
import { exportSundial, type ExportFormat, type PageSize } from '../utils/exportUtils';

// Utility to convert named color to hex
function colorToHex(color: string): string {
  const ctx = document.createElement('canvas').getContext('2d');
  if (!ctx) return '#fff8dc';
  ctx.fillStyle = '#fff8dc'; // fallback
  ctx.fillStyle = color;
  // If the browser accepts the color, ctx.fillStyle will be a hex string
  const computed = ctx.fillStyle;
  // If the color is not valid, fallback to cornsilk
  if (computed === '' || computed === undefined) return '#fff8dc';
  // If already hex, return as is
  if (computed.startsWith('#')) return computed;
  // Otherwise, fallback
  return '#fff8dc';
}



interface DesignExportProps {
  onBorderChange: (showBorder: boolean, margin: number, borderStyle: string) => void;
  onBackgroundChange: (showBackground: boolean, backgroundColor: string) => void;
  lineStyles: LineStyle[];
  pageSize: PageSize;
  orientation: 'Landscape' | 'Portrait';
}



const DesignExport: React.FC<DesignExportProps> = ({ onBorderChange, onBackgroundChange, lineStyles, pageSize, orientation }) => {
  const [format, setFormat] = useState<ExportFormat>('PNG');
  const [showBorder, setShowBorder] = useState<boolean>(true);
  const [margin, setMargin] = useState<number>(6); // in mm
  const [borderStyle, setBorderStyle] = useState<string>('default-hairline');
  const [showBackground, setShowBackground] = useState<boolean>(true);
  const [backgroundColor, setBackgroundColor] = useState<string>('Cornsilk');
  const [dpi, setDpi] = useState<number>(600);

  const handleBorderChange = (checked: boolean) => {
    setShowBorder(checked);
    onBorderChange(checked, margin, borderStyle);
  };

  const handleMarginChange = (newMargin: number) => {
    setMargin(newMargin);
    onBorderChange(showBorder, newMargin, borderStyle);
  };

  const handleBorderStyleChange = (newStyle: string) => {
    setBorderStyle(newStyle);
    onBorderChange(showBorder, margin, newStyle);
  };

  const handleBackgroundChange = (checked: boolean) => {
    setShowBackground(checked);
    onBackgroundChange(checked, backgroundColor);
  };

  const handleBackgroundColorChange = (newColor: string) => {
    setBackgroundColor(newColor);
    onBackgroundChange(showBackground, newColor);
  };

  const handleExport = async () => {
    try {
      await exportSundial({
        format,
        pageSize,
        orientation,
        dpi: format === 'PNG' ? dpi : undefined,
        showBackground,
        backgroundColor,
      });
    } catch (error) {
      console.error('Export failed:', error);
      // You could add user-facing error handling here, like showing a toast notification
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title"><Save color="#2563eb" size={20} style={{marginRight: 6}} /> Design & Export</h3>
      </div>
      <div className="card-content">
        <div className="form-group">
          {/* Removed Show Location checkbox */}
        </div>

        {/* Page Border checkbox on its own row */}
        <div className="form-row" style={{ marginTop: '0.5rem' }}>
          <div className="form-group">
            <label className="form-checkbox">
              <input
                type="checkbox"
                checked={showBorder}
                onChange={(e) => handleBorderChange(e.target.checked)}
              />
              Page Border
            </label>
          </div>
        </div>
        
        {/* Border Style and Margin on the same line */}
        <div className="form-row" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <label className="form-label" htmlFor="border-style" style={{ margin: 0 }}>Border Style</label>
            <select
              id="border-style"
              className="form-select"
              value={borderStyle}
              onChange={(e) => handleBorderStyleChange(e.target.value)}
            >
              {lineStyles.filter(s => s.name && s.name.trim()).map(style => (
                <option key={style.id || style.name} value={style.id || style.name}>{style.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <label className="form-label" htmlFor="border-margin" style={{ margin: 0 }}>Margin (mm)</label>
            <input
              id="border-margin"
              type="number"
              className="form-input"
              min={1}
              max={50}
              step={1}
              value={margin}
              onChange={(e) => handleMarginChange(parseFloat(e.target.value) || 6)}
              style={{ width: '60px' }}
            />
          </div>
        </div>
        {/* Page Background row (now second) */}
        <div className="form-row">
          <div className="form-group">
            <label className="form-checkbox" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                checked={showBackground}
                onChange={(e) => handleBackgroundChange(e.target.checked)}
              />
              Page Background
              {showBackground && (
                <>
                  <input
                    type="text"
                    className="form-input"
                    value={backgroundColor}
                    onChange={(e) => handleBackgroundColorChange(e.target.value)}
                    style={{ width: '80px', fontSize: '0.9rem', marginLeft: '0.75rem' }}
                    placeholder="Cornsilk"
                    title="Enter color name or hex value"
                  />
                  <input
                    type="color"
                    value={colorToHex(backgroundColor)}
                    onChange={(e) => handleBackgroundColorChange(e.target.value)}
                    style={{
                      width: '30px',
                      height: '30px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      marginLeft: '0.25rem'
                    }}
                    title="Click to pick color"
                  />
                </>
              )}
            </label>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Export Format</label>
            <select 
              className="form-select"
              value={format} 
              onChange={(e) => setFormat(e.target.value as ExportFormat)}
            >
              <option value="SVG">SVG</option>
              <option value="PNG">PNG</option>
              <option value="PDF">PDF</option>
            </select>
          </div>
          {/* DPI input, only show for PNG */}
          {format === 'PNG' && (
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <label htmlFor="dpi-input" style={{ margin: 0 }}>DPI:</label>
              <input
                id="dpi-input"
                type="number"
                className="form-input"
                min={72}
                max={2400}
                step={1}
                value={dpi}
                onChange={e => setDpi(parseInt(e.target.value) || 600)}
                style={{ width: '70px' }}
              />
            </div>
          )}
          <div className="form-group" style={{ alignSelf: 'end' }}>
            <button 
              className="btn btn-primary"
              onClick={handleExport}
            >
              Export
            </button>
          </div>
        </div>

        <div className="form-group">
          <p style={{ fontSize: '0.9em', color: '#718096', margin: 0 }}>
            {format === 'SVG' ? 'SVG export is now functional!' : format === 'PNG' ? 'PNG export is functional!' : 'PDF export functionality coming soon'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default DesignExport;