import React, { useState, useCallback, useMemo } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { FiMapPin, FiNavigation, FiExternalLink, FiRefreshCw } from '../../icons/feather';
import { useTranslation } from 'react-i18next';

const mapContainerStyle = {
  width: '100%',
  height: '400px',
  borderRadius: '12px',
  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
};

const defaultCenter = {
  lat: 30.0444, // Cairo, Egypt
  lng: 31.2357
};

const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: true,
  scaleControl: true,
  streetViewControl: true,
  rotateControl: true,
  fullscreenControl: true,
  styles: [
    {
      featureType: 'poi',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }]
    },
    {
      featureType: 'transit',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }]
    }
  ]
};

const GoogleMapComponent = ({
  latitude,
  longitude,
  title,
  address,
  price,
  currency = 'EGP',
  image,
  className = ''
}) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';
  const numberFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        maximumFractionDigits: 0
      }),
    [locale]
  );

  const [map, setMap] = useState(null);
  const [isInfoWindowOpen, setIsInfoWindowOpen] = useState(false);
  const [mapError, setMapError] = useState(false);

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '',
    libraries: ['places']
  });

  const center = useMemo(() => {
    if (latitude && longitude) {
      return { lat: parseFloat(latitude), lng: parseFloat(longitude) };
    }
    return defaultCenter;
  }, [latitude, longitude]);

  const onLoad = useCallback((map) => {
    setMap(map);
    setMapError(false);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const handleMarkerClick = () => {
    setIsInfoWindowOpen(true);
  };

  const handleInfoWindowClose = () => {
    setIsInfoWindowOpen(false);
  };

  const handleGetDirections = () => {
    const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    window.open(directionsUrl, '_blank');
  };

  const handleRetry = () => {
    setMapError(false);
    window.location.reload();
  };

  // Loading skeleton
  if (!isLoaded) {
    return (
      <div className={`relative ${className}`} dir={i18n.dir()}>
        <div className="bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl overflow-hidden" style={mapContainerStyle}>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-slate-600 font-medium">{t('map.loading')}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (loadError || mapError) {
    return (
      <div className={`relative ${className}`} dir={i18n.dir()}>
        <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-xl overflow-hidden" style={mapContainerStyle}>
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
        <div className="bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-300 rounded-xl overflow-hidden" style={mapContainerStyle}>
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
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <FiMapPin className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">{t('map.header.title')}</h3>
                <p className="text-primary-100 text-sm">{t('map.header.subtitle')}</p>
              </div>
            </div>
            <div className={isRTL ? 'text-left' : 'text-right'}>
              <p className="text-white font-semibold">
                {price ? `${numberFormatter.format(price)} ${currency}` : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Map Container */}
        <div className="relative">
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={center}
            zoom={15}
            onLoad={onLoad}
            onUnmount={onUnmount}
            options={mapOptions}
            onError={() => setMapError(true)}
          >
            <Marker
              position={center}
              onClick={handleMarkerClick}
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

            {isInfoWindowOpen && (
              <InfoWindow
                position={center}
                onCloseClick={handleInfoWindowClose}
                options={{
                  pixelOffset: new window.google.maps.Size(0, -10)
                }}
              >
                <div className="p-4 max-w-xs" dir={i18n.dir()}>
                  <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                    {image && (
                      <img
                        src={image}
                        alt={title}
                        className="w-16 h-16 object-cover rounded-lg"
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
                          {price ? `${numberFormatter.format(price)} ${currency}` : ''}
                        </span>
                        <button
                          onClick={handleGetDirections}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-primary-600 text-white text-xs rounded-lg hover:bg-primary-700 transition-colors"
                        >
                          <FiNavigation className="w-3 h-3" />
                          {t('map.actions.directions')}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </InfoWindow>
            )}
          </GoogleMap>

        {/* Map Overlay Controls */}
        <div className={`absolute top-4 ${isRTL ? 'left-4' : 'right-4'} flex flex-col gap-2`}>
            <button
              onClick={handleGetDirections}
              className="bg-white hover:bg-gray-50 text-gray-700 p-2 rounded-lg shadow-lg transition-colors"
            title={t('map.tooltips.directions')}
            >
              <FiNavigation className="w-4 h-4" />
            </button>
            <a
              href={`https://www.google.com/maps?q=${latitude},${longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white hover:bg-gray-50 text-gray-700 p-2 rounded-lg shadow-lg transition-colors"
            title={t('map.tooltips.openInGoogle')}
            >
              <FiExternalLink className="w-4 h-4" />
            </a>
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
            {t('map.footer.poweredGoogle')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoogleMapComponent;
