// src/App.tsx

import React, { useState, useEffect } from 'react';
import { Text, Info, Instagram, Mail, Coffee, Github } from 'lucide-react';
import PageSettings, { type InclineType } from './components/PageSettings';
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
import BuildDate from './components/BuildDate';
import VisitorMap from './components/VisitorMap';


const DEFAULT_DIAL_TEXTBLOCK = `**{location}**\n{coordinates}\n*{gnomon}*\n*{incline}*\n*{today}*`;

const App: React.FC = () => {
  const [latitude, setLatitude] = useState(40.5853);
  const [longitude, setLongitude] = useState(-105.0844);
  const [tzMeridian, setTzMeridian] = useState(-105);
  const [gnomonMode, setGnomonMode] = useState<'auto' | 'manual'>('auto');
  const [gnomonHeight, setGnomonHeight] = useState(10);
  const [gnomonType, setGnomonType] = useState<'crosshair' | 'popup' | 'popup-with-brace' | 'crosshair-with-north'>('crosshair-with-north');
  const [pageSize, setPageSize] = useState<'A4' | 'Letter' | '11x17' | '10x15cm Postcard' | 'Custom'>('Letter');
  const [customWidth, setCustomWidth] = useState<number>(8.5 * 25.4); // Store in mm
  const [customHeight, setCustomHeight] = useState<number>(11 * 25.4); // Store in mm
  const [customUnits, setCustomUnits] = useState<'in' | 'cm'>('in');
  const [previousPageSize, setPreviousPageSize] = useState<'A4' | 'Letter' | '11x17' | '10x15cm Postcard' | 'Custom'>('Letter');
  const [orientation, setOrientation] = useState<'Landscape' | 'Portrait'>('Landscape');
  const [inclineType, setInclineType] = useState<InclineType>('Horizontal');
  const [tiltAngle, setTiltAngle] = useState<number>(0);
  const [hourlineDateRange, setHourlineDateRange] = useState<'FullYear' | 'SummerToWinter' | 'WinterToSummer'>('SummerToWinter');
  const [lineStyles, setLineStyles] = useState<LineStyle[]>(() => {
    return loadLineStyles();
  });
  const [hourlineIntervals, setHourlineIntervals] = useState<HourlineInterval[]>(() => {
    return loadHourlineIntervals();
  });
  const [declinationLines, setDeclinationLines] = useState<DeclinationLine[]>(() => {
    return loadDeclinationLines();
  });
  const [startHour, setStartHour] = useState<number>(4);
  const [stopHour, setStopHour] = useState<number>(19);
  const [use24Hour, setUse24Hour] = useState<boolean>(false);
  const [labelWinterSide, setLabelWinterSide] = useState<boolean>(true);
  const [labelSummerSide, setLabelSummerSide] = useState<boolean>(true);
  const [labelOffset, setLabelOffset] = useState<number>(pageSize === '10x15cm Postcard' ? 1 : 1.5);
  const [fontFamily, setFontFamily] = useState<string>('sans-serif');
  const [fontSize, setFontSize] = useState<number>(pageSize === '10x15cm Postcard' ? 12 : 20);
  const [useDST, setUseDST] = useState<boolean>(true);
  const [declinationNoonmarks, setDeclinationNoonmarks] = useState<boolean>(true);
  const [showBorder, setShowBorder] = useState<boolean>(true);
  const [borderMargin, setBorderMargin] = useState<number>(pageSize === '10x15cm Postcard' ? 0.1 : 0.236); // in inches (6mm default)
  const [borderStyle, setBorderStyle] = useState<string>('default-hairline');
  // Add state for gnomon position
  const [gnomonPosition, setGnomonPosition] = useState<number>(0);
  const [gnomonPositionMode, setGnomonPositionMode] = useState<'auto' | 'manual'>('auto');
  const [showBackground, setShowBackground] = useState<boolean>(true);
  const [backgroundColor, setBackgroundColor] = useState<string>('Cornsilk');
  const [dialTextBlock, setDialTextBlock] = useState<string>(DEFAULT_DIAL_TEXTBLOCK);
  const [dialTextBlockVisible, setDialTextBlockVisible] = useState<boolean>(true);
  const [dialTextBlockFontSize, setDialTextBlockFontSize] = useState<number>(pageSize === '10x15cm Postcard' ? 8 : 14);
  const [dialTextBlockFontFamily, setDialTextBlockFontFamily] = useState<string>(fontFamily);
  const [locationName, setLocationName] = useState<string>('Fort Collins, CO USA');
  
  // Calculate default dial facing based on hemisphere
  const getDefaultDialFacing = (lat: number): 'North' | 'South' => {
    return lat >= 0 ? 'North' : 'South';
  };
  
  const [dialFacing, setDialFacing] = useState<'North' | 'South'>(getDefaultDialFacing(latitude));

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
                      inclineType === 'Equatorial' ? latitude :
                      inclineType === 'Capricorn' ? getCapricornIncline(latitude) :
                      inclineType === 'Vertical' ? 90 : 0;
      setTiltAngle(newAngle);
    }
  }, [inclineType, latitude]);

  // Debug: log declinationLines before filtering
  React.useEffect(() => {
    // eslint-disable-next-line no-console
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
  useEffect(() => {
    if (pageSize === 'Custom') {
      // Set initial values based on the previous page size
      const currentPageSize = pageSizeMap[previousPageSize as keyof typeof pageSizeMap] || pageSizeMap.Letter;
      const widthInInches = currentPageSize.width / 25.4;
      const heightInInches = currentPageSize.height / 25.4;
      
      setCustomWidth(Math.round(widthInInches * 25.4 * 10) / 10); // Convert to mm and round to 1 decimal place
      setCustomHeight(Math.round(heightInInches * 25.4 * 10) / 10); // Convert to mm and round to 1 decimal place
      setCustomUnits('in');
    }
  }, [pageSize, previousPageSize]);

  // Page size map (mm)
  const pageSizeMap = {
    Letter: { width: 8.5 * 25.4, height: 11 * 25.4 },
    A4: { width: 210, height: 297 },
    '11x17': { width: 11 * 25.4, height: 17 * 25.4 },
    '10x15cm Postcard': { width: 100, height: 150 },
  };
  
  // Calculate custom page size in mm
  const getCustomPageSize = () => {
    if (pageSize !== 'Custom') return null;
    // customWidth and customHeight are already stored in millimeters
    return {
      width: customWidth,
      height: customHeight
    };
  };
  
  const customPageSize = getCustomPageSize();
  let { width: pageWidth, height: pageHeight } = customPageSize || (pageSize !== 'Custom' ? pageSizeMap[pageSize as keyof typeof pageSizeMap] : pageSizeMap.Letter);
  if (orientation === 'Landscape') {
    [pageWidth, pageHeight] = [pageHeight, pageWidth];
  }

  // Calculate effective latitude based on incline
  const getEffectiveLatitude = (): number => {
    const tilt = inclineType === 'Horizontal' ? 0 : 
                 inclineType === 'Cancer' ? getCancerIncline(latitude) :
                 inclineType === 'Equatorial' ? latitude :
                 inclineType === 'Capricorn' ? getCapricornIncline(latitude) :
                 inclineType === 'Vertical' ? 90 : tiltAngle;
    
    // For inclined dials, the effective latitude is (original latitude - tilt angle)
    // This simulates tilting the dial toward the sun
    return latitude - tilt;
  };

  const effectiveLatitude = getEffectiveLatitude();

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
    return Math.round(requiredGnomonHeight * 0.66 * (55/40));
  };

  const effectiveGnomonHeight =
    gnomonMode === 'auto'
      ? calculateAutoGnomonHeight(effectiveLatitude, pageHeight)
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
          onChange={({ lat, lng, tz, useDST, locationName }) => {
            setLatitude(lat);
            setLongitude(lng);
            setTzMeridian(tz);
            // Automatically set DST checkbox based on Google Time Zone API response
            if (useDST !== undefined) {
              setUseDST(useDST);
            }
            // Update location name - use the passed locationName if available, otherwise fall back to coordinate matching
            if (locationName) {
              setLocationName(locationName);
            } else {
              // Update location name when coordinates change
              // Use the new coordinates directly instead of the state values
              const locations: { [key: string]: { lat: number; lng: number } } = {
                'Fort Collins, CO USA': { lat: 40.5853, lng: -105.0844 },
                'Marble, CO USA': { lat: 39.0722, lng: -107.1895 },
                'Spartanburg, SC USA': { lat: 34.9496, lng: -81.9321 },
                'Spangle, WA USA': { lat: 47.4307, lng: -117.3796 },
                'Henrico, VA USA': { lat: 37.5243, lng: -77.4932 },
                'Tucson, AZ USA': { lat: 32.2226, lng: -110.9747 },
                'Quito, Ecuador': { lat: -0.1807, lng: -78.4678 },
                'Recife, Brazil': { lat: -8.0476, lng: -34.8770 },
                'Falkenstein, Saxony, Germany': { lat: 50.4777, lng: 12.3649 },
                'Luxembourg City, Luxembourg': { lat: 49.6116, lng: 6.1319 },
                'St Petersburg, Russia': { lat: 59.8761, lng: 30.4339 }
              };
              
              let newLocationName = 'Custom Location';
              for (const [name, data] of Object.entries(locations)) {
                if (Math.abs(data.lat - lat) < 0.001 && Math.abs(data.lng - lng) < 0.001) {
                  newLocationName = name;
                  break;
                }
              }
              setLocationName(newLocationName);
            }
          }}
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
          latitude={latitude}
          dialFacing={dialFacing}
          setDialFacing={setDialFacing}
          customWidth={customWidth}
          setCustomWidth={setCustomWidth}
          customHeight={customHeight}
          setCustomHeight={setCustomHeight}
          customUnits={customUnits}
          setCustomUnits={setCustomUnits}
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
          position={gnomonPosition}
          onChange={({ mode, height, gnomonType, positionMode, position }) => {
            setGnomonMode(mode);
            setGnomonHeight(height);
            setGnomonType(gnomonType);
            if (positionMode) setGnomonPositionMode(positionMode);
            if (typeof position === 'number') setGnomonPosition(position);
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
          onUpdate={(start, stop, use24, winter, summer, offset, fontFam, fontSz, dst, declNoonmarks) => {
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
                Show Text Block
              </label>
            </div>
            <div className="form-group">
              <label className="form-label">Text (supports {"{location}"}, {"{coordinates}"}, {"{gnomon}"}, {"{today}"} and some Markup codes)</label>
              <textarea
                className="form-input"
                rows={5}
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
            setBorderMargin(margin / 25.4); // Convert mm to inches
            setBorderStyle(style);
          }}
          onBackgroundChange={(showBackground, backgroundColor) => {
            setShowBackground(showBackground);
            setBackgroundColor(backgroundColor);
          }}
          lineStyles={lineStyles}
          pageSize={pageSize}
          orientation={orientation}
          customWidth={customWidth}
          customHeight={customHeight}
        />
        <VisitorMap />
        <div className="card">
          <div className="card-header">
            <h3 className="card-title"><Info color="#2563eb" size={20} style={{marginRight: 6}} /> About</h3>
          </div>
          <div className="card-content">
                         <div style={{ 
               backgroundColor: '#fefce8', 
               color: '#7c2d12', 
               padding: '8px 12px', 
               borderRadius: '6px', 
               marginBottom: '16px',
               fontSize: '14px',
               fontWeight: '500'
             }}>
             <p><strong>New Feature:</strong> Custom page sizes.</p>
             <p><strong>New Feature:</strong> Mobile-friendly design.</p>
             <p><strong>New Feature:</strong> Map now has searchbox.</p>
             <p><strong>New Feature:</strong> Added Cancer and Capricorn options for Inclined Dials.</p>
             <p><strong>New Feature:</strong> Gnomon height optionally printed on dial.</p>
             <p><strong>New Feature:</strong> Today's date, when plotted, optionally printed on dial.</p>
              <p><strong>New Feature:</strong> Added Gnomon type option. North Pt. on/off.</p>
               <p><strong>New feature:</strong> Properly supported Inclined Dials. </p>
               <p><strong>Known Bug:</strong> Text block placement is inconsistent and sometimes missing for certain locations/inclines. </p>
             </div>
            <div dangerouslySetInnerHTML={{ __html: `
<p>
  This App traces its origins back to a gloriously nerdy gem—the 
  <a href="http://sundial.gennetten.org/docs/1980-12-SundialArticle.pdf">Amateur Scientist column</a>
  from the December 1980 issue of Scientific American. 
  Back then, my first sundial app was coded with love (and 
  <a href="https://www.hp9845.net/9845/software/basic/">Rocky Mountain Basic</a>
  ) on an 
  <a href="https://www.hp9845.net/">HP9845</a> 
    desktop workstation, which was basically a space shuttle cockpit compared to the future IBM PC toddlers.

  Not content with digital wizardry alone, I whipped up an 
  <a href="http://sundial.gennetten.org/docs/SolarClockAd.pdf">advertisement</a>
  and, like a caffinated Da Vinci, scribbled out hand-drawn 
  <a href="http://sundial.gennetten.org/docs/AnalemmaIllustrationFromJune1985.pdf">instructional</a>,
  <a href="http://sundial.gennetten.org/docs/SundialIllustrationFromJune1985.pdf">illustrations</a>.
   Here's an example 
  <a href="http://sundial.gennetten.org/docs/Tabloid-sizeDial.pdf">11x17 inch sundial</a>,
 plotted using an 
  <a href="https://www.hpmuseum.net/display_item.php?hw=79">HP9872 plotter</a>.
</p>
<p>The sundial generator now uses the professional-grade 
<a href="https://academic.oup.com/mnras/article/238/4/1529/1037665">Hughes, Yallop & Hohenkerk</a>
algorithm with ±3.5 seconds accuracy. 
</p>
` }} />
            {/* Bottom row with build date and social icons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
              <BuildDate />
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <a
                  href="https://buymeacoffee.com/dgennetten"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Buy me a Coffee!"
                  style={{ color: '#2563eb', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                >
                  <Coffee size={22} color="#2563eb" style={{ verticalAlign: 'middle' }} />
                </a>
                <a
                  href="https://github.com/dgennetten/sundial-generator"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="View Source Code on GitHub"
                  style={{ color: '#2563eb', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                >
                  <Github size={22} color="#2563eb" style={{ verticalAlign: 'middle' }} />
                </a>
                <a
                  href="mailto:sundial@gennetten.com?subject=Sundial%20Feedback"
                  title="eMail the Author"
                  style={{ color: '#2563eb', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                >
                  <Mail size={22} color="#2563eb" style={{ verticalAlign: 'middle' }} />
                </a>
                <a
                  href="https://instagram.com/dgennetten"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Follow @dgennetten on Instagram"
                  style={{ color: '#2563eb', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                >
                  <Instagram size={22} color="#2563eb" style={{ verticalAlign: 'middle' }} />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Panel - Right Side */}
      <div className="preview-panel">
        <SundialPreview
          lat={effectiveLatitude}
          lng={longitude}
          originalLatitude={latitude}
          tzMeridian={tzMeridian}
          gnomonHeight={effectiveGnomonHeight}
          gnomonType={gnomonType}
          startHour={startHour}
          stopHour={stopHour}
          use24Hour={use24Hour}
          scale={1}
          orientation={orientation}
          pageSize={pageSize}
          customWidth={customWidth}
          customHeight={customHeight}
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
          useDST={useDST}
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
           locationName={locationName}
           inclineType={inclineType}
           tiltAngle={tiltAngle}
           declinationNoonmarks={declinationNoonmarks}
           dialFacing={dialFacing}
        />
      </div>
    </div>
  );
};

export default App;