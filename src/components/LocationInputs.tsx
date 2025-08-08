// src/components/LocationInputs.tsx
import React, { useState, lazy, Suspense } from 'react';
import { MapPin } from 'lucide-react';
// Remove: import MapPicker from './MapPicker';
const MapPicker = lazy(() => import('./MapPicker'));

// Location data
const locations: { [key: string]: { lat: number; lng: number } } = {
  'Fort Collins, CO USA': { lat: 40.5853, lng: -105.0844 },
  'Marble, CO USA': { lat: 39.0722, lng: -107.1895 },
  'Spartanburg, SC USA': { lat: 34.9496, lng: -81.9321 },
  'Spangle, WA USA': { lat: 47.4307, lng: -117.3796 },
  'Henrico, VA USA': { lat: 37.5243, lng: -77.4932 },
  'Tucson, AZ USA': { lat: 32.2226, lng: -110.9747 },
  'Quito, Ecuador': { lat: -0.1807, lng: -78.4678 },
  'Recife, Brazil': { lat: -8.0476, lng: -34.8770 },
  'Sydney, Australia': { lat: -33.8688, lng: 151.2093 },
  'Falkenstein, Saxony, Germany': { lat: 50.4777, lng: 12.3649 },
  'Luxembourg City, Luxembourg': { lat: 49.6116, lng: 6.1319 },
  'St Petersburg, Russia': { lat: 59.8761, lng: 30.4339 }
};

interface Props {
  latitude: number;
  longitude: number;
  tzMeridian: number;
  onChange: (values: { lat: number; lng: number; tz: number; useDST?: boolean; timezoneName?: string }) => void;
}

const LocationInputs: React.FC<Props> = ({ latitude, longitude, tzMeridian, onChange }) => {
  const [timezoneName, setTimezoneName] = useState<string>('Mountain Time Zone');
  const [mapOpen, setMapOpen] = useState(false);
  const [loadingTz, setLoadingTz] = useState(false);

  // Responsive: detect mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 500;

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
      // Fetch timezone data for the selected location
      setLoadingTz(true);
      const timeZoneData = await fetchTimeZone(locationData.lat, locationData.lng);
      setLoadingTz(false);
      
             if (timeZoneData.timeZoneId) {
         const isDST = timeZoneData.dstOffset !== null && 
                      isCurrentlyInDST(timeZoneData.dstOffset);
         const tzName = timeZoneData.timeZoneName || 'Time Zone';
         const newMeridian = calculateTzMeridian(locationData.lng);
         
         setTimezoneName(tzName);
         
         onChange({ 
           lat: locationData.lat, 
           lng: locationData.lng, 
           tz: newMeridian,
           useDST: isDST,
           timezoneName: tzName
         });
      } else {
        // Fallback if API call fails
        onChange({ 
          lat: locationData.lat, 
          lng: locationData.lng, 
          tz: tzMeridian 
        });
      }
    }
  };

  // Initialize timezone name on component mount
  React.useEffect(() => {
    const initializeTimezone = async () => {
      setLoadingTz(true);
      const timeZoneData = await fetchTimeZone(latitude, longitude);
      setLoadingTz(false);
      
      if (timeZoneData.timeZoneId) {
        const isDST = timeZoneData.dstOffset !== null && 
                     isCurrentlyInDST(timeZoneData.dstOffset);
        const tzName = timeZoneData.timeZoneName || 'Time Zone';
        console.log('Setting timezone name:', tzName, 'from API response:', timeZoneData); // Debug log
        setTimezoneName(tzName);
      }
    };
    
    initializeTimezone();
  }, [latitude, longitude]);

  // Helper to fetch time zone from Google Time Zone API
  const fetchTimeZone = async (lat: number, lng: number): Promise<{ timeZoneId: string | null; dstOffset: number | null; rawOffset: number | null; timeZoneName: string | null }> => {
    const timestamp = Math.floor(Date.now() / 1000);
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    
    // Check if API key is available
    console.log('API Key available:', !!apiKey, 'API Key value:', apiKey ? apiKey.substring(0, 10) + '...' : 'undefined');
    
    if (!apiKey || apiKey === 'undefined') {
      console.error('Google Maps API key is not set. Please add VITE_GOOGLE_MAPS_API_KEY to your .env.local file');
      console.log('For testing, using fallback timezone data for Fort Collins coordinates');
      
      // Fallback for Fort Collins coordinates (40.5853, -105.0844)
      if (Math.abs(lat - 40.5853) < 0.1 && Math.abs(lng - (-105.0844)) < 0.1) {
        return {
          timeZoneId: 'America/Denver',
          dstOffset: 3600, // Currently in DST
          rawOffset: -25200,
          timeZoneName: 'Mountain Daylight Time'
        };
      }
      
      return { timeZoneId: null, dstOffset: null, rawOffset: null, timeZoneName: null };
    }
    
    const url = `https://maps.googleapis.com/maps/api/timezone/json?location=${lat},${lng}&timestamp=${timestamp}&key=${apiKey}`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      console.log('Google Timezone API response:', data); // Debug log
      if (data.status === 'OK') {
        return {
          timeZoneId: data.timeZoneId,
          dstOffset: data.dstOffset,
          rawOffset: data.rawOffset,
          timeZoneName: data.timeZoneName
        };
      } else {
        console.error('Google Timezone API error:', data.status, data.errorMessage);
      }
    } catch (e) {
      console.error('Error fetching timezone:', e);
    }
    return { timeZoneId: null, dstOffset: null, rawOffset: null, timeZoneName: null };
  };

  // Helper to determine if location is currently in DST
  const isCurrentlyInDST = (dstOffset: number): boolean => {
    // If dstOffset > 0, the location is currently in DST
    return dstOffset > 0;
  };

  // Calculate tzMeridian based on longitude (not timezone offset)
  // For sundial calculations, we use the actual longitude as the timezone meridian
  const calculateTzMeridian = (longitude: number): number => {
    // Longitude is already in degrees west of Greenwich (negative for western hemisphere)
    const meridian = longitude;
    console.log('Calculating tzMeridian from longitude:', { longitude, meridian });
    return meridian;
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
            style={isMobile ? { minWidth: 0, flexShrink: 1, flex: '1.5' } : { flex: '1.5' }}
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
            style={isMobile ? { minWidth: 0, flexShrink: 1, flex: '1.5' } : { flex: '1.5' }}
          >
            <label className="form-label">Time Zone</label>
            <input
              type="text"
              className="form-input"
              value={timezoneName}
              readOnly
              style={{ backgroundColor: '#f8f9fa', cursor: 'not-allowed' }}
            />
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
              onChange={async (e) => {
                const newLat = parseFloat(e.target.value);
                onChange({ lat: newLat, lng: longitude, tz: tzMeridian });
                
                // Fetch timezone data for the new coordinates
                setLoadingTz(true);
                const timeZoneData = await fetchTimeZone(newLat, longitude);
                setLoadingTz(false);
                
                                 if (timeZoneData.timeZoneId) {
                   const isDST = timeZoneData.dstOffset !== null && 
                                isCurrentlyInDST(timeZoneData.dstOffset);
                   const tzName = timeZoneData.timeZoneName || 'Time Zone';
                   const newMeridian = calculateTzMeridian(longitude);
                   
                   setTimezoneName(tzName);
                   
                   onChange({ 
                     lat: newLat, 
                     lng: longitude, 
                     tz: newMeridian,
                     useDST: isDST,
                     timezoneName: tzName
                   });
                 }
              }}
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
              onChange={async (e) => {
                const newLng = parseFloat(e.target.value);
                onChange({ lat: latitude, lng: newLng, tz: tzMeridian });
                
                // Fetch timezone data for the new coordinates
                setLoadingTz(true);
                const timeZoneData = await fetchTimeZone(latitude, newLng);
                setLoadingTz(false);
                
                                 if (timeZoneData.timeZoneId) {
                   const isDST = timeZoneData.dstOffset !== null && 
                                isCurrentlyInDST(timeZoneData.dstOffset);
                   const tzName = timeZoneData.timeZoneName || 'Time Zone';
                   const newMeridian = calculateTzMeridian(newLng);
                   
                   setTimezoneName(tzName);
                   
                   onChange({ 
                     lat: latitude, 
                     lng: newLng, 
                     tz: newMeridian,
                     useDST: isDST,
                     timezoneName: tzName
                   });
                 }
              }}
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
               const tzName = timeZoneData.timeZoneName || 'Time Zone';
               const newMeridian = calculateTzMeridian(lng);
               
               setTimezoneName(tzName);
               
               onChange({ 
                 lat, 
                 lng, 
                 tz: newMeridian,
                 useDST: isDST,
                 timezoneName: tzName
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