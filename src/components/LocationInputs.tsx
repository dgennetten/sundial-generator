// src/components/LocationInputs.tsx
import React, { useState, lazy, Suspense } from 'react';
import { MapPin } from 'lucide-react';
// Remove: import MapPicker from './MapPicker';
const MapPicker = lazy(() => import('./MapPicker'));

// Time zone to meridian mapping
const timeZoneToMeridian: { [key: string]: number } = {
  'UTC': 0,
  'EST': -75,
  'EDT': -75, // Eastern Daylight Time
  'CST': -90,
  'CDT': -90, // Central Daylight Time
  'MST': -105,
  'MDT': -105, // Mountain Daylight Time
  'PST': -120,
  'PDT': -120, // Pacific Daylight Time
  'AKST': -135,
  'AKDT': -135, // Alaska Daylight Time
  'HST': -150,
  'AST': -60,
  'ADT': -60, // Atlantic Daylight Time
  'NST': -52.5,
  'NDT': -52.5, // Newfoundland Daylight Time
  'BRT': -45,
  'BRST': -45, // Brazil Summer Time
  'PET': -75, // Peru Time
  'GMT': 0,
  'BST': 0, // British Summer Time
  'CET': 15,
  'CEST': 15, // Central European Summer Time
  'EET': 30,
  'EEST': 30, // Eastern European Summer Time
  'MSK': 45,
  'MSD': 45, // Moscow Summer Time
  'IST': 82.5,
  'JST': 135,
  'AEST': 150,
  'AEDT': 150, // Australian Eastern Daylight Time
  'NZST': 180,
  'NZDT': 180 // New Zealand Daylight Time
};



// DST-aware mapping from Google timeZoneId to time zone abbreviation
const timeZoneIdToAbbrWithDST: { [key: string]: { standard: string; daylight: string } } = {
  'America/New_York': { standard: 'EST', daylight: 'EDT' },
  'America/Chicago': { standard: 'CST', daylight: 'CDT' },
  'America/Denver': { standard: 'MST', daylight: 'MDT' },
  'America/Phoenix': { standard: 'MST', daylight: 'MST' }, // Arizona doesn't observe DST
  'America/Los_Angeles': { standard: 'PST', daylight: 'PDT' },
  'America/Anchorage': { standard: 'AKST', daylight: 'AKDT' },
  'Pacific/Honolulu': { standard: 'HST', daylight: 'HST' }, // Hawaii doesn't observe DST
  'America/Halifax': { standard: 'AST', daylight: 'ADT' },
  'America/St_Johns': { standard: 'NST', daylight: 'NDT' },
  'Europe/London': { standard: 'GMT', daylight: 'BST' },
  'Europe/Belfast': { standard: 'GMT', daylight: 'BST' },
  'Europe/Paris': { standard: 'CET', daylight: 'CEST' },
  'Europe/Berlin': { standard: 'CET', daylight: 'CEST' },
  'Europe/Athens': { standard: 'EET', daylight: 'EEST' },
  'Europe/Moscow': { standard: 'MSK', daylight: 'MSD' },
  'Europe/Luxembourg': { standard: 'CET', daylight: 'CEST' },
  'Asia/Kolkata': { standard: 'IST', daylight: 'IST' }, // India doesn't observe DST
  'Asia/Tokyo': { standard: 'JST', daylight: 'JST' }, // Japan doesn't observe DST
  'Australia/Sydney': { standard: 'AEST', daylight: 'AEDT' },
  'Pacific/Auckland': { standard: 'NZST', daylight: 'NZDT' },
  'Etc/UTC': { standard: 'UTC', daylight: 'UTC' },
  'America/Sao_Paulo': { standard: 'BRT', daylight: 'BRST' }, // Brazil timezone
  'America/Recife': { standard: 'BRT', daylight: 'BRST' }, // Brazil timezone
  'America/Fortaleza': { standard: 'BRT', daylight: 'BRST' }, // Brazil timezone
  'America/Maceio': { standard: 'BRT', daylight: 'BRST' }, // Brazil timezone
  'America/Aracaju': { standard: 'BRT', daylight: 'BRST' }, // Brazil timezone
  'America/Salvador': { standard: 'BRT', daylight: 'BRST' }, // Brazil timezone
  // Peru timezone
  'America/Lima': { standard: 'PET', daylight: 'PET' }, // Peru doesn't observe DST
  // Additional Arizona timezones
  'America/Regina': { standard: 'CST', daylight: 'CST' }, // Saskatchewan doesn't observe DST
  'America/Swift_Current': { standard: 'CST', daylight: 'CST' }, // Saskatchewan doesn't observe DST
  'America/Edmonton': { standard: 'MST', daylight: 'MDT' },
  'America/Calgary': { standard: 'MST', daylight: 'MDT' },
  'America/Vancouver': { standard: 'PST', daylight: 'PDT' },
  'America/Winnipeg': { standard: 'CST', daylight: 'CDT' },
  'America/Toronto': { standard: 'EST', daylight: 'EDT' },
  'America/Montreal': { standard: 'EST', daylight: 'EDT' },
  'America/Boise': { standard: 'MST', daylight: 'MDT' },
  'America/Detroit': { standard: 'EST', daylight: 'EDT' },
  'America/Indianapolis': { standard: 'EST', daylight: 'EDT' },
  'America/Kentucky/Louisville': { standard: 'EST', daylight: 'EDT' },
  'America/Kentucky/Monticello': { standard: 'EST', daylight: 'EDT' },
  'America/Menominee': { standard: 'CST', daylight: 'CDT' },
  'America/North_Dakota/Beulah': { standard: 'CST', daylight: 'CDT' },
  'America/North_Dakota/Center': { standard: 'CST', daylight: 'CDT' },
  'America/North_Dakota/New_Salem': { standard: 'CST', daylight: 'CDT' },
  'America/Indiana/Indianapolis': { standard: 'EST', daylight: 'EDT' },
  'America/Indiana/Knox': { standard: 'CST', daylight: 'CDT' },
  'America/Indiana/Marengo': { standard: 'EST', daylight: 'EDT' },
  'America/Indiana/Petersburg': { standard: 'EST', daylight: 'EDT' },
  'America/Indiana/Tell_City': { standard: 'CST', daylight: 'CDT' },
  'America/Indiana/Vevay': { standard: 'EST', daylight: 'EDT' },
  'America/Indiana/Vincennes': { standard: 'EST', daylight: 'EDT' },
  'America/Indiana/Winamac': { standard: 'EST', daylight: 'EDT' },
  'America/Michigan/Detroit': { standard: 'EST', daylight: 'EDT' },
  'America/Michigan/Flint': { standard: 'EST', daylight: 'EDT' },
  'America/Michigan/Grand_Rapids': { standard: 'EST', daylight: 'EDT' },
  'America/Michigan/Kalamazoo': { standard: 'EST', daylight: 'EDT' },
  'America/Michigan/Lansing': { standard: 'EST', daylight: 'EDT' },
  'America/Michigan/Marquette': { standard: 'EST', daylight: 'EDT' },
  'America/Michigan/Sault_Ste_Marie': { standard: 'EST', daylight: 'EDT' },
  'America/Michigan/Ann_Arbor': { standard: 'EST', daylight: 'EDT' },
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
  'Recife, Brazil': { lat: -8.0476, lng: -34.8770, tz: 'BRT' },
  'Sydney, Australia': { lat: -33.8688, lng: 151.2093, tz: 'AEST' },
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
  onChange: (values: { lat: number; lng: number; tz: number; useDST?: boolean }) => void;
}

const LocationInputs: React.FC<Props> = ({ latitude, longitude, tzMeridian, onChange }) => {
  // Get current time zone from meridian
  const currentTimeZone = meridianToTimeZone[tzMeridian] || 'MST';
  
  // State to track the current timezone display (including DST status)
  const [currentTimezoneDisplay, setCurrentTimezoneDisplay] = useState<string>(currentTimeZone);

  // Find current location based on lat/lng
  const getCurrentLocation = () => {
    for (const [name, data] of Object.entries(locations)) {
      if (Math.abs(data.lat - latitude) < 0.001 && Math.abs(data.lng - longitude) < 0.001) {
        return name;
      }
    }
    return 'Custom Location';
  };

  const handleLocationChange = async (locationName: string) => {
    if (locationName === 'Custom Location') return; // Don't change anything for custom
    
    const locationData = locations[locationName];
    if (locationData) {
      // Fetch timezone data for the selected location to get DST information
      setLoadingTz(true);
      const timeZoneData = await fetchTimeZone(locationData.lat, locationData.lng);
      setLoadingTz(false);
      
      if (timeZoneData.timeZoneId) {
                  const isDST = timeZoneData.dstOffset !== null && 
                       isCurrentlyInDST(timeZoneData.dstOffset);
          const tzAbbr = getTimezoneAbbr(timeZoneData.timeZoneId, isDST, timeZoneData.rawOffset || 0);
        
        // Use the timezone abbreviation from Google API, fallback to predefined if not in our mapping
        const newMeridian = timeZoneToMeridian[tzAbbr || locationData.tz] || -105;
        
        // Update the timezone display to show the DST-aware abbreviation
        setCurrentTimezoneDisplay(tzAbbr || locationData.tz);
        
        onChange({ 
          lat: locationData.lat, 
          lng: locationData.lng, 
          tz: newMeridian,
          useDST: isDST
        });
      } else {
        // Fallback to predefined timezone if API call fails
        const newMeridian = timeZoneToMeridian[locationData.tz] || -105;
        setCurrentTimezoneDisplay(locationData.tz);
        onChange({ 
          lat: locationData.lat, 
          lng: locationData.lng, 
          tz: newMeridian 
        });
      }
    }
  };

  const handleTimeZoneChange = (timeZone: string) => {
    const newMeridian = timeZoneToMeridian[timeZone] || -105; // Default to MST
    setCurrentTimezoneDisplay(timeZone);
    onChange({ lat: latitude, lng: longitude, tz: newMeridian });
  };

  const [mapOpen, setMapOpen] = useState(false);
  const [loadingTz, setLoadingTz] = useState(false);

  // Responsive: detect mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 500;

  // Update timezone display when tzMeridian changes
  React.useEffect(() => {
    const newTimezone = meridianToTimeZone[tzMeridian] || 'MST';
    setCurrentTimezoneDisplay(newTimezone);
  }, [tzMeridian]);

  // Helper to fetch time zone from Google Time Zone API
  const fetchTimeZone = async (lat: number, lng: number): Promise<{ timeZoneId: string | null; dstOffset: number | null; rawOffset: number | null }> => {
    const timestamp = Math.floor(Date.now() / 1000);
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    const url = `https://maps.googleapis.com/maps/api/timezone/json?location=${lat},${lng}&timestamp=${timestamp}&key=${apiKey}`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      if (data.status === 'OK') {
        return {
          timeZoneId: data.timeZoneId,
          dstOffset: data.dstOffset,
          rawOffset: data.rawOffset
        };
      }
    } catch (e) {
      // ignore
    }
    return { timeZoneId: null, dstOffset: null, rawOffset: null };
  };

  // Helper to determine if location is currently in DST
  const isCurrentlyInDST = (dstOffset: number): boolean => {
    // If dstOffset > 0, the location is currently in DST
    return dstOffset > 0;
  };

  // Helper to get the appropriate timezone abbreviation based on DST status
  const getTimezoneAbbr = (timeZoneId: string, isDST: boolean, rawOffset: number): string => {
    const dstMapping = timeZoneIdToAbbrWithDST[timeZoneId];
    if (dstMapping) {
      return isDST ? dstMapping.daylight : dstMapping.standard;
    }
    
    // If we don't have a mapping, calculate timezone from raw offset
    // rawOffset is in seconds, convert to hours
    const offsetHours = rawOffset / 3600;
    
    // Generate timezone abbreviation based on offset for unmapped timezones
    if (offsetHours === 0) return 'UTC';
    if (offsetHours === -5) return isDST ? 'EDT' : 'EST';
    if (offsetHours === -6) return isDST ? 'CDT' : 'CST';
    if (offsetHours === -7) return isDST ? 'MDT' : 'MST';
    if (offsetHours === -8) return isDST ? 'PDT' : 'PST';
    if (offsetHours === -9) return isDST ? 'AKDT' : 'AKST';
    if (offsetHours === -10) return 'HST';
    if (offsetHours === -4) return isDST ? 'ADT' : 'AST';
    if (offsetHours === -3.5) return isDST ? 'NDT' : 'NST';
    if (offsetHours === -3) return isDST ? 'BRST' : 'BRT';
    if (offsetHours === 1) return isDST ? 'BST' : 'GMT';
    if (offsetHours === 2) return isDST ? 'CEST' : 'CET';
    if (offsetHours === 3) return isDST ? 'EEST' : 'EET';
    if (offsetHours === 4) return isDST ? 'MSD' : 'MSK';
    if (offsetHours === 5.5) return 'IST';
    if (offsetHours === 9) return 'JST';
    if (offsetHours === 10) return isDST ? 'AEDT' : 'AEST';
    if (offsetHours === 12) return isDST ? 'NZDT' : 'NZST';
    
    // For other offsets, create a generic abbreviation
    const sign = offsetHours >= 0 ? '+' : '';
    return `UTC${sign}${Math.round(offsetHours)}`;
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
              value={currentTimezoneDisplay}
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
            const timeZoneData = await fetchTimeZone(lat, lng);
            setLoadingTz(false);
            
                    if (timeZoneData.timeZoneId) {
          const isDST = timeZoneData.dstOffset !== null && 
                       isCurrentlyInDST(timeZoneData.dstOffset);
          const tzAbbr = getTimezoneAbbr(timeZoneData.timeZoneId, isDST, timeZoneData.rawOffset || 0);
          const newMeridian = timeZoneToMeridian[tzAbbr || 'MST'] || tzMeridian;
          
          // Update the timezone display to show the DST-aware abbreviation
          setCurrentTimezoneDisplay(tzAbbr || 'MST');
          
          onChange({ 
            lat, 
            lng, 
            tz: newMeridian,
            useDST: isDST
          });
        } else {
          onChange({ lat, lng, tz: tzMeridian });
        }
          }}
          initialLat={latitude}
          initialLng={longitude}
        />
      </Suspense>
    </div>
  );
};

export default LocationInputs;