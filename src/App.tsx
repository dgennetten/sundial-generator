// src/App.tsx

import React, { useState, useEffect } from 'react';
import PageSettings from './components/PageSettings';
import LocationInputs from './components/LocationInputs';
import GnomonSettings from './components/GnomonSettings';
import DesignExport from './components/DesignExport';
import SundialPreview from './components/SundialPreview';
import HourlineSettings from './components/HourlineSettings';
import LineSettings, { loadLineStyles } from './components/LineSettings';
import type { LineStyle } from './components/LineSettings';
import DeclinationLineOptions, { loadDeclinationLines } from './components/DeclinationLineOptions';
import type { DeclinationLine } from './components/DeclinationLineOptions';
import HourRangeControls from './components/HourRangeControls';

const App: React.FC = () => {
  const [latitude, setLatitude] = useState(40.5853);
  const [longitude, setLongitude] = useState(-105.0844);
  const [tzMeridian, setTzMeridian] = useState(-105);
  const [gnomonMode, setGnomonMode] = useState<'auto' | 'manual'>('auto');
  const [gnomonHeight, setGnomonHeight] = useState(10);
  const [pageSize, setPageSize] = useState<'A4' | 'Letter' | 'Custom'>('Letter');
  const [scaleFactor, setScaleFactor] = useState<number>(1);
  const [orientation, setOrientation] = useState<'Landscape' | 'Portrait'>('Landscape');
  const [hourlineDateRange, setHourlineDateRange] = useState<'FullYear' | 'SummerToWinter' | 'WinterToSummer'>('FullYear');
  const [lineStyles, setLineStyles] = useState<LineStyle[]>(() => {
    return loadLineStyles();
  });
  const [selectedHourlineStyle, setSelectedHourlineStyle] = useState<string>('default-hairline');
  const [declinationLines, setDeclinationLines] = useState<DeclinationLine[]>(() => {
    return loadDeclinationLines();
  });
  const [startHour, setStartHour] = useState<number>(6);
  const [stopHour, setStopHour] = useState<number>(18);

  useEffect(() => {
    // Ensure selected style is valid
    if (!lineStyles.some(s => s.id === selectedHourlineStyle)) {
      setSelectedHourlineStyle('default-hairline');
    }
  }, [lineStyles]);

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
      ? parseFloat((Math.tan((latitude * Math.PI) / 180) * 100 * 5 / 8).toFixed(2))
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

      <GnomonSettings
        mode={gnomonMode}
        height={gnomonHeight}
        latitude={latitude}
        onChange={({ mode, height }) => {
          setGnomonMode(mode);
          setGnomonHeight(height);
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
        selectedStyle={selectedHourlineStyle}
        setSelectedStyle={setSelectedHourlineStyle}
      />
      <HourRangeControls
        onUpdate={(start, stop) => {
          setStartHour(start);
          setStopHour(stop);
        }}
      />
      <DesignExport />

      <SundialPreview
        lat={latitude}
        lng={longitude}
        tzMeridian={tzMeridian}
        gnomonHeight={effectiveGnomonHeight}
        startHour={startHour}
        stopHour={stopHour}
        scale={scaleFactor}
        orientation={orientation}
        pageSize={pageSize}
        dateRange={hourlineDateRange}
        hourlineStyle={lineStyles.find(s => s.id === selectedHourlineStyle || s.name === selectedHourlineStyle) || lineStyles[0]}
        declinationLines={declinationLines
          .map(l => ({
            ...l,
            id: l.id || `user-${Date.now()}-${Math.random()}`,
            styleId: l.styleId || 'default-hairline',
          }))
          .filter(l => l.active && l.date && l.styleId)}
        lineStyles={lineStyles}
      />
    </div>
  );
};

export default App;