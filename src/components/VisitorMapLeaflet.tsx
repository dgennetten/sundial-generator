import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { VisitorMapProps } from '../types';

// Fix for default markers in Leaflet with React
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const VisitorMapLeaflet: React.FC<VisitorMapProps> = ({
  visitors,
  selectedCountry,
  onCountrySelect,
  height = '300px'
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Initialize the map
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
      attributionControl: true
    });

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
      minZoom: 2
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current || !visitors.length) return;

    const map = mapInstanceRef.current;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Create custom markers for each visitor
    visitors.forEach((visitor) => {
      const isSelected = selectedCountry === visitor.country;
      
      // Create custom icon with visit count
      const customIcon = L.divIcon({
        className: 'custom-marker',
        html: `
          <div style="
            background: ${isSelected ? '#3b82f6' : '#ef4444'};
            color: white;
            border: 2px solid white;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 12px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            cursor: pointer;
          ">
            ${visitor.visitCount}
          </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });

      const marker = L.marker([visitor.lat, visitor.lon], {
        icon: customIcon,
        title: `${visitor.city}, ${visitor.region}, ${visitor.country} - ${visitor.visitCount} visits`
      }).addTo(map);

      // Add click handler
      marker.on('click', () => {
        onCountrySelect(isSelected ? null : visitor.country);
      });

      // Add popup with visitor info
      const popupContent = `
        <div style="min-width: 200px;">
          <h4 style="margin: 0 0 8px 0; color: #1f2937;">${visitor.city}, ${visitor.region}</h4>
          <p style="margin: 4px 0; color: #6b7280;">
            <strong>Country:</strong> ${visitor.country}
          </p>
          <p style="margin: 4px 0; color: #6b7280;">
            <strong>Visits:</strong> ${visitor.visitCount}
          </p>
          <p style="margin: 4px 0; color: #6b7280;">
            <strong>First Visit:</strong> ${new Date(visitor.firstVisit).toLocaleDateString()}
          </p>
          <p style="margin: 4px 0; color: #6b7280;">
            <strong>Last Visit:</strong> ${new Date(visitor.lastVisit).toLocaleDateString()}
          </p>
        </div>
      `;
      
      marker.bindPopup(popupContent);

      markersRef.current.push(marker);
    });

    // Fit map to show all markers if there are multiple visitors
    if (visitors.length > 1) {
      const group = new L.FeatureGroup(markersRef.current);
      map.fitBounds(group.getBounds().pad(0.1));
    } else if (visitors.length === 1) {
      map.setView([visitors[0].lat, visitors[0].lon], 6);
    }

  }, [visitors, selectedCountry, onCountrySelect]);

  return (
    <div 
      ref={mapRef} 
      style={{ 
        height, 
        width: '100%', 
        borderRadius: '8px',
        border: '1px solid #e2e8f0'
      }}
    />
  );
};

export default VisitorMapLeaflet; 