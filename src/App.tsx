// src/App.tsx

import React, { useState } from 'react';
import PageSettings from './components/PageSettings';
import LocationInputs from './components/LocationInputs';
import GnomonSettings from './components/GnomonSettings';
import HourLineDisplay from './components/HourLineDisplay';
import DesignExport from './components/DesignExport';
import SundialPreview from './components/SundialPreview';

const App: React.FC = () => {
  const [latitude, setLatitude] = useState(40.5853);
  const [longitude, setLongitude] = useState(-105.0844);
  const [tzMeridian, setTzMeridian] = useState(-105);
  const [startHour, setStartHour] = useState(6);
  const [stopHour, setStopHour] = useState(18);
  const [gnomonMode, setGnomonMode] = useState<'auto' | 'manual'>('auto');
  const [gnomonHeight, setGnomonHeight] = useState(10);
  const [orientation, setOrientation] = useState<'Horizontal' | 'Vertical' | 'Equatorial'>('Horizontal');

  const effectiveGnomonHeight =
    gnomonMode === 'auto'
      ? parseFloat((Math.tan((latitude * Math.PI) / 180) * 100).toFixed(2))
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
        orientation={orientation}
        onChange={({ mode, height, orientation }) => {
          setGnomonMode(mode);
          setGnomonHeight(height);
          setOrientation(orientation);
        }}
      />

      <HourLineDisplay
        startHour={startHour}
        stopHour={stopHour}
        onChange={({ start, stop }) => {
          setStartHour(start);
          setStopHour(stop);
        }}
      />

      <PageSettings />
      <DesignExport />

      <SundialPreview
        lat={latitude}
        lng={longitude}
        tzMeridian={tzMeridian}
        gnomonHeight={effectiveGnomonHeight}
        startHour={startHour}
        stopHour={stopHour}
        scale={1}
        orientation={orientation}
      />
    </div>
  );
};

export default App;