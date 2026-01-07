// src/components/DesignExport.tsx
import React, { useState } from 'react';
import { Printer, Download } from 'lucide-react';
import { exportSundial, logPrintActivity, type ExportFormat, type PageSize } from '../utils/exportUtils';
import type { GnomonType, InclineType } from '../types/sundial';



interface DesignExportProps {
  pageSize: PageSize;
  orientation: 'Landscape' | 'Portrait';
  customWidth?: number;
  customHeight?: number;
  dateRange?: 'FullYear' | 'SummerToFall' | 'WinterToSpring';
  gnomonType?: GnomonType;
  locationName?: string;
  showBackground: boolean;
  backgroundColor: string;
  sundialNotesMode?: string;
  dialTextBlock?: string;
  latitude?: number;
  longitude?: number;
  gnomonHeight?: number;
  inclineType?: InclineType;
  tiltAngle?: number;
}



const DesignExport: React.FC<DesignExportProps> = React.memo(({ pageSize, orientation, customWidth, customHeight, dateRange, gnomonType, locationName, showBackground, backgroundColor, sundialNotesMode, dialTextBlock, latitude, longitude, gnomonHeight, inclineType, tiltAngle }) => {
  const [format, setFormat] = useState<ExportFormat>('PNG');
  const [dpi, setDpi] = useState<number>(600);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Responsive: detect mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 500;

  const handlePrint = async () => {
    console.log('Starting print...');

    // Create dynamic print styles based on current page settings
    const printStyleId = 'dynamic-print-styles';
    const existingStyle = document.getElementById(printStyleId);

    if (existingStyle) {
      existingStyle.remove();
    }

    // Determine page size and orientation
    const isLandscape = orientation === 'Landscape';
    let pageSizeStr = 'letter';

    switch (pageSize) {
      case 'A4':
        pageSizeStr = 'A4';
        break;
      case 'Letter':
        pageSizeStr = 'letter';
        break;
      case '11x17':
        pageSizeStr = 'ledger'; // 11x17 is also known as ledger/tabloid
        break;
      case '10x15cm Postcard':
        pageSizeStr = '100mm 150mm';
        break;
      case 'Custom':
        if (customWidth && customHeight) {
          pageSizeStr = `${customWidth}mm ${customHeight}mm`;
        }
        break;
    }

    const orientationStr = isLandscape ? 'landscape' : 'portrait';

    // Create and inject dynamic print styles
    const style = document.createElement('style');
    style.id = printStyleId;

    // Determine appropriate margin based on page size match
    // If the dial page size matches the print page size, use minimal margins
    // Otherwise, use larger margins for safety
    let marginStr = '0.5in'; // Default margin for mismatched sizes

    // Check if dial size matches print paper size (assuming standard letter paper)
    if (pageSize === 'Letter') {
      marginStr = '0.1in'; // Minimal margin when sizes match
    } else if (pageSize === 'A4') {
      marginStr = '0.1in'; // Minimal margin for A4 as well
    }
    // For other sizes (11x17, postcard, custom), keep the larger margin

    style.textContent = `
      @media print {
        @page {
          size: ${pageSizeStr} ${orientationStr};
          margin: ${marginStr};
        }
      }
    `;

    document.head.appendChild(style);

    // Trigger print
    window.print();

    // Log the print activity
    try {
      await logPrintActivity({
        pageSize,
        orientation,
        customWidth,
        customHeight,
        dateRange,
        gnomonType,
        locationName,
        sundialNotesMode,
        dialTextBlock,
        latitude,
        longitude,
        gnomonHeight,
        inclineType,
        tiltAngle,
      });
      console.log('Print activity logged successfully');
    } catch (error) {
      console.error('Failed to log print activity:', error);
      // Don't prevent printing if logging fails
    }

    // Clean up the dynamic style after a delay
    setTimeout(() => {
      const styleToRemove = document.getElementById(printStyleId);
      if (styleToRemove) {
        styleToRemove.remove();
      }
    }, 1000);
  };

  const handleExport = async () => {
    if (isExporting) {
      console.log('Export already in progress, ignoring click');
      return; // Prevent multiple simultaneous exports
    }

    console.log('Starting export, format:', format);
    setIsExporting(true);
    try {
      await exportSundial({
        format,
        pageSize,
        orientation,
        dpi: format === 'PNG' ? dpi : undefined,
        showBackground,
        backgroundColor,
        customWidth,
        customHeight,
        dateRange,
        gnomonType,
        locationName,
        sundialNotesMode,
        dialTextBlock,
        latitude,
        longitude,
        gnomonHeight,
        inclineType,
        tiltAngle,
      });
      console.log('Export completed successfully');
    } catch (error) {
      console.error('Export failed:', error);
      // You could add user-facing error handling here, like showing a toast notification
    } finally {
      console.log('Resetting export state');
      setIsExporting(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title"><Printer color="#2563eb" size={20} style={{ marginRight: 6 }} />Print and Export</h3>
      </div>
      <div className="card-content">
        <div
          className="form-row"
          style={{
            display: 'flex',
            alignItems: 'stretch',
            gap: isMobile ? '0.5rem' : '0.25rem',
            flexDirection: 'column'
          }}
        >
          {/* Print button above, aligned with Export button */}
          <div className="form-group" style={{ alignSelf: 'end' }}>
            <button
              className="btn btn-primary"
              onClick={handlePrint}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: isMobile ? '100%' : '140px',
                minWidth: isMobile ? 'auto' : '70px'
              }}
            >
              <Printer size={16} style={{ marginRight: '4px' }} />
              Print
            </button>
          </div>

          {/* Export controls row */}
          <div
            className="form-row"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              gap: '0.5rem',
              flexDirection: isMobile ? 'column' : 'row'
            }}
          >
            {/* Left: Export options */}
            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.5rem' : '0.5rem', flex: '1 1 auto', minWidth: 0 }}>
              {/* Export Format */}
              <div className="form-group" style={{ flex: isMobile ? '1' : 'auto' }}>
                <label className="form-label">Export Format</label>
                <select
                  className="form-select"
                  value={format}
                  onChange={(e) => {
                    console.log('Format change:', e.target.value);
                    setFormat(e.target.value as ExportFormat);
                  }}
                  style={{ width: isMobile ? '100%' : 'auto' }}
                >
                  <option value="SVG">SVG</option>
                  <option value="PNG">PNG</option>
                  <option value="PDF">PDF</option>
                </select>
              </div>

              {/* DPI input, only show for PNG */}
              {format === 'PNG' && (
                <div className="form-group" style={{ flex: isMobile ? '0 0 auto' : 'auto' }}>
                  <label className="form-label">DPI</label>
                  <input
                    type="number"
                    className="form-input"
                    min={72}
                    max={2400}
                    step={1}
                    value={dpi}
                    onChange={e => setDpi(parseInt(e.target.value) || 600)}
                    style={{ width: isMobile ? '60px' : '70px' }}
                  />
                </div>
              )}
            </div>

            {/* Right: Export button (aligned with Print above) */}
            <div className="form-group" style={{ alignSelf: isMobile ? 'stretch' : 'end', marginLeft: isMobile ? 0 : 'auto', flex: '0 0 auto' }}>
              <button
                className="btn btn-primary"
                onClick={handleExport}
                disabled={isExporting}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: isMobile ? '100%' : '140px',
                  minWidth: isMobile ? 'auto' : '70px',
                  opacity: isExporting ? 0.7 : 1,
                  cursor: isExporting ? 'not-allowed' : 'pointer',
                  transform: isExporting ? 'scale(0.98)' : 'scale(1)',
                  transition: 'all 0.1s ease'
                }}
              >
                <Download size={18} style={{ marginRight: '6px' }} stroke="#fff" strokeWidth={2} />
                {isExporting ? 'Exporting...' : 'Export'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default DesignExport;