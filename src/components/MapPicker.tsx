import React, { useCallback, useState } from 'react';
import ReactDOM from 'react-dom';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';

const containerStyle = {
  width: '100%',
  height: '400px',
};

const defaultCenter = {
  lat: 0,
  lng: 0,
};

interface MapPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (lat: number, lng: number) => void;
  initialLat?: number;
  initialLng?: number;
}

const MapPicker: React.FC<MapPickerProps> = ({ open, onClose, onSelect, initialLat, initialLng }) => {
  const [selected, setSelected] = useState<{ lat: number; lng: number } | null>(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null
  );

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string,
  });

  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      setSelected({
        lat: e.latLng.lat(),
        lng: e.latLng.lng(),
      });
    }
  }, []);

  const handleConfirm = () => {
    if (selected) {
      onSelect(selected.lat, selected.lng);
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
          minWidth: 350,
          boxShadow: '0 2px 16px rgba(0,0,0,0.2)',
          position: 'relative',
        }}
        onClick={e => e.stopPropagation()}
      >
        <h2 style={{ marginTop: 0 }}>Pick a Location</h2>
        {loadError && <div>Error loading map</div>}
        {!isLoaded && <div>Loading map...</div>}
        {isLoaded && (
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={selected || defaultCenter}
            zoom={selected ? 8 : 2}
            onClick={handleMapClick}
          >
            {selected && <Marker position={selected} />}
          </GoogleMap>
        )}
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ padding: '6px 16px' }}>Cancel</button>
          <button
            onClick={handleConfirm}
            style={{ padding: '6px 16px' }}
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