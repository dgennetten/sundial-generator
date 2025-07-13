// src/components/DesignExport.tsx
import React, { useState } from 'react';
import type { LineStyle } from './LineSettings';

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

type ExportFormat = 'SVG' | 'PNG' | 'PDF';

interface DesignExportProps {
  onBorderChange: (showBorder: boolean, margin: number, borderStyle: string) => void;
  onBackgroundChange: (showBackground: boolean, backgroundColor: string) => void;
  lineStyles: LineStyle[];
}

const DesignExport: React.FC<DesignExportProps> = ({ onBorderChange, onBackgroundChange, lineStyles }) => {
  const [format, setFormat] = useState<ExportFormat>('SVG');
  const [showBorder, setShowBorder] = useState<boolean>(true);
  const [margin, setMargin] = useState<number>(0.25); // in inches
  const [borderStyle, setBorderStyle] = useState<string>('default-hairline');
  const [showBackground, setShowBackground] = useState<boolean>(true);
  const [backgroundColor, setBackgroundColor] = useState<string>('Cornsilk');

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

  const handleExport = () => {
    if (format === 'SVG') {
      // Get the SVG element from the preview
      const svgElement = document.querySelector('svg') as SVGSVGElement;
      if (svgElement) {
        // Create a clone to avoid modifying the original
        const svgClone = svgElement.cloneNode(true) as SVGSVGElement;
        
        // Set viewBox and dimensions for proper export
        const bbox = svgElement.getBBox();
        svgClone.setAttribute('viewBox', `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`);
        svgClone.setAttribute('width', bbox.width.toString());
        svgClone.setAttribute('height', bbox.height.toString());
        
        // Fix stroke-width and dasharray units for proper export
        const paths = svgClone.querySelectorAll('path');
        paths.forEach(path => {
          const strokeWidth = path.getAttribute('stroke-width');
          if (strokeWidth && !strokeWidth.includes('px') && !strokeWidth.includes('pt') && !strokeWidth.includes('mm')) {
            // Add 'px' unit to stroke-width
            path.setAttribute('stroke-width', strokeWidth + 'px');
          }
          
          const dasharray = path.getAttribute('stroke-dasharray');
          if (dasharray) {
            // Add 'px' units to dasharray values
            const fixedDasharray = dasharray.split(',').map(val => {
              const num = parseFloat(val);
              if (!isNaN(num) && !val.includes('px') && !val.includes('pt') && !val.includes('mm')) {
                return num + 'px';
              }
              return val;
            }).join(',');
            path.setAttribute('stroke-dasharray', fixedDasharray);
          }
        });
        
        // Convert to string
        const svgString = new XMLSerializer().serializeToString(svgClone);
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });
        
        // Create download link
        const url = URL.createObjectURL(svgBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'sundial.svg';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">💾 Design & Export</h3>
      </div>
      <div className="card-content">
        <div className="form-group">
          {/* Removed Show Location checkbox */}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-checkbox" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                checked={showBackground}
                onChange={(e) => handleBackgroundChange(e.target.checked)}
              />
              Page Background
              {/* Inline color controls to the right of the label */}
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

        {showBorder && (
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Border Style</label>
              <select
                className="form-select"
                value={borderStyle}
                onChange={(e) => handleBorderStyleChange(e.target.value)}
              >
                {lineStyles.filter(s => s.name && s.name.trim()).map(style => (
                  <option key={style.id || style.name} value={style.id || style.name}>{style.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Margin (inches)</label>
              <input
                type="number"
                className="form-input"
                min={0.1}
                max={2}
                step={0.1}
                value={margin}
                onChange={(e) => handleMarginChange(parseFloat(e.target.value) || 0.5)}
                style={{ width: '80px' }}
              />
            </div>
          </div>
        )}

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
            {format === 'SVG' ? 'SVG export is now functional!' : 'Export functionality coming soon – for now, right-click the preview to save.'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default DesignExport;