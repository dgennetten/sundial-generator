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


const App: React.FC = () => {
  const [latitude, setLatitude] = useState(40.5853);
  const [longitude, setLongitude] = useState(-105.0844);
  const [tzMeridian, setTzMeridian] = useState(-105);
  const [gnomonMode, setGnomonMode] = useState<'auto' | 'manual'>('auto');
  const [gnomonHeight, setGnomonHeight] = useState(10);
  const [gnomonType, setGnomonType] = useState<'crosshair' | 'sized-base-triangle'>('crosshair');
  const [pageSize, setPageSize] = useState<'A4' | 'Letter' | 'Custom'>('Letter');
  const [scaleFactor, setScaleFactor] = useState<number>(1);
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
  const [fontSize, setFontSize] = useState<number>(10);
  const [showBorder, setShowBorder] = useState<boolean>(true);
  const [borderMargin, setBorderMargin] = useState<number>(0.25); // in inches
  const [borderStyle, setBorderStyle] = useState<string>('default-hairline');

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

  const effectiveGnomonHeight =
    gnomonMode === 'auto'
      ? parseFloat((Math.tan((latitude * Math.PI) / 180) * 100 * 3.7 / 8).toFixed(2))
      : gnomonHeight;

  return (
    <div style={{ padding: '1rem', fontFamily: 'sans-serif' }}>
      <h1>Sundial Generator</h1>

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
        scaleFactor={scaleFactor}
        setScaleFactor={setScaleFactor}
        orientation={orientation}
        setOrientation={setOrientation}
      />

      <GnomonSettings
        mode={gnomonMode}
        height={gnomonHeight}
        latitude={latitude}
        gnomonType={gnomonType}
        onChange={({ mode, height, gnomonType }) => {
          setGnomonMode(mode);
          setGnomonHeight(height);
          setGnomonType(gnomonType);
        }}
      />
      <LineSettings
        lineStyles={lineStyles}
        setLineStyles={setLineStyles}
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

      <SundialPreview
        lat={latitude}
        lng={longitude}
        tzMeridian={tzMeridian}
        gnomonHeight={effectiveGnomonHeight}
        gnomonType={gnomonType}
        startHour={startHour}
        stopHour={stopHour}
        use24Hour={use24Hour}
        scale={scaleFactor}
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
      />
    </div>
  );
};

export default App;