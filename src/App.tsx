// src/App.tsx
//
// Precision Sundial - A web-based sundial design application
// Copyright (c) 2025 Sundial Generator
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the Creative Commons Attribution-NonCommercial-ShareAlike
// 4.0 International License as published by Creative Commons.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International
// License for more details.
//
// You should have received a copy of the Creative Commons
// Attribution-NonCommercial-ShareAlike 4.0 International License
// along with this program. If not, see <https://creativecommons.org/licenses/by-nc-sa/4.0/>.

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Download, MapPin, StickyNote, MoveUpRight, Text, Calendar, Clock, PenLine, Map, Info, Undo, X } from 'lucide-react';

import PageSettings, { type InclineType, type DeclinationType, type DialShape } from './components/PageSettings';
import LocationInputs from './components/LocationInputs';
import GnomonSettings from './components/GnomonSettings';
import DesignExport from './components/DesignExport';
import SundialPreview from './components/SundialPreview';
import GnomonNetSVG from './components/GnomonNetSVG';
import HourlineSettings from './components/HourlineSettings';
import { loadHourlineIntervals, type HourlineInterval, saveHourlineOverrides } from './components/hourlineUtils';
import LineSettings from './components/LineSettings';
import { loadLineStyles } from './components/lineStyleUtils';
import type { LineStyle } from './components/LineSettings';
import DeclinationLineOptions from './components/DeclinationLineOptions';
import { loadDeclinationLines } from './components/declinationLineUtils';
import type { DeclinationLine } from './components/DeclinationLineOptions';
import { getDisplayTiltAngle, calculateAutoGnomonHeight, getWallDeclinationForPreset, getCancerInclineWithDeclination, getCapricornInclineWithDeclination } from './utils/sundialMath';
import type { CorrectionFlags } from './utils/sundialMath';
import AboutCard from './components/AboutCard';
// import VisitorMap from './components/VisitorMap';
import DialTextBlockSettings from './components/DialTextBlockSettings';
import PrintedDialsMap from './components/PrintedDialsMap';
import WelcomeDialog, { clearWelcomeDismissed } from './components/WelcomeDialog';
import DevLogModal from './components/DevLogModal';
import { shouldShowLog, clearLogPref } from './lib/devLog';
import type { SundialPrint } from './types/sundial';
import { log } from './utils/logger';
import { getControlsScrollerElement } from './utils/controlsScroller';


const DEFAULT_DIAL_TEXTBLOCK = `**{location}**\n{latitude-label}: {latitude}, {longitude-label}: {longitude}\n{half-year}\n*{incline}{decline}*\n*{gnomon}*\n[red]**{today}**`;

const MOBILE_TABS = [
  { id: 'card-export',     icon: Download,    label: 'Export' },
  { id: 'card-location',   icon: MapPin,      label: 'Location' },
  { id: 'card-page',       icon: StickyNote,  label: 'Page' },
  { id: 'card-gnomon',     icon: MoveUpRight, label: 'Gnomon' },
  { id: 'card-decoration', icon: Text,        label: 'Decoration' },
  { id: 'card-datelines',  icon: Calendar,    label: 'Date Lines' },
  { id: 'card-hourlines',  icon: Clock,       label: 'Hour Lines' },
  { id: 'card-linestyles', icon: PenLine,     label: 'Line Styles' },
  { id: 'card-map',        icon: Map,         label: 'Recent Prints & Exports. Click to view.' },
  { id: 'card-about',      icon: Info,        label: 'About' },
];

const MobileTabBar: React.FC<{ onResetDefaults: () => void }> = ({ onResetDefaults }) => {
  const [activeTab, setActiveTab] = React.useState<string | null>(null);

  const handleTabClick = (id: string) => {
    setActiveTab(id);
    const el = document.getElementById(id);
    if (!el) return;
    const scroller = getControlsScrollerElement();
    if (scroller) {
      const top =
        el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
      scroller.scrollTo({ top, behavior: 'smooth' });
    } else {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="mobile-tab-bar">
      {MOBILE_TABS.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          type="button"
          className={`mobile-tab-btn${activeTab === id ? ' active' : ''}`}
          onClick={() => handleTabClick(id)}
          title={label}
          aria-label={label}
        >
          <Icon size={18} />
        </button>
      ))}
      <button
        type="button"
        className="mobile-tab-btn"
        onClick={onResetDefaults}
        title="Reset to defaults"
        aria-label="Reset to defaults"
      >
        <Undo size={18} />
      </button>
    </div>
  );
};

const App: React.FC = () => {
  const [latitude, setLatitude] = useState(38.2530);
  const [longitude, setLongitude] = useState(-85.7592);
  const [tzMeridian, setTzMeridian] = useState(-75); // Eastern Standard Time meridian (EST = UTC-5 = -75°)
  const [gnomonMode, setGnomonMode] = useState<'auto' | 'manual'>('auto');
  const [gnomonHeight, setGnomonHeight] = useState(10);
  const [gnomonType, setGnomonType] = useState<'crosshair' | 'popup' | 'popup-with-brace' | 'crosshair-with-north' | 'crosshair-with-height' | 'glued-popup-base'>('popup-with-brace');
  const [gnomonPreviewMode, setGnomonPreviewMode] = useState<'Dial' | 'Gnomon'>('Dial');
  const [pageSize, setPageSize] = useState<'A4' | 'Letter' | '11x17' | '10x15cm Postcard' | 'Custom'>('Letter');
  const [customWidth, setCustomWidth] = useState<number>(8.5 * 25.4); // Store in mm
  const [customHeight, setCustomHeight] = useState<number>(11 * 25.4); // Store in mm
  const [customUnits, setCustomUnits] = useState<'in' | 'cm'>('in');
  const [previousPageSize, setPreviousPageSize] = useState<'A4' | 'Letter' | '11x17' | '10x15cm Postcard' | 'Custom'>('Letter');
  const isRestoringRef = useRef(false); // Flag to prevent auto-initialization during restore
  const [restoreCompleteTick, setRestoreCompleteTick] = useState(0);
  const [orientation, setOrientation] = useState<'Landscape' | 'Portrait'>('Landscape');
  const [inclineType, setInclineType] = useState<InclineType>('Horizontal');
  const [tiltAngle, setTiltAngle] = useState<number>(0);
  const [declinationType, setDeclinationType] = useState<DeclinationType>(latitude >= 0 ? 'South' : 'North');
  const [declinationDegrees, setDeclinationDegrees] = useState<number>(0);
  const [dialOrientation, setDialOrientation] = useState<'North' | 'South'>(latitude >= 0 ? 'North' : 'South');
  const prevHemisphereRef = useRef<'N' | 'S'>(latitude >= 0 ? 'N' : 'S');
  const controlsPanelRef = useRef<HTMLDivElement>(null);
  const floatingScrollRef = useRef<HTMLDivElement>(null);
  const [controlsScrolled, setControlsScrolled] = useState(false);

  useEffect(() => {
    const el = controlsPanelRef.current;
    if (!el) return;
    const onScroll = () => setControlsScrolled(el.scrollTop > 40);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);
  const [hourlineDateRange, setHourlineDateRange] = useState<'FullYear' | 'SummerToFall' | 'WinterToSpring'>('FullYear');
  const [lineStyles, setLineStyles] = useState<LineStyle[]>(() => {
    return loadLineStyles();
  });
  const [hourlineIntervals, setHourlineIntervals] = useState<HourlineInterval[]>(() => {
    return loadHourlineIntervals();
  });
  const [declinationLines, setDeclinationLines] = useState<DeclinationLine[]>(() => {
    return loadDeclinationLines();
  });
  const handleDateRangeChange = useCallback((range: 'FullYear' | 'SummerToFall' | 'WinterToSpring') => {
    setHourlineDateRange(range);
    if (range === 'FullYear') {
      setShowFullYearOnNoon(false);
    }
    setHourlineIntervals(prev => {
      const updated = prev.map(i => {
        if (i.id === 'half-hour') {
          return { ...i, styleId: 'hourline-2-2-day-dash' };
        }
        if (i.id === 'quarter-hour') {
          return { ...i, styleId: 'hourline-2-2-day-dash' };
        }
        if (i.id === '5-minute' || i.id === '2-minute') {
          return { ...i, active: false };
        }
        return i;
      });
      // Persist overrides of built-ins so refresh keeps the setting
      saveHourlineOverrides({
        'half-hour': { styleId: 'hourline-2-2-day-dash' },
        'quarter-hour': { styleId: 'hourline-2-2-day-dash' },
        '5-minute': { active: false },
        '2-minute': { active: false },
      });
      return updated;
    });
  }, []);

  const [startHour, setStartHour] = useState<number>(4);
  const [stopHour, setStopHour] = useState<number>(20);
  const [use24Hour, setUse24Hour] = useState<boolean>(false);
  const [labelWinterSide, setLabelWinterSide] = useState<boolean>(true);
  const [labelSummerSide, setLabelSummerSide] = useState<boolean>(true);
  const [labelOffset, setLabelOffset] = useState<number>(pageSize === '10x15cm Postcard' ? 1 : 1.5);
  const [fontFamily, setFontFamily] = useState<string>('sans-serif');
  const [fontSize, setFontSize] = useState<number>(pageSize === '10x15cm Postcard' ? 12 : 20);
  const [useDST, setUseDST] = useState<boolean>(true);
  const [declinationNoonmarks, setDeclinationNoonmarks] = useState<boolean>(true);
  const [showFullYearOnNoon, setShowFullYearOnNoon] = useState<boolean>(false);
  const [showBelowHorizonHourLines, setShowBelowHorizonHourLines] = useState<boolean>(true);
  const [showBelowHorizonDateLines, setShowBelowHorizonDateLines] = useState<boolean>(true);
  const [showDatelineLabels, setShowDatelineLabels] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('sundial-dateline-labels');
      return stored !== null ? stored === 'true' : true;
    } catch { return true; }
  });
  const [datelineLabelLocation, setDatelineLabelLocation] = useState<'edge' | 'noonmark'>(() => {
    try {
      const stored = localStorage.getItem('sundial-dateline-label-location');
      return stored === 'noonmark' ? 'noonmark' : 'edge';
    } catch { return 'edge'; }
  });
  const [syncBelowHorizon, setSyncBelowHorizon] = useState<boolean>(true);
  const [dialShape, setDialShape] = useState<DialShape>('Rectangle');
  const [borderStyle, setBorderStyle] = useState<string>('default-hairline');
  const [borderMargin, setBorderMargin] = useState<number>(pageSize === '10x15cm Postcard' ? 0.1 : 0.236); // in inches (6mm default)
  // Add state for gnomon position (vertical = mm from top, horizontal = mm from left; undefined = center)
  const [gnomonPosition, setGnomonPosition] = useState<number>(0);
  const [gnomonPositionMode, setGnomonPositionMode] = useState<'auto' | 'manual'>('auto');
  const [gnomonHorizontalPosition, setGnomonHorizontalPosition] = useState<number | undefined>(undefined);
  const [showBackground, setShowBackground] = useState<boolean>(true);
  const [backgroundColor, setBackgroundColor] = useState<string>('Cornsilk');
  const [dialTextBlock, setDialTextBlock] = useState<string>(DEFAULT_DIAL_TEXTBLOCK);
  const [dialTextBlockFontSize, setDialTextBlockFontSize] = useState<number>(pageSize === '10x15cm Postcard' ? 8 : 14);
  const [dialTextBlockFontFamily, setDialTextBlockFontFamily] = useState<string>(fontFamily);
  const [sundialNotesMode, setSundialNotesMode] = useState<string>('textBlock');
  const [sundialNotesPositionMode, setSundialNotesPositionMode] = useState<'auto' | 'manual'>('auto');
  const [sundialNotesOffset, setSundialNotesOffset] = useState<number>(0); // in mm
  const [sundialNotesOffsetHorizontal, setSundialNotesOffsetHorizontal] = useState<number>(0); // in mm
  const [locationName, setLocationName] = useState<string>('NASS, Louisville, KY');
  const [printedDialsMapRefreshTrigger, setPrintedDialsMapRefreshTrigger] = useState<number>(0);
  const [language, setLanguage] = useState<string>(
    () => (typeof window !== 'undefined' ? localStorage.getItem('sundial-welcome-language') : null) || 'en'
  );
  const [correctionFlags, setCorrectionFlags] = useState<CorrectionFlags>({
    latitude: true,
    longitude: true,
    equationOfTime: true,
    solarDeclination: true,
    refraction: true,
    mysteryError: false,
  });

  const [isPreviewFullscreen, setIsPreviewFullscreen] = useState(false);
  const [showFloatingControls, setShowFloatingControls] = useState(true);
  const [floatingPos, setFloatingPos] = useState<{ x: number; y: number } | null>(null);
  const floatingDragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  // Sync React state with browser fullscreen changes (e.g. user presses Escape)
  useEffect(() => {
    const onFsChange = () => {
      if (!document.fullscreenElement) {
        setIsPreviewFullscreen(false);
        setShowFloatingControls(true);
        setFloatingPos(null);
      }
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const handleFloatingDragStart = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    const panel = (e.currentTarget as HTMLDivElement).parentElement!;
    const rect = panel.getBoundingClientRect();
    floatingDragRef.current = { startX: e.clientX, startY: e.clientY, origX: rect.left, origY: rect.top };

    const onMove = (ev: MouseEvent) => {
      if (!floatingDragRef.current) return;
      const { startX, startY, origX, origY } = floatingDragRef.current;
      setFloatingPos({ x: origX + ev.clientX - startX, y: origY + ev.clientY - startY });
    };
    const onUp = () => {
      floatingDragRef.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, []);

  const [showDevLog, setShowDevLog] = useState(() => {
    if (!import.meta.env.DEV) return shouldShowLog();
    const resetFlag = sessionStorage.getItem('sundial-show-devlog-after-reset');
    if (resetFlag) {
      sessionStorage.removeItem('sundial-show-devlog-after-reset');
      return shouldShowLog();
    }
    return false;
  });

  // Page size map (mm)
  const pageSizeMap = useMemo(() => ({
    Letter: { width: 8.5 * 25.4, height: 11 * 25.4 },
    A4: { width: 210, height: 297 },
    '11x17': { width: 11 * 25.4, height: 17 * 25.4 },
    '10x15cm Postcard': { width: 100, height: 150 },
  }), []);

  useEffect(() => {
    // Ensure selected style is valid
    // Ensure all hourline intervals have valid styles
    const updated = hourlineIntervals.map(interval => ({
      ...interval,
      styleId: lineStyles.some(s => s.id === interval.styleId || s.name === interval.styleId)
        ? interval.styleId
        : 'default-hairline'
    }));
    if (JSON.stringify(updated) !== JSON.stringify(hourlineIntervals)) {
      setHourlineIntervals(updated);
    }
  }, [lineStyles, hourlineIntervals]);

  // Update dial orientation when crossing equator (hemisphere change) to match hemisphere default
  useEffect(() => {
    const currentHemisphere: 'N' | 'S' = latitude >= 0 ? 'N' : 'S';
    const prevHemisphere = prevHemisphereRef.current;
    if (currentHemisphere !== prevHemisphere) {
      // Hemisphere changed - update dial orientation to match new hemisphere default
      const defaultOrientation = latitude >= 0 ? 'North' : 'South';
      setDialOrientation(defaultOrientation);
      // Note: prevHemisphereRef will be updated by the declination useEffect below
    }
  }, [latitude]); // Only depend on latitude, not dialOrientation to avoid loops

  // Update tilt angle when incline type changes (not when latitude changes).
  // Cancer and Capricorn are handled by a separate effect that also tracks dialDeclination.
  useEffect(() => {
    if (inclineType === 'Horizontal') {
      setTiltAngle(0);
    } else if (inclineType !== 'Manual' && inclineType !== 'Cancer' && inclineType !== 'Capricorn') {
      const newAngle = getDisplayTiltAngle(inclineType, latitude, tiltAngle);
      setTiltAngle(newAngle);
    }
  }, [inclineType]);

  // Keep wall declination at the hemisphere default for Polar only.
  // Cancer and Capricorn now support arbitrary wall declination and re-adjust tilt automatically.
  useEffect(() => {
    if (inclineType !== 'Polar') return;
    const defaultDecl: DeclinationType = latitude >= 0 ? 'South' : 'North';
    setDeclinationType(defaultDecl);
    setDeclinationDegrees(getWallDeclinationForPreset(defaultDecl, 0, latitude));
  }, [inclineType, latitude]);

  // Update declination degrees when declination type preset changes
  useEffect(() => {
    if (declinationType !== 'Manual') {
      setDeclinationDegrees(getWallDeclinationForPreset(declinationType, declinationDegrees, latitude));
    }
  }, [declinationType]);

  // When latitude crosses the equator reset declination to the new hemisphere's poleward default
  useEffect(() => {
    const currentHemisphere: 'N' | 'S' = latitude >= 0 ? 'N' : 'S';
    if (currentHemisphere !== prevHemisphereRef.current) {
      prevHemisphereRef.current = currentHemisphere;
      const defaultDeclinationType = latitude >= 0 ? 'South' : 'North';
      setDeclinationType(defaultDeclinationType);
      setDeclinationDegrees(0);
    }
  }, [latitude]);

  // After reset: scroll left pane to top. Remove flag only after delayed scroll so LineSettings can skip focus-on-mount.
  useEffect(() => {
    try {
      if (!sessionStorage.getItem('sundial-scroll-panel-to-top')) return;
      const panel =
        getControlsScrollerElement() ?? controlsPanelRef.current ?? document.querySelector<HTMLElement>('.controls-panel');
      const scroll = () => panel?.scrollTo(0, 0);
      scroll();
      const t = setTimeout(() => {
        scroll();
        sessionStorage.removeItem('sundial-scroll-panel-to-top');
      }, 150);
      return () => clearTimeout(t);
    } catch (_) {}
  }, []);

  // Dial declination: rotation from poleward direction, degrees (+West / −East)
  const dialDeclination = useMemo(() =>
    getWallDeclinationForPreset(declinationType, declinationDegrees, latitude),
    [declinationType, declinationDegrees, latitude]
  );

  // When Cancer or Capricorn is active, recompute tiltAngle to keep the gnomon on the solstice
  // line as latitude or wall declination changes.
  useEffect(() => {
    if (inclineType === 'Cancer') {
      setTiltAngle(getCancerInclineWithDeclination(latitude, dialDeclination));
    } else if (inclineType === 'Capricorn') {
      setTiltAngle(getCapricornInclineWithDeclination(latitude, dialDeclination));
    }
  }, [inclineType, latitude, dialDeclination]);

  // Debug: log declinationLines before filtering
  React.useEffect(() => {
    log.debug('App declinationLines state:', declinationLines);
  }, [declinationLines]);

  // Update font sizes and offset when page size changes
  // Skip during restore to avoid overwriting restored values
  React.useEffect(() => {
    if (isRestoringRef.current) return;
    if (pageSize === '10x15cm Postcard') {
      setFontSize(12);
      setLabelOffset(1);
      setDialTextBlockFontSize(8);
      setBorderMargin(0.1);
    } else {
      setFontSize(20);
      setLabelOffset(1.5);
      setDialTextBlockFontSize(14);
      setBorderMargin(0.236); // 6mm in inches
    }
  }, [pageSize]);

  // Track previous page size
  useEffect(() => {
    if (pageSize !== 'Custom') {
      setPreviousPageSize(pageSize);
    }
  }, [pageSize]);

  // Initialize custom size values when switching to Custom
  // Skip this if we're in the middle of a restore operation
  useEffect(() => {
    if (pageSize === 'Custom' && !isRestoringRef.current) {
      // Set initial values based on the previous page size
      const currentPageSize = pageSizeMap[previousPageSize as keyof typeof pageSizeMap] || pageSizeMap.Letter;
      const widthInInches = currentPageSize.width / 25.4;
      const heightInInches = currentPageSize.height / 25.4;

      setCustomWidth(Math.round(widthInInches * 25.4 * 10) / 10); // Convert to mm and round to 1 decimal place
      setCustomHeight(Math.round(heightInInches * 25.4 * 10) / 10); // Convert to mm and round to 1 decimal place
      setCustomUnits('in');
    }
  }, [pageSize, previousPageSize, pageSizeMap]);

  // Calculate custom page size in mm
  const customPageSize = useMemo(() => {
    if (pageSize !== 'Custom') return null;
    return {
      width: customWidth,
      height: customHeight,
    };
  }, [pageSize, customWidth, customHeight]);

  let { width: pageWidth, height: pageHeight } = customPageSize || (pageSize !== 'Custom' ? pageSizeMap[pageSize as keyof typeof pageSizeMap] : pageSizeMap.Letter);
  if (orientation === 'Landscape') {
    [pageWidth, pageHeight] = [pageHeight, pageWidth];
  }

  // Reset gnomon preview to Dial when switching away from glued-popup-base
  useEffect(() => {
    if (gnomonType !== 'glued-popup-base') {
      setGnomonPreviewMode('Dial');
    }
  }, [gnomonType]);

  useEffect(() => {
    try { localStorage.setItem('sundial-dateline-labels', String(showDatelineLabels)); } catch { /* ignore */ }
  }, [showDatelineLabels]);
  useEffect(() => {
    try { localStorage.setItem('sundial-dateline-label-location', datelineLabelLocation); } catch { /* ignore */ }
  }, [datelineLabelLocation]);

  // Dial inclination: tilt from horizontal in degrees (0 = flat, 90 = vertical).
  // Cancer and Capricorn use the declination-aware formula so the gnomon stays on the solstice line.
  const dialInclination = useMemo(() => {
    if (gnomonType === 'glued-popup-base') return 0;
    if (inclineType === 'Cancer') return getCancerInclineWithDeclination(latitude, dialDeclination);
    if (inclineType === 'Capricorn') return getCapricornInclineWithDeclination(latitude, dialDeclination);
    return getDisplayTiltAngle(inclineType, latitude, tiltAngle);
  }, [gnomonType, inclineType, latitude, tiltAngle, dialDeclination]);

  const autoGnomonHeight = useCallback((pageHeight: number): number => {
    return calculateAutoGnomonHeight(latitude, longitude, tzMeridian, pageHeight, dialInclination, dialDeclination);
  }, [latitude, longitude, tzMeridian, dialInclination, dialDeclination]);

  const effectiveGnomonHeight = useMemo(() => (
    gnomonMode === 'auto'
      ? autoGnomonHeight(pageHeight)
      : gnomonHeight
  ), [gnomonMode, pageHeight, gnomonHeight, autoGnomonHeight]);

  const activeHourlineIntervals = useMemo(() =>
    hourlineIntervals.filter(i => i.active),
    [hourlineIntervals]
  );

  const normalizedDeclinationLines = useMemo(() =>
    (() => {
      const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      const normalizeMonthShort = (rawToken: string): string | null => {
        const token = String(rawToken).trim();
        if (token.length < 3) return null;
        const key = token.slice(0, 3).toLowerCase();
        if (!months.includes(key)) return null;
        return key.charAt(0).toUpperCase() + key.slice(1); // e.g. "jul" -> "Jul"
      };

      const parseRange = (s: string): { type: 'range'; monthShort: string; startDay: number; endDay: number } | null => {
        const str = String(s || '').trim();
        // Accept "July 1-5" and "Jul 1 - 5"
        const rangeRe = /^([A-Za-z]+)\s+(\d{1,2})\s*-\s*(\d{1,2})$/;
        const mRange = rangeRe.exec(str);
        if (!mRange) return null;
        const monthShort = normalizeMonthShort(mRange[1]);
        if (!monthShort) return null;
        const startDay = parseInt(mRange[2], 10);
        const endDay = parseInt(mRange[3], 10);
        if (startDay < 1 || startDay > 31) return null;
        if (endDay < 1 || endDay > 31) return null;
        if (endDay < startDay) return null;
        return { type: 'range', monthShort, startDay, endDay };
      };

      const expanded: DeclinationLine[] = [];

      declinationLines.forEach((l) => {
        const id = l.id || `user-${Date.now()}-${Math.random()}`;
        const styleId = l.styleId || 'default-hairline';

        if (!l.active || !l.date) return;

        const parsed = parseRange(l.date);
        if (parsed) {
          // Expand into one line per day (inclusive)
          const baseId = id || `user-${Date.now()}-${Math.random()}`;
          for (let d = parsed.startDay; d <= parsed.endDay; d++) {
            expanded.push({
              ...l,
              id: `${baseId}-${d}`,
              styleId,
              date: `${parsed.monthShort} ${d}`,
            });
          }
          return;
        }

        expanded.push({
          ...l,
          id,
          styleId,
        });
      });

      return expanded.filter(l => l.active && l.date && l.styleId);
    })(),
    [declinationLines]
  );
  const previewConfig = useMemo(() => ({
    lat: latitude,
    lng: longitude,
    tzMeridian,
    scale: 1,
    gnomonHeight: effectiveGnomonHeight,
    gnomonType,
    startHour,
    stopHour,
    use24Hour,
    orientation,
    pageSize,
    customWidth,
    customHeight,
    dateRange: hourlineDateRange,
    hourlineIntervals: activeHourlineIntervals,
    declinationLines: normalizedDeclinationLines,
    lineStyles,
    labelWinterSide,
    labelSummerSide,
    labelOffset,
    fontFamily,
    fontSize,
    useDST,
    dialShape,
    borderStyle,
    borderMargin,
    gnomonPosition,
    gnomonHorizontalPosition,
    showBackground,
    backgroundColor,
    dialTextBlock,
    dialTextBlockFontSize,
    dialTextBlockFontFamily,
    sundialNotesMode,
    sundialNotesPositionMode,
    sundialNotesOffset,
    sundialNotesOffsetHorizontal,
    locationName,
    inclineType,
    tiltAngle,
    declinationType,
    declinationDegrees,
    declinationNoonmarks,
    showFullYearOnNoon,
    originalLatitude: latitude,
    dialInclination,
    dialDeclination,
    dialOrientation,
    showBelowHorizonHourLines,
    showBelowHorizonDateLines,
    showDatelineLabels,
    datelineLabelLocation,
    language,
    correctionFlags,
  }), [
    latitude,
    longitude,
    tzMeridian,
    effectiveGnomonHeight,
    gnomonType,
    startHour,
    stopHour,
    use24Hour,
    orientation,
    pageSize,
    customWidth,
    customHeight,
    hourlineDateRange,
    lineStyles,
    labelWinterSide,
    labelSummerSide,
    labelOffset,
    fontFamily,
    fontSize,
    useDST,
    dialShape,
    borderStyle,
    borderMargin,
    gnomonPosition,
    gnomonHorizontalPosition,
    showBackground,
    backgroundColor,
    dialTextBlock,
    dialTextBlockFontSize,
    dialTextBlockFontFamily,
    sundialNotesMode,
    sundialNotesPositionMode,
    sundialNotesOffset,
    sundialNotesOffsetHorizontal,
    locationName,
    inclineType,
    tiltAngle,
    declinationType,
    declinationDegrees,
    declinationNoonmarks,
    showFullYearOnNoon,
    activeHourlineIntervals,
    normalizedDeclinationLines,
    dialInclination,
    dialDeclination,
    dialOrientation,
    showBelowHorizonHourLines,
    showBelowHorizonDateLines,
    showDatelineLabels,
    datelineLabelLocation,
    language,
    correctionFlags,
  ]);

  // Callback to restore dial configuration from saved config
  const handleRestoreDial = useCallback((config: any) => {
    // Set restore flag to prevent auto-initialization
    isRestoringRef.current = true;

    // Location
    if (config.latitude !== undefined) setLatitude(config.latitude);
    if (config.longitude !== undefined) setLongitude(config.longitude);
    if (config.tzMeridian !== undefined) setTzMeridian(config.tzMeridian);
    if (config.locationName !== undefined) setLocationName(config.locationName);

    // Gnomon
    if (config.gnomonMode !== undefined) setGnomonMode(config.gnomonMode);
    if (config.gnomonHeight !== undefined) setGnomonHeight(config.gnomonHeight);
    if (config.gnomonType !== undefined) setGnomonType(config.gnomonType);
    if (config.gnomonPosition !== undefined) setGnomonPosition(config.gnomonPosition);
    if (config.gnomonPositionMode !== undefined) setGnomonPositionMode(config.gnomonPositionMode);
    if (config.gnomonHorizontalPosition !== undefined) setGnomonHorizontalPosition(config.gnomonHorizontalPosition);

    // Page - restore custom dimensions FIRST, then pageSize
    // This prevents the auto-initialization useEffect from overwriting restored values
    if (config.customWidth !== undefined) setCustomWidth(config.customWidth);
    if (config.customHeight !== undefined) setCustomHeight(config.customHeight);
    if (config.customUnits !== undefined) setCustomUnits(config.customUnits);

    // Now set pageSize (this will trigger the useEffect, but our flag prevents overwriting)
    if (config.pageSize !== undefined) {
      setPageSize(config.pageSize);
    }

    // Clear restore flag after a short delay to allow state updates to complete
    setTimeout(() => {
      isRestoringRef.current = false;
      setRestoreCompleteTick((t) => t + 1);
    }, 100);
    if (config.orientation !== undefined) setOrientation(config.orientation);
    if (config.inclineType !== undefined) setInclineType(config.inclineType);
    if (config.tiltAngle !== undefined) setTiltAngle(config.tiltAngle);
    // Restore declination; fall back to hemisphere default if not saved
    const restoreLatitude = config.latitude !== undefined ? config.latitude : latitude;
    const defaultDeclinationType = restoreLatitude >= 0 ? 'South' : 'North';
    if (config.declinationType !== undefined) {
      setDeclinationType(config.declinationType);
    } else {
      setDeclinationType(defaultDeclinationType);
    }
    if (config.declinationDegrees !== undefined) {
      setDeclinationDegrees(config.declinationDegrees);
    } else {
      setDeclinationDegrees(0);
    }
    if (config.dialShape !== undefined) setDialShape(config.dialShape);
    if (config.borderStyle !== undefined) setBorderStyle(config.borderStyle);
    if (config.borderMargin !== undefined) setBorderMargin(config.borderMargin);

    // Hour lines
    if (config.hourlineDateRange !== undefined) {
      handleDateRangeChange(config.hourlineDateRange);
    }
    if (config.hourlineIntervals !== undefined && Array.isArray(config.hourlineIntervals)) {
      setHourlineIntervals(config.hourlineIntervals);
    }
    if (config.startHour !== undefined) setStartHour(config.startHour);
    if (config.stopHour !== undefined) setStopHour(config.stopHour);
    if (config.use24Hour !== undefined) setUse24Hour(config.use24Hour);
    if (config.labelWinterSide !== undefined) setLabelWinterSide(config.labelWinterSide);
    if (config.labelSummerSide !== undefined) setLabelSummerSide(config.labelSummerSide);
    if (config.labelOffset !== undefined) setLabelOffset(config.labelOffset);
    if (config.fontFamily !== undefined) setFontFamily(config.fontFamily);
    if (config.fontSize !== undefined) setFontSize(config.fontSize);
    if (config.useDST !== undefined) setUseDST(config.useDST);
    if (config.declinationNoonmarks !== undefined) setDeclinationNoonmarks(config.declinationNoonmarks);
    if (config.showFullYearOnNoon !== undefined) setShowFullYearOnNoon(config.showFullYearOnNoon);
    if (config.showBelowHorizonHourLines !== undefined) setShowBelowHorizonHourLines(config.showBelowHorizonHourLines);
    if (config.showBelowHorizonDateLines !== undefined) setShowBelowHorizonDateLines(config.showBelowHorizonDateLines);
    if (config.syncBelowHorizon !== undefined) setSyncBelowHorizon(config.syncBelowHorizon);

    // Lines - restore these carefully to maintain references
    if (config.lineStyles !== undefined && Array.isArray(config.lineStyles)) {
      setLineStyles(config.lineStyles);
    }
    if (config.declinationLines !== undefined && Array.isArray(config.declinationLines)) {
      setDeclinationLines(config.declinationLines);
    }

    // Background/Text
    if (config.showBackground !== undefined) setShowBackground(config.showBackground);
    if (config.backgroundColor !== undefined) setBackgroundColor(config.backgroundColor);
    if (config.dialTextBlock !== undefined) setDialTextBlock(config.dialTextBlock);
    if (config.dialTextBlockFontSize !== undefined) setDialTextBlockFontSize(config.dialTextBlockFontSize);
    if (config.dialTextBlockFontFamily !== undefined) setDialTextBlockFontFamily(config.dialTextBlockFontFamily);
    if (config.sundialNotesMode !== undefined) setSundialNotesMode(config.sundialNotesMode);
    if (config.sundialNotesPositionMode !== undefined) setSundialNotesPositionMode(config.sundialNotesPositionMode);
    if (config.sundialNotesOffset !== undefined) setSundialNotesOffset(config.sundialNotesOffset);
    if (config.sundialNotesOffsetHorizontal !== undefined) setSundialNotesOffsetHorizontal(config.sundialNotesOffsetHorizontal);
    if (config.dialOrientation !== undefined) setDialOrientation(config.dialOrientation);
  }, [handleDateRangeChange]);

  // Callback to restore settings from a printed dial record
  const handlePinClick = useCallback((print: SundialPrint) => {
    // If a full config snapshot was stored, do a complete restore and return early
    if (print.config_json) {
      try {
        const fullConfig = JSON.parse(print.config_json);
        handleRestoreDial(fullConfig);
        return;
      } catch {
        // Fall through to partial restore if JSON is malformed
      }
    }

    // Partial restore for legacy records without config_json
    setLatitude(print.latitude);
    setLongitude(print.longitude);
    // Estimate timezone standard meridian from longitude (nearest 15° = 1 hour)
    setTzMeridian(Math.round(print.longitude / 15) * 15);
    setTiltAngle(print.inclination);
    setInclineType('Manual');
    setDeclinationType('Manual'); // Required so declinationDegrees is used, not a preset
    setGnomonType(print.gnomon_type as typeof gnomonType);
    setSundialNotesMode(print.notes_type);
    setHourlineDateRange(print.date_range as typeof hourlineDateRange);
    setDeclinationDegrees(print.declination);

    if (print.location) {
      setLocationName(print.location);
      setDialTextBlock(prev => {
        if (!prev.includes('{location}')) {
          return `**{location}**\n${prev}`;
        }
        return prev;
      });
    }
    if (print.today_line_active !== undefined) {
      setDeclinationLines(prev => prev.map(line =>
        line.id === 'today' ? { ...line, active: !!print.today_line_active } : line
      ));
    }
  }, [handleRestoreDial]);

  // Callback to trigger map refresh after logging
  const handleLogComplete = useCallback(() => {
    // Increment refresh trigger to cause map to refresh
    setPrintedDialsMapRefreshTrigger(prev => prev + 1);
  }, []);

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
      clearLogPref();
      getControlsScrollerElement()?.scrollTo(0, 0);
      try {
        sessionStorage.setItem('sundial-scroll-panel-to-top', '1');
        sessionStorage.setItem('sundial-show-welcome-after-reset', '1');
        sessionStorage.setItem('sundial-show-devlog-after-reset', '1');
      } catch (_) {}
      window.location.hash = '';
      window.location.reload();
    }
  }, []);

  const handleSetTodayLineActive = useCallback((active: boolean) => {
    setDeclinationLines(prev => prev.map(line =>
      line.id === 'today' ? { ...line, active } : line
    ));
  }, []);

  const [highLatVerticalNudgeOpen, setHighLatVerticalNudgeOpen] = useState(false);
  const suppressHighLatVerticalNudgeRef = useRef(false);

  const highLatFlatHorizontalEligible =
    Math.abs(latitude) >= 55 &&
    inclineType === 'Horizontal' &&
    Math.abs(tiltAngle) < 0.05;

  useEffect(() => {
    if (!highLatFlatHorizontalEligible) {
      suppressHighLatVerticalNudgeRef.current = false;
      setHighLatVerticalNudgeOpen(false);
      return;
    }
    if (isRestoringRef.current) return;
    if (!suppressHighLatVerticalNudgeRef.current) {
      setHighLatVerticalNudgeOpen(true);
    }
  }, [highLatFlatHorizontalEligible, latitude, inclineType, tiltAngle, restoreCompleteTick]);

  const confirmHighLatVertical = useCallback(() => {
    setInclineType('Vertical');
    setGnomonPositionMode('auto');
    suppressHighLatVerticalNudgeRef.current = true;
    setHighLatVerticalNudgeOpen(false);
  }, []);

  const cancelHighLatVertical = useCallback(() => {
    suppressHighLatVerticalNudgeRef.current = true;
    setHighLatVerticalNudgeOpen(false);
  }, []);

  const highLatVerticalNudgeBody =
    latitude >= 0 ? (
      <>
        At northern latitudes of <strong>55°N</strong> or poleward, a <strong>vertical</strong> dial is much more
        readable than a horizontal one. Would you like me to set the inclination to <strong>Vertical</strong>?
      </>
    ) : (
      <>
        At southern latitudes of <strong>55°S</strong> or poleward, a <strong>vertical</strong> dial is much more
        readable than a horizontal one. Would you like me to set the inclination to <strong>Vertical</strong>?
      </>
    );

  return (
    <div className={`app-container${isPreviewFullscreen ? ' preview-fullscreen' : ''}`}>
      {/* Welcome Dialog */}
      <WelcomeDialog language={language} onLanguageChange={setLanguage} />

      {showDevLog && (
        <DevLogModal onClose={() => setShowDevLog(false)} />
      )}

      {highLatVerticalNudgeOpen &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="high-lat-vertical-nudge-title"
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1100,
              fontFamily: 'system-ui, Avenir, Helvetica, Arial, sans-serif',
            }}
            onClick={cancelHighLatVertical}
            onKeyDown={(e) => {
              if (e.key === 'Escape') cancelHighLatVertical();
            }}
          >
            <div
              style={{
                background: '#fff',
                borderRadius: 8,
                padding: 24,
                minWidth: 320,
                maxWidth: 'min(440px, 92vw)',
                boxShadow: '0 2px 16px rgba(0,0,0,0.2)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2
                id="high-lat-vertical-nudge-title"
                style={{ margin: '0 0 12px 0', fontSize: '1.05rem', color: '#111827' }}
              >
                Vertical dial recommended
              </h2>
              <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: 1.5, color: '#374151' }}>
                {highLatVerticalNudgeBody}
              </p>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-start',
                  gap: 10,
                  marginTop: 20,
                }}
              >
                <button
                  type="button"
                  onClick={confirmHighLatVertical}
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
                  Yes
                </button>
                <button
                  type="button"
                  onClick={cancelHighLatVertical}
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
              </div>
            </div>
          </div>,
          document.body
        )}
      
      {/* Controls Panel - Left Side */}
      {(!isPreviewFullscreen || showFloatingControls) && (
      <div
        ref={controlsPanelRef}
        className={`controls-panel${isPreviewFullscreen ? ' controls-panel--floating' : ''}`}
        style={isPreviewFullscreen && floatingPos ? { left: floatingPos.x, top: floatingPos.y } : undefined}
      >
        {isPreviewFullscreen && (
          <div className="floating-controls-titlebar" onMouseDown={handleFloatingDragStart}>
            <div className="floating-controls-icons">
              {MOBILE_TABS.map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  className="floating-tab-icon"
                  title={label}
                  onClick={(e) => {
                    const el = document.getElementById(id);
                    if (!el) return;
                    const scroller = floatingScrollRef.current;
                    if (scroller) {
                      const bar = (e.currentTarget as HTMLElement).closest('.floating-controls-titlebar') as HTMLElement | null;
                      const barHeight = bar ? bar.getBoundingClientRect().height : 0;
                      const top = el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - barHeight;
                      scroller.scrollTo({ top, behavior: 'smooth' });
                    }
                  }}
                >
                  <Icon size={15} />
                </button>
              ))}
            </div>
            <button
              className="floating-controls-close"
              onClick={() => {
                if (document.fullscreenElement) {
                  document.exitFullscreen();
                } else {
                  setIsPreviewFullscreen(false);
                  setShowFloatingControls(true);
                  setFloatingPos(null);
                }
              }}
              title="Hide controls"
            >
              <X size={15} />
            </button>
          </div>
        )}
        {!isPreviewFullscreen && controlsScrolled && (
          <div className="controls-sticky-iconbar">
            {MOBILE_TABS.map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                className="controls-sticky-icon"
                title={label}
                onClick={(e) => {
                  const el = document.getElementById(id);
                  if (!el) return;
                  const scroller = controlsPanelRef.current;
                  if (scroller) {
                    const bar = (e.currentTarget as HTMLElement).closest('.controls-sticky-iconbar') as HTMLElement | null;
                    const barHeight = bar ? bar.getBoundingClientRect().height : 0;
                    const top = el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - barHeight;
                    scroller.scrollTo({ top, behavior: 'smooth' });
                  }
                }}
              >
                <Icon size={15} />
              </button>
            ))}
          </div>
        )}
        <div className="mobile-controls-scroll" ref={isPreviewFullscreen ? floatingScrollRef : undefined}>
        <div className="app-header">
          <h1 className="app-title">Precision Sundial</h1>
          <p className="app-subtitle">Create beautiful, accurate sundials for any location</p>
        </div>

        <div id="card-export"><DesignExport
          pageSize={pageSize}
          orientation={orientation}
          customWidth={customWidth}
          customHeight={customHeight}
          dateRange={hourlineDateRange}
          gnomonType={gnomonType}
          locationName={locationName}
          showBackground={showBackground}
          backgroundColor={backgroundColor}
          sundialNotesMode={sundialNotesMode}
          dialTextBlock={dialTextBlock}
          latitude={latitude}
          longitude={longitude}
          gnomonHeight={effectiveGnomonHeight}
          inclineType={inclineType}
          tiltAngle={tiltAngle}
          onLogComplete={handleLogComplete}
          tzMeridian={tzMeridian}
          gnomonMode={gnomonMode}
          gnomonPosition={gnomonPosition}
          gnomonPositionMode={gnomonPositionMode}
          gnomonHorizontalPosition={gnomonHorizontalPosition}
          customUnits={customUnits}
          declinationType={declinationType}
          declinationDegrees={declinationDegrees}
          dialShape={dialShape}
          borderStyle={borderStyle}
          borderMargin={borderMargin}
          hourlineIntervals={hourlineIntervals}
          lineStyles={lineStyles}
          declinationLines={declinationLines}
          startHour={startHour}
          stopHour={stopHour}
          use24Hour={use24Hour}
          labelWinterSide={labelWinterSide}
          labelSummerSide={labelSummerSide}
          labelOffset={labelOffset}
          fontFamily={fontFamily}
          fontSize={fontSize}
          useDST={useDST}
          declinationNoonmarks={declinationNoonmarks}
          showFullYearOnNoon={showFullYearOnNoon}
          dialTextBlockFontSize={dialTextBlockFontSize}
          dialTextBlockFontFamily={dialTextBlockFontFamily}
          sundialNotesPositionMode={sundialNotesPositionMode}
          sundialNotesOffset={sundialNotesOffset}
          sundialNotesOffsetHorizontal={sundialNotesOffsetHorizontal}
          dialOrientation={dialOrientation}
          showBelowHorizonHourLines={showBelowHorizonHourLines}
          showBelowHorizonDateLines={showBelowHorizonDateLines}
          syncBelowHorizon={syncBelowHorizon}
          onRestoreDial={handleRestoreDial}
          onSetTodayLineActive={handleSetTodayLineActive}
          onResetDefaults={handleResetDefaults}
        /></div>

        <div id="card-location"><LocationInputs
          latitude={latitude}
          longitude={longitude}
          tzMeridian={tzMeridian}
          onChange={useCallback(({ lat, lng, tz, useDST, locationName }) => {
            setLatitude(lat);
            setLongitude(lng);
            setTzMeridian(tz);
            if (useDST !== undefined) setUseDST(useDST);
            if (locationName) {
              setLocationName(locationName);
            } else {
              const locations: { [key: string]: { lat: number; lng: number } } = {
                'Fort Collins, CO USA': { lat: 40.5853, lng: -105.0844 },
                'Los Barriles, Mexico': { lat: 23.6880, lng: -109.6930 },
                'Spartanburg, SC USA': { lat: 34.9496, lng: -81.9321 },
                'Tucson, AZ USA': { lat: 32.2226, lng: -110.9747 },
                'Recife, Brazil': { lat: -8.0476, lng: -34.8770 },
                'Sydney, Australia': { lat: -33.8688, lng: 151.2093 },
                'Falkenstein, Saxony, Germany': { lat: 50.4777, lng: 12.3649 },
                'Luxembourg City, Luxembourg': { lat: 49.6116, lng: 6.1319 },
                'St Petersburg, Russia': { lat: 59.8761, lng: 30.4339 }
              };
              let newLocationName = 'Custom Lat/Long';
              for (const [name, data] of Object.entries(locations)) {
                if (Math.abs(data.lat - lat) < 0.001 && Math.abs(data.lng - lng) < 0.001) {
                  newLocationName = name;
                  break;
                }
              }
              setLocationName(newLocationName);
            }
          }, [])}
        /></div>

        <div id="card-page"><PageSettings
          pageSize={pageSize}
          setPageSize={setPageSize}
          orientation={orientation}
          setOrientation={setOrientation}
          inclineType={inclineType}
          setInclineType={setInclineType}
          tiltAngle={tiltAngle}
          setTiltAngle={setTiltAngle}
          declinationType={declinationType}
          setDeclinationType={setDeclinationType}
          declinationDegrees={declinationDegrees}
          setDeclinationDegrees={setDeclinationDegrees}
          latitude={latitude}
          dialOrientation={dialOrientation}
          setDialOrientation={setDialOrientation}
          customWidth={customWidth}
          setCustomWidth={setCustomWidth}
          customHeight={customHeight}
          setCustomHeight={setCustomHeight}
          customUnits={customUnits}
          setCustomUnits={setCustomUnits}
          onBorderChange={(shape, style, margin) => {
            setDialShape(shape);
            setBorderStyle(style);
            setBorderMargin(margin / 25.4); // Convert mm to inches
          }}
          onBackgroundChange={(showBackground, backgroundColor) => {
            setShowBackground(showBackground);
            setBackgroundColor(backgroundColor);
          }}
          lineStyles={lineStyles}
          dialShape={dialShape}
          borderStyle={borderStyle}
          borderMargin={borderMargin}
          showBackground={showBackground}
          backgroundColor={backgroundColor}
          onInclineTypeChange={() => setGnomonPositionMode('auto')}
          disableInclination={gnomonType === 'glued-popup-base'}
        /></div>

        <div id="card-gnomon"><GnomonSettings
          mode={gnomonMode}
          height={gnomonHeight}
          latitude={latitude}
          longitude={longitude}
          tzMeridian={tzMeridian}
          pageHeight={pageHeight}
          pageWidth={pageWidth}
          gnomonType={gnomonType}
          positionMode={gnomonPositionMode}
          position={gnomonPosition}
          horizontalPosition={gnomonHorizontalPosition}
          dialInclination={dialInclination}
          dialDeclination={dialDeclination}
          lockHorizontalToCenter={declinationType !== 'Manual' || Math.abs(dialDeclination) < 1e-6}
          gnomonPreviewMode={gnomonPreviewMode}
          onGnomonPreviewModeChange={setGnomonPreviewMode}
          onChange={useCallback(({ mode, height, gnomonType, positionMode, position, horizontalPosition }) => {
            setGnomonMode(mode);
            setGnomonHeight(height);
            setGnomonType(gnomonType);
            if (positionMode) setGnomonPositionMode(positionMode);
            if (typeof position === 'number') setGnomonPosition(position);
            if (horizontalPosition !== undefined) setGnomonHorizontalPosition(horizontalPosition);
          }, [])}
        /></div>

        <div id="card-decoration"><DialTextBlockSettings
          dialTextBlock={dialTextBlock}
          setDialTextBlock={setDialTextBlock}
          dialTextBlockFontSize={dialTextBlockFontSize}
          setDialTextBlockFontSize={setDialTextBlockFontSize}
          dialTextBlockFontFamily={dialTextBlockFontFamily}
          setDialTextBlockFontFamily={setDialTextBlockFontFamily}
          sundialNotesMode={sundialNotesMode}
          setSundialNotesMode={setSundialNotesMode}
          sundialNotesPositionMode={sundialNotesPositionMode}
          setSundialNotesPositionMode={setSundialNotesPositionMode}
          sundialNotesOffset={sundialNotesOffset}
          setSundialNotesOffset={setSundialNotesOffset}
          sundialNotesOffsetHorizontal={sundialNotesOffsetHorizontal}
          setSundialNotesOffsetHorizontal={setSundialNotesOffsetHorizontal}
          language={language}
          setLanguage={(v) => {
            setLanguage(v);
            localStorage.setItem('sundial-welcome-language', v);
          }}
        /></div>

        <React.Profiler id="HourlineSettings" onRender={(id, phase, actualDuration) => {
          if (phase === 'update') log.perf(id, phase, actualDuration);
        }}>
          <div id="card-datelines"><DeclinationLineOptions
            lineStyles={lineStyles}
            declinationLines={declinationLines}
            setDeclinationLines={setDeclinationLines}
            dateRange={hourlineDateRange}
            lat={latitude}
            showBelowHorizonDateLines={showBelowHorizonDateLines}
            setShowBelowHorizonDateLines={(v) => {
              setShowBelowHorizonDateLines(v);
              if (syncBelowHorizon) setShowBelowHorizonHourLines(v);
            }}
            syncBelowHorizon={syncBelowHorizon}
            setSyncBelowHorizon={(v) => {
              setSyncBelowHorizon(v);
              if (v) setShowBelowHorizonDateLines(showBelowHorizonHourLines);
            }}
            showDatelineLabels={showDatelineLabels}
            setShowDatelineLabels={setShowDatelineLabels}
            declinationNoonmarks={declinationNoonmarks}
            datelineLabelLocation={datelineLabelLocation}
            setDatelineLabelLocation={setDatelineLabelLocation}
          /></div>
          <div id="card-hourlines"><HourlineSettings
            dateRange={hourlineDateRange}
            setDateRange={handleDateRangeChange}
            lineStyles={lineStyles}
            hourlineIntervals={hourlineIntervals}
            setHourlineIntervals={setHourlineIntervals}
            startHour={startHour}
            stopHour={stopHour}
            use24Hour={use24Hour}
            onUpdate={useCallback((start, stop, use24, winter, summer, offset, fontFam, fontSz, dst, declNoonmarks) => {
              setStartHour(start);
              setStopHour(stop);
              setUse24Hour(use24);
              setLabelWinterSide(winter);
              setLabelSummerSide(summer);
              setLabelOffset(offset);
              setFontFamily(fontFam);
              setFontSize(fontSz);
              setUseDST(dst);
              setDeclinationNoonmarks(declNoonmarks);
            }, [])}
            labelWinterSide={labelWinterSide}
            labelSummerSide={labelSummerSide}
            labelOffset={labelOffset}
            fontFamily={fontFamily}
            fontSize={fontSize}
            useDST={useDST}
            declinationNoonmarks={declinationNoonmarks}
            showFullYearOnNoon={showFullYearOnNoon}
            setShowFullYearOnNoon={setShowFullYearOnNoon}
            showBelowHorizonHourLines={showBelowHorizonHourLines}
            setShowBelowHorizonHourLines={(v) => {
              setShowBelowHorizonHourLines(v);
              if (syncBelowHorizon) setShowBelowHorizonDateLines(v);
            }}
            syncBelowHorizon={syncBelowHorizon}
            setSyncBelowHorizon={(v) => {
              setSyncBelowHorizon(v);
              if (v) setShowBelowHorizonDateLines(showBelowHorizonHourLines);
            }}
          /></div>
        </React.Profiler>
        <React.Profiler id="LineSettings" onRender={(id, phase, actualDuration) => {
          if (phase === 'update') log.perf(id, phase, actualDuration);
        }}>
          <div id="card-linestyles"><LineSettings
            lineStyles={lineStyles}
            setLineStyles={setLineStyles}
            hourlineIntervals={hourlineIntervals}
            declinationLines={declinationLines}
          /></div>
        </React.Profiler>
        <div id="card-map"><PrintedDialsMap
          onPinClick={handlePinClick}
          refreshTrigger={printedDialsMapRefreshTrigger}
        /></div>
        {/* <VisitorMap /> */}
        <div id="card-about"><AboutCard latitude={latitude} longitude={longitude} locationName={locationName} onShowDevLog={() => { clearLogPref(); setShowDevLog(true); }} correctionFlags={correctionFlags} onCorrectionFlagsChange={setCorrectionFlags} /></div>
        </div>
      </div>
      )}

      {/* Preview Panel - Right Side (order places it at top on mobile portrait) */}
      <div
        className="preview-panel"
        data-mobile-sheet={orientation === 'Portrait' ? 'portrait' : 'landscape'}
        style={
          {
            '--mobile-page-aspect-w': pageWidth,
            '--mobile-page-aspect-h': pageHeight,
          } as React.CSSProperties
        }
      >
        <div className="mobile-preview-slot">
          <div className="mobile-preview-slot-inner">
            {gnomonType === 'glued-popup-base' && gnomonPreviewMode === 'Gnomon' && (
              <GnomonNetSVG
                gnomonHeight={effectiveGnomonHeight}
                pageWidth={pageWidth}
                pageHeight={pageHeight}
                showBackground={showBackground}
                backgroundColor={backgroundColor}
                borderMarginMm={borderMargin * 25.4}
              />
            )}
            {/* SundialPreview stays in the DOM even when gnomon tab is active
                so that createSVGExport() can always read the dial SVG for print.
                display:contents when visible → transparent to the flex layout,
                so SundialPreview's card is a direct flex child of .preview-panel
                exactly as before this wrapper was added. */}
            <div style={{ display: gnomonType === 'glued-popup-base' && gnomonPreviewMode === 'Gnomon' ? 'none' : 'contents' }}>
              <React.Profiler id="SundialPreview" onRender={(id, phase, actualDuration) => {
                if (phase === 'update') log.perf(id, phase, actualDuration);
              }}>
                <SundialPreview
                  config={previewConfig}
                  isFullscreen={isPreviewFullscreen}
                  onToggleFullscreen={() => {
                    if (!document.fullscreenElement) {
                      document.documentElement.requestFullscreen().then(() => {
                        setIsPreviewFullscreen(true);
                        setShowFloatingControls(true);
                        setFloatingPos(null);
                      }).catch(() => {
                        // Fallback: CSS-only fullscreen if browser blocks the API
                        setIsPreviewFullscreen(true);
                        setShowFloatingControls(true);
                        setFloatingPos(null);
                      });
                    } else {
                      document.exitFullscreen().then(() => {
                        setIsPreviewFullscreen(false);
                        setShowFloatingControls(true);
                        setFloatingPos(null);
                      });
                    }
                  }}
                />
              </React.Profiler>
            </div>
          </div>
        </div>
        {isPreviewFullscreen && !showFloatingControls && (
          <button
            className="preview-show-controls-btn"
            onClick={() => setShowFloatingControls(true)}
            title="Show controls"
          >
            Show Controls
          </button>
        )}
        <MobileTabBar onResetDefaults={handleResetDefaults} />
      </div>

    </div>
  );
};

export default App;