import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { FiMapPin, FiCheck, FiX, FiNavigation } from '../../icons/feather';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icon for selection
const createSelectionIcon = () => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: #3B82F6;
        width: 40px;
        height: 40px;
        border-radius: 50% 50% 50% 0;
        border: 4px solid white;
        transform: rotate(-45deg);
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          color: white;
          font-size: 18px;
          transform: rotate(45deg);
          font-weight: bold;
        ">📍</div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40]
  });
};

// Map click handler component
const MapClickHandler = ({ onLocationSelect }) => {
  useMapEvents({
    click: (e) => {
      const { lat, lng } = e.latlng;
      onLocationSelect({ lat, lng });
    },
  });
  return null;
};

const OpenStreetMapPicker = ({ onConfirm, onCancel, initialLat, initialLng }) => {
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  // Set initial position if provided
  useEffect(() => {
    if (initialLat && initialLng) {
      const position = {
        lat: parseFloat(initialLat),
        lng: parseFloat(initialLng)
      };
      setSelectedPosition(position);
    }
  }, [initialLat, initialLng]);

  const handleMapClick = (position) => {
    setSelectedPosition(position);
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const pos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setSelectedPosition(pos);
        setIsGettingLocation(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('Unable to get your current location');
        setIsGettingLocation(false);
      }
    );
  };

  const handleConfirm = () => {
    if (selectedPosition) {
      onConfirm({
        latitude: selectedPosition.lat,
        longitude: selectedPosition.lng
      });
    }
  };

  const center = selectedPosition ? [selectedPosition.lat, selectedPosition.lng] : [30.0444, 31.2357]; // Cairo, Egypt default

  return (
    <div className="fixed inset-0 bg-[#131c2b] bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <FiMapPin className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">Pick Property Location</h3>
              <p className="text-blue-100 text-sm">Click on the map to select location</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-white hover:bg-white/10 p-2 rounded-lg transition-colors"
          >
            <FiX className="w-6 h-6" />
          </button>
        </div>

        {/* Map Container */}
        <div className="relative">
          <div style={{ height: '500px', width: '100%' }}>
            <MapContainer
              center={center}
              zoom={selectedPosition ? 15 : 12}
              style={{ height: '100%', width: '100%' }}
              className="rounded-none"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {selectedPosition && (
                <Marker 
                  position={[selectedPosition.lat, selectedPosition.lng]} 
                  icon={createSelectionIcon()}
                  draggable={true}
                  eventHandlers={{
                    dragend: (e) => {
                      const marker = e.target;
                      const position = marker.getLatLng();
                      setSelectedPosition({
                        lat: position.lat,
                        lng: position.lng
                      });
                    }
                  }}
                />
              )}

              {/* Interactive click handler */}
              <MapClickHandler onLocationSelect={handleMapClick} />
            </MapContainer>
          </div>

          {/* Floating Controls */}
          <div className="absolute top-4 right-4">
            <button
              onClick={handleGetCurrentLocation}
              disabled={isGettingLocation}
              className="bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg shadow-lg transition-colors flex items-center space-x-2 disabled:opacity-50"
              title="Use Current Location"
            >
              <FiNavigation className="w-4 h-4" />
              <span className="text-sm font-medium">
                {isGettingLocation ? 'Getting...' : 'My Location'}
              </span>
            </button>
          </div>
        </div>

        {/* Coordinates Display */}
        <div className="bg-slate-800 px-6 py-4 border-t border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              {selectedPosition ? (
                <div className="space-y-1">
                  <p className="text-sm text-slate-400">Selected Coordinates:</p>
                  <div className="flex items-center space-x-4">
                    <span className="text-white font-mono">
                      <span className="text-blue-400">Lat:</span> {selectedPosition.lat.toFixed(6)}
                    </span>
                    <span className="text-white font-mono">
                      <span className="text-purple-400">Lng:</span> {selectedPosition.lng.toFixed(6)}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-slate-400 italic">
                  Click on the map to select a location
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-800 px-6 py-4 border-t border-slate-700 flex items-center justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-6 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-700/50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedPosition}
            className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <FiCheck className="w-4 h-4" />
            <span>Confirm Location</span>
          </button>
        </div>

        {/* Instructions */}
        <div className="bg-blue-500/10 border-t border-blue-500/20 px-6 py-3">
          <p className="text-sm text-blue-300">
            <strong>Tip:</strong> Click anywhere on the map to place a marker, or drag the marker to fine-tune the location.
          </p>
        </div>
      </div>
    </div>
  );
};

export default OpenStreetMapPicker;
