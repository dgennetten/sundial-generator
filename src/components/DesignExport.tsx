// src/components/DesignExport.tsx
import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import ReactDOM, { flushSync } from 'react-dom';
import { Download, Save, FolderUp, Undo, Camera } from 'lucide-react';
import type { Language } from './WelcomeDialog';
import { galleryTranslations } from './gallery/galleryTranslations';

// Pulls in the lightbox bundle only when the gallery is opened.
const PhotoGallery = lazy(() => import('./gallery/PhotoGallery'));
import { exportSundial, logPrintActivity, type ExportFormat, type PageSize } from '../utils/exportUtils';
import { createSVGExport } from '../utils/svgExportUtils';
import type { GnomonType, InclineType } from '../types/sundial';
import { saveDialConfig, loadAllSavedConfigs, deleteSavedConfig, hasSavedConfigs, type SavedDialConfig } from '../utils/dialSaveRestore';
import SaveDialDialog from './SaveDialDialog';
import RestoreDialDialog from './RestoreDialDialog';
import type { HourlineInterval } from './hourlineUtils';
import type { LineStyle } from './LineSettings';
import type { DeclinationLine } from './DeclinationLineOptions';
import { log } from '../utils/logger';
import { buildGnomonNetSVGString, computePageMM } from '../utils/gnomonNetUtils';



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
  showFullYearOnNoon?: boolean;
  dialTextBlockFontSize?: number;
  dialTextBlockFontFamily?: string;
  sundialNotesPositionMode?: 'auto' | 'manual';
  sundialNotesOffset?: number;
  sundialNotesOffsetHorizontal?: number;
  dialOrientation?: 'North' | 'South';
  showBelowHorizonHourLines?: boolean;
  showBelowHorizonDateLines?: boolean;
  syncBelowHorizon?: boolean;
  onRestoreDial?: (config: SavedDialConfig['config']) => void;
  onSetTodayLineActive?: (active: boolean) => void;
  onResetDefaults: () => void;
  language?: string;
}



const DesignExport: React.FC<DesignExportProps> = React.memo(({
  pageSize, orientation, customWidth, customHeight, dateRange, gnomonType, locationName, showBackground, backgroundColor,
  sundialNotesMode, dialTextBlock, latitude, longitude, gnomonHeight, inclineType, tiltAngle, onLogComplete,
  tzMeridian, gnomonMode, gnomonPosition, gnomonPositionMode, gnomonHorizontalPosition, customUnits, declinationType, declinationDegrees,
  dialShape, borderStyle, borderMargin, hourlineIntervals, lineStyles, declinationLines,
  startHour, stopHour, use24Hour, labelWinterSide, labelSummerSide, labelOffset, fontFamily, fontSize, useDST,
  declinationNoonmarks, showFullYearOnNoon, dialTextBlockFontSize, dialTextBlockFontFamily, sundialNotesPositionMode, sundialNotesOffset, sundialNotesOffsetHorizontal,
  dialOrientation, showBelowHorizonHourLines, showBelowHorizonDateLines, syncBelowHorizon,
  onRestoreDial,
  onSetTodayLineActive,
  onResetDefaults,
  language
}) => {
  const galleryLang: Language = (language && language in galleryTranslations ? language : 'en') as Language;
  const [showGallery, setShowGallery] = useState(false);
  const [format, setFormat] = useState<ExportFormat>('PDF');
  const [dpi, setDpi] = useState<number>(600);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [hasSavedConfigsState, setHasSavedConfigsState] = useState(false);
  const [savedConfigs, setSavedConfigs] = useState<SavedDialConfig[]>([]);

  const [pendingAction, setPendingAction] = useState<'print' | 'export' | null>(null);
  const [includeTodayLine, setIncludeTodayLine] = useState(false);

  // Glued Popup Base export options
  const [exportGnomonNet, setExportGnomonNet] = useState(true);
  const [exportSundialFace, setExportSundialFace] = useState(true);
  const isGluedPopup = gnomonType === 'glued-popup-base';

  const hasTodayLineActive = declinationLines?.some(line => line.id === 'today' && line.active) ?? false;

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
      // Declination defaults based on hemisphere (disabled in UI, but still saved for backward compatibility)
      declinationType: declinationType ?? (latitude && latitude >= 0 ? 'North' : 'South'),
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
      showFullYearOnNoon: showFullYearOnNoon ?? false,

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
      dialOrientation: dialOrientation,
      showBelowHorizonHourLines: showBelowHorizonHourLines ?? true,
      showBelowHorizonDateLines: showBelowHorizonDateLines ?? true,
      syncBelowHorizon: syncBelowHorizon ?? true,
    };
  }, [
    latitude, longitude, tzMeridian, locationName, gnomonMode, gnomonHeight, gnomonType, gnomonPosition, gnomonPositionMode, gnomonHorizontalPosition,
    pageSize, customWidth, customHeight, customUnits, orientation, inclineType, tiltAngle, declinationType, declinationDegrees,
    dialShape, borderStyle, borderMargin, dateRange, hourlineIntervals, startHour, stopHour, use24Hour,
    labelWinterSide, labelSummerSide, labelOffset, fontFamily, fontSize, useDST, declinationNoonmarks, showFullYearOnNoon, lineStyles,
    declinationLines, showBackground, backgroundColor, dialTextBlock, dialTextBlockFontSize, dialTextBlockFontFamily,
    sundialNotesMode, sundialNotesPositionMode, sundialNotesOffset, sundialNotesOffsetHorizontal,
    dialOrientation, showBelowHorizonHourLines, showBelowHorizonDateLines, syncBelowHorizon
  ]);

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

    // Remove any leftover print elements from a previous call
    document.getElementById('dynamic-print-styles')?.remove();
    document.getElementById('sundial-print-container')?.remove();
    document.getElementById('sundial-print-hide')?.remove();

    // ── @page rule: size + margin: 0 ─────────────────────────────────────────
    // margin: 0 so the SVG fills the exact physical page. Each SVG carries its
    // own internal border margin, so nothing is clipped.
    const isLandscape = orientation === 'Landscape';
    let pageSizeStr = 'letter';
    switch (pageSize) {
      case 'A4':            pageSizeStr = 'A4';                                           break;
      case 'Letter':        pageSizeStr = 'letter';                                       break;
      case '11x17':         pageSizeStr = 'ledger';                                       break;
      case '10x15cm Postcard': pageSizeStr = '100mm 150mm';                               break;
      case 'Custom':        if (customWidth && customHeight)
                              pageSizeStr = `${customWidth}mm ${customHeight}mm`;         break;
    }
    const orientationStr = isLandscape ? 'landscape' : 'portrait';

    const pageStyle = document.createElement('style');
    pageStyle.id = 'dynamic-print-styles';
    // duplex:simplex is a proposed CSS descriptor; honoured by some printer drivers.
    // It is not universally supported — users may still need to uncheck "Two-sided"
    // in their browser's print dialog.
    pageStyle.textContent = `@media print { @page { size: ${pageSizeStr} ${orientationStr}; margin: 0; duplex: simplex; } }`;
    document.head.appendChild(pageStyle);

    // ── Determine what to print (checkboxes, independent of preview state) ───
    const includeSundialFace = !isGluedPopup || exportSundialFace;
    const includeGnomonNet   = isGluedPopup && exportGnomonNet;

    // ── Build isolated print container ───────────────────────────────────────
    // This is completely independent of which preview tab is currently shown.
    // Each child div is one printed page.
    const printContainer = document.createElement('div');
    printContainer.id = 'sundial-print-container';
    let firstPage = true;

    if (includeSundialFace) {
      // createSVGExport reads the SundialPreview SVG from the DOM.
      // SundialPreview is always rendered (just hidden when gnomon tab is active)
      // so this always succeeds.
      const rawSvgStr = createSVGExport({
        pageSize, orientation, showBackground, backgroundColor,
        ...(pageSize === 'Custom' && { customWidth, customHeight }),
      });
      if (rawSvgStr) {
        // The on-screen SundialPreview SVG remains in the DOM (display:none) so
        // print can always read it. But its clipPath/gradient IDs are identical
        // to those in the print SVG. CSS url(#id) picks the FIRST match in
        // document order — the hidden one — so clipping breaks in print.
        // Fix: prefix every id= and url(#) in the print copy to make them unique.
        const svgStr = rawSvgStr
          .replace(/\bid="([^"]+)"/g,  'id="prt-$1"')
          .replace(/url\(#([^)]+)\)/g, 'url(#prt-$1)')
          .replace(/href="#([^"]+)"/g, 'href="#prt-$1"');
        const page = document.createElement('div');
        // Strip XML declaration so it parses cleanly as innerHTML
        page.innerHTML = svgStr.replace(/^<\?xml[^>]+\?>\s*/, '');
        printContainer.appendChild(page);
        firstPage = false;
      }
    }

    if (includeGnomonNet) {
      const { pageWidthMm, pageHeightMm } = computePageMM(pageSize, orientation, customWidth, customHeight);
      const borderMm = (borderMargin ?? 0) * 25.4;
      const gnomSvg  = buildGnomonNetSVGString(
        gnomonHeight || 10, pageWidthMm, pageHeightMm, showBackground, backgroundColor, borderMm
      );
      const page = document.createElement('div');
      if (!firstPage) {
        // Force a page break before the second page.
        // Both properties used for cross-browser compatibility.
        page.style.cssText = 'break-before:page;page-break-before:always;';
      }
      page.innerHTML = gnomSvg;
      printContainer.appendChild(page);
    }

    document.body.appendChild(printContainer);

    // Hide ALL other DOM content during print — only the container shows.
    // `body > *:not(#...)` targets direct body children (app-container, portals, etc.)
    // without hiding the print container's own children.
    const hideStyle = document.createElement('style');
    hideStyle.id = 'sundial-print-hide';
    hideStyle.textContent = [
      '@media print {',
      '  body > *:not(#sundial-print-container) { display:none !important; }',
      '  #sundial-print-container { display:block !important; }',
      '}',
    ].join('\n');
    document.head.appendChild(hideStyle);

    // Trigger the browser print dialog
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
        todayLineActive: hasTodayLineActive,
        configJson: JSON.stringify(collectCurrentConfig()),
      });
      log.info('Print activity logged successfully');
      onLogComplete?.();
    } catch (error) {
      log.error('Failed to log print activity:', error);
    }

    // Clean up after the print dialog closes
    setTimeout(() => {
      document.getElementById('dynamic-print-styles')?.remove();
      document.getElementById('sundial-print-container')?.remove();
      document.getElementById('sundial-print-hide')?.remove();
    }, 1000);
  };

  const handleExport = async () => {
    if (isExporting) {
      log.debug('Export already in progress, ignoring click');
      return; // Prevent multiple simultaneous exports
    }

    log.info('Starting export, format:', format);
    setIsExporting(true);
    const { pageWidthMm, pageHeightMm } = isGluedPopup
      ? computePageMM(pageSize, orientation, customWidth, customHeight)
      : { pageWidthMm: undefined, pageHeightMm: undefined };

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
        declinationType: declinationType as import('../types/sundial').DeclinationType | undefined,
        declinationDegrees,
        todayLineActive: hasTodayLineActive,
        configJson: JSON.stringify(collectCurrentConfig()),
        exportGnomonNet: isGluedPopup ? exportGnomonNet : false,
        exportSundialFace: isGluedPopup ? exportSundialFace : true,
        pageWidthMm,
        pageHeightMm,
        borderMarginMm: (borderMargin ?? 0) * 25.4,
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

  const handlePrintClick = () => {
    if (hasTodayLineActive) {
      setPendingAction('print');
      setIncludeTodayLine(false);
    } else {
      handlePrint();
    }
  };

  const handleExportClick = () => {
    if (isExporting) return;
    if (hasTodayLineActive) {
      setPendingAction('export');
      setIncludeTodayLine(false);
    } else {
      handleExport();
    }
  };

  const handleDialogCancel = () => {
    setPendingAction(null);
  };

  const handleDialogContinue = async () => {
    const action = pendingAction;
    const shouldHideToday = !includeTodayLine && hasTodayLineActive;

    // Close the modal synchronously so it is removed from the DOM before print/export.
    // Otherwise window.print() can capture the overlay in the print preview.
    flushSync(() => {
      setPendingAction(null);
    });
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

    if (shouldHideToday) {
      onSetTodayLineActive?.(false);
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
    }

    try {
      if (action === 'print') {
        await handlePrint();
      } else if (action === 'export') {
        await handleExport();
      }
    } finally {
      if (shouldHideToday) {
        onSetTodayLineActive?.(true);
      }
    }
  };

  const todayFormatted = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title"><Download color="#2563eb" size={20} style={{ marginRight: 6 }} />Print, Export, and Save</h3>
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
          {/* Glued Popup Base: page selection checkboxes */}
          {isGluedPopup && (
            <div style={{ display: 'flex', flexDirection: 'row', gap: '1rem', alignItems: 'center', padding: '4px 0 2px' }}>
              <span style={{ fontSize: '0.875rem', color: '#374151', fontWeight: 500 }}>Pages:</span>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', color: '#374151', cursor: 'pointer', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={exportSundialFace}
                  onChange={e => setExportSundialFace(e.target.checked)}
                  style={{ width: 15, height: 15, cursor: 'pointer', accentColor: '#2563eb' }}
                />
                Dial Face
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', color: '#374151', cursor: 'pointer', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={exportGnomonNet}
                  onChange={e => setExportGnomonNet(e.target.checked)}
                  style={{ width: 15, height: 15, cursor: 'pointer', accentColor: '#2563eb' }}
                />
                Cut-and-Fold Gnomons
              </label>
            </div>
          )}
          {isGluedPopup && (
            <div style={{ fontSize: '0.78rem', color: '#b45309', padding: '0 0 2px', lineHeight: 1.3 }}>
              Print / export at 100% actual size — never "Fit to Page"
            </div>
          )}

          {/* Reset, Save, Load (left) and Export (right) */}
            <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '0.5rem' }}>
              {/* Reset, Save, Load - left aligned */}
              <div className="form-group" style={{ display: 'flex', flexDirection: 'row', gap: '0.4rem', alignItems: 'center', flexWrap: 'nowrap' }}>
                <button
                  className="btn btn-secondary"
                  onClick={onResetDefaults}
                  title="Reset to defaults"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    width: 'auto',
                    padding: '0.5rem 0.6rem',
                    flexShrink: 0
                  }}
                >
                  <Undo size={16} />
                  Reset
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={handleSave}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    width: 'auto',
                    padding: '0.5rem 0.6rem',
                    flexShrink: 0
                  }}
                >
                  <Save size={16} />
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
                    gap: '4px',
                    width: 'auto',
                    padding: '0.5rem 0.6rem',
                    opacity: hasSavedConfigsState ? 1 : 0.5,
                    cursor: hasSavedConfigsState ? 'pointer' : 'not-allowed',
                    flexShrink: 0
                  }}
                >
                  <FolderUp size={16} />
                  Load
                </button>
              </div>
              {/* Export - right aligned */}
              <div className="form-group" style={{ flexShrink: 0 }}>
                <button
                  className="btn btn-primary"
                  onClick={handleExportClick}
                  disabled={isExporting}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100px',
                    minWidth: '100px',
                    padding: '0.5rem 0.6rem',
                    gap: '4px',
                    opacity: isExporting ? 0.7 : 1,
                    cursor: isExporting ? 'not-allowed' : 'pointer',
                    transform: isExporting ? 'scale(0.98)' : 'scale(1)',
                    transition: 'all 0.1s ease',
                  }}
                >
                  <Download size={18} style={{ marginRight: '2px' }} stroke="#fff" strokeWidth={2} />
                  {isExporting ? 'Exporting...' : 'Export'}
                </button>
              </div>
            </div>

          {/* Print + export options row — always one line (Format, DPI, Print) */}
          <div
            className="form-row"
            style={{
              display: 'flex',
              flexDirection: 'row',
              flexWrap: 'nowrap',
              alignItems: 'flex-end',
              justifyContent: 'flex-start',
              gap: '0.5rem',
              minWidth: 0,
            }}
          >
            {/* Left: Export format + DPI */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'nowrap',
                alignItems: 'flex-end',
                gap: '0.5rem',
                flex: '1 1 auto',
                minWidth: 0,
              }}
            >
              <div className="form-group" style={{ flex: '0 1 auto', minWidth: 0 }}>
                <label className="form-label">Export Format</label>
                <select
                  className="form-select"
                  value={format}
                  onChange={(e) => {
                    log.debug('Format change:', e.target.value);
                    setFormat(e.target.value as ExportFormat);
                  }}
                  style={{ width: 'auto', minWidth: '5.5rem', maxWidth: '100%' }}
                >
                  <option value="SVG">SVG</option>
                  <option value="PNG">PNG</option>
                  <option value="PDF">PDF</option>
                </select>
              </div>

              {format === 'PNG' && (
                <div className="form-group" style={{ flex: '0 0 auto' }}>
                  <label className="form-label">DPI</label>
                  <input
                    type="number"
                    className="form-input"
                    min={72}
                    max={2400}
                    step={1}
                    value={dpi}
                    onChange={e => setDpi(parseInt(e.target.value) || 600)}
                    style={{ width: '64px' }}
                  />
                </div>
              )}
            </div>

            <div className="form-group" style={{ flex: '0 0 auto', marginLeft: 'auto' }}>
              <label className="form-label" style={{ visibility: 'hidden' }} aria-hidden>
                {'\u00a0'}
              </label>
              <button
                type="button"
                className="btn"
                onClick={() => setShowGallery(true)}
                title={galleryTranslations[galleryLang].photos}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 'auto',
                  padding: '0.5rem 0.6rem',
                  gap: '4px',
                  backgroundColor: '#eff6ff',
                  border: '1.5px solid #2563eb',
                  color: '#2563eb',
                  fontWeight: 600,
                  boxShadow: '0 1px 2px rgba(37,99,235,0.15)',
                }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#dbeafe'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#eff6ff'; }}
              >
                <Camera size={18} />
                {galleryTranslations[galleryLang].photos}
              </button>
            </div>

            <div className="form-group" style={{ flex: '0 0 auto' }}>
              <label className="form-label" style={{ visibility: 'hidden' }} aria-hidden>
                {'\u00a0'}
              </label>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handlePrintClick}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100px',
                  minWidth: '100px',
                  padding: '0.5rem 0.6rem',
                  gap: '4px',
                }}
              >
                <Download size={18} stroke="#fff" strokeWidth={2} />
                Print
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

      {/* Print/Export Today Line Dialog */}
      {pendingAction && ReactDOM.createPortal(
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            fontFamily: 'system-ui, Avenir, Helvetica, Arial, sans-serif',
          }}
          onClick={handleDialogCancel}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 8,
              padding: 24,
              minWidth: 340,
              maxWidth: '90vw',
              boxShadow: '0 2px 16px rgba(0,0,0,0.2)',
              position: 'relative',
            }}
            onClick={e => e.stopPropagation()}
          >
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                cursor: 'pointer',
                fontSize: '0.95rem',
                color: '#374151',
                userSelect: 'none',
              }}
            >
              <input
                type="checkbox"
                checked={includeTodayLine}
                onChange={e => setIncludeTodayLine(e.target.checked)}
                style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#2563eb' }}
              />
              Include Today ({todayFormatted}) Date Line?
            </label>

            {pendingAction === 'print' && (
              <p
                style={{
                  margin: '14px 0 0 0',
                  fontSize: '0.875rem',
                  lineHeight: 1.45,
                  color: '#dc2626',
                }}
              >
                <strong>TIP:</strong> Your printer may print {'<'} 100% Scale! Include{' '}
                <strong>Pop-Up Gnomon</strong> to check scaling, or match your gnomon height to the distance
                between the two dots just above the bottom border.
              </p>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button
                onClick={handleDialogCancel}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#f3f4f6',
                  border: '1px solid #d1d5db',
                  color: '#374151',
                  cursor: 'pointer',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDialogContinue}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#2563eb',
                  border: '1px solid #2563eb',
                  color: 'white',
                  cursor: 'pointer',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                }}
              >
                Continue
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showGallery && ReactDOM.createPortal(
        // Portalled to <body> so the gallery's position:fixed is relative to the
        // viewport. Rendered in place, a transformed ancestor of the card becomes
        // its containing block and traps the "full screen" overlay inside the card.
        <Suspense fallback={null}>
          <PhotoGallery language={galleryLang} onClose={() => setShowGallery(false)} />
        </Suspense>,
        document.body
      )}
    </div>
  );
});

export default DesignExport;