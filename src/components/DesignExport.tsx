// src/components/DesignExport.tsx
import React, { useState } from 'react';
import type { LineStyle } from './LineSettings';
import { Save } from 'lucide-react';
import html2canvas from 'html2canvas';

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
type PageSize = 'A4' | 'Letter' | '11x17' | '10x15cm Postcard';

interface DesignExportProps {
  onBorderChange: (showBorder: boolean, margin: number, borderStyle: string) => void;
  onBackgroundChange: (showBackground: boolean, backgroundColor: string) => void;
  lineStyles: LineStyle[];
  pageSize: PageSize;
  orientation: 'Landscape' | 'Portrait';
}

const pageSizeMap = {
  Letter: { width: 8.5, height: 11 }, // inches
  A4: { width: 8.27, height: 11.69 }, // inches
  '11x17': { width: 11, height: 17 },
  '10x15cm Postcard': { width: 3.94, height: 5.91 }, // inches (100mm = 3.94", 150mm = 5.91")
};

const DesignExport: React.FC<DesignExportProps> = ({ onBorderChange, onBackgroundChange, lineStyles, pageSize, orientation }) => {
  const [format, setFormat] = useState<ExportFormat>('PNG');
  const [showBorder, setShowBorder] = useState<boolean>(true);
  const [margin, setMargin] = useState<number>(0.25); // in inches
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

  const handleExport = () => {
    if (format === 'PNG') {
      // Find the preview container - look for the card with "Sundial Preview" in the title
      const previewCards = document.querySelectorAll('.card');
      let previewContainer: HTMLElement | null = null;
      
      for (const card of previewCards) {
        const title = card.querySelector('.card-title');
        if (title && title.textContent && title.textContent.includes('Sundial Preview')) {
          previewContainer = card as HTMLElement;
          break;
        }
      }
      
      if (!previewContainer) {
        console.error('Could not find preview container');
        return;
      }

      // Find the SVG container div within the preview
      const svgContainer = previewContainer.querySelector('div[style*="display: flex"]') as HTMLElement;
      if (!svgContainer) {
        console.error('Could not find SVG container');
        return;
      }

      console.log('Found SVG container:', svgContainer);

      // Get intended print width in inches
      let { width: printWidth, height: printHeight } = pageSizeMap[pageSize] || pageSizeMap.Letter;
      if (orientation === 'Landscape') {
        [printWidth, printHeight] = [printHeight, printWidth];
      }
      // Get actual DOM width in pixels
      const domWidth = svgContainer.offsetWidth;
      // Calculate scale for user-selected DPI
      const pixelWidth = printWidth * dpi;
      const scale = pixelWidth / domWidth;

      // Use html2canvas to capture the SVG container
      html2canvas(svgContainer, {
        backgroundColor: showBackground ? backgroundColor : '#ffffff',
        scale,
        useCORS: true,
        allowTaint: true,
        logging: true, // Enable logging for debugging
      }).then((canvas) => {
        console.log('Canvas created:', canvas);
        
        // Convert canvas to PNG blob
        canvas.toBlob((blob) => {
          if (blob) {
            // Create download link
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'sundial.png';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          }
        }, 'image/png');
      }).catch((error) => {
        console.error('Error creating canvas:', error);
      });
    } else if (format === 'SVG') {
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
        <h3 className="card-title"><Save color="#2563eb" size={20} style={{marginRight: 6}} /> Design & Export</h3>
      </div>
      <div className="card-content">
        <div className="form-group">
          {/* Removed Show Location checkbox */}
        </div>

        {/* Border, Border Style, and Margin all on one row (now first) */}
        <div className="form-row" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label className="form-checkbox" style={{ margin: 0 }}>
              <input
                type="checkbox"
                checked={showBorder}
                onChange={(e) => handleBorderChange(e.target.checked)}
              />
              Page Border
            </label>
          </div>
          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <label htmlFor="border-style" style={{ margin: 0 }}>Border Style:</label>
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
            <label htmlFor="border-margin" style={{ margin: 0 }}>Margin (in):</label>
            <input
              id="border-margin"
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
            {format === 'SVG' ? 'SVG export is NOT yet functional!' : format === 'PNG' ? 'PNG export is now functional!' : 'PDF export functionality coming soon'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default DesignExport;