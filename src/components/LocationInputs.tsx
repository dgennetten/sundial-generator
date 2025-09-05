// src/components/LocationInputs.tsx
import React, { useState, lazy, Suspense } from 'react';
import { MapPin } from 'lucide-react';
// Remove: import MapPicker from './MapPicker';
const MapPicker = lazy(() => import('./MapPicker'));

// Location data
const locations: { [key: string]: { lat: number; lng: number } } = {
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

  // Helper to fetch time zone from Google Time Zone API
  const fetchTimeZone = async (lat: number, lng: number): Promise<{ timeZoneId: string | null; dstOffset: number | null; rawOffset: number | null; timeZoneName: string | null }> => {
    const timestamp = Math.floor(Date.now() / 1000);
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    
    // Check if API key is available
    console.log('API Key available:', !!apiKey, 'API Key value:', apiKey ? apiKey.substring(0, 10) + '...' : 'undefined');
    
    if (!apiKey || apiKey === 'undefined' || apiKey === 'your_api_key_here') {
      console.log('Google Maps API key is not set. Using fallback timezone data.');
      console.log('To enable timezone lookup, add VITE_GOOGLE_MAPS_API_KEY to your .env.local file');
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