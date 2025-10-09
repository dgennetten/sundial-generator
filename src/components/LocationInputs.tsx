// src/components/LocationInputs.tsx
import React, { useState, lazy, Suspense } from 'react';
import { MapPin } from 'lucide-react';
// Remove: import MapPicker from './MapPicker';
const MapPicker = lazy(() => import('./MapPicker'));

// Location data
const locations: { [key: string]: { lat: number; lng: number } } = {
  'Chicago, IL USA': { lat: 41.8781, lng: -87.6298 },
  'Fort Collins, CO USA': { lat: 40.5853, lng: -105.0844 },
  'Spartanburg, SC USA': { lat: 34.9496, lng: -81.9321 },
  'Tucson, AZ USA': { lat: 32.2226, lng: -110.9747 },
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
  onChange: (values: { lat: number; lng: number; tz: number; useDST?: boolean; timezoneName?: string; locationName?: string }) => void;
}

const LocationInputs: React.FC<Props> = ({ latitude, longitude, tzMeridian, onChange }) => {
  const [timezoneName, setTimezoneName] = useState<string>('Mountain Time Zone');
  const [mapOpen, setMapOpen] = useState(false);
  const [loadingTz, setLoadingTz] = useState(false);
  const [foundLocationName, setFoundLocationName] = useState<string | null>(null);

  // Responsive: detect layout mode using media query
  const [layoutMode, setLayoutMode] = useState<'desktop' | 'mobile-portrait' | 'mobile-landscape'>('desktop');
  
  React.useEffect(() => {
    const checkLayoutMode = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isLandscape = width > height;
      
      if (width <= 900 && isLandscape && height >= 500) {
        setLayoutMode('mobile-landscape');
      } else if (width <= 900) {
        setLayoutMode('mobile-portrait');
      } else {
        setLayoutMode('desktop');
      }
    };
    
    checkLayoutMode();
    window.addEventListener('resize', checkLayoutMode);
    
    return () => window.removeEventListener('resize', checkLayoutMode);
  }, []);

  // Find current location based on lat/lng
  const getCurrentLocation = () => {
    for (const [name, data] of Object.entries(locations)) {
      if (Math.abs(data.lat - latitude) < 0.001 && Math.abs(data.lng - longitude) < 0.001) {
        return name;
      }
    }
    return 'Custom Lat/Long';
  };

  const handleLocationChange = async (locationName: string) => {
    if (locationName === 'Custom Lat/Long') return; // Don't change anything for custom
    if (locationName === 'Use Map') {
      setMapOpen(true);
      return;
    }
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
            timezoneName: tzName,
            locationName: locationName
          });
               } else {
           // Fallback if API call fails
           onChange({ 
             lat: locationData.lat, 
             lng: locationData.lng, 
             tz: tzMeridian,
             locationName: locationName
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
        const tzName = timeZoneData.timeZoneName || 'Time Zone';
        console.log('Setting timezone name:', tzName, 'from API response:', timeZoneData); // Debug log
        setTimezoneName(tzName);
      }
    };
    
    initializeTimezone();
  }, [latitude, longitude]);

  // Enhanced timezone lookup with comprehensive fallback system
  const fetchTimeZone = async (lat: number, lng: number): Promise<{ timeZoneId: string | null; dstOffset: number | null; rawOffset: number | null; timeZoneName: string | null }> => {
    // First, try to get timezone from our enhanced fallback system
    const fallbackResult = getTimezoneFromCoordinates(lat, lng);
    if (fallbackResult) {
      console.log('Using enhanced fallback timezone data for coordinates:', lat, lng);
      return fallbackResult;
    }

    // If no fallback match, try Google API (though it will likely fail with website restrictions)
    const timestamp = Math.floor(Date.now() / 1000);
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    
    if (apiKey && apiKey !== 'undefined' && apiKey !== 'your_api_key_here') {
      const url = `https://maps.googleapis.com/maps/api/timezone/json?location=${lat},${lng}&timestamp=${timestamp}&key=${apiKey}`;
      try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.status === 'OK') {
          console.log('Successfully used Google Timezone API');
          return {
            timeZoneId: data.timeZoneId,
            dstOffset: data.dstOffset,
            rawOffset: data.rawOffset,
            timeZoneName: data.timeZoneName
          };
        } else {
          console.log('Google Timezone API failed:', data.status, data.errorMessage);
          console.log('Falling back to coordinate-based timezone estimation');
        }
      } catch (e) {
        console.log('Google Timezone API request failed:', e);
        console.log('Falling back to coordinate-based timezone estimation');
      }
    }

    // Final fallback: estimate timezone from longitude
    return estimateTimezoneFromLongitude(lat, lng);
  };

  // Enhanced fallback system with timezone data for common locations
  const getTimezoneFromCoordinates = (lat: number, lng: number) => {
    const timezoneData = [
      // North America
      { lat: 40.5853, lng: -105.0844, timeZoneId: 'America/Denver', name: 'Mountain Time', offset: -7, dstOffset: 1 }, // Fort Collins
      { lat: 34.9496, lng: -81.9321, timeZoneId: 'America/New_York', name: 'Eastern Time', offset: -5, dstOffset: 1 }, // Spartanburg
      { lat: 32.2226, lng: -110.9747, timeZoneId: 'America/Phoenix', name: 'Mountain Standard Time', offset: -7, dstOffset: 0 }, // Tucson (no DST)
      { lat: 40.7128, lng: -74.0060, timeZoneId: 'America/New_York', name: 'Eastern Time', offset: -5, dstOffset: 1 }, // New York
      { lat: 34.0522, lng: -118.2437, timeZoneId: 'America/Los_Angeles', name: 'Pacific Time', offset: -8, dstOffset: 1 }, // Los Angeles
      { lat: 41.8781, lng: -87.6298, timeZoneId: 'America/Chicago', name: 'Central Time', offset: -6, dstOffset: 1 }, // Chicago
      
      // South America
      { lat: -8.0476, lng: -34.8770, timeZoneId: 'America/Recife', name: 'Brasilia Time', offset: -3, dstOffset: 0 }, // Recife
      { lat: -23.5505, lng: -46.6333, timeZoneId: 'America/Sao_Paulo', name: 'Brasilia Time', offset: -3, dstOffset: 0 }, // São Paulo
      
      // Europe
      { lat: 50.4777, lng: 12.3649, timeZoneId: 'Europe/Berlin', name: 'Central European Time', offset: 1, dstOffset: 1 }, // Falkenstein
      { lat: 49.6116, lng: 6.1319, timeZoneId: 'Europe/Luxembourg', name: 'Central European Time', offset: 1, dstOffset: 1 }, // Luxembourg
      { lat: 51.5074, lng: -0.1278, timeZoneId: 'Europe/London', name: 'Greenwich Mean Time', offset: 0, dstOffset: 1 }, // London
      { lat: 48.8566, lng: 2.3522, timeZoneId: 'Europe/Paris', name: 'Central European Time', offset: 1, dstOffset: 1 }, // Paris
      
      // Asia/Russia
      { lat: 59.8761, lng: 30.4339, timeZoneId: 'Europe/Moscow', name: 'Moscow Standard Time', offset: 3, dstOffset: 0 }, // St Petersburg
      { lat: 35.6762, lng: 139.6503, timeZoneId: 'Asia/Tokyo', name: 'Japan Standard Time', offset: 9, dstOffset: 0 }, // Tokyo
      
      // Australia/Oceania
      { lat: -33.8688, lng: 151.2093, timeZoneId: 'Australia/Sydney', name: 'Australian Eastern Time', offset: 10, dstOffset: 1 }, // Sydney
      { lat: -37.8136, lng: 144.9631, timeZoneId: 'Australia/Melbourne', name: 'Australian Eastern Time', offset: 10, dstOffset: 1 }, // Melbourne
    ];

    // Find closest match within reasonable distance (about 100km)
    for (const tz of timezoneData) {
      const distance = Math.sqrt(Math.pow(lat - tz.lat, 2) + Math.pow(lng - tz.lng, 2));
      if (distance < 1.0) { // Roughly 100km
        const now = new Date();
        const isDST = isDaylightSavingTime(now, tz.timeZoneId);
        
        return {
          timeZoneId: tz.timeZoneId,
          dstOffset: isDST && tz.dstOffset > 0 ? tz.dstOffset * 3600 : 0,
          rawOffset: tz.offset * 3600,
          timeZoneName: isDST && tz.dstOffset > 0 ? tz.name.replace('Standard', 'Daylight').replace('Time', 'Daylight Time') : tz.name
        };
      }
    }
    
    return null;
  };

  // Estimate timezone from longitude as final fallback
  const estimateTimezoneFromLongitude = (_lat: number, lng: number) => {
    // Basic timezone estimation: 15 degrees longitude ≈ 1 hour
    const estimatedOffset = Math.round(lng / 15);
    const offsetHours = Math.max(-12, Math.min(12, estimatedOffset));
    
    // Generate a reasonable timezone name
    let timezoneName = 'UTC';
    if (offsetHours !== 0) {
      const sign = offsetHours > 0 ? '+' : '';
      timezoneName = `UTC${sign}${offsetHours}`;
    }
    
    console.log(`Estimated timezone from longitude ${lng}: ${timezoneName} (${offsetHours} hours)`);
    
    return {
      timeZoneId: null,
      dstOffset: 0,
      rawOffset: offsetHours * 3600,
      timeZoneName: timezoneName
    };
  };

  // Simple DST detection for common timezones
  const isDaylightSavingTime = (date: Date, timeZoneId: string): boolean => {
    const month = date.getMonth() + 1; // 1-12
    
    // North American DST (March to November)
    if (timeZoneId?.includes('America/') && !timeZoneId.includes('Phoenix')) {
      return month > 3 && month < 11;
    }
    
    // European DST (March to October)
    if (timeZoneId?.includes('Europe/')) {
      return month > 3 && month < 11;
    }
    
    // Australian DST (October to March) - Southern Hemisphere
    if (timeZoneId?.includes('Australia/')) {
      return month > 9 || month < 4;
    }
    
    // Default: no DST
    return false;
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
            layoutMode === 'mobile-portrait'
              ? { display: 'flex', flexDirection: 'column', width: '100%', gap: '0.5rem' }
              : { 
                  display: 'flex', 
                  flexDirection: 'row', 
                  alignItems: 'end', 
                  gap: layoutMode === 'mobile-landscape' ? '0.5rem' : '0.75rem',
                  flexWrap: 'nowrap'
                }
          }
        >
          <div
            className="form-group"
            style={
              layoutMode === 'mobile-portrait'
                ? { width: '100%' } 
                : { 
                    flex: '1',
                    minWidth: layoutMode === 'mobile-landscape' ? '120px' : '150px'
                  }
            }
          >
            <label className="form-label">Location</label>
            <div style={{ position: 'relative' }}>
              <select
                className="form-select"
                value={getCurrentLocation()}
                onChange={(e) => handleLocationChange(e.target.value)}
                style={{ 
                  visibility: foundLocationName ? 'hidden' : 'visible',
                  width: '100%',
                  minWidth: 0,
                  fontSize: layoutMode === 'mobile-landscape' ? '0.85rem' : '0.9rem'
                }}
              >
                {Object.keys(locations).map(location => (
                  <option key={location} value={location}>{location}</option>
                ))}
                <option value="Custom Lat/Long">Custom Lat/Long</option>
                <option value="Use Map">Use Map…</option>
              </select>
              {foundLocationName && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: '#f1f3f4',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  padding: '0.5rem 0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  color: '#6b7280',
                  fontSize: '0.9rem',
                  cursor: 'not-allowed',
                  zIndex: 10
                }}>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {foundLocationName}
                  </span>
                  <button
                    type="button"
                    style={{
                      background: '#fecaca',
                      border: 'none',
                      borderRadius: '50%',
                      width: '20px',
                      height: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      color: '#dc2626',
                      fontWeight: 'bold',
                      flexShrink: 0,
                      marginLeft: '0.5rem'
                    }}
                    onClick={() => {
                      setFoundLocationName(null);
                    }}
                    title="Remove found location"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>
          <div
            className="form-group"
            style={
              layoutMode === 'mobile-portrait'
                ? { width: '100%' } 
                : { 
                    flex: layoutMode === 'mobile-landscape' ? '0 0 120px' : '0 0 140px',
                    minWidth: layoutMode === 'mobile-landscape' ? '100px' : '120px'
                  }
            }
          >
            <label className="form-label">Time Zone</label>
            <div
              className="form-input location-timezone-field"
              style={{ 
                backgroundColor: '#f1f3f4', 
                cursor: 'not-allowed',
                color: '#6b7280',
                borderColor: '#d1d5db',
                opacity: 0.8,
                width: '100%',
                minWidth: 0,
                height: 'auto',
                minHeight: '34px',
                display: 'flex',
                alignItems: 'center',
                paddingTop: '0.45rem',
                paddingBottom: '0.45rem',
                fontSize: layoutMode === 'mobile-landscape' ? '0.8rem' : '0.9rem'
              }}
            >
              {timezoneName}
            </div>
          </div>
        </div>

        <div
          className="form-row"
          style={
            layoutMode === 'mobile-portrait'
              ? { display: 'flex', flexDirection: 'column', width: '100%', gap: '0.5rem' }
              : {
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'end',
                  gap: layoutMode === 'mobile-landscape' ? '0.5rem' : '0.75rem',
                  flexWrap: 'nowrap'
                }
          }
        >
          <div
            className="form-group"
            style={
              layoutMode === 'mobile-portrait'
                ? { width: '100%' } 
                : { 
                    flex: '1',
                    minWidth: layoutMode === 'mobile-landscape' ? '70px' : '80px'
                  }
            }
          >
            <label className="form-label">Latitude</label>
            <input
              type="number"
              className="form-input"
              step={0.0001}
              min={-90}
              max={90}
              value={latitude}
                            onChange={async (e) => {
                const newLat = parseFloat(e.target.value);

                // Validate latitude range
                if (isNaN(newLat) || newLat < -90 || newLat > 90) {
                  return; // Don't update if invalid
                }

                // Clear found location name when manually changing coordinates
                setFoundLocationName(null);
                onChange({ lat: newLat, lng: longitude, tz: tzMeridian, locationName: 'Custom Lat/Long' });
                
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
                     timezoneName: tzName,
                     locationName: 'Custom Lat/Long'
                   });
                 }
               }}
              style={{ 
                width: '100%',
                minWidth: 0,
                fontSize: layoutMode === 'mobile-landscape' ? '0.85rem' : '0.9rem'
              }}
            />
          </div>
          <div
            className="form-group"
            style={
              layoutMode === 'mobile-portrait'
                ? { width: '100%' } 
                : { 
                    flex: '1',
                    minWidth: layoutMode === 'mobile-landscape' ? '70px' : '80px'
                  }
            }
          >
            <label className="form-label">Longitude</label>
            <input
              type="number"
              className="form-input"
              step={0.0001}
              min={-180}
              max={180}
              value={longitude}
                            onChange={async (e) => {
                const newLng = parseFloat(e.target.value);

                // Validate longitude range
                if (isNaN(newLng) || newLng < -180 || newLng > 180) {
                  return; // Don't update if invalid
                }

                // Clear found location name when manually changing coordinates
                setFoundLocationName(null);
                onChange({ lat: latitude, lng: newLng, tz: tzMeridian, locationName: 'Custom Lat/Long' });
                
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
                     timezoneName: tzName,
                     locationName: 'Custom Lat/Long'
                   });
                 }
               }}
              style={{ 
                width: '100%',
                minWidth: 0,
                fontSize: layoutMode === 'mobile-landscape' ? '0.85rem' : '0.9rem'
              }}
            />
          </div>
          <div
            className="form-group"
            style={
              layoutMode === 'mobile-portrait'
                ? { width: '100%' } 
                : { 
                    flex: '0 0 auto'
                  }
            }
          >
            <button
              type="button"
              className="form-input"
              style={{ 
                height: 36, 
                cursor: 'pointer', 
                padding: layoutMode === 'mobile-portrait' ? '0 8px' : layoutMode === 'mobile-landscape' ? '0 6px' : '0 12px',
                width: layoutMode === 'mobile-portrait' ? '100%' : 'auto',
                minWidth: layoutMode === 'mobile-portrait' ? 0 : layoutMode === 'mobile-landscape' ? '60px' : '80px',
                whiteSpace: 'nowrap',
                fontSize: layoutMode === 'mobile-landscape' ? '0.85rem' : '0.9rem'
              }}
              onClick={() => setMapOpen(true)}
            >
              {layoutMode === 'mobile-landscape' ? 'Map' : 'Use Map'}
            </button>
          </div>
        </div>
        {loadingTz && <div style={{ color: '#f59e42', marginTop: 8 }}>Detecting time zone...</div>}
      </div>
      <Suspense fallback={<div style={{textAlign: 'center', padding: 32}}>Loading map…</div>}>
                 <MapPicker
           open={mapOpen}
           onClose={() => setMapOpen(false)}
           onSelect={async (lat, lng, locationName) => {
             setLoadingTz(true);
             const timeZoneData = await fetchTimeZone(lat, lng);
             setLoadingTz(false);
             
                           // Set the found location name to show in the overlay
              setFoundLocationName(locationName || null);
             
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
                  timezoneName: tzName,
                  locationName: locationName
                });
              } else {
                onChange({ 
                  lat, 
                  lng, 
                  tz: tzMeridian,
                  locationName: locationName
                });
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