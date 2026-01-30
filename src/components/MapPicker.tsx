import React, { useCallback, useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { MapPin, Search } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { log } from '../utils/logger';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (lat: number, lng: number, placeName?: string) => void;
  initialLat?: number;
  initialLng?: number;
}

// Component to handle map clicks
const MapClickHandler: React.FC<{ onMapClick: (lat: number, lng: number) => void }> = ({ onMapClick }) => {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

const MapPicker: React.FC<MapPickerProps> = ({ open, onClose, onSelect, initialLat, initialLng }) => {
  const [selected, setSelected] = useState<{ lat: number; lng: number } | null>(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null
  );
  const [selectedPlaceName, setSelectedPlaceName] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>(
    initialLat && initialLng ? [initialLat, initialLng] : [0, 0]
  );
  const [mapZoom, setMapZoom] = useState(selected ? 8 : 2);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Focus search box when modal opens
  useEffect(() => {
    if (open && searchInputRef.current) {
      setSearchQuery('');
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  const handleMapClick = useCallback((lat: number, lng: number) => {
    setSelected({ lat, lng });
    setSelectedPlaceName(null); // Clear place name when clicking directly on map
  }, []);

  // Simple geocoding using Nominatim (OpenStreetMap)
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`
      );
      const results = await response.json();

      if (results && results.length > 0) {
        const result = results[0];
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);

        setSelected({ lat, lng });
        setSelectedPlaceName(result.display_name);
        setMapCenter([lat, lng]);
        setMapZoom(10);
      }
    } catch (error) {
      log.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }, [handleSearch]);

  const handleConfirm = () => {
    if (selected) {
      onSelect(selected.lat, selected.lng, selectedPlaceName || undefined);
      onClose();
    }
  };

  if (!open) return null;

  const modal = (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 8,
          padding: 24,
          minWidth: 400,
          maxWidth: '90vw',
          maxHeight: '90vh',
          boxShadow: '0 2px 16px rgba(0,0,0,0.2)',
          position: 'relative',
          fontFamily: 'system-ui, Avenir, Helvetica, Arial, sans-serif',
        }}
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: '1.125rem', fontWeight: '600', color: '#1f2937' }}>
          <MapPin color="#2563eb" size={20} style={{ marginRight: 6 }} /> Location
        </h3>

        {/* Search Box */}
        <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search for a location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              outline: 'none',
            }}
          />
          <button
            onClick={handleSearch}
            disabled={isSearching || !searchQuery.trim()}
            style={{
              padding: '8px 12px',
              backgroundColor: isSearching || !searchQuery.trim() ? '#f3f4f6' : '#2563eb',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              color: isSearching || !searchQuery.trim() ? '#9ca3af' : 'white',
              cursor: isSearching || !searchQuery.trim() ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Search size={16} />
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </div>

        {/* Map */}
        <div style={{ height: '400px', width: '100%', marginBottom: 16, border: '1px solid #d1d5db', borderRadius: '6px', overflow: 'hidden' }}>
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            style={{ height: '100%', width: '100%' }}
            key={`${mapCenter[0]}-${mapCenter[1]}-${mapZoom}`} // Force re-render when center/zoom changes
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapClickHandler onMapClick={handleMapClick} />
            {selected && <Marker position={[selected.lat, selected.lng]} />}
          </MapContainer>
        </div>

        {/* Selected location info */}
        {selected && (
          <div style={{ marginBottom: 16, padding: '8px 12px', backgroundColor: '#f9fafb', borderRadius: '6px', fontSize: '14px' }}>
            <strong>Selected:</strong> {selectedPlaceName || `${selected.lat.toFixed(4)}, ${selected.lng.toFixed(4)}`}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            onClick={onClose}
            className="form-input"
            style={{
              padding: '8px 16px',
              backgroundColor: '#f3f4f6',
              border: '1px solid #d1d5db',
              color: '#374151',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="form-input"
            style={{
              padding: '8px 16px',
              backgroundColor: selected ? '#2563eb' : '#f3f4f6',
              border: '1px solid #d1d5db',
              color: selected ? 'white' : '#9ca3af',
              cursor: selected ? 'pointer' : 'not-allowed'
            }}
            disabled={!selected}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modal, document.body);
};

export default MapPicker; 