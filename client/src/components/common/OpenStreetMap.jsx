import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import { FiMapPin, FiNavigation, FiExternalLink, FiRefreshCw } from '../../icons/feather';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTranslation } from 'react-i18next';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icon
const createCustomIcon = (color = '#3B82F6') => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 30px;
        height: 30px;
        border-radius: 50% 50% 50% 0;
        border: 3px solid white;
        transform: rotate(-45deg);
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          color: white;
          font-size: 16px;
          transform: rotate(45deg);
          font-weight: bold;
        ">📍</div>
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30]
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

const OpenStreetMapComponent = ({
  latitude,
  longitude,
  title,
  address,
  price,
  currency = 'EGP',
  image,
  className = '',
  isInteractive = false,
  onLocationSelect
}) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';

  const [mapError, setMapError] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const center = latitude && longitude ? [parseFloat(latitude), parseFloat(longitude)] : [30.0444, 31.2357]; // Cairo, Egypt default

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert(t('map.errors.geolocationUnsupported'));
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const pos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        if (onLocationSelect) {
          onLocationSelect(pos);
        }
        setIsGettingLocation(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        alert(t('map.errors.geolocationFailed'));
        setIsGettingLocation(false);
      }
    );
  };

  const handleDirections = () => {
    const directionsUrl = `https://www.openstreetmap.org/directions?to=${latitude},${longitude}`;
    window.open(directionsUrl, '_blank');
  };

  const handleRetry = () => {
    setMapError(false);
    window.location.reload();
  };

  // Error state
  if (mapError) {
    return (
      <div className={`relative ${className}`} dir={i18n.dir()}>
        <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-xl overflow-hidden" style={{ height: '400px' }}>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiMapPin className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-red-800 mb-2">{t('map.errors.unavailable')}</h3>
              <p className="text-red-600 mb-4">{t('map.errors.unavailableDescription')}</p>
              <button
                onClick={handleRetry}
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <FiRefreshCw className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                {t('map.actions.retry')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No coordinates
  if (!latitude || !longitude) {
    return (
      <div className={`relative ${className}`} dir={i18n.dir()}>
        <div className="bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-300 rounded-xl overflow-hidden" style={{ height: '400px' }}>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiMapPin className="w-8 h-8 text-slate-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-700 mb-2">{t('map.errors.noCoordinates.title')}</h3>
              <p className="text-slate-600">{t('map.errors.noCoordinates.description')}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} dir={i18n.dir()}>
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Map Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4">
          <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <FiMapPin className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">{t('map.header.title')}</h3>
                <p className="text-primary-100 text-sm">{t('map.header.subtitle')}</p>
              </div>
            </div>
            <div className={isRTL ? 'text-left' : 'text-right'}>
              <p className="text-white font-semibold">
                {price ? `${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(price)} ${currency}` : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Map Container */}
        <div className="relative">
          <div style={{ height: '400px', width: '100%' }}>
            <MapContainer
              center={center}
              zoom={15}
              style={{ height: '100%', width: '100%' }}
              className="rounded-none"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              <Marker position={center} icon={createCustomIcon()}>
                <Popup>
                  <div className="p-2 max-w-xs" dir={i18n.dir()}>
                    <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                      {image && (
                        <img
                          src={image}
                          alt={title}
                          className="w-12 h-12 object-cover rounded-lg"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2">
                          {title}
                        </h4>
                        <p className="text-gray-600 text-xs mb-2 line-clamp-2">
                          {address}
                        </p>
                        <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <span className="text-primary-600 font-semibold text-sm">
                            {price ? `${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(price)} ${currency}` : ''}
                          </span>
                          <button
                            onClick={handleDirections}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-primary-600 text-white text-xs rounded hover:bg-primary-700 transition-colors"
                          >
                            <FiNavigation className="w-3 h-3" />
                            {t('map.actions.directions')}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>

              {/* Interactive click handler for map picker */}
              {isInteractive && onLocationSelect && (
                <MapClickHandler onLocationSelect={onLocationSelect} />
              )}
            </MapContainer>
          </div>

          {/* Map Overlay Controls */}
        <div className={`absolute top-4 ${isRTL ? 'left-4' : 'right-4'} flex flex-col gap-2`}>
            {isInteractive && (
              <button
                onClick={handleGetCurrentLocation}
                disabled={isGettingLocation}
              className="bg-white hover:bg-gray-50 text-gray-700 p-2 rounded-lg shadow-lg transition-colors flex items-center gap-2 disabled:opacity-50"
              title={t('map.tooltips.useCurrentLocation')}
              >
                <FiNavigation className="w-4 h-4" />
                <span className="text-sm font-medium">
                {isGettingLocation ? t('map.actions.gettingLocation') : t('map.actions.myLocation')}
                </span>
              </button>
            )}
            <button
              onClick={handleDirections}
              className="bg-white hover:bg-gray-50 text-gray-700 p-2 rounded-lg shadow-lg transition-colors"
            title={t('map.tooltips.openInOSM')}
            >
              <FiExternalLink className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Map Footer */}
        <div className="bg-gray-50 px-6 py-3 border-t">
        <div className={`flex items-center justify-between text-sm text-gray-600 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <FiMapPin className="w-4 h-4" />
              <span>{address}</span>
            </div>
            <div className="text-xs">
            {t('map.footer.poweredOSM')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OpenStreetMapComponent;
