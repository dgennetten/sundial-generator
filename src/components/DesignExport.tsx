// src/components/DesignExport.tsx
import React, { useState } from 'react';
import type { LineStyle } from './LineSettings';

type ExportFormat = 'SVG' | 'PNG' | 'PDF';

interface DesignExportProps {
  onBorderChange: (showBorder: boolean, margin: number, borderStyle: string) => void;
  lineStyles: LineStyle[];
}

const DesignExport: React.FC<DesignExportProps> = ({ onBorderChange, lineStyles }) => {
  const [format, setFormat] = useState<ExportFormat>('SVG');
  const [showBorder, setShowBorder] = useState<boolean>(true);
  const [margin, setMargin] = useState<number>(0.25); // in inches
  const [borderStyle, setBorderStyle] = useState<string>('default-hairline');

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