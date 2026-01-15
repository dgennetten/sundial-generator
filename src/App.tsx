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
import { getSolarPosition, projectShadowToSurface } from './utils/analemmaGenerator';
import AboutCard from './components/AboutCard';
// import VisitorMap from './components/VisitorMap';
import DialTextBlockSettings from './components/DialTextBlockSettings';
import PrintedDialsMap from './components/PrintedDialsMap';
import type { SundialPrint } from './types/sundial';


const DEFAULT_DIAL_TEXTBLOCK = `**{location}**\n{coordinates}\n{half-year}\n*{gnomon}*\n*{incline}*\n*{today}*`;

const App: React.FC = () => {
  const [latitude, setLatitude] = useState(40.5853);
  const [longitude, setLongitude] = useState(-105.0844);
  const [tzMeridian, setTzMeridian] = useState(-90);
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
  const [declinationType, setDeclinationType] = useState<DeclinationType>('North');
  const [declinationDegrees, setDeclinationDegrees] = useState<number>(0);
  const [hourlineDateRange, setHourlineDateRange] = useState<'FullYear' | 'SummerToFall' | 'WinterToSpring'>('WinterToSpring');
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
          return { ...i, styleId: range === 'FullYear' ? 'dashed-hairline' : 'default-hairline' };
        }
        if (i.id === 'quarter-hour') {
          return { ...i, active: range !== 'FullYear', styleId: 'hourline-5-2-day-dash' };
        }
        if (i.id === '5-minute' || i.id === '2-minute') {
          return { ...i, active: false };
        }
        return i;
      });
      // Persist overrides of built-ins so refresh keeps the setting
      saveHourlineOverrides({
        'half-hour': { styleId: range === 'FullYear' ? 'dashed-hairline' : 'default-hairline' },
        'quarter-hour': { active: range !== 'FullYear', styleId: 'hourline-5-2-day-dash' },
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
  // Add state for gnomon position
  const [gnomonPosition, setGnomonPosition] = useState<number>(0);
  const [gnomonPositionMode, setGnomonPositionMode] = useState<'auto' | 'manual'>('auto');
  const [showBackground, setShowBackground] = useState<boolean>(true);
  const [backgroundColor, setBackgroundColor] = useState<string>('Cornsilk');
  const [dialTextBlock, setDialTextBlock] = useState<string>(DEFAULT_DIAL_TEXTBLOCK);
  const [dialTextBlockFontSize, setDialTextBlockFontSize] = useState<number>(pageSize === '10x15cm Postcard' ? 8 : 14);
  const [dialTextBlockFontFamily, setDialTextBlockFontFamily] = useState<string>(fontFamily);
  const [sundialNotesMode, setSundialNotesMode] = useState<string>('textBlock');
  const [sundialNotesPositionMode, setSundialNotesPositionMode] = useState<'auto' | 'manual'>('auto');
  const [sundialNotesOffset, setSundialNotesOffset] = useState<number>(0); // in mm
  const [locationName, setLocationName] = useState<string>('Fort Collins, CO USA');
  const [printedDialsMapRefreshTrigger, setPrintedDialsMapRefreshTrigger] = useState<number>(0);

  // Calculate default dial orientation
  // Default orientation is North (North at top)
  const getDefaultDialOrientation = (): 'North' | 'South' => {
    return 'North';
  };

  const [dialOrientation, setDialOrientation] = useState<'North' | 'South'>(getDefaultDialOrientation());

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

  // Helper functions for tropical calculations
  const getCancerIncline = (lat: number): number => {
    // Calculate tilt toward Tropic of Cancer (23.4367°)
    // This creates a dial oriented toward the summer solstice
    return Math.abs(lat - 23.4367);
  };

  const getCapricornIncline = (lat: number): number => {
    // Calculate tilt toward Tropic of Capricorn (-23.4367°)
    // This creates a dial oriented toward the winter solstice
    return Math.abs(lat - (-23.4367));
  };

  // Update tilt angle when incline type or latitude changes
  useEffect(() => {
    if (inclineType !== 'Manual') {
      const newAngle = inclineType === 'Horizontal' ? 0 :
        inclineType === 'Cancer' ? getCancerIncline(latitude) :
          inclineType === 'Polar' ? latitude :
            inclineType === 'Capricorn' ? getCapricornIncline(latitude) :
              inclineType === 'Vertical' ? 90 : 0;
      setTiltAngle(newAngle);
    }
  }, [inclineType, latitude]);

  // Debug: log declinationLines before filtering
  React.useEffect(() => {
    console.log('App declinationLines state:', declinationLines);
  }, [declinationLines]);

  // Update font sizes and offset when page size changes
  React.useEffect(() => {
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

  // Calculate effective latitude based on incline
  const effectiveLatitude = useMemo(() => {
    const tilt = inclineType === 'Horizontal' ? 0 :
      inclineType === 'Cancer' ? getCancerIncline(latitude) :
        inclineType === 'Polar' ? latitude :
          inclineType === 'Capricorn' ? getCapricornIncline(latitude) :
            inclineType === 'Vertical' ? 90 : tiltAngle;
    return latitude - tilt;
  }, [inclineType, latitude, tiltAngle]);

  // Function to calculate gnomon height based on winter-to-summer solstice distance
  const calculateAutoGnomonHeight = useCallback((lat: number, pageHeight: number): number => {
    // Winter solstice is around day 355, Summer solstice is around day 172
    const winterSolsticeDay = 355;
    const summerSolsticeDay = 172;
    const noonHour = 12;

    // Calculate shadow positions for winter and summer solstices at noon
    const winterPos = getSolarPosition(winterSolsticeDay, lat, longitude, tzMeridian, noonHour);
    const summerPos = getSolarPosition(summerSolsticeDay, lat, longitude, tzMeridian, noonHour);

    if (winterPos.altitude <= 0 || summerPos.altitude <= 0) {
      // Fallback to original calculation if sun is below horizon
      return Math.round(Math.tan((lat * Math.PI) / 180) * 100 * 3.7 / 8);
    }

    // Project shadows to surface (using a temporary gnomon height of 1)
    const tempGnomonHeight = 1;
    const winterShadow = projectShadowToSurface(winterPos.altitude, winterPos.azimuth, tempGnomonHeight, 'Horizontal', lat);
    const summerShadow = projectShadowToSurface(summerPos.altitude, summerPos.azimuth, tempGnomonHeight, 'Horizontal', lat);

    // Calculate the distance between winter and summer shadows
    const shadowDistance = Math.abs(winterShadow.y - summerShadow.y);

    // Calculate required gnomon height to make this distance 40% of page height
    const targetDistance = pageHeight * 0.4;
    const requiredGnomonHeight = targetDistance / shadowDistance;
    // Reduce to 66% of previous value, then increase by factor of 55/40
    return Math.round(requiredGnomonHeight * 0.66 * (55 / 40));
  }, [longitude, tzMeridian]);

  const effectiveGnomonHeight = useMemo(() => (
    gnomonMode === 'auto'
      ? calculateAutoGnomonHeight(effectiveLatitude, pageHeight)
      : gnomonHeight
  ), [gnomonMode, effectiveLatitude, pageHeight, gnomonHeight, calculateAutoGnomonHeight]);

  const activeHourlineIntervals = useMemo(() =>
    hourlineIntervals.filter(i => i.active),
    [hourlineIntervals]
  );

  const normalizedDeclinationLines = useMemo(() =>
    declinationLines
      .map(l => ({
        ...l,
        id: l.id || `user-${Date.now()}-${Math.random()}`,
        styleId: l.styleId || 'default-hairline',
      }))
      .filter(l => l.active && l.date && l.styleId),
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
    showBackground,
    backgroundColor,
    dialTextBlock,
    dialTextBlockFontSize,
    dialTextBlockFontFamily,
    sundialNotesMode,
    sundialNotesPositionMode,
    sundialNotesOffset,
    locationName,
    inclineType,
    tiltAngle,
    declinationNoonmarks,
    dialOrientation,
    originalLatitude: latitude,
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
    showBackground,
    backgroundColor,
    dialTextBlock,
    dialTextBlockFontSize,
    dialTextBlockFontFamily,
    sundialNotesMode,
    sundialNotesPositionMode,
    sundialNotesOffset,
    locationName,
    inclineType,
    tiltAngle,
    declinationNoonmarks,
    dialOrientation,
    latitude,
    activeHourlineIntervals,
    normalizedDeclinationLines,
  ]);

  // Callback to restore settings from a printed dial record
  const handlePinClick = useCallback((print: SundialPrint) => {
    setLatitude(print.latitude);
    setLongitude(print.longitude);
    // Set timezone meridian to match longitude (required for calculations)
    setTzMeridian(print.longitude);
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
    if (config.declinationType !== undefined) setDeclinationType(config.declinationType);
    if (config.declinationDegrees !== undefined) setDeclinationDegrees(config.declinationDegrees);
    if (config.dialOrientation !== undefined) setDialOrientation(config.dialOrientation);
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
  }, [handleDateRangeChange]);

  return (
    <div className="app-container">
      {/* Controls Panel - Left Side */}
      <div className="controls-panel">
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
          customUnits={customUnits}
          declinationType={declinationType}
          declinationDegrees={declinationDegrees}
          dialOrientation={dialOrientation}
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
          onRestoreDial={handleRestoreDial}
        />

        <LocationInputs
          latitude={latitude}
          longitude={longitude}
          tzMeridian={tzMeridian}
          sundialNotesMode={sundialNotesMode}
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
        />

        <GnomonSettings
          mode={gnomonMode}
          height={gnomonHeight}
          latitude={effectiveLatitude}
          longitude={longitude}
          tzMeridian={tzMeridian}
          pageHeight={pageHeight}
          gnomonType={gnomonType}
          positionMode={gnomonPositionMode}
          onChange={useCallback(({ mode, height, gnomonType, positionMode, position }) => {
            setGnomonMode(mode);
            setGnomonHeight(height);
            setGnomonType(gnomonType);
            if (positionMode) setGnomonPositionMode(positionMode);
            if (typeof position === 'number') setGnomonPosition(position);
          }, [])}
          position={gnomonPosition}
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
        />

        <React.Profiler id="HourlineSettings" onRender={(id, phase, actualDuration) => {
          if (phase === 'update') console.log(`${id} render: ${actualDuration.toFixed(1)}ms`);
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
          if (phase === 'update') console.log(`${id} render: ${actualDuration.toFixed(1)}ms`);
        }}>

          <LineSettings
            lineStyles={lineStyles}
            setLineStyles={setLineStyles}
          />
        </React.Profiler>
        <PrintedDialsMap
          onPinClick={handlePinClick}
          refreshTrigger={printedDialsMapRefreshTrigger}
        />
        {/* <VisitorMap /> */}
        <AboutCard />
      </div>

      {/* Preview Panel - Right Side */}
      <React.Profiler id="SundialPreview" onRender={(id, phase, actualDuration) => {
        if (phase === 'update') console.log(`${id} render: ${actualDuration.toFixed(1)}ms`);
      }}>
        <SundialPreview config={previewConfig} />
      </React.Profiler>

    </div>
  );
};

export default App;
