// src/App.tsx

import React, { useState, useEffect } from 'react';
import { Text } from 'lucide-react';
import PageSettings from './components/PageSettings';
import LocationInputs from './components/LocationInputs';
import GnomonSettings from './components/GnomonSettings';
import DesignExport from './components/DesignExport';
import SundialPreview from './components/SundialPreview';
import HourlineSettings, { loadHourlineIntervals } from './components/HourlineSettings';
import type { HourlineInterval } from './components/HourlineSettings';
import LineSettings from './components/LineSettings';
import { loadLineStyles } from './components/lineStyleUtils';
import type { LineStyle } from './components/LineSettings';
import DeclinationLineOptions from './components/DeclinationLineOptions';
import { loadDeclinationLines } from './components/declinationLineUtils';
import type { DeclinationLine } from './components/DeclinationLineOptions';
import { getSolarPosition, projectShadowToSurface } from './utils/analemmaGenerator';


const DEFAULT_DIAL_TEXTBLOCK = `**{location}**\n{coordinates}\n*Computer Generated Sundial by K. Douglas Gennetten*`;

const App: React.FC = () => {
  const [latitude, setLatitude] = useState(40.5853);
  const [longitude, setLongitude] = useState(-105.0844);
  const [tzMeridian, setTzMeridian] = useState(-105);
  const [gnomonMode, setGnomonMode] = useState<'auto' | 'manual'>('auto');
  const [gnomonHeight, setGnomonHeight] = useState(10);
  const [gnomonType, setGnomonType] = useState<'crosshair' | 'popup' | 'popup-with-brace'>('crosshair');
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
  const [startHour, setStartHour] = useState<number>(5);
  const [stopHour, setStopHour] = useState<number>(19);
  const [use24Hour, setUse24Hour] = useState<boolean>(true);
  const [labelWinterSide, setLabelWinterSide] = useState<boolean>(true);
  const [labelSummerSide, setLabelSummerSide] = useState<boolean>(true);
  const [labelOffset, setLabelOffset] = useState<number>(1.5);
  const [fontFamily, setFontFamily] = useState<string>('sans-serif');
  const [fontSize, setFontSize] = useState<number>(20);
  const [showBorder, setShowBorder] = useState<boolean>(true);
  const [borderMargin, setBorderMargin] = useState<number>(0.25); // in inches
  const [borderStyle, setBorderStyle] = useState<string>('default-hairline');
  // Add state for gnomon position
  const [gnomonPosition, setGnomonPosition] = useState<number>(0);
  const [gnomonPositionMode, setGnomonPositionMode] = useState<'auto' | 'manual'>('auto');
  const [showBackground, setShowBackground] = useState<boolean>(true);
  const [backgroundColor, setBackgroundColor] = useState<string>('Cornsilk');
  const [dialTextBlock, setDialTextBlock] = useState<string>(DEFAULT_DIAL_TEXTBLOCK);
  const [dialTextBlockVisible, setDialTextBlockVisible] = useState<boolean>(true);
  const [dialTextBlockFontSize, setDialTextBlockFontSize] = useState<number>(14);
  const [dialTextBlockFontFamily, setDialTextBlockFontFamily] = useState<string>(fontFamily);
  const [locationName, setLocationName] = useState<string>('Fort Collins, CO USA');

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
    // Reduce to 66% of previous value, then increase by factor of 55/40
    return parseFloat((requiredGnomonHeight * 0.66 * (55/40)).toFixed(2));
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
            // Update location name when coordinates change
            // Use the new coordinates directly instead of the state values
            const locations: { [key: string]: { lat: number; lng: number } } = {
              'Fort Collins, CO USA': { lat: 40.5853, lng: -105.0844 },
              'Marble, CO USA': { lat: 39.0722, lng: -107.1895 },
              'Spartanburg, SC USA': { lat: 34.9496, lng: -81.9321 },
              'Spangle, WA USA': { lat: 47.4307, lng: -117.3796 },
              'Henrico, VA USA': { lat: 37.5243, lng: -77.4932 },
              'Tucson, AZ USA': { lat: 32.2226, lng: -110.9747 }
            };
            
            let newLocationName = 'Custom Location';
            for (const [name, data] of Object.entries(locations)) {
              if (Math.abs(data.lat - lat) < 0.001 && Math.abs(data.lng - lng) < 0.001) {
                newLocationName = name;
                break;
              }
            }
            setLocationName(newLocationName);
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
        <div className="card">
          <div className="card-header">
            <h3 className="card-title"><Text color="#2563eb" size={20} style={{marginRight: 6}} /> Dial Text Block</h3>
          </div>
          <div className="card-content">
            <div className="form-group">
              <label className="form-checkbox">
                <input
                  type="checkbox"
                  checked={dialTextBlockVisible}
                  onChange={e => setDialTextBlockVisible(e.target.checked)}
                />
                Show Text Block at Bottom
              </label>
            </div>
            <div className="form-group">
              <label className="form-label">Text (supports {"{location}"}, {"{coordinates}"} and some Markup codes)</label>
              <textarea
                className="form-input"
                rows={3}
                value={dialTextBlock}
                onChange={e => setDialTextBlock(e.target.value)}
                style={{ width: '100%', fontFamily: dialTextBlockFontFamily, fontSize: '12pt', maxWidth: '100%', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-end' }}>
              <div className="form-group" style={{ flex: '0 0 auto' }}>
                <label className="form-label">Font Size (pt)</label>
                <input
                  type="number"
                  className="form-input"
                  min={4}
                  max={24}
                  value={dialTextBlockFontSize}
                  onChange={e => setDialTextBlockFontSize(Number(e.target.value))}
                  style={{ width: '80px' }}
                />
              </div>
              <div className="form-group" style={{ flex: '1 1 auto' }}>
                <label className="form-label">Font Family</label>
                <select
                  className="form-select"
                  value={dialTextBlockFontFamily}
                  onChange={e => setDialTextBlockFontFamily(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="sans-serif">Sans-serif</option>
                  <option value="serif">Serif</option>
                  <option value="monospace">Monospace</option>
                  <option value="Arial">Arial</option>
                  <option value="Times New Roman">Times New Roman</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Courier New">Courier New</option>
                </select>
              </div>
            </div>
          </div>
        </div>
        <DesignExport 
          onBorderChange={(showBorder, margin, style) => {
            setShowBorder(showBorder);
            setBorderMargin(margin);
            setBorderStyle(style);
          }}
          onBackgroundChange={(showBackground, backgroundColor) => {
            setShowBackground(showBackground);
            setBackgroundColor(backgroundColor);
          }}
          lineStyles={lineStyles}
          pageSize={pageSize}
          orientation={orientation}
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
          showBackground={showBackground}
          backgroundColor={backgroundColor}
          dialTextBlock={dialTextBlock}
          dialTextBlockVisible={dialTextBlockVisible}
          dialTextBlockFontSize={dialTextBlockFontSize}
          dialTextBlockFontFamily={dialTextBlockFontFamily}
          latitude={latitude}
          longitude={longitude}
          locationName={locationName}
        />
      </div>
    </div>
  );
};

export default App;