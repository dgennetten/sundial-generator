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

// Location data
const locations: { [key: string]: { lat: number; lng: number; tz: string } } = {
  'Fort Collins, CO USA': { lat: 40.5853, lng: -105.0844, tz: 'MST' },
  'Marble, CO USA': { lat: 39.0722, lng: -107.1895, tz: 'MST' },
  'Spartanburg, SC USA': { lat: 34.9496, lng: -81.9321, tz: 'EST' }
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

  // Find current location based on lat/lng
  const getCurrentLocation = () => {
    for (const [name, data] of Object.entries(locations)) {
      if (Math.abs(data.lat - latitude) < 0.001 && Math.abs(data.lng - longitude) < 0.001) {
        return name;
      }
    }
    return 'Custom Location';
  };

  const handleLocationChange = (locationName: string) => {
    if (locationName === 'Custom Location') return; // Don't change anything for custom
    
    const locationData = locations[locationName];
    if (locationData) {
      const newMeridian = timeZoneToMeridian[locationData.tz] || -105;
      onChange({ 
        lat: locationData.lat, 
        lng: locationData.lng, 
        tz: newMeridian 
      });
    }
  };

  const handleTimeZoneChange = (timeZone: string) => {
    const newMeridian = timeZoneToMeridian[timeZone] || -105; // Default to MST
    onChange({ lat: latitude, lng: longitude, tz: newMeridian });
  };

  return (
    <fieldset style={{ marginBottom: '1rem' }}>
      <legend><strong>Location</strong></legend>

      <label>
        Location:&nbsp;
        <select
          value={getCurrentLocation()}
          onChange={(e) => handleLocationChange(e.target.value)}
          style={{ width: 200 }}
        >
          {Object.keys(locations).map(location => (
            <option key={location} value={location}>{location}</option>
          ))}
          <option value="Custom Location">Custom Location</option>
        </select>
      </label>
      <br /><br />

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