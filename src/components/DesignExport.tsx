// src/components/DesignExport.tsx
import React, { useState } from 'react';
import { Save } from 'lucide-react';
import { exportSundial, type ExportFormat, type PageSize } from '../utils/exportUtils';



interface DesignExportProps {
  pageSize: PageSize;
  orientation: 'Landscape' | 'Portrait';
  customWidth?: number;
  customHeight?: number;
  dateRange?: 'FullYear' | 'SummerToFall' | 'WinterToSpring';
  gnomonType?: 'crosshair' | 'popup' | 'popup-with-brace' | 'crosshair-with-north';
  locationName?: string;
  showBackground: boolean;
  backgroundColor: string;
  sundialNotesMode?: string;
}



const DesignExport: React.FC<DesignExportProps> = React.memo(({ pageSize, orientation, customWidth, customHeight, dateRange, gnomonType, locationName, showBackground, backgroundColor, sundialNotesMode }) => {
  const [format, setFormat] = useState<ExportFormat>('PNG');
  const [dpi, setDpi] = useState<number>(600);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Responsive: detect mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 500;

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
        <h3 className="card-title"><Save color="#2563eb" size={20} style={{marginRight: 6}} />Export</h3>
      </div>
      <div className="card-content">
        <div 
          className="form-row" 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: isMobile ? '0.5rem' : '1rem',
            flexDirection: 'row'
          }}
        >
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
          <div className="form-group" style={{ alignSelf: 'end', flex: isMobile ? '0 0 auto' : 'auto' }}>
            <button 
              className="btn btn-primary"
              onClick={handleExport}
              disabled={isExporting}
              style={{ 
                width: isMobile ? 'auto' : 'auto',
                opacity: isExporting ? 0.7 : 1,
                cursor: isExporting ? 'not-allowed' : 'pointer',
                transform: isExporting ? 'scale(0.98)' : 'scale(1)',
                transition: 'all 0.1s ease'
              }}
            >
              {isExporting ? 'Exporting...' : 'Export'}
            </button>
          </div>
        </div>

        <div className="form-group">
          <p style={{ fontSize: '0.9em', color: '#718096', margin: 0 }}>
            {format === 'SVG' ? 'SVG export is now functional!' : format === 'PNG' ? 'PNG export is functional!' : 'PDF export is functional!'}
          </p>
        </div>
      </div>
    </div>
  );
});

export default DesignExport;