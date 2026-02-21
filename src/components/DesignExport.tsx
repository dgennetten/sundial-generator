// src/components/DesignExport.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Printer, Download, Save, RotateCcw, Undo } from 'lucide-react';
import { exportSundial, logPrintActivity, type ExportFormat, type PageSize } from '../utils/exportUtils';
import type { GnomonType, InclineType } from '../types/sundial';
import { saveDialConfig, loadAllSavedConfigs, deleteSavedConfig, hasSavedConfigs, type SavedDialConfig } from '../utils/dialSaveRestore';
import SaveDialDialog from './SaveDialDialog';
import RestoreDialDialog from './RestoreDialDialog';
import { clearWelcomeDismissed } from './WelcomeDialog';
import type { HourlineInterval } from './hourlineUtils';
import type { LineStyle } from './LineSettings';
import type { DeclinationLine } from './DeclinationLineOptions';
import { log } from '../utils/logger';



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
  onLogComplete?: () => void;
  // Additional props needed for save/restore
  tzMeridian?: number;
  gnomonMode?: 'auto' | 'manual';
  gnomonPosition?: number;
  gnomonPositionMode?: 'auto' | 'manual';
  gnomonHorizontalPosition?: number;
  customUnits?: 'in' | 'cm';
  declinationType?: string;
  declinationDegrees?: number;
  dialShape?: string;
  borderStyle?: string;
  borderMargin?: number;
  hourlineIntervals?: HourlineInterval[];
  lineStyles?: LineStyle[];
  declinationLines?: DeclinationLine[];
  startHour?: number;
  stopHour?: number;
  use24Hour?: boolean;
  labelWinterSide?: boolean;
  labelSummerSide?: boolean;
  labelOffset?: number;
  fontFamily?: string;
  fontSize?: number;
  useDST?: boolean;
  declinationNoonmarks?: boolean;
  dialTextBlockFontSize?: number;
  dialTextBlockFontFamily?: string;
  sundialNotesPositionMode?: 'auto' | 'manual';
  sundialNotesOffset?: number;
  sundialNotesOffsetHorizontal?: number;
  onRestoreDial?: (config: SavedDialConfig['config']) => void;
}



const DesignExport: React.FC<DesignExportProps> = React.memo(({ 
  pageSize, orientation, customWidth, customHeight, dateRange, gnomonType, locationName, showBackground, backgroundColor, 
  sundialNotesMode, dialTextBlock, latitude, longitude, gnomonHeight, inclineType, tiltAngle, onLogComplete,
  tzMeridian, gnomonMode, gnomonPosition, gnomonPositionMode, gnomonHorizontalPosition, customUnits, declinationType, declinationDegrees,
  dialShape, borderStyle, borderMargin, hourlineIntervals, lineStyles, declinationLines,
  startHour, stopHour, use24Hour, labelWinterSide, labelSummerSide, labelOffset, fontFamily, fontSize, useDST,
  declinationNoonmarks, dialTextBlockFontSize, dialTextBlockFontFamily, sundialNotesPositionMode, sundialNotesOffset, sundialNotesOffsetHorizontal,
  onRestoreDial
}) => {
  const [format, setFormat] = useState<ExportFormat>('PNG');
  const [dpi, setDpi] = useState<number>(600);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [hasSavedConfigsState, setHasSavedConfigsState] = useState(false);
  const [savedConfigs, setSavedConfigs] = useState<SavedDialConfig[]>([]);

  // Responsive: detect mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 500;

  // Check for saved configs on mount and when dialogs close
  useEffect(() => {
    const checkSavedConfigs = () => {
      const hasConfigs = hasSavedConfigs();
      setHasSavedConfigsState(hasConfigs);
      if (hasConfigs) {
        setSavedConfigs(loadAllSavedConfigs());
      }
    };
    
    checkSavedConfigs();
  }, [saveDialogOpen, restoreDialogOpen]);

  // Helper function to collect all current settings into config format
  const collectCurrentConfig = useCallback((): SavedDialConfig['config'] => {
    return {
      // Location
      latitude: latitude ?? 0,
      longitude: longitude ?? 0,
      tzMeridian: tzMeridian ?? 0,
      locationName: locationName ?? 'Custom Lat/Long',
      
      // Gnomon
      gnomonMode: gnomonMode ?? 'auto',
      gnomonHeight: gnomonHeight ?? 10,
      gnomonType: gnomonType ?? 'popup-with-brace',
      gnomonPosition: gnomonPosition ?? 0,
      gnomonPositionMode: gnomonPositionMode ?? 'auto',
      gnomonHorizontalPosition: gnomonHorizontalPosition,
      
      // Page
      pageSize: pageSize ?? 'Letter',
      customWidth: customWidth ?? 8.5 * 25.4,
      customHeight: customHeight ?? 11 * 25.4,
      customUnits: customUnits ?? 'in',
      orientation: orientation ?? 'Landscape',
      inclineType: inclineType ?? 'Horizontal',
      tiltAngle: tiltAngle ?? 90,
      declinationType: declinationType ?? 'North',
      declinationDegrees: declinationDegrees ?? 0,
      dialShape: dialShape ?? 'Rectangle',
      borderStyle: borderStyle ?? 'default-hairline',
      borderMargin: borderMargin ?? 0.236,
      
      // Hour lines
      hourlineDateRange: dateRange ?? 'WinterToSpring',
      hourlineIntervals: hourlineIntervals ?? [],
      startHour: startHour ?? 4,
      stopHour: stopHour ?? 20,
      use24Hour: use24Hour ?? false,
      labelWinterSide: labelWinterSide ?? true,
      labelSummerSide: labelSummerSide ?? true,
      labelOffset: labelOffset ?? 1.5,
      fontFamily: fontFamily ?? 'sans-serif',
      fontSize: fontSize ?? 20,
      useDST: useDST ?? true,
      declinationNoonmarks: declinationNoonmarks ?? true,
      
      // Lines
      lineStyles: lineStyles ?? [],
      declinationLines: declinationLines ?? [],
      
      // Background/Text
      showBackground: showBackground ?? true,
      backgroundColor: backgroundColor ?? 'Cornsilk',
      dialTextBlock: dialTextBlock ?? '',
      dialTextBlockFontSize: dialTextBlockFontSize ?? 14,
      dialTextBlockFontFamily: dialTextBlockFontFamily ?? 'sans-serif',
      sundialNotesMode: sundialNotesMode ?? 'textBlock',
      sundialNotesPositionMode: sundialNotesPositionMode ?? 'auto',
      sundialNotesOffset: sundialNotesOffset ?? 0,
      sundialNotesOffsetHorizontal: sundialNotesOffsetHorizontal ?? 0,
    };
  }, [
    latitude, longitude, tzMeridian, locationName, gnomonMode, gnomonHeight, gnomonType, gnomonPosition, gnomonPositionMode, gnomonHorizontalPosition,
    pageSize, customWidth, customHeight, customUnits, orientation, inclineType, tiltAngle, declinationType, declinationDegrees,
    dialShape, borderStyle, borderMargin, dateRange, hourlineIntervals, startHour, stopHour, use24Hour,
    labelWinterSide, labelSummerSide, labelOffset, fontFamily, fontSize, useDST, declinationNoonmarks, lineStyles,
    declinationLines, showBackground, backgroundColor, dialTextBlock, dialTextBlockFontSize, dialTextBlockFontFamily,
    sundialNotesMode, sundialNotesPositionMode, sundialNotesOffset, sundialNotesOffsetHorizontal
  ]);

  const handleResetDefaults = useCallback(() => {
    if (confirm('This will reset all your custom settings (line styles, declination lines, etc.) to defaults. Are you sure?')) {
      const keysToRemove = [
        'sundial-line-styles',
        'sundial-declination-lines',
        'sundial-hourline-intervals',
        'sundial-hourline-overrides',
      ];
      keysToRemove.forEach(key => localStorage.removeItem(key));
      clearWelcomeDismissed();
      document.querySelector<HTMLElement>('.controls-panel')?.scrollTo(0, 0);
      try { sessionStorage.setItem('sundial-scroll-panel-to-top', '1'); } catch (_) {}
      window.location.hash = '';
      window.location.reload();
    }
  }, []);

  const handleSave = useCallback(() => {
    setSaveDialogOpen(true);
  }, []);

  const handleSaveConfirm = useCallback((name: string) => {
    try {
      const config = collectCurrentConfig();
      saveDialConfig(name, config);
      setSaveDialogOpen(false);
      // Update saved configs list
      setSavedConfigs(loadAllSavedConfigs());
      setHasSavedConfigsState(true);
    } catch (error) {
      log.error('Failed to save configuration:', error);
      alert(error instanceof Error ? error.message : 'Failed to save configuration');
    }
  }, [collectCurrentConfig]);

  const handleRestore = useCallback(() => {
    setRestoreDialogOpen(true);
    setSavedConfigs(loadAllSavedConfigs());
  }, []);

  const handleRestoreConfirm = useCallback((config: SavedDialConfig['config']) => {
    if (onRestoreDial) {
      onRestoreDial(config);
    }
    setRestoreDialogOpen(false);
  }, [onRestoreDial]);

  const handleDelete = useCallback((id: string) => {
    const success = deleteSavedConfig(id);
    if (success) {
      const remaining = loadAllSavedConfigs();
      setSavedConfigs(remaining);
      setHasSavedConfigsState(remaining.length > 0);
    }
  }, []);

  const handlePrint = async () => {
    log.info('Starting print...');

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
        declinationType: declinationType as import('../types').DeclinationType | undefined,
        declinationDegrees,
      });
      log.info('Print activity logged successfully');
      onLogComplete?.(); // Trigger map refresh
    } catch (error) {
      log.error('Failed to log print activity:', error);
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
      log.debug('Export already in progress, ignoring click');
      return; // Prevent multiple simultaneous exports
    }

    log.info('Starting export, format:', format);
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
      log.info('Export completed successfully');
      onLogComplete?.(); // Trigger map refresh
    } catch (error) {
      log.error('Export failed:', error);
      // You could add user-facing error handling here, like showing a toast notification
    } finally {
      log.debug('Resetting export state');
      setIsExporting(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title"><Printer color="#2563eb" size={20} style={{ marginRight: 6 }} />Print, Export, and Save</h3>
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
          {/* Save, Restore, and Print buttons */}
          <div className="form-group" style={{ alignSelf: 'flex-end', display: 'flex', flexDirection: 'row', gap: '0.5rem', alignItems: 'center', flexWrap: 'nowrap' }}>
            <button
              className="btn btn-secondary"
              onClick={handleResetDefaults}
              title="Reset to defaults"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '34px',
                minWidth: '34px',
                height: '34px',
                padding: 0,
                flexShrink: 0
              }}
            >
              <Undo size={16} />
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleSave}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 'auto',
                padding: '0.5rem 0.6rem',
                flexShrink: 0
              }}
            >
              <Save size={16} style={{ marginRight: '4px' }} />
              Save
            </button>
            <button
              className="btn btn-secondary"
              disabled={!hasSavedConfigsState}
              onClick={handleRestore}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 'auto',
                padding: '0.5rem 0.6rem',
                opacity: hasSavedConfigsState ? 1 : 0.5,
                cursor: hasSavedConfigsState ? 'pointer' : 'not-allowed',
                flexShrink: 0
              }}
            >
              <RotateCcw size={16} style={{ marginRight: '4px' }} />
              Load
            </button>
            <button
              className="btn btn-primary"
              onClick={handlePrint}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100px',
                minWidth: '100px',
                padding: '0.5rem 0.6rem',
                flexShrink: 0
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
                    log.debug('Format change:', e.target.value);
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
                  width: isMobile ? '100%' : '100px',
                  minWidth: isMobile ? 'auto' : '100px',
                  opacity: isExporting ? 0.7 : 1,
                  cursor: isExporting ? 'not-allowed' : 'pointer',
                  transform: isExporting ? 'scale(0.98)' : 'scale(1)',
                  transition: 'all 0.1s ease',
                  padding: '0.5rem 0.6rem'
                }}
              >
                <Download size={18} style={{ marginRight: '6px' }} stroke="#fff" strokeWidth={2} />
                {isExporting ? 'Exporting...' : 'Export'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Save Dialog */}
      <SaveDialDialog
        open={saveDialogOpen}
        onClose={() => setSaveDialogOpen(false)}
        onSave={handleSaveConfirm}
        existingNames={savedConfigs.map(c => c.name)}
      />

      {/* Restore Dialog */}
      <RestoreDialDialog
        open={restoreDialogOpen}
        onClose={() => setRestoreDialogOpen(false)}
        onRestore={handleRestoreConfirm}
        onDelete={handleDelete}
        savedConfigs={savedConfigs}
      />
    </div>
  );
});

export default DesignExport;