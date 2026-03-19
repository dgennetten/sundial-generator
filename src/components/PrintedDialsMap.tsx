import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin } from 'lucide-react';
import type { SundialPrint, SundialPrintMapProps } from '../types/sundial';
import { fetchSundialPrints } from '../utils/sundialPrintUtils';
import { log } from '../utils/logger';

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
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const [prints, setPrints] = useState<SundialPrint[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [mapInitialized, setMapInitialized] = useState<boolean>(false);

  // Initialize map - only when not loading and no error (map div is rendered)
  useEffect(() => {
    if (loading || error || !mapRef.current || mapInstanceRef.current) {
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
      worldCopyJump: true, // Repeat markers across all world copies for infinite scroll
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
  }, [loading, error]);

  // Fetch data from Supabase
  useEffect(() => {
    const loadPrints = async () => {
      setLoading(true);
      setError(null);
      try {
        const { prints: fetchedPrints, totalCount: fetchedTotal } = await fetchSundialPrints();
        setPrints(fetchedPrints);
        setTotalCount(fetchedTotal);
      } catch (error) {
        log.error('Error loading sundial prints:', error);
        setError(error instanceof Error ? error.message : 'Failed to load sundial prints');
      } finally {
        setLoading(false);
      }
    };

    loadPrints();
  }, [refreshTrigger]);

  // Update markers when prints change
  useEffect(() => {
    if (!mapInitialized || !mapInstanceRef.current || loading) {
      return;
    }

    const map = mapInstanceRef.current;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    if (prints.length === 0) {
      return;
    }

    // Filter out prints with invalid coordinates first
    const validPrints = prints.filter(print => {
      if (typeof print.latitude !== 'number' || typeof print.longitude !== 'number' ||
          isNaN(print.latitude) || isNaN(print.longitude)) {
        log.error('Invalid coordinates for print:', print);
        return false;
      }
      // Validate coordinate ranges
      if (print.latitude < -90 || print.latitude > 90 || 
          print.longitude < -180 || print.longitude > 180) {
        log.error('Coordinates out of valid range for print:', print);
        return false;
      }
      return true;
    });

    // Group prints by rounded coordinates to identify duplicates
    // Only show the latest print for each location
    const coordinateMap = new Map<string, SundialPrint>();
    const printsToShow: SundialPrint[] = [];
    
    validPrints.forEach((print) => {
      const key = `${print.latitude.toFixed(6)},${print.longitude.toFixed(6)}`;
      
      // If we haven't seen this location yet, or this print is newer (earlier in the sorted list),
      // add it to the map. Since prints are sorted by newest first (index 0 is latest),
      // we only keep the first one we encounter for each location.
      if (!coordinateMap.has(key)) {
        coordinateMap.set(key, print);
        printsToShow.push(print);
      }
    });

    // Determine pin colors (now all shown pins are the latest for their location)
    printsToShow.forEach((print) => {
      // Since we're only showing the latest for each location, all pins are "latest" for their location
      // The very first print in the overall list is still the overall latest
      const isOverallLatest = print === validPrints[0];
      const pinColor = isOverallLatest ? '#ff6b35' : '#22c55e'; // Red-orange for overall latest, green for others

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
        }).addTo(map);

        marker.on('click', () => {
          onPinClick(print);
        });

        markersRef.current.push(marker);
      } catch (error) {
        log.error('Error creating marker for print:', print, error);
      }
    });

    // Fit map to show all markers
    if (markersRef.current.length > 0) {
      try {
        const group = new L.FeatureGroup(markersRef.current);
        const bounds = group.getBounds();
        
        if (bounds.isValid()) {
          // Check if longitude span is greater than 180 degrees (crosses date line)
          const lonSpan = bounds.getEast() - bounds.getWest();
          if (lonSpan > 180) {
            // When span > 180°, Leaflet fitBounds can show wrong side
            // Use world bounds instead (zoom level 2 shows entire world)
            map.setView([0, 0], 2);
          } else {
            map.fitBounds(bounds.pad(0.1));
          }
        } else {
          log.warn('Invalid bounds calculated, using default view');
          // If bounds are invalid (e.g., all markers at same point), center on first marker
          if (markersRef.current.length > 0) {
            const firstMarker = markersRef.current[0];
            map.setView([firstMarker.getLatLng().lat, firstMarker.getLatLng().lng], 2);
          }
        }
      } catch (error) {
        log.error('Error fitting map bounds:', error);
        // Fallback: center on first marker
        if (markersRef.current.length > 0) {
          const firstMarker = markersRef.current[0];
          map.setView([firstMarker.getLatLng().lat, firstMarker.getLatLng().lng], 2);
        }
      }
    }
  }, [prints, loading, mapInitialized, onPinClick]);

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">
          <MapPin color="#2563eb" size={20} style={{ marginRight: 6 }} /> Past 30 Days of Prints & Exports
        </h3>
      </div>
      <div className="card-content">
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
              Make sure the sundial_prints table exists in Supabase. See supabase_sundial_prints_table.sql
            </div>
          </div>
        ) : (
          <>
            <div
              ref={mapRef}
              style={{
                height: '400px',
                width: '100%',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                marginBottom: totalCount > 200 ? '8px' : '0',
              }}
            />
            {totalCount > 200 && (
              <div style={{
                textAlign: 'center',
                color: '#6b7280',
                fontSize: '14px',
                marginTop: '8px',
              }}>
                Last 200 of the total of {totalCount} are shown
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PrintedDialsMap;
