// src/App.tsx

import React, { useState } from 'react';
import PageSettings from './components/PageSettings';
import LocationInputs from './components/LocationInputs';
import GnomonSettings from './components/GnomonSettings';
import DesignExport from './components/DesignExport';
import SundialPreview from './components/SundialPreview';

const App: React.FC = () => {
  const [latitude, setLatitude] = useState(40.5853);
  const [longitude, setLongitude] = useState(-105.0844);
  const [tzMeridian, setTzMeridian] = useState(-105);
  const [gnomonMode, setGnomonMode] = useState<'auto' | 'manual'>('auto');
  const [gnomonHeight, setGnomonHeight] = useState(10);
  const [pageSize, setPageSize] = useState<'A4' | 'Letter' | 'Custom'>('Letter');
  const [scaleFactor, setScaleFactor] = useState<number>(1);
  const [orientation, setOrientation] = useState<'Landscape' | 'Portrait'>('Landscape');

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
      <DesignExport />

      <SundialPreview
        lat={latitude}
        lng={longitude}
        tzMeridian={tzMeridian}
        gnomonHeight={effectiveGnomonHeight}
        startHour={6}
        stopHour={18}
        scale={scaleFactor}
        orientation={orientation}
        pageSize={pageSize}
      />
    </div>
  );
};

export default App;