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
  const [includeMotif, setIncludeMotif] = useState<boolean>(false);
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
    <fieldset style={{ marginBottom: '1rem' }}>
      <legend><strong>Design & Export</strong></legend>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
        <label>
          <input
            type="checkbox"
            checked={showBorder}
            onChange={(e) => handleBorderChange(e.target.checked)}
          />
          &nbsp;Page Border
        </label>
        
        <label>
          Style:&nbsp;
          <select
            value={borderStyle}
            onChange={(e) => handleBorderStyleChange(e.target.value)}
            disabled={!showBorder}
            style={{ width: 120 }}
          >
            {lineStyles.filter(s => s.name && s.name.trim()).map(style => (
              <option key={style.id || style.name} value={style.id || style.name}>{style.name}</option>
            ))}
          </select>
        </label>
      </div>

      <label>
        Margin (inches):&nbsp;
        <input
          type="number"
          min={0.1}
          max={2}
          step={0.1}
          value={margin}
          onChange={(e) => handleMarginChange(parseFloat(e.target.value) || 0.5)}
          style={{ width: 60 }}
          disabled={!showBorder}
        />
      </label>
      <br /><br />

      <label>
        Overlay Motif:&nbsp;
        <input
          type="checkbox"
          checked={includeMotif}
          onChange={(e) => setIncludeMotif(e.target.checked)}
        />
        <span style={{ marginLeft: '0.5rem', fontSize: '0.9em', color: '#666' }}>
          (adds custom graphic layer)
        </span>
      </label>
      <br /><br />

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <label>
          Export Format:&nbsp;
          <select value={format} onChange={(e) => setFormat(e.target.value as ExportFormat)}>
            <option value="SVG">SVG</option>
            <option value="PNG">PNG</option>
            <option value="PDF">PDF</option>
          </select>
        </label>
        
        <button 
          onClick={handleExport}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0056b3'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#007bff'}
        >
          Export
        </button>
      </div>

      <p style={{ fontSize: '0.9em', color: '#666', marginTop: '0.5rem' }}>
        {format === 'SVG' ? 'SVG export is now functional!' : 'Export functionality coming soon – for now, right-click the preview to save.'}
      </p>
    </fieldset>
  );
};

export default DesignExport;