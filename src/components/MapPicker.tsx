import React, { useCallback, useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { GoogleMap, useJsApiLoader, Marker, StandaloneSearchBox } from '@react-google-maps/api';
import { MapPin } from 'lucide-react';

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
  onSelect: (lat: number, lng: number, placeName?: string) => void;
  initialLat?: number;
  initialLng?: number;
}

const MapPicker: React.FC<MapPickerProps> = ({ open, onClose, onSelect, initialLat, initialLng }) => {
  const [selected, setSelected] = useState<{ lat: number; lng: number } | null>(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null
  );
  const [selectedPlaceName, setSelectedPlaceName] = useState<string | null>(null);
  const searchBoxRef = useRef<google.maps.places.SearchBox | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Focus search box when modal opens
  useEffect(() => {
    if (open && searchInputRef.current) {
      // Clear the search box
      searchInputRef.current.value = '';
      // Focus the search box
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string,
    libraries: ['places'],
  });

  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      setSelected({
        lat: e.latLng.lat(),
        lng: e.latLng.lng(),
      });
    }
  }, []);

  const onSearchBoxLoad = useCallback((ref: google.maps.places.SearchBox) => {
    searchBoxRef.current = ref;
  }, []);

  const onPlacesChanged = useCallback(() => {
    if (searchBoxRef.current) {
      const places = searchBoxRef.current.getPlaces();
      if (places && places.length > 0) {
        const place = places[0];
        if (place.geometry && place.geometry.location) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          setSelected({ lat, lng });
          // Capture the place name
          setSelectedPlaceName(place.formatted_address || place.name || null);
        }
      }
    }
  }, []);

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
        }}
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: '1.125rem', fontWeight: '600', color: '#1f2937' }}>
          <MapPin color="#2563eb" size={20} style={{marginRight: 6}} /> Location
        </h3>
        
                 {/* Search Box */}
         {isLoaded && (
           <div style={{ marginBottom: 16 }}>
             <StandaloneSearchBox
               onLoad={onSearchBoxLoad}
               onPlacesChanged={onPlacesChanged}
             >
               <input
                 ref={searchInputRef}
                 type="text"
                 placeholder="Search for a location..."
                 style={{
                   width: 'calc(100% - 24px)',
                   padding: '8px 12px',
                   border: '1px solid #d1d5db',
                   borderRadius: '6px',
                   fontSize: '14px',
                   outline: 'none',
                 }}
               />
             </StandaloneSearchBox>
           </div>
         )}
        
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