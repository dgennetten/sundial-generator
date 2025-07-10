// src/components/LocationInputs.tsx
import React from 'react';

interface Props {
  latitude: number;
  longitude: number;
  tzMeridian: number;
  onChange: (values: { lat: number; lng: number; tz: number }) => void;
}

const LocationInputs: React.FC<Props> = ({ latitude, longitude, tzMeridian, onChange }) => {
  return (
    <fieldset style={{ marginBottom: '1rem' }}>
      <legend><strong>Location</strong></legend>

      <label>
        Latitude:&nbsp;
        <input
          type="number"
          step={0.0001}
          value={latitude}
          onChange={(e) =>
            onChange({ lat: parseFloat(e.target.value), lng: longitude, tz: tzMeridian })
          }
        />
      </label>
      <br /><br />

      <label>
        Longitude:&nbsp;
        <input
          type="number"
          step={0.0001}
          value={longitude}
          onChange={(e) =>
            onChange({ lat: latitude, lng: parseFloat(e.target.value), tz: tzMeridian })
          }
        />
      </label>
      <br /><br />

      <label>
        Time Zone Meridian (°):&nbsp;
        <input
          type="number"
          value={tzMeridian}
          onChange={(e) =>
            onChange({ lat: latitude, lng: longitude, tz: parseFloat(e.target.value) })
          }
        />
        <span style={{ marginLeft: '0.5rem', fontSize: '0.9em', color: '#666' }}>
          (e.g. −105 for MST)
        </span>
      </label>
    </fieldset>
  );
};

export default LocationInputs;