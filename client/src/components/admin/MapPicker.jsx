import React, { useState, useCallback, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { FiMapPin, FiCheck, FiX, FiNavigation } from '../../icons/feather';

const mapContainerStyle = {
  width: '100%',
  height: '500px',
};

const defaultCenter = {
  lat: 30.0444, // Cairo, Egypt
  lng: 31.2357
};

const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: true,
  streetViewControl: true,
  fullscreenControl: true,
  clickableIcons: false,
};

const MapPicker = ({ onConfirm, onCancel, initialLat, initialLng }) => {
  const [map, setMap] = useState(null);
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [markerPosition, setMarkerPosition] = useState(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '',
  });

  // Set initial position if provided
  useEffect(() => {
    if (initialLat && initialLng) {
      const position = {
        lat: parseFloat(initialLat),
        lng: parseFloat(initialLng)
      };
      setSelectedPosition(position);
      setMarkerPosition(position);
    }
  }, [initialLat, initialLng]);

  const onLoad = useCallback((map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const handleMapClick = useCallback((event) => {
    const lat = event.latLng.lat();
    const lng = event.latLng.lng();
    const position = { lat, lng };
    
    setSelectedPosition(position);
    setMarkerPosition(position);
  }, []);

  const handleMarkerDragEnd = useCallback((event) => {
    const lat = event.latLng.lat();
    const lng = event.latLng.lng();
    const position = { lat, lng };
    
    setSelectedPosition(position);
    setMarkerPosition(position);
  }, []);

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
        setMarkerPosition(pos);
        if (map) {
          map.panTo(pos);
          map.setZoom(15);
        }
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

  if (!isLoaded) {
    return (
      <div className="fixed inset-0 bg-[#131c2b] bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-slate-900 rounded-xl p-8 max-w-4xl w-full mx-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <p className="ml-4 text-white">Loading map...</p>
          </div>
        </div>
      </div>
    );
  }

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
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={markerPosition || defaultCenter}
            zoom={markerPosition ? 15 : 12}
            onLoad={onLoad}
            onUnmount={onUnmount}
            onClick={handleMapClick}
            options={mapOptions}
          >
            {markerPosition && (
              <Marker
                position={markerPosition}
                draggable={true}
                onDragEnd={handleMarkerDragEnd}
                icon={{
                  url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                    <svg width="40" height="50" viewBox="0 0 40 50" xmlns="http://www.w3.org/2000/svg">
                      <path d="M20 0C8.954 0 0 8.954 0 20c0 15 20 30 20 30s20-15 20-30c0-11.046-8.954-20-20-20z" fill="#3B82F6"/>
                      <circle cx="20" cy="20" r="8" fill="white"/>
                      <circle cx="20" cy="20" r="4" fill="#3B82F6"/>
                    </svg>
                  `),
                  scaledSize: new window.google.maps.Size(40, 50),
                  anchor: new window.google.maps.Point(20, 50)
                }}
              />
            )}
          </GoogleMap>

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

export default MapPicker;

