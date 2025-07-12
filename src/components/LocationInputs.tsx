// src/components/LocationInputs.tsx
import React from 'react';

// Time zone to meridian mapping
const timeZoneToMeridian: { [key: string]: number } = {
  'UTC': 0,
  'EST': -75,
  'CST': -90,
  'MST': -105,
  'PST': -120,
  'AKST': -135,
  'HST': -150,
  'AST': -60,
  'NST': -52.5,
  'GMT': 0,
  'BST': 0,
  'CET': 15,
  'EET': 30,
  'MSK': 45,
  'IST': 82.5,
  'JST': 135,
  'AEST': 150,
  'NZST': 180
};

const meridianToTimeZone: { [key: number]: string } = Object.fromEntries(
  Object.entries(timeZoneToMeridian).map(([tz, meridian]) => [meridian, tz])
);

interface Props {
  latitude: number;
  longitude: number;
  tzMeridian: number;
  onChange: (values: { lat: number; lng: number; tz: number }) => void;
}

const LocationInputs: React.FC<Props> = ({ latitude, longitude, tzMeridian, onChange }) => {
  // Get current time zone from meridian
  const currentTimeZone = meridianToTimeZone[tzMeridian] || 'MST';

  const handleTimeZoneChange = (timeZone: string) => {
    const newMeridian = timeZoneToMeridian[timeZone] || -105; // Default to MST
    onChange({ lat: latitude, lng: longitude, tz: newMeridian });
  };

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
        Time Zone:&nbsp;
        <select
          value={currentTimeZone}
          onChange={(e) => handleTimeZoneChange(e.target.value)}
          style={{ width: 120 }}
        >
          {Object.keys(timeZoneToMeridian).map(tz => (
            <option key={tz} value={tz}>{tz}</option>
          ))}
        </select>
      </label>
    </fieldset>
  );
};

export default LocationInputs;