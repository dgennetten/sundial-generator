// src/components/LocationInputs.tsx
import React, { useState, lazy, Suspense } from 'react';
import { MapPin } from 'lucide-react';
// Remove: import MapPicker from './MapPicker';
const MapPicker = lazy(() => import('./MapPicker'));

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

// Mapping from Google timeZoneId to app's time zone abbreviation
const timeZoneIdToAbbr: { [key: string]: string } = {
  'America/New_York': 'EST',
  'America/Chicago': 'CST',
  'America/Denver': 'MST',
  'America/Phoenix': 'MST', // Arizona doesn't observe DST
  'America/Los_Angeles': 'PST',
  'America/Anchorage': 'AKST',
  'Pacific/Honolulu': 'HST',
  'America/Halifax': 'AST',
  'America/St_Johns': 'NST',
  'Europe/London': 'GMT',
  'Europe/Belfast': 'BST',
  'Europe/Paris': 'CET',
  'Europe/Berlin': 'CET',
  'Europe/Athens': 'EET',
  'Europe/Moscow': 'MSK',
  'Europe/Luxembourg': 'CET',
  'Asia/Kolkata': 'IST',
  'Asia/Tokyo': 'JST',
  'Australia/Sydney': 'AEST',
  'Pacific/Auckland': 'NZST',
  'Etc/UTC': 'UTC',
  // Add more as needed
};

// Location data
const locations: { [key: string]: { lat: number; lng: number; tz: string } } = {
  'Fort Collins, CO USA': { lat: 40.5853, lng: -105.0844, tz: 'MST' },
  'Marble, CO USA': { lat: 39.0722, lng: -107.1895, tz: 'MST' },
  'Spartanburg, SC USA': { lat: 34.9496, lng: -81.9321, tz: 'EST' },
  'Spangle, WA USA': { lat: 47.4307, lng: -117.3796, tz: 'PST' },
  'Henrico, VA USA': { lat: 37.5243, lng: -77.4932, tz: 'EST' },
  'Tucson, AZ USA': { lat: 32.2226, lng: -110.9747, tz: 'MST' },
  'Quito, Ecuador': { lat: -0.1807, lng: -78.4678, tz: 'EST' },
  'Falkenstein, Saxony, Germany': { lat: 50.4777, lng: 12.3649, tz: 'CET' },
  'Luxembourg City, Luxembourg': { lat: 49.6116, lng: 6.1319, tz: 'CET' },
  'St Petersburg, Russia': { lat: 59.8761, lng: 30.4339, tz: 'MSK' }
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

  const [mapOpen, setMapOpen] = useState(false);
  const [loadingTz, setLoadingTz] = useState(false);

  // Responsive: detect mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 500;

  // Helper to fetch time zone from Google Time Zone API
  const fetchTimeZone = async (lat: number, lng: number): Promise<string | null> => {
    const timestamp = Math.floor(Date.now() / 1000);
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    const url = `https://maps.googleapis.com/maps/api/timezone/json?location=${lat},${lng}&timestamp=${timestamp}&key=${apiKey}`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      if (data.status === 'OK') {
        return data.timeZoneId;
      }
    } catch (e) {
      // ignore
    }
    return null;
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title"><MapPin color="#2563eb" size={20} style={{marginRight: 6}} /> Location</h3>
      </div>
      <div className="card-content">
        <div
          className="form-row"
          style={
            isMobile
              ? { display: 'flex', flexDirection: 'row', alignItems: 'end', width: '100%', gap: 4 }
              : { alignItems: 'end' }
          }
        >
          <div
            className="form-group"
            style={isMobile ? { minWidth: 0, flexShrink: 1, flex: '2' } : { flex: '2' }}
          >
            <label className="form-label">Location</label>
            <select
              className="form-select"
              value={getCurrentLocation()}
              onChange={(e) => handleLocationChange(e.target.value)}
            >
              {Object.keys(locations).map(location => (
                <option key={location} value={location}>{location}</option>
              ))}
              <option value="Custom Location">Custom Location</option>
            </select>
          </div>
          <div
            className="form-group"
            style={isMobile ? { minWidth: 0, flexShrink: 1, flex: '1' } : { flex: '1' }}
          >
            <label className="form-label">Time Zone</label>
            <select
              className="form-select"
              value={currentTimeZone}
              onChange={(e) => handleTimeZoneChange(e.target.value)}
            >
              {Object.keys(timeZoneToMeridian).map(tz => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>
        </div>

        <div
          className="form-row"
          style={
            isMobile
              ? { display: 'flex', flexDirection: 'row', alignItems: 'end', width: '100%', gap: 4 }
              : { alignItems: 'end' }
          }
        >
          <div
            className="form-group"
            style={isMobile ? { minWidth: 0, flexShrink: 1 } : undefined}
          >
            <label className="form-label">Latitude</label>
            <input
              type="number"
              className="form-input"
              step={0.0001}
              value={latitude}
              onChange={(e) =>
                onChange({ lat: parseFloat(e.target.value), lng: longitude, tz: tzMeridian })
              }
              style={{ maxWidth: isMobile ? 80 : 120 }}
            />
          </div>
          <div
            className="form-group"
            style={isMobile ? { minWidth: 0, flexShrink: 1 } : undefined}
          >
            <label className="form-label">Longitude</label>
            <input
              type="number"
              className="form-input"
              step={0.0001}
              value={longitude}
              onChange={(e) =>
                onChange({ lat: latitude, lng: parseFloat(e.target.value), tz: tzMeridian })
              }
              style={{ maxWidth: isMobile ? 80 : 120 }}
            />
          </div>
          <div
            className="form-group"
            style={isMobile ? { marginLeft: 4, marginBottom: 2, minWidth: 0, flexShrink: 1 } : { marginLeft: 12, marginBottom: 2 }}
          >
            <button
              type="button"
              className="form-input"
              style={{ height: 36, cursor: 'pointer', padding: isMobile ? '0 8px' : undefined }}
              onClick={() => setMapOpen(true)}
            >
              Pick on Map
            </button>
          </div>
        </div>
        {loadingTz && <div style={{ color: '#f59e42', marginTop: 8 }}>Detecting time zone...</div>}
      </div>
      <Suspense fallback={<div style={{textAlign: 'center', padding: 32}}>Loading map…</div>}>
        <MapPicker
          open={mapOpen}
          onClose={() => setMapOpen(false)}
          onSelect={async (lat, lng) => {
            setLoadingTz(true);
            const timeZoneId = await fetchTimeZone(lat, lng);
            setLoadingTz(false);
            let tzAbbr = timeZoneId && timeZoneIdToAbbr[timeZoneId];
            let newMeridian = tzAbbr ? timeZoneToMeridian[tzAbbr] : tzMeridian;
            onChange({ lat, lng, tz: newMeridian });
          }}
          initialLat={latitude}
          initialLng={longitude}
        />
      </Suspense>
    </div>
  );
};

export default LocationInputs;