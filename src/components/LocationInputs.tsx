// src/components/LocationInputs.tsx
import React, { useState, lazy, Suspense, useCallback, useEffect, useRef } from 'react';
import { MapPin, Map } from 'lucide-react';
import { log } from '../utils/logger';
const MapPicker = lazy(() => import('./MapPicker'));

// Location data
const locations: { [key: string]: { lat: number; lng: number } } = {
  'Biggleswade, England': { lat: 52.0873, lng: -0.2641 },
  'Chicago, IL USA': { lat: 41.8781, lng: -87.6298 },
  'Cocoa Beach, FL USA': { lat: 28.3200, lng: -80.6076 },
  'Dallas, TX USA': { lat: 32.7767, lng: -96.7970 },
  'Fort Collins, CO USA': { lat: 40.5853, lng: -105.0844 },
  'Los Barriles, Mexico': { lat: 23.6880, lng: -109.6930 },
  'Spartanburg, SC USA': { lat: 34.9496, lng: -81.9321 },
  'Tucson, AZ USA': { lat: 32.2226, lng: -110.9747 },
  'Recife, Brazil': { lat: -8.0476, lng: -34.8770 },
  'Sydney, Australia': { lat: -33.8688, lng: 151.2093 },
  'Falkenstein, Saxony, Germany': { lat: 50.4777, lng: 12.3649 },
  'Luxembourg City, Luxembourg': { lat: 49.6116, lng: 6.1319 },
  'St Petersburg, Russia': { lat: 59.8761, lng: 30.4339 }
};

interface TimezoneResult {
  timeZoneId: string | null;
  dstOffset: number; // DST offset in seconds (0 if no DST, >0 if DST capable)
  rawOffset: number; // Standard offset in seconds
  timeZoneName: string;
  isCurrentlyInDST: boolean; // Whether currently in DST season
}

interface Props {
  latitude: number;
  longitude: number;
  tzMeridian: number;
  onChange: (values: { lat: number; lng: number; tz: number; useDST?: boolean; timezoneName?: string; locationName?: string }) => void;
}

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

// Enhanced fallback system with timezone data for common locations
const getTimezoneFromCoordinates = (lat: number, lng: number) => {
  const timezoneData = [
    // North America
    { lat: 40.5853, lng: -105.0844, timeZoneId: 'America/Denver', name: 'Mountain Time', offset: -7, dstOffset: 1 }, // Fort Collins
    { lat: 23.6880, lng: -109.6930, timeZoneId: 'America/Mazatlan', name: 'Mountain Standard Time', offset: -7, dstOffset: 0 }, // Los Barriles
    { lat: 28.3200, lng: -80.6076, timeZoneId: 'America/New_York', name: 'Eastern Time', offset: -5, dstOffset: 1 }, // Cocoa Beach
    { lat: 38.2530, lng: -85.7592, timeZoneId: 'America/Kentucky/Louisville', name: 'Eastern Time', offset: -5, dstOffset: 1 }, // Louisville KY
    { lat: 34.9496, lng: -81.9321, timeZoneId: 'America/New_York', name: 'Eastern Time', offset: -5, dstOffset: 1 }, // Spartanburg
    { lat: 32.2226, lng: -110.9747, timeZoneId: 'America/Phoenix', name: 'Mountain Standard Time', offset: -7, dstOffset: 0 }, // Tucson (no DST)
    { lat: 40.7128, lng: -74.0060, timeZoneId: 'America/New_York', name: 'Eastern Time', offset: -5, dstOffset: 1 }, // New York
    { lat: 34.0522, lng: -118.2437, timeZoneId: 'America/Los_Angeles', name: 'Pacific Time', offset: -8, dstOffset: 1 }, // Los Angeles
    { lat: 41.8781, lng: -87.6298, timeZoneId: 'America/Chicago', name: 'Central Time', offset: -6, dstOffset: 1 }, // Chicago
    { lat: 32.7767, lng: -96.7970, timeZoneId: 'America/Chicago', name: 'Central Time', offset: -6, dstOffset: 1 }, // Dallas

    // South America
    { lat: -8.0476, lng: -34.8770, timeZoneId: 'America/Recife', name: 'Brasilia Time', offset: -3, dstOffset: 0 }, // Recife
    { lat: -23.5505, lng: -46.6333, timeZoneId: 'America/Sao_Paulo', name: 'Brasilia Time', offset: -3, dstOffset: 0 }, // São Paulo

    // Europe
    { lat: 50.4777, lng: 12.3649, timeZoneId: 'Europe/Berlin', name: 'Central European Time', offset: 1, dstOffset: 1 }, // Falkenstein
    { lat: 49.6116, lng: 6.1319, timeZoneId: 'Europe/Luxembourg', name: 'Central European Time', offset: 1, dstOffset: 1 }, // Luxembourg
    { lat: 51.5074, lng: -0.1278, timeZoneId: 'Europe/London', name: 'Greenwich Mean Time', offset: 0, dstOffset: 1 }, // London
    { lat: 52.0873, lng: -0.2641, timeZoneId: 'Europe/London', name: 'Greenwich Mean Time', offset: 0, dstOffset: 1 }, // Biggleswade
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
      const inDST = isDaylightSavingTime(now, tz.timeZoneId);

      return {
        timeZoneId: tz.timeZoneId,
        // dstOffset: DST capability (>0 if timezone observes DST, 0 if never DST)
        dstOffset: tz.dstOffset > 0 ? tz.dstOffset * 3600 : 0,
        rawOffset: tz.offset * 3600,
        // Include DST indicator in timezone name if currently in DST
        timeZoneName: inDST && tz.dstOffset > 0 
          ? tz.name.replace('Standard', 'Daylight').replace('Time', 'Daylight Time')
          : tz.name,
        // Track current DST status separately
        isCurrentlyInDST: inDST
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

  return {
    timeZoneId: null,
    dstOffset: 0, // No DST for estimated timezones
    rawOffset: offsetHours * 3600,
    timeZoneName: timezoneName,
    isCurrentlyInDST: false
  };
};

/** Auto DST when we have an IANA zone; undefined = leave checkbox unchanged (e.g. longitude-only estimate). */
const inferUseDST = (data: TimezoneResult): boolean | undefined => {
  if (!data.timeZoneId) return undefined;
  return (
    !!data.isCurrentlyInDST ||
    (data.dstOffset > 0 && data.timeZoneId.includes('America/')) ||
    (data.dstOffset > 0 && data.timeZoneId.includes('Europe/')) ||
    (data.dstOffset > 0 && data.timeZoneId.includes('Australia/'))
  );
};

// Calculate tzMeridian from timezone rawOffset (in seconds)
// tzMeridian is the standard meridian of the timezone (e.g. -90 for CST, -105 for MST)
// Formula: each hour of UTC offset = 15 degrees of longitude
// This is used by getSolarPosition to compute the longitude correction:
//   timeCorrection = 4 * (lng - tzMeridian) minutes
const calculateTzMeridian = (rawOffsetSeconds: number): number => {
  return (rawOffsetSeconds / 3600) * 15;
};

const LocationInputs: React.FC<Props> = ({ latitude, longitude, tzMeridian, onChange }) => {
  const [timezoneName, setTimezoneName] = useState<string>('Mountain Time Zone');
  const [mapOpen, setMapOpen] = useState(false);
  const [loadingTz, setLoadingTz] = useState(false);
  const [foundLocationName, setFoundLocationName] = useState<string | null>(null);
  const tzFetchGeneration = useRef(0);

  // Responsive: detect layout mode using media query
  const [layoutMode, setLayoutMode] = useState<'desktop' | 'mobile-portrait' | 'mobile-landscape'>('desktop');

  useEffect(() => {
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

  // Enhanced timezone lookup with comprehensive fallback system
  const fetchTimeZone = useCallback(async (lat: number, lng: number): Promise<TimezoneResult> => {
    // First, try to get timezone from our enhanced fallback system
    const fallbackResult = getTimezoneFromCoordinates(lat, lng);
    if (fallbackResult) {
      log.debug('Using enhanced fallback timezone data for coordinates:', lat, lng);
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
          log.debug('Successfully used Google Timezone API');
          // Google API returns dstOffset in seconds directly
          const googleDstOffset = data.dstOffset || 0;
          const inDST = googleDstOffset > 0;
          return {
            timeZoneId: data.timeZoneId,
            dstOffset: googleDstOffset,
            rawOffset: data.rawOffset || 0,
            timeZoneName: data.timeZoneName || 'Time Zone',
            isCurrentlyInDST: inDST
          };
        } else {
          log.debug('Google Timezone API failed:', data.status, data.errorMessage);
          log.debug('Falling back to coordinate-based timezone estimation');
        }
      } catch (e) {
        log.debug('Google Timezone API request failed:', e);
        log.debug('Falling back to coordinate-based timezone estimation');
      }
    }

    // Final fallback: estimate timezone from longitude
    return estimateTimezoneFromLongitude(lat, lng);
  }, []);

  const applyResolvedTimezone = useCallback(
    (lat: number, lng: number, timeZoneData: TimezoneResult, updateParent: boolean, locationName?: string) => {
      const newMeridian = calculateTzMeridian(timeZoneData.rawOffset);
      const tzName = timeZoneData.timeZoneName || 'Time Zone';
      setTimezoneName(tzName);
      if (!updateParent) return;

      const useDSTFlag = inferUseDST(timeZoneData);
      const payload: {
        lat: number;
        lng: number;
        tz: number;
        useDST?: boolean;
        timezoneName?: string;
        locationName?: string;
      } = {
        lat,
        lng,
        tz: newMeridian,
      };
      if (locationName !== undefined) payload.locationName = locationName;
      if (useDSTFlag !== undefined) {
        payload.useDST = useDSTFlag;
        payload.timezoneName = tzName;
      }
      onChange(payload);
    },
    [onChange]
  );

  const lookupAndApplyTimezone = useCallback(
    async (lat: number, lng: number, updateParent: boolean, locationName?: string) => {
      const gen = ++tzFetchGeneration.current;
      setLoadingTz(true);
      try {
        const timeZoneData = await fetchTimeZone(lat, lng);
        if (gen !== tzFetchGeneration.current) return;
        applyResolvedTimezone(lat, lng, timeZoneData, updateParent, locationName);
      } finally {
        if (gen === tzFetchGeneration.current) setLoadingTz(false);
      }
    },
    [fetchTimeZone, applyResolvedTimezone]
  );

  const handleLocationChange = async (locationName: string) => {
    if (locationName === 'Custom Lat/Long') return; // Don't change anything for custom
    if (locationName === 'Use Map') {
      setMapOpen(true);
      return;
    }
    const locationData = locations[locationName];
    if (locationData) {
      await lookupAndApplyTimezone(locationData.lat, locationData.lng, true, locationName);
    }
  };

  // Keep the detected zone label in sync with coordinates (does not change parent tz meridian)
  useEffect(() => {
    const gen = ++tzFetchGeneration.current;
    (async () => {
      const data = await fetchTimeZone(latitude, longitude);
      if (gen !== tzFetchGeneration.current) return;
      setTimezoneName(data.timeZoneName || 'Time Zone');
    })();
  }, [latitude, longitude, fetchTimeZone]);

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title"><MapPin color="#2563eb" size={20} style={{ marginRight: 6 }} /> Location</h3>
      </div>
      <div className="card-content">
        <div
          className="form-row location-card-top"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
            gap: '0.5rem',
            width: '100%',
            minWidth: 0,
          }}
        >
          {/* Location ~60% | Latitude / Longitude share the rest */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'flex-end',
              gap: layoutMode === 'mobile-landscape' ? '0.4rem' : '0.65rem',
              width: '100%',
              minWidth: 0,
            }}
          >
            <div className="form-group" style={{ flex: '0 1 60%', minWidth: 0, marginBottom: 0 }}>
              <label className="form-label">Location</label>
              <div style={{ position: 'relative', width: '100%' }}>
                <select
                  className="form-select"
                  value={getCurrentLocation()}
                  onChange={(e) => handleLocationChange(e.target.value)}
                  style={{
                    visibility: foundLocationName ? 'hidden' : 'visible',
                    width: '100%',
                    minWidth: 0,
                    fontSize: layoutMode === 'mobile-landscape' ? '0.85rem' : '0.9rem',
                  }}
                >
                  <option value="Use Map">Use Map…</option>
                  {Object.keys(locations).map(location => (
                    <option key={location} value={location}>{location}</option>
                  ))}
                  <option value="Custom Lat/Long">Custom Lat/Long</option>
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
              style={{
                flex: '1 1 0',
                minWidth: layoutMode === 'mobile-landscape' ? '52px' : '60px',
                marginBottom: 0,
              }}
            >
              <label className="form-label">Latitude</label>
              <input
                type="number"
                className="form-input form-input-no-spin"
                step={0.001}
                min={-90}
                max={90}
                value={latitude.toFixed(3)}
                onChange={async (e) => {
                  const newLat = parseFloat(e.target.value);
                  if (Number.isNaN(newLat) || newLat < -90 || newLat > 90) return;
                  setFoundLocationName(null);
                  await lookupAndApplyTimezone(newLat, longitude, true, 'Custom Lat/Long');
                }}
                style={{
                  width: '100%',
                  minWidth: 0,
                  fontSize: layoutMode === 'mobile-landscape' ? '0.85rem' : '0.9rem',
                }}
              />
            </div>
            <div
              className="form-group"
              style={{
                flex: '1 1 0',
                minWidth: layoutMode === 'mobile-landscape' ? '52px' : '60px',
                marginBottom: 0,
              }}
            >
              <label className="form-label">Longitude</label>
              <input
                type="number"
                className="form-input form-input-no-spin"
                step={0.001}
                min={-180}
                max={180}
                value={longitude.toFixed(3)}
                onChange={async (e) => {
                  const newLng = parseFloat(e.target.value);
                  if (Number.isNaN(newLng) || newLng < -180 || newLng > 180) return;
                  setFoundLocationName(null);
                  await lookupAndApplyTimezone(latitude, newLng, true, 'Custom Lat/Long');
                }}
                style={{
                  width: '100%',
                  minWidth: 0,
                  fontSize: layoutMode === 'mobile-landscape' ? '0.85rem' : '0.9rem',
                }}
              />
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'flex-end',
              gap: layoutMode === 'mobile-landscape' ? '0.4rem' : '0.5rem',
              width: '100%',
              minWidth: 0,
            }}
          >
            <div
              className="form-group location-timezone-detected-wrap"
              style={{
                flex: '1 1 auto',
                minWidth: 0,
                marginBottom: 0,
              }}
            >
              <label className="form-label" htmlFor="location-tz-detected-readout">
                Detected Time Zone
              </label>
              <div
                id="location-tz-detected-readout"
                className="form-input location-timezone-detected"
                role="status"
                aria-live="polite"
                style={{
                  backgroundColor: '#f1f3f4',
                  color: '#6b7280',
                  borderColor: '#d1d5db',
                  cursor: 'default',
                  width: '100%',
                  minWidth: 0,
                  minHeight: '34px',
                  display: 'flex',
                  alignItems: 'center',
                  boxSizing: 'border-box',
                  fontSize: layoutMode === 'mobile-landscape' ? '0.8rem' : '0.9rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={loadingTz ? undefined : timezoneName}
              >
                {loadingTz ? 'Detecting…' : timezoneName}
              </div>
            </div>
            <div
              className="form-group location-timezone-meridian"
              style={{
                flex: '0 0 auto',
                marginBottom: 0,
              }}
            >
              <label className="form-label" htmlFor="location-tz-meridian">
                Meridian (°)
              </label>
              <input
                id="location-tz-meridian"
                type="number"
                className="form-input location-timezone-field form-input-no-spin"
                step={1}
                min={-180}
                max={180}
                value={tzMeridian}
                title="Standard meridian for civil time (multiples of 15°). Filled automatically from lat/long; change if the guess is wrong."
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (Number.isNaN(v) || v < -180 || v > 180) return;
                  onChange({ lat: latitude, lng: longitude, tz: v });
                }}
                style={{
                  width: '4.5rem',
                  minWidth: '4rem',
                  fontSize: layoutMode === 'mobile-landscape' ? '0.8rem' : '0.9rem',
                }}
              />
            </div>
            <div className="form-group" style={{ flex: '0 0 auto', marginBottom: 0 }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setMapOpen(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: layoutMode === 'mobile-landscape' ? 'auto' : '100px',
                  minWidth: layoutMode === 'mobile-landscape' ? '72px' : '100px',
                  padding: '0.5rem 0.6rem',
                  gap: '4px',
                  whiteSpace: 'nowrap',
                  fontSize: layoutMode === 'mobile-landscape' ? '0.85rem' : undefined,
                }}
              >
                <Map size={16} />
                Map
              </button>
            </div>
          </div>
        </div>
      </div>
      <Suspense fallback={<div style={{ textAlign: 'center', padding: 32 }}>Loading map…</div>}>
        <MapPicker
          open={mapOpen}
          onClose={() => setMapOpen(false)}
          onSelect={async (lat, lng, locationName) => {
            setFoundLocationName(locationName || null);
            await lookupAndApplyTimezone(lat, lng, true, locationName);
          }}
          initialLat={latitude}
          initialLng={longitude}
        />
      </Suspense>
    </div>
  );
};

export default LocationInputs;