// src/App.tsx
//
// Sundial Generator - A web-based sundial design application
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

import PageSettings, { type InclineType, type DeclinationType, type DialShape } from './components/PageSettings';
import LocationInputs from './components/LocationInputs';
import GnomonSettings from './components/GnomonSettings';
import DesignExport from './components/DesignExport';
import SundialPreview from './components/SundialPreview';
import HourlineSettings from './components/HourlineSettings';
import { loadHourlineIntervals, type HourlineInterval, saveHourlineOverrides } from './components/hourlineUtils';
import LineSettings from './components/LineSettings';
import { loadLineStyles } from './components/lineStyleUtils';
import type { LineStyle } from './components/LineSettings';
import DeclinationLineOptions from './components/DeclinationLineOptions';
import { loadDeclinationLines } from './components/declinationLineUtils';
import type { DeclinationLine } from './components/DeclinationLineOptions';
import { getDisplayTiltAngle, getRenderTiltAngle, calculateAutoGnomonHeight, getWallDeclinationForPreset, computeGeneralDialParameters } from './utils/sundialMath';
import AboutCard from './components/AboutCard';
// import VisitorMap from './components/VisitorMap';
import DialTextBlockSettings from './components/DialTextBlockSettings';
import PrintedDialsMap from './components/PrintedDialsMap';
import WelcomeDialog from './components/WelcomeDialog';
import type { SundialPrint } from './types/sundial';
import { log } from './utils/logger';


const DEFAULT_DIAL_TEXTBLOCK = `**{location}**\nLatitude: {latitude}, Longitude: {longitude}\n{half-year}\n*{incline}{decline}*\n*{gnomon}*\n*{today}*`;

const App: React.FC = () => {
  const [latitude, setLatitude] = useState(40.5853);
  const [longitude, setLongitude] = useState(-105.0844);
  const [tzMeridian, setTzMeridian] = useState(-105); // Mountain Standard Time meridian (MST = UTC-7 = -105°)
  const [gnomonMode, setGnomonMode] = useState<'auto' | 'manual'>('auto');
  const [gnomonHeight, setGnomonHeight] = useState(10);
  const [gnomonType, setGnomonType] = useState<'crosshair' | 'popup' | 'popup-with-brace' | 'crosshair-with-north' | 'crosshair-with-height'>('popup-with-brace');
  const [pageSize, setPageSize] = useState<'A4' | 'Letter' | '11x17' | '10x15cm Postcard' | 'Custom'>('Letter');
  const [customWidth, setCustomWidth] = useState<number>(8.5 * 25.4); // Store in mm
  const [customHeight, setCustomHeight] = useState<number>(11 * 25.4); // Store in mm
  const [customUnits, setCustomUnits] = useState<'in' | 'cm'>('in');
  const [previousPageSize, setPreviousPageSize] = useState<'A4' | 'Letter' | '11x17' | '10x15cm Postcard' | 'Custom'>('Letter');
  const isRestoringRef = useRef(false); // Flag to prevent auto-initialization during restore
  const [orientation, setOrientation] = useState<'Landscape' | 'Portrait'>('Landscape');
  const [inclineType, setInclineType] = useState<InclineType>('Horizontal');
  const [tiltAngle, setTiltAngle] = useState<number>(90);
  const [declinationType, setDeclinationType] = useState<DeclinationType>(latitude >= 0 ? 'North' : 'South');
  const [declinationDegrees, setDeclinationDegrees] = useState<number>(0);
  const [dialOrientation, setDialOrientation] = useState<'North' | 'South'>(latitude >= 0 ? 'North' : 'South');
  const prevHemisphereRef = useRef<'N' | 'S'>(latitude >= 0 ? 'N' : 'S');
  const controlsPanelRef = useRef<HTMLDivElement>(null);
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
    setHourlineIntervals(prev => {
      const updated = prev.map(i => {
        if (i.id === 'half-hour') {
          return { ...i, styleId: 'hourline-2-2-day-dash' };
        }
        if (i.id === 'quarter-hour') {
          return { ...i, active: range !== 'FullYear', styleId: 'hourline-2-2-day-dash' };
        }
        if (i.id === '5-minute' || i.id === '2-minute') {
          return { ...i, active: false };
        }
        return i;
      });
      // Persist overrides of built-ins so refresh keeps the setting
      saveHourlineOverrides({
        'half-hour': { styleId: 'hourline-2-2-day-dash' },
        'quarter-hour': { active: range !== 'FullYear', styleId: 'hourline-2-2-day-dash' },
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
  const [locationName, setLocationName] = useState<string>('Fort Collins, CO USA');
  const [printedDialsMapRefreshTrigger, setPrintedDialsMapRefreshTrigger] = useState<number>(0);

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

  // Update tilt angle when incline type changes (not when latitude changes)
  // This prevents issues when switching between locations
  useEffect(() => {
    if (inclineType !== 'Manual') {
      const newAngle = getDisplayTiltAngle(inclineType, latitude, tiltAngle);
      setTiltAngle(newAngle);
    }
  }, [inclineType]);

  // Update declination degrees when declination type preset changes
  useEffect(() => {
    if (declinationType !== 'Manual') {
      setDeclinationDegrees(getWallDeclinationForPreset(declinationType, declinationDegrees, latitude));
    }
  }, [declinationType]);

  // Update declination type when latitude crosses the equator to match hemisphere default
  // Since declination is disabled, always set to default (North for NH, South for SH)
  useEffect(() => {
    const currentHemisphere: 'N' | 'S' = latitude >= 0 ? 'N' : 'S';
    if (currentHemisphere !== prevHemisphereRef.current) {
      prevHemisphereRef.current = currentHemisphere;
      // Always set to default for new hemisphere (declination is disabled)
      const defaultDeclinationType = latitude >= 0 ? 'North' : 'South';
      setDeclinationType(defaultDeclinationType);
      setDeclinationDegrees(0);
    }
  }, [latitude]); // Only depend on latitude, not declinationType to avoid loops

  // After reset: scroll left pane to top. Remove flag only after delayed scroll so LineSettings can skip focus-on-mount.
  useEffect(() => {
    try {
      if (!sessionStorage.getItem('sundial-scroll-panel-to-top')) return;
      const panel = controlsPanelRef.current ?? document.querySelector<HTMLElement>('.controls-panel');
      const scroll = () => panel?.scrollTo(0, 0);
      scroll();
      const t = setTimeout(() => {
        scroll();
        sessionStorage.removeItem('sundial-scroll-panel-to-top');
      }, 150);
      return () => clearTimeout(t);
    } catch (_) {}
  }, []);

  // Raw wall declination from UI presets
  const rawWallDeclination = useMemo(() =>
    getWallDeclinationForPreset(declinationType, declinationDegrees, latitude),
    [declinationType, declinationDegrees, latitude]
  );

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

  // Calculate render tilt angle for incline
  const renderTiltAngle = useMemo(() =>
    getRenderTiltAngle(inclineType, latitude, tiltAngle),
    [inclineType, latitude, tiltAngle]
  );

  // General dial parameters: combines inclination + declination via classical gnomonics
  const { effectiveLatitude, styleRotation: wallDeclination } = useMemo(() =>
    computeGeneralDialParameters(latitude, renderTiltAngle, rawWallDeclination),
    [latitude, renderTiltAngle, rawWallDeclination]
  );

  // Use consolidated calculateAutoGnomonHeight from sundialMath
  const autoGnomonHeight = useCallback((lat: number, pageHeight: number): number => {
    return calculateAutoGnomonHeight(lat, longitude, tzMeridian, pageHeight);
  }, [longitude, tzMeridian]);

  const effectiveGnomonHeight = useMemo(() => (
    gnomonMode === 'auto'
      ? autoGnomonHeight(effectiveLatitude, pageHeight)
      : gnomonHeight
  ), [gnomonMode, effectiveLatitude, pageHeight, gnomonHeight, autoGnomonHeight]);

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
    lat: effectiveLatitude,
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
    originalLatitude: latitude,
    wallDeclination,
    dialOrientation,
  }), [
    effectiveLatitude,
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
    latitude,
    activeHourlineIntervals,
    normalizedDeclinationLines,
    wallDeclination,
    dialOrientation,
  ]);

  // Callback to restore settings from a printed dial record
  const handlePinClick = useCallback((print: SundialPrint) => {
    setLatitude(print.latitude);
    setLongitude(print.longitude);
    // Estimate timezone standard meridian from longitude (nearest 15° = 1 hour)
    setTzMeridian(Math.round(print.longitude / 15) * 15);
    setTiltAngle(print.inclination);
    setInclineType('Manual'); // Set to Manual since we're restoring a specific angle
    setGnomonType(print.gnomon_type as typeof gnomonType);
    setSundialNotesMode(print.notes_type);
    setHourlineDateRange(print.date_range as typeof hourlineDateRange);
    setDeclinationDegrees(print.declination);
    
    // Restore location from saved record
    if (print.location) {
      setLocationName(print.location);
      
      // Ensure {location} placeholder exists in dialTextBlock (restore it if it was cleared)
      setDialTextBlock(prev => {
        // If {location} placeholder doesn't exist, add it at the beginning
        if (!prev.includes('{location}')) {
          // Add **{location}** as the first line (matching default format)
          return `**{location}**\n${prev}`;
        }
        // If it already exists, keep it as is (it will be replaced at render time with locationName)
        return prev;
      });
    }
    // If no location saved, leave dialTextBlock as-is (don't clear {location} placeholder)
  }, []);

  // Callback to trigger map refresh after logging
  const handleLogComplete = useCallback(() => {
    // Increment refresh trigger to cause map to refresh
    setPrintedDialsMapRefreshTrigger(prev => prev + 1);
  }, []);

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
    }, 100);
    if (config.orientation !== undefined) setOrientation(config.orientation);
    if (config.inclineType !== undefined) setInclineType(config.inclineType);
    if (config.tiltAngle !== undefined) setTiltAngle(config.tiltAngle);
    // Declination is disabled - always set to default for current hemisphere
    // Use the latitude from the config if available, otherwise use current latitude
    const restoreLatitude = config.latitude !== undefined ? config.latitude : latitude;
    const defaultDeclinationType = restoreLatitude >= 0 ? 'North' : 'South';
    setDeclinationType(defaultDeclinationType);
    setDeclinationDegrees(0);
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
  }, [handleDateRangeChange]);

  const handleSetTodayLineActive = useCallback((active: boolean) => {
    setDeclinationLines(prev => prev.map(line =>
      line.id === 'today' ? { ...line, active } : line
    ));
  }, []);

  return (
    <div className="app-container">
      {/* Welcome Dialog */}
      <WelcomeDialog />
      
      {/* Controls Panel - Left Side */}
      <div ref={controlsPanelRef} className="controls-panel">
        <div className="app-header">
          <h1 className="app-title">Sundial Generator</h1>
          <p className="app-subtitle">Create beautiful, accurate sundials for any location</p>
        </div>

        <DesignExport
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
          dialTextBlockFontSize={dialTextBlockFontSize}
          dialTextBlockFontFamily={dialTextBlockFontFamily}
          sundialNotesPositionMode={sundialNotesPositionMode}
          sundialNotesOffset={sundialNotesOffset}
          sundialNotesOffsetHorizontal={sundialNotesOffsetHorizontal}
          onRestoreDial={handleRestoreDial}
          onSetTodayLineActive={handleSetTodayLineActive}
        />

        <LocationInputs
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
        />

        <PageSettings
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
        />

        <GnomonSettings
          mode={gnomonMode}
          height={gnomonHeight}
          latitude={effectiveLatitude}
          longitude={longitude}
          tzMeridian={tzMeridian}
          pageHeight={pageHeight}
          pageWidth={pageWidth}
          gnomonType={gnomonType}
          positionMode={gnomonPositionMode}
          position={gnomonPosition}
          horizontalPosition={gnomonHorizontalPosition}
          wallDeclination={wallDeclination}
          lockHorizontalToCenter={declinationType !== 'Manual' || Math.abs(rawWallDeclination) < 1e-6}
          onChange={useCallback(({ mode, height, gnomonType, positionMode, position, horizontalPosition }) => {
            setGnomonMode(mode);
            setGnomonHeight(height);
            setGnomonType(gnomonType);
            if (positionMode) setGnomonPositionMode(positionMode);
            if (typeof position === 'number') setGnomonPosition(position);
            if (horizontalPosition !== undefined) setGnomonHorizontalPosition(horizontalPosition);
          }, [])}
        />

        <DialTextBlockSettings
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
        />

        <React.Profiler id="HourlineSettings" onRender={(id, phase, actualDuration) => {
          if (phase === 'update') log.perf(id, phase, actualDuration);
        }}>

          <DeclinationLineOptions
            lineStyles={lineStyles}
            declinationLines={declinationLines}
            setDeclinationLines={setDeclinationLines}
            dateRange={hourlineDateRange}
            lat={effectiveLatitude}
          />
          <HourlineSettings
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
          />
        </React.Profiler>
        <React.Profiler id="LineSettings" onRender={(id, phase, actualDuration) => {
          if (phase === 'update') log.perf(id, phase, actualDuration);
        }}>

          <LineSettings
            lineStyles={lineStyles}
            setLineStyles={setLineStyles}
            hourlineIntervals={hourlineIntervals}
            declinationLines={declinationLines}
          />
        </React.Profiler>
        <PrintedDialsMap
          onPinClick={handlePinClick}
          refreshTrigger={printedDialsMapRefreshTrigger}
        />
        {/* <VisitorMap /> */}
        <AboutCard />
      </div>

      {/* Preview Panel - Right Side (order places it at top on mobile portrait) */}
      <div className="preview-panel">
        <React.Profiler id="SundialPreview" onRender={(id, phase, actualDuration) => {
          if (phase === 'update') log.perf(id, phase, actualDuration);
        }}>
          <SundialPreview config={previewConfig} />
        </React.Profiler>
      </div>

    </div>
  );
};

export default App;
