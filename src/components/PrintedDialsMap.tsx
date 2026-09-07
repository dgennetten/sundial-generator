import React, { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Globe2, Map as MapIcon } from 'lucide-react';
import type { SundialPrint, SundialPrintMapProps } from '../types/sundial';
import {
  fetchSundialPrints,
  WORLD_TOUR_CANDIDATE_LIMIT,
} from '../utils/sundialPrintUtils';
import { log } from '../utils/logger';

const WorldTourGlobe = lazy(() => import('./WorldTourGlobe'));

// Fix for default markers in Leaflet with React
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const PrintedDialsMap: React.FC<SundialPrintMapProps> = ({
  onPinClick,
  refreshTrigger = 0,
  pinLimit = 200,
  onTourActiveChange,
  worldTourStartTrigger = 0,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const lastTourStartTriggerRef = useRef(0);
  const [prints, setPrints] = useState<SundialPrint[]>([]);
  const [tourPrints, setTourPrints] = useState<SundialPrint[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [tourLoading, setTourLoading] = useState(false);
  const [tourError, setTourError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mapInitialized, setMapInitialized] = useState<boolean>(false);
  const [tourActive, setTourActive] = useState(false);

  useEffect(() => {
    onTourActiveChange?.(tourActive);
  }, [tourActive, onTourActiveChange]);

  const startWorldTour = useCallback(async () => {
    setTourLoading(true);
    setTourError(null);
    try {
      const { prints: candidates } = await fetchSundialPrints(WORLD_TOUR_CANDIDATE_LIMIT, true);
      if (candidates.length === 0) {
        throw new Error('No print records are available for the tour');
      }
      setTourPrints(candidates);
      setTourActive(true);
    } catch (err) {
      log.error('Error loading World Tour candidates:', err);
      setTourError(err instanceof Error ? err.message : 'Failed to load World Tour data');
    } finally {
      setTourLoading(false);
    }
  }, []);

  useEffect(() => {
    if (worldTourStartTrigger <= lastTourStartTriggerRef.current) return;
    lastTourStartTriggerRef.current = worldTourStartTrigger;
    if (!tourActive && !tourLoading) {
      void startWorldTour();
    }
  }, [worldTourStartTrigger, tourActive, tourLoading, startWorldTour]);

  // Initialize map - only when leaflet is visible (not loading/error/tour)
  useEffect(() => {
    if (loading || error || tourActive || !mapRef.current || mapInstanceRef.current) {
      return;
    }

    const map = L.map(mapRef.current, {
      center: [20, 0],
      zoom: 2,
      zoomControl: true,
      scrollWheelZoom: false,
      dragging: true,
      touchZoom: true,
      doubleClickZoom: true,
      boxZoom: false,
      keyboard: false,
      attributionControl: true,
      worldCopyJump: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
      minZoom: 2,
    }).addTo(map);

    mapInstanceRef.current = map;
    setMapInitialized(true);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        setMapInitialized(false);
      }
    };
  }, [loading, error, tourActive]);

  // Fetch data from MySQL
  useEffect(() => {
    const loadPrints = async () => {
      setLoading(true);
      setError(null);
      try {
        const { prints: fetchedPrints, totalCount: fetchedTotal } = await fetchSundialPrints(pinLimit);
        setPrints(fetchedPrints);
        setTotalCount(fetchedTotal);
      } catch (err) {
        log.error('Error loading sundial prints:', err);
        setError(err instanceof Error ? err.message : 'Failed to load sundial prints');
      } finally {
        setLoading(false);
      }
    };

    loadPrints();
  }, [refreshTrigger, pinLimit]);

  // Update markers when prints change
  useEffect(() => {
    if (!mapInitialized || !mapInstanceRef.current || loading || tourActive) {
      return;
    }

    const map = mapInstanceRef.current;

    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    if (prints.length === 0) {
      return;
    }

    const validPrints = prints.filter(print => {
      const lat = Number(print.latitude);
      const lng = Number(print.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        log.error('Invalid coordinates for print:', print);
        return false;
      }
      if (lat < -90 || lat > 90) {
        log.error('Coordinates out of valid range for print:', print);
        return false;
      }
      return true;
    }).map(print => {
      let lng = Number(print.longitude);
      while (lng > 180) lng -= 360;
      while (lng < -180) lng += 360;
      return lng === print.longitude ? print : { ...print, longitude: lng };
    });

    const coordinateMap = new Map<string, SundialPrint>();
    const printsToShow: SundialPrint[] = [];

    validPrints.forEach((print) => {
      const key = `${print.latitude.toFixed(6)},${print.longitude.toFixed(6)}`;
      if (!coordinateMap.has(key)) {
        coordinateMap.set(key, print);
        printsToShow.push(print);
      }
    });

    const sortedForZOrder = [...printsToShow].sort((a, b) => {
      const aLatest = a === validPrints[0];
      const bLatest = b === validPrints[0];
      if (aLatest !== bLatest) return aLatest ? 1 : -1;
      return 0;
    });

    sortedForZOrder.forEach((print) => {
      const isOverallLatest = print === validPrints[0];
      const pinColor = isOverallLatest ? '#ff6b35' : '#22c55e';

      const customIcon = L.divIcon({
        className: 'custom-marker',
        html: `
          <div style="
            background: ${pinColor};
            color: white;
            border: 2px solid white;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            cursor: pointer;
          ">
          </div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      try {
        const marker = L.marker([print.latitude, print.longitude], {
          icon: customIcon,
          title: `Lat: ${print.latitude.toFixed(4)}, Lon: ${print.longitude.toFixed(4)}`,
          zIndexOffset: isOverallLatest ? 1000 : 0,
        }).addTo(map);

        marker.on('click', () => {
          onPinClick(print);
        });

        markersRef.current.push(marker);
      } catch (err) {
        log.error('Error creating marker for print:', print, err);
      }
    });

    const latestPrint = validPrints[0];
    if (latestPrint) {
      map.setView([latestPrint.latitude, latestPrint.longitude], 6);
    }
  }, [prints, loading, mapInitialized, onPinClick, tourActive]);

  return (
    <div className="card">
      <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <h3 className="card-title" style={{ margin: 0 }}>
          <MapIcon color="#2563eb" size={20} style={{ marginRight: 6 }} /> Recent Prints & Exports. Click to view.
        </h3>
        {!loading && !error && prints.length > 0 && !tourActive && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => void startWorldTour()}
            disabled={tourLoading}
            title="Animated globe tour of all recorded dials"
            style={{ padding: '6px 12px', fontSize: '0.85rem' }}
          >
            <Globe2 size={16} /> {tourLoading ? 'Loading Tour…' : 'World Tour'}
          </button>
        )}
      </div>
      <div className="card-content">
        {tourError && !tourActive && (
          <div style={{ color: '#dc2626', fontSize: 13, marginBottom: 8 }}>
            World Tour: {tourError}
          </div>
        )}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            Loading map data...
          </div>
        ) : error ? (
          <div style={{
            textAlign: 'center',
            padding: '2rem',
            color: '#dc2626',
            fontSize: '14px',
          }}>
            Error: {error}
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#6b7280' }}>
              Make sure the sundial_prints table exists in MySQL. See mysql_sundial_prints_table.sql
            </div>
          </div>
        ) : tourActive ? (
          <Suspense
            fallback={
              <div style={{
                height: 520,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#020617',
                color: '#94a3b8',
                borderRadius: 8,
              }}>
                Loading globe…
              </div>
            }
          >
            <WorldTourGlobe
              prints={tourPrints}
              onStopArrive={onPinClick}
              onClose={() => setTourActive(false)}
            />
          </Suspense>
        ) : (
          <>
            <div
              ref={mapRef}
              style={{
                height: '400px',
                width: '100%',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                marginBottom: totalCount > pinLimit ? '8px' : '0',
              }}
            />
            {totalCount > pinLimit && (
              <div style={{
                textAlign: 'center',
                color: '#6b7280',
                fontSize: '14px',
                marginTop: '8px',
              }}>
                Last {pinLimit} of the total of {totalCount} are shown
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PrintedDialsMap;
