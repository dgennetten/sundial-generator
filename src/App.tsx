// src/App.tsx

import React, { useState, useEffect } from 'react';
import PageSettings from './components/PageSettings';
import LocationInputs from './components/LocationInputs';
import GnomonSettings from './components/GnomonSettings';
import DesignExport from './components/DesignExport';
import SundialPreview from './components/SundialPreview';
import HourlineSettings, { loadHourlineIntervals } from './components/HourlineSettings';
import type { HourlineInterval } from './components/HourlineSettings';
import LineSettings, { loadLineStyles } from './components/LineSettings';
import type { LineStyle } from './components/LineSettings';
import DeclinationLineOptions, { loadDeclinationLines } from './components/DeclinationLineOptions';
import type { DeclinationLine } from './components/DeclinationLineOptions';
import { getSolarPosition, projectShadowToSurface } from './utils/analemmaGenerator';


const App: React.FC = () => {
  const [latitude, setLatitude] = useState(40.5853);
  const [longitude, setLongitude] = useState(-105.0844);
  const [tzMeridian, setTzMeridian] = useState(-105);
  const [gnomonMode, setGnomonMode] = useState<'auto' | 'manual'>('auto');
  const [gnomonHeight, setGnomonHeight] = useState(10);
  const [gnomonType, setGnomonType] = useState<'crosshair' | 'sized-base-triangle'>('crosshair');
  const [pageSize, setPageSize] = useState<'A4' | 'Letter' | 'Custom'>('Letter');
  const [orientation, setOrientation] = useState<'Landscape' | 'Portrait'>('Landscape');
  const [hourlineDateRange, setHourlineDateRange] = useState<'FullYear' | 'SummerToWinter' | 'WinterToSummer'>('FullYear');
  const [lineStyles, setLineStyles] = useState<LineStyle[]>(() => {
    return loadLineStyles();
  });
  const [hourlineIntervals, setHourlineIntervals] = useState<HourlineInterval[]>(() => {
    return loadHourlineIntervals();
  });
  const [declinationLines, setDeclinationLines] = useState<DeclinationLine[]>(() => {
    return loadDeclinationLines();
  });
  const [startHour, setStartHour] = useState<number>(6);
  const [stopHour, setStopHour] = useState<number>(18);
  const [use24Hour, setUse24Hour] = useState<boolean>(true);
  const [labelWinterSide, setLabelWinterSide] = useState<boolean>(true);
  const [labelSummerSide, setLabelSummerSide] = useState<boolean>(true);
  const [labelOffset, setLabelOffset] = useState<number>(1.5);
  const [fontFamily, setFontFamily] = useState<string>('sans-serif');
  const [fontSize, setFontSize] = useState<number>(5);
  const [showBorder, setShowBorder] = useState<boolean>(true);
  const [borderMargin, setBorderMargin] = useState<number>(0.25); // in inches
  const [borderStyle, setBorderStyle] = useState<string>('default-hairline');
  // Add state for gnomon position
  const [gnomonPosition, setGnomonPosition] = useState<number>(0);
  const [gnomonPositionMode, setGnomonPositionMode] = useState<'auto' | 'manual'>('auto');

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

  // Debug: log declinationLines before filtering
  React.useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('App declinationLines state:', declinationLines);
  }, [declinationLines]);

  // Page size map (mm)
  const pageSizeMap = {
    Letter: { width: 8.5 * 25.4, height: 11 * 25.4 },
    A4: { width: 210, height: 297 },
    Custom: { width: 8.5 * 25.4, height: 11 * 25.4 }, // fallback for now
  };
  let { width: pageWidth, height: pageHeight } = pageSizeMap[pageSize] || pageSizeMap.Letter;
  if (orientation === 'Landscape') {
    [pageWidth, pageHeight] = [pageHeight, pageWidth];
  }

  // Function to calculate gnomon height based on winter-to-summer solstice distance
  const calculateAutoGnomonHeight = (lat: number, pageHeight: number): number => {
    // Winter solstice is around day 355, Summer solstice is around day 172
    const winterSolsticeDay = 355;
    const summerSolsticeDay = 172;
    const noonHour = 12;
    
    // Calculate shadow positions for winter and summer solstices at noon
    const winterPos = getSolarPosition(winterSolsticeDay, lat, longitude, tzMeridian, noonHour);
    const summerPos = getSolarPosition(summerSolsticeDay, lat, longitude, tzMeridian, noonHour);
    
    if (winterPos.altitude <= 0 || summerPos.altitude <= 0) {
      // Fallback to original calculation if sun is below horizon
      return parseFloat((Math.tan((lat * Math.PI) / 180) * 100 * 3.7 / 8).toFixed(2));
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
    
    return parseFloat(requiredGnomonHeight.toFixed(2));
  };

  const effectiveGnomonHeight =
    gnomonMode === 'auto'
      ? calculateAutoGnomonHeight(latitude, pageHeight)
      : gnomonHeight;

  return (
    <div className="app-container">
      {/* Controls Panel - Left Side */}
      <div className="controls-panel">
        <div className="app-header">
          <h1 className="app-title">Sundial Generator</h1>
          <p className="app-subtitle">Create beautiful, accurate sundials for any location</p>
        </div>

        <LocationInputs
          latitude={latitude}
          longitude={longitude}
          tzMeridian={tzMeridian}
          onChange={({ lat, lng, tz }) => {
            setLatitude(lat);
            setLongitude(lng);
            setTzMeridian(tz);
          }}
        />

        <PageSettings
          pageSize={pageSize}
          setPageSize={setPageSize}
          orientation={orientation}
          setOrientation={setOrientation}
        />

        <LineSettings
          lineStyles={lineStyles}
          setLineStyles={setLineStyles}
        />
        <GnomonSettings
          mode={gnomonMode}
          height={gnomonHeight}
          latitude={latitude}
          longitude={longitude}
          tzMeridian={tzMeridian}
          pageHeight={pageHeight}
          gnomonType={gnomonType}
          positionMode={gnomonPositionMode}
          position={gnomonPosition}
          onChange={({ mode, height, gnomonType, positionMode, position }) => {
            setGnomonMode(mode);
            setGnomonHeight(height);
            setGnomonType(gnomonType);
            if (positionMode) setGnomonPositionMode(positionMode);
            if (typeof position === 'number') setGnomonPosition(position);
          }}
        />
        <DeclinationLineOptions
          lineStyles={lineStyles}
          declinationLines={declinationLines}
          setDeclinationLines={setDeclinationLines}
        />
        <HourlineSettings
          dateRange={hourlineDateRange}
          setDateRange={setHourlineDateRange}
          lineStyles={lineStyles}
          hourlineIntervals={hourlineIntervals}
          setHourlineIntervals={setHourlineIntervals}
          onUpdate={(start, stop, use24, winter, summer, offset, fontFam, fontSz) => {
            setStartHour(start);
            setStopHour(stop);
            setUse24Hour(use24);
            setLabelWinterSide(winter);
            setLabelSummerSide(summer);
            setLabelOffset(offset);
            setFontFamily(fontFam);
            setFontSize(fontSz);
          }}
        />
        <DesignExport 
          lineStyles={lineStyles}
          onBorderChange={(showBorder, margin, style) => {
            setShowBorder(showBorder);
            setBorderMargin(margin);
            setBorderStyle(style);
          }}
        />
      </div>

      {/* Preview Panel - Right Side */}
      <div className="preview-panel">
        <SundialPreview
          lat={latitude}
          lng={longitude}
          tzMeridian={tzMeridian}
          gnomonHeight={effectiveGnomonHeight}
          gnomonType={gnomonType}
          startHour={startHour}
          stopHour={stopHour}
          use24Hour={use24Hour}
          scale={1}
          orientation={orientation}
          pageSize={pageSize}
          dateRange={hourlineDateRange}
          hourlineIntervals={hourlineIntervals.filter(i => i.active)}
          lineStyles={lineStyles}
          declinationLines={declinationLines
            .map(l => ({
              ...l,
              id: l.id || `user-${Date.now()}-${Math.random()}`,
              styleId: l.styleId || 'default-hairline',
            }))
            .filter(l => l.active && l.date && l.styleId)}
          labelWinterSide={labelWinterSide}
          labelSummerSide={labelSummerSide}
          labelOffset={labelOffset}
          fontFamily={fontFamily}
          fontSize={fontSize}
          showBorder={showBorder}
          borderMargin={borderMargin}
          borderStyle={borderStyle}
          gnomonPosition={gnomonPosition}
          gnomonPositionMode={gnomonPositionMode}
        />
      </div>
    </div>
  );
};

export default App;