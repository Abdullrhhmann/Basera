import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { generateSEOTags, generateBreadcrumbSchema, getCanonicalUrl } from '../utils/seo';
import MultipleStructuredData from '../components/seo/StructuredData';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { propertiesAPI, developersAPI, citiesAPI, usersAPI, governoratesAPI, areasAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { showSuccess, showError } from '../utils/sonner';
import { FiSearch, FiMapPin, FiMaximize, FiHeart, FiSettings, FiLayers } from '../icons/feather';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '../components/ui/shadcn';
import PageLayout from '../components/layout/PageLayout';
import RangeSlider from '../components/RangeSlider';

const PROPERTY_TYPE_OPTIONS = [
  { labelKey: 'properties.filterOptions.propertyTypes.apartment', value: 'apartment' },
  { labelKey: 'properties.filterOptions.propertyTypes.villa', value: 'villa' },
  { labelKey: 'properties.filterOptions.propertyTypes.twinVilla', value: 'twin-villa' },
  { labelKey: 'properties.filterOptions.propertyTypes.duplex', value: 'duplex' },
  { labelKey: 'properties.filterOptions.propertyTypes.land', value: 'land' },
  { labelKey: 'properties.filterOptions.propertyTypes.commercial', value: 'commercial' },
];

const FURNISHING_OPTIONS = [
  { labelKey: 'properties.filterOptions.furnishing.unfurnished', value: 'unfurnished' },
  { labelKey: 'properties.filterOptions.furnishing.semiFurnished', value: 'semi-furnished' },
  { labelKey: 'properties.filterOptions.furnishing.furnished', value: 'furnished' },
];

const AMENITY_OPTIONS = [
  { labelKey: 'properties.filterOptions.amenities.privatePool', value: 'Private Pool' },
  { labelKey: 'properties.filterOptions.amenities.clubhouse', value: 'Clubhouse access' },
  { labelKey: 'properties.filterOptions.amenities.undergroundParking', value: 'Underground parking' },
  { labelKey: 'properties.filterOptions.amenities.security24_7', value: '24/7 security' },
  { labelKey: 'properties.filterOptions.amenities.smartHome', value: 'Smart Home' },
  { labelKey: 'properties.filterOptions.amenities.beachAccess', value: 'Beach access' },
  { labelKey: 'properties.filterOptions.amenities.gymMembership', value: 'Gym membership' },
  { labelKey: 'properties.filterOptions.amenities.valetParking', value: 'Valet parking' },
  { labelKey: 'properties.filterOptions.amenities.conferenceCenter', value: 'Conference center' },
  { labelKey: 'properties.filterOptions.amenities.golfCourse', value: 'Golf course access' },
  { labelKey: 'properties.filterOptions.amenities.communityPools', value: 'Community pools' },
  { labelKey: 'properties.filterOptions.amenities.marinaAccess', value: 'Marina access' },
  { labelKey: 'properties.filterOptions.amenities.kidsPlayArea', value: 'Kids play area' },
  { labelKey: 'properties.filterOptions.amenities.medicalClinic', value: 'Medical clinic' },
];

const getEntityId = (entity) => {
  if (!entity) return '';
  if (typeof entity === 'string') return entity;
  if (typeof entity === 'object') {
    return entity._id || entity.id || entity.slug || entity.value || '';
  }
  return '';
};

const PRICE_RANGE = {
  min: 1000000,
  max: 500000000,
  step: 250000,
};

const AREA_RANGE = {
  min: 50,
  max: 50000,
  step: 10,
};

const Properties = () => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';
  const isRTL = i18n.dir() === 'rtl';
  const numberFormatter = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const formatValue = useCallback(
    (value, fallback) => numberFormatter.format(value !== '' && value != null ? Number(value) : fallback),
    [numberFormatter]
  );
  const inlineMarginClass = isRTL ? 'mr-3' : 'ml-3';
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    search: '',
    type: '',
    status: '',
    minPrice: '',
    maxPrice: '',
    city: '',
    governorate: '', // New hierarchical filter
    city_ref: '',    // New hierarchical filter
    area_ref: '',    // New hierarchical filter
    developer: '',
    compound: '',
    bedrooms: '',
    bathrooms: '',
    minArea: '',
    maxArea: '',
    furnished: '',
    amenities: [],
    featured: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [showAllDevelopers, setShowAllDevelopers] = useState(false);
  const [showAllDevelopersMobile, setShowAllDevelopersMobile] = useState(false);

  // Fetch developers for filter dropdown
  const { data: developersData } = useQuery(
    'developers-for-filter',
    async () => {
      const response = await developersAPI.getDevelopers({ limit: 100, sortBy: 'name', sortOrder: 'asc' });
      return response.data;
    },
    {
      staleTime: 10 * 60 * 1000, // 10 minutes
    }
  );

  // Fetch governorates for filter dropdown
  const { data: governoratesData } = useQuery(
    'governorates-for-filter',
    async () => {
      const response = await governoratesAPI.getGovernorates({ limit: 100, sortBy: 'name', sortOrder: 'asc' });
      return response.data;
    },
    {
      staleTime: 10 * 60 * 1000,
    }
  );

  // Fetch cities for filter dropdown (hierarchical)
  const { data: citiesByGovernorateData } = useQuery(
    ['cities-by-governorate-filter', filters.governorate],
    async () => {
      if (!filters.governorate) return { cities: [] };
      const response = await citiesAPI.getCitiesByGovernorate(filters.governorate);
      return response.data;
    },
    {
      enabled: !!filters.governorate,
      staleTime: 10 * 60 * 1000,
    }
  );

  // Fetch areas for filter dropdown (hierarchical)
  const { data: areasByCityData } = useQuery(
    ['areas-by-city-filter', filters.city_ref],
    async () => {
      if (!filters.city_ref) return { areas: [] };
      const response = await areasAPI.getAreasByCity(filters.city_ref);
      return response.data;
    },
    {
      enabled: !!filters.city_ref,
      staleTime: 10 * 60 * 1000,
    }
  );

  // Fetch cities for filter dropdown (legacy/all cities)
  const { data: citiesData } = useQuery(
    'cities-for-filter',
    async () => {
      const response = await citiesAPI.getCities({ limit: 100, sortBy: 'name', sortOrder: 'asc' });
      return response.data;
    },
    {
      staleTime: 10 * 60 * 1000, // 10 minutes
    }
  );

  // Fetch user favorites
  const { data: favoritesData } = useQuery(
    'user-favorites',
    async () => {
      const response = await usersAPI.getFavorites();
      return response.data;
    },
    {
      enabled: isAuthenticated,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  const favoriteIds =
    favoritesData?.favorites
      ?.map((fav) => getEntityId(fav?.property || fav))
      ?.filter(Boolean) || [];

  // Add to favorites mutation
  const addFavoriteMutation = useMutation(
    (propertyId) => usersAPI.addFavorite(propertyId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('user-favorites');
        showSuccess(t('properties.toast.added'));
      },
      onError: (error) => {
        showError(error.response?.data?.message || t('properties.toast.addFailed'));
      }
    }
  );

  // Remove from favorites mutation
  const removeFavoriteMutation = useMutation(
    (propertyId) => usersAPI.removeFavorite(propertyId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('user-favorites');
        showSuccess(t('properties.toast.removed'));
      },
      onError: (error) => {
        showError(error.response?.data?.message || t('properties.toast.removeFailed'));
      }
    }
  );

  const toggleFavorite = (propertyId, isFavorited) => {
    if (!isAuthenticated) {
      showError(t('properties.toast.loginRequired'));
      return;
    }

    if (isFavorited) {
      removeFavoriteMutation.mutate(propertyId);
    } else {
      addFavoriteMutation.mutate(propertyId);
    }
  };

  // Initialize filters from URL params
  useEffect(() => {
    const developerParam = searchParams.get('developer');
    const cityParam = searchParams.get('city');
    const typeParam = searchParams.get('type');
    const statusParam = searchParams.get('status');
    const minPriceParam = searchParams.get('minPrice');
    const maxPriceParam = searchParams.get('maxPrice');
    const compoundParam = searchParams.get('compound');
    
    let hasParams = false;
    const newFilters = {
      search: '',
      type: '',
      status: '',
      minPrice: '',
      maxPrice: '',
      city: '',
      governorate: '',
      city_ref: '',
      area_ref: '',
      developer: '',
      compound: '',
      bedrooms: '',
      bathrooms: '',
      minArea: '',
      maxArea: '',
      furnished: '',
      amenities: [],
      featured: '',
      sortBy: 'createdAt',
      sortOrder: 'desc'
    };
    
    if (developerParam) {
      newFilters.developer = developerParam;
      hasParams = true;
    }
    
    if (cityParam) {
      newFilters.city = decodeURIComponent(cityParam);
      hasParams = true;
    }
    
    if (typeParam) {
      newFilters.type = decodeURIComponent(typeParam);
      hasParams = true;
    }
    
    if (statusParam) {
      newFilters.status = decodeURIComponent(statusParam);
      hasParams = true;
    }
    
    if (minPriceParam) {
      newFilters.minPrice = decodeURIComponent(minPriceParam);
      hasParams = true;
    }
    
    if (maxPriceParam) {
      newFilters.maxPrice = decodeURIComponent(maxPriceParam);
      hasParams = true;
    }
    
    if (compoundParam) {
      newFilters.compound = decodeURIComponent(compoundParam);
      hasParams = true;
    }
    
    if (hasParams) {
      setFilters(newFilters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const { data: rawData, isLoading, error } = useQuery(
    ['properties', filters, currentPage],
    async () => {
      try {
        const response = await propertiesAPI.getProperties({ ...filters, page: currentPage, _t: Date.now() });
        return response.data;
      } catch (err) {
        console.error('API Error:', err); // Debug log
        console.error('API Error details:', {
          message: err.message,
          response: err.response?.data,
          status: err.response?.status
        }); // Detailed error log
        throw err;
      }
    },
    {
      keepPreviousData: true,
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
      refetchOnWindowFocus: false,
      onError: (err) => console.error('Query Error:', err), // Debug log
    }
  );

  // Client-side safety filter: ALWAYS exclude sold/rented properties
  const data = rawData ? {
    ...rawData,
    properties: rawData.properties?.filter(property => 
      property.status !== 'sold' && property.status !== 'rented'
    ) || []
  } : null;

  // Fetch all properties for histogram (without price/area filters)
  // This gives us the actual distribution of properties
  const histogramFilters = useMemo(() => {
    // eslint-disable-next-line no-unused-vars
    const { minPrice, maxPrice, minArea, maxArea, ...rest } = filters;
    return rest;
  }, [filters]);

  const { data: histogramData } = useQuery(
    ['properties-histogram', histogramFilters],
    async () => {
      try {
        // Fetch all properties (with high limit) without price/area filters
        const response = await propertiesAPI.getProperties({ 
          ...histogramFilters, 
          page: 1, 
          limit: 1000, // High limit to get most properties for accurate histogram
          _t: Date.now() 
        });
        return response.data?.properties || [];
      } catch (err) {
        console.error('Histogram data fetch error:', err);
        return [];
      }
    },
    {
      staleTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
    }
  );

  // Filter out sold/rented from histogram data
  const validHistogramData = useMemo(() => {
    return (histogramData || []).filter(property => 
      property.status !== 'sold' && property.status !== 'rented'
    );
  }, [histogramData]);

  const handleFilterChange = (key, value) => {
    // Handle cascading location resets
    if (key === 'governorate') {
      // When governorate changes, reset city and area
      setFilters(prev => ({ ...prev, governorate: value, city_ref: '', area_ref: '' }));
    } else if (key === 'city_ref') {
      // When city changes, reset area
      setFilters(prev => ({ ...prev, city_ref: value, area_ref: '' }));
    } else {
      setFilters(prev => ({ ...prev, [key]: value }));
    }
    
    setCurrentPage(1);

    // Track search when search input changes (debounced)
    if (key === 'search' && value.trim()) {
      // Clear existing timeout
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }

      // Set new timeout to track search after user stops typing
      const timeout = setTimeout(() => {
        trackSearch(value.trim());
      }, 1500); // Wait 1.5 seconds after user stops typing

      setSearchTimeout(timeout);
    }
  };

  const trackSearch = async (searchQuery) => {
    if (!searchQuery) return;

    try {
      // Track the search in the backend using the API utility
      const searchAPI = (await import('../utils/api')).searchAPI;
      await searchAPI.trackSearch({
        query: searchQuery,
        resultsCount: data?.properties?.length || 0,
        filters: {
          type: filters.type,
          status: filters.status,
          city: filters.city,
          minPrice: filters.minPrice ? parseFloat(filters.minPrice) : null,
          maxPrice: filters.maxPrice ? parseFloat(filters.maxPrice) : null
        }
      });
    } catch (error) {
      console.error('Error tracking search:', error);
    }
  };

  const handleIntentionalSearch = () => {
    // Track search when user explicitly searches (e.g., presses Enter or clicks search)
    if (filters.search.trim()) {
      trackSearch(filters.search.trim());
    }
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      type: '',
      status: '',
      minPrice: '',
      maxPrice: '',
      city: '',
      governorate: '',
      city_ref: '',
      area_ref: '',
      developer: '',
      bedrooms: '',
      bathrooms: '',
      minArea: '',
      maxArea: '',
      furnished: '',
      amenities: [],
      featured: '',
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
    setCurrentPage(1);
  };

  // Count active filters for badge
  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.city) count++;
    if (filters.governorate) count++;
    if (filters.city_ref) count++;
    if (filters.area_ref) count++;
    if (filters.developer) count++;
    if (filters.bedrooms) count++;
    if (filters.bathrooms) count++;
    if (filters.type) count++;
    if (filters.furnished) count++;
    if (filters.minPrice || filters.maxPrice) count++;
    if (filters.minArea || filters.maxArea) count++;
    if (filters.amenities.length > 0) count++;
    if (filters.featured) count++;
    return count;
  };

  const PropertyCard = ({ property, isFavorited, onToggleFavorite }) => {
    const propertyId =
      getEntityId(property) ||
      property.slug ||
      (property.title ? property.title.toLowerCase().replace(/\s+/g, '-') : 'property');
    const propertyTypeKey = (property.type || '').toLowerCase().replace(/\s+/g, '-');
    const propertyTypeLabel = t(`properties.propertyTypeLabels.${propertyTypeKey}`, {
      defaultValue: property.type
    });
    const statusKey = (property.status || '').toLowerCase();
    const statusLabel = statusKey
      ? t(`propertyDetail.status.${statusKey}`, {
          defaultValue: property.status?.replace(/-/g, ' ')
        })
      : null;
    const statusBadgeClasses = (() => {
      switch (statusKey) {
        case 'for-sale':
          return 'bg-emerald-500 text-white';
        case 'for-rent':
          return 'bg-blue-500 text-white';
        case 'sold':
        case 'rented':
          return 'bg-gray-700 text-white';
        default:
          return 'bg-white/90 text-gray-900';
      }
    })();
    const currencyKey = (property.currency || '').toLowerCase();
    const currencyLabel = currencyKey
      ? t(`properties.currency.${currencyKey}`, { defaultValue: property.currency })
      : property.currency || '';
    const formattedPrice =
      property.price != null
        ? t('properties.cards.price', {
            value: numberFormatter.format(property.price),
            currency: currencyLabel
          })
        : t('properties.cards.priceUnknown');
    const isCompoundOverview = Boolean(property.isCompound);
    const compoundName = property.compound?.name;
    const compoundStatusKey = property.compound?.status;
    const compoundStatusLabel = compoundStatusKey
      ? t(`compound.status.${compoundStatusKey}`, { defaultValue: compoundStatusKey.replace(/-/g, ' ') })
      : null;
    const areaValue = property.specifications?.area;
    const areaLabel = areaValue != null
      ? t('properties.cards.area', {
          value: numberFormatter.format(areaValue),
          unit: t('properties.cards.areaUnit')
        })
      : null;
    const bedroomsCount = property.specifications?.bedrooms;
    const bedroomsLabel =
      bedroomsCount != null ? t('properties.cards.bedrooms', { count: bedroomsCount }) : null;
    const bathroomsCount = property.specifications?.bathrooms;
    const bathroomsLabel =
      bathroomsCount != null ? t('properties.cards.bathrooms', { count: bathroomsCount }) : null;
    const locationSeparator = isRTL ? '، ' : ', ';
    const whatsappMessage = encodeURIComponent(
      t('properties.cards.whatsappMessage', { title: property.title })
    );
    const whatsappLabel = t('properties.cards.whatsappButton');
    // Get location label with priority for hierarchical structure
    const getLocationLabel = () => {
      // Priority 1: Use hierarchical location structure (Area, City, Governorate)
      if (property.useNewLocationStructure || property.governorate_ref || property.city_ref || property.area_ref) {
        const segments = [
          property.area_ref?.name,
          property.city_ref?.name,
          property.governorate_ref?.name,
        ].filter(Boolean);
        
        if (segments.length > 0) {
          return segments.join(locationSeparator);
        }
      }
      
      // Priority 2: Use old location structure
      return property.location?.city || property.location?.address || t('properties.cards.locationUnknown');
    };

    // Handle share functionality
    const handleShare = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const propertyUrl = `${window.location.origin}/properties/${property.slug || propertyId}`;
      const shareText = t('properties.cards.shareText', {
        type: propertyTypeLabel,
        title: property.title,
        price: formattedPrice
      });
      
      // Check if Web Share API is available (mobile devices)
      if (navigator.share) {
        try {
          await navigator.share({
            title: property.title,
            text: shareText,
            url: propertyUrl,
          });
          showSuccess(t('properties.toast.shareSuccess'));
        } catch (error) {
          // User cancelled or error occurred
          if (error.name !== 'AbortError') {
            console.error('Error sharing:', error);
            // Fallback to clipboard
            await copyToClipboard(propertyUrl);
          }
        }
      } else {
        // Fallback to clipboard for desktop
        await copyToClipboard(propertyUrl);
      }
    };

    // Copy to clipboard fallback
    const copyToClipboard = async (text) => {
      try {
        await navigator.clipboard.writeText(text);
        showSuccess(t('properties.toast.copySuccess'));
      } catch (error) {
        console.error('Failed to copy:', error);
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand('copy');
          showSuccess(t('properties.toast.copySuccess'));
        } catch (err) {
          showError(t('properties.toast.copyFailed'));
        }
        document.body.removeChild(textArea);
      }
    };

    return (
      <div className="bg-white/95 rounded-3xl overflow-hidden border border-white/70 shadow-sm shadow-basira-gold/10 hover:shadow-xl hover:shadow-basira-gold/20 transition-all duration-300">
        {/* Image with overlay buttons */}
        <div className="relative">
          {statusLabel && (
            <span
              className={`absolute top-2 sm:top-3 ${
                isRTL ? 'right-2 sm:right-3' : 'left-2 sm:left-3'
              } px-2.5 sm:px-3 py-1 text-xs sm:text-sm font-semibold rounded-full shadow-sm backdrop-blur-sm ${statusBadgeClasses}`}
            >
              {statusLabel}
            </span>
          )}
          {property.images && property.images.length > 0 ? (
            <img
              src={property.images.find(img => img.isHero)?.url || property.images[0].url}
              alt={property.title}
              className="w-full h-48 sm:h-56 object-cover"
            />
          ) : (
            <div className="w-full h-48 sm:h-56 bg-gray-200 flex items-center justify-center">
              <span className="text-gray-400 text-xs sm:text-sm">{t('properties.cards.noImage')}</span>
            </div>
          )}
          
          {/* Overlay buttons */}
          <div className={`absolute top-2 sm:top-3 ${isRTL ? 'left-2 sm:left-3' : 'right-2 sm:right-3'} flex gap-1.5 sm:gap-2`}>
            <button 
              onClick={handleShare}
              className="w-8 h-8 sm:w-9 sm:h-9 bg-white/80 backdrop-blur-sm rounded flex items-center justify-center hover:bg-white transition-colors touch-manipulation"
              title={t('properties.cards.shareTooltip')}
              aria-label={t('properties.cards.shareTooltip')}
            >
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleFavorite();
              }}
              className={`w-8 h-8 sm:w-9 sm:h-9 backdrop-blur-sm rounded flex items-center justify-center transition-all touch-manipulation ${
                isFavorited 
                  ? 'bg-red-500 hover:bg-red-600' 
                  : 'bg-white/80 hover:bg-white'
              }`}
            >
              <FiHeart 
                className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${
                  isFavorited ? 'text-white fill-current' : 'text-gray-700'
                }`}
                style={isFavorited ? { fill: 'currentColor' } : {}}
              />
            </button>
          </div>
        </div>

        <div className="p-3 sm:p-4">
          {/* Location */}
          <div className="flex items-center gap-1 mb-1.5 sm:mb-2">
            <FiMapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 flex-shrink-0" />
            <span className="text-xs sm:text-sm text-blue-600 font-medium truncate">{getLocationLabel()}</span>
          </div>

          {compoundName && (
            <div className="flex items-center gap-1 mb-1.5 sm:mb-2">
              <FiLayers className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-300 flex-shrink-0" />
              <span className="text-xs sm:text-sm text-purple-200 font-medium truncate">
                {compoundName}
                {compoundStatusLabel ? ` • ${compoundStatusLabel}` : ''}
              </span>
            </div>
          )}

          {/* Title */}
          <RouterLink to={`/properties/${property.slug || propertyId}`} className="block">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1.5 sm:mb-2 hover:text-primary-600 transition-colors line-clamp-2">
              {t('properties.cards.title', { type: propertyTypeLabel, title: property.title })}
            </h3>
          </RouterLink>

          {/* Description */}
          <p className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3 line-clamp-2 min-h-[32px] sm:min-h-[40px]">
            {t('properties.cards.description', {
              bedrooms: bedroomsLabel ?? t('properties.cards.bedrooms', { count: 0 }),
              type: propertyTypeLabel,
              title: property.title,
              developer: property.developer?.name || t('properties.cards.unknownDeveloper'),
              area: areaLabel ?? t('properties.cards.areaUnknown'),
              bathrooms: bathroomsLabel ?? t('properties.cards.bathrooms', { count: 0 })
            })}
          </p>

          {/* Specifications */}
          <div className="flex items-center gap-2 sm:gap-4 mb-3 sm:mb-4 text-xs sm:text-sm min-h-[20px] sm:min-h-[24px] overflow-x-auto">
            {areaLabel && (
              <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                <FiMaximize className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                <span className="font-medium text-gray-700 whitespace-nowrap">{areaLabel}</span>
              </div>
            )}
            {bedroomsCount != null && (
              <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                <svg className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span className="font-medium text-gray-700 whitespace-nowrap">{bedroomsCount}</span>
              </div>
            )}
            {bathroomsCount != null && (
              <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                <svg className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12v8H6V7z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 15h16" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 11h1M15 11h1" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2" />
                </svg>
                <span className="font-medium text-gray-700 whitespace-nowrap">{bathroomsCount}</span>
              </div>
            )}
          </div>

          {/* Developer Logo (if available) */}
          <div className="mb-2 sm:mb-3 min-h-[20px] sm:min-h-[24px]">
            {property.developer?.logo && (
              <img 
                src={property.developer.logo} 
                alt={property.developer.name}
                className="h-5 sm:h-6 object-contain"
              />
            )}
          </div>

          {/* Pricing */}
          <div className="flex items-center sm:items-end justify-between gap-2 sm:gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-2">
                <span className="text-xl sm:text-2xl font-bold text-basira-gold whitespace-nowrap">
                  {formattedPrice}
                </span>
              </div>
              {isCompoundOverview && (
                <span className="mt-1 inline-flex items-center gap-1 px-2.5 py-1 text-[11px] sm:text-xs font-semibold rounded-full bg-blue-500/15 text-blue-600 border border-blue-500/20">
                  <FiLayers className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  {t('properties.cards.compoundBadge')}
                </span>
              )}
            </div>
            
            {/* WhatsApp Button */}
            <a 
              href={`https://wa.me/?text=${whatsappMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 bg-[#25D366] rounded-lg flex items-center justify-center gap-2 hover:bg-[#20BA5A] active:bg-[#1DA851] transition-colors shadow-sm touch-manipulation px-4 h-10 sm:h-10 lg:px-2.5 lg:w-10"
            >
              <svg className="w-5 h-5 text-white flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              <span className="text-white font-medium text-sm whitespace-nowrap lg:hidden">{whatsappLabel}</span>
            </a>
          </div>
        </div>
      </div>
    );
  };

  // Generate SEO tags
  const seoTags = generateSEOTags({
    title: t('properties.metaTitle'),
    description: t('properties.metaDescription'),
    url: getCanonicalUrl('/properties'),
    locale: i18n.language === 'ar' ? 'ar' : 'en',
    alternateLocale: i18n.language === 'ar' ? 'en' : 'ar'
  });
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Properties', url: '/properties' }
  ]);

  return (
    <>
      <Helmet>
        <title>{seoTags.title}</title>
        <meta name="description" content={seoTags.description} />
        <meta name="keywords" content={seoTags.keywords} />
        <link rel="canonical" href={seoTags.canonical} />
        <meta property="og:title" content={seoTags['og:title']} />
        <meta property="og:description" content={seoTags['og:description']} />
        <meta property="og:image" content={seoTags['og:image']} />
        <meta property="og:url" content={seoTags['og:url']} />
        <meta property="og:type" content={seoTags['og:type']} />
        <meta name="twitter:card" content={seoTags['twitter:card']} />
        <meta name="twitter:title" content={seoTags['twitter:title']} />
        <meta name="twitter:description" content={seoTags['twitter:description']} />
        <link rel="alternate" hrefLang="en" href={getCanonicalUrl('/properties')} />
        <link rel="alternate" hrefLang="ar" href={getCanonicalUrl('/properties')} />
      </Helmet>
      <MultipleStructuredData schemas={[breadcrumbSchema]} />

      <PageLayout hideNavOnMobile={true} showMobileNav={true}>
      <div className="min-h-screen bg-[#F7F5EF]" dir={i18n.dir()}>
        {/* Hero */}
        <section className="relative overflow-hidden  text-white">
          <div className="absolute inset-0 opacity-20"  />
          <div className="container-max px-4 lg:px-0 py-12 lg:py-16 relative">
            
          </div>
        </section>

        {/* Search Bar */}
        <div className="relative z-20 -mt-10 lg:-mt-12 px-4 lg:px-0">
          <div className="container-max">
            <div className="rounded-3xl border border-white/60 bg-white shadow-xl shadow-basira-gold/10">
              <div className="py-5 lg:py-6 px-4 lg:px-8">
                <div className="flex items-center gap-3">
                  <div className="flex-1 relative">
                    <FiSearch className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400`} />
                    <input
                      type="text"
                      placeholder={t('properties.searchPlaceholder')}
                      className={`w-full ${isRTL ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4'} py-3 text-base border border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-basira-gold focus:border-transparent`}
                      value={filters.search}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleIntentionalSearch();
                        }
                      }}
                    />
                  </div>

                  {/* Sort Button - Mobile */}
                  <button
                    onClick={() => setShowSort(true)}
                    className="lg:hidden relative flex items-center justify-center w-12 h-12 border border-gray-200 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                    </svg>
                  </button>

                  {/* Filter Button - Mobile */}
                  <button
                    onClick={() => setShowFilters(true)}
                    className="lg:hidden relative flex items-center justify-center w-12 h-12 border border-gray-200 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors"
                  >
                    <FiSettings className="w-5 h-5 text-gray-600" />
                    {getActiveFilterCount() > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-basira-gold text-white text-xs font-bold rounded-full flex items-center justify-center">
                        {getActiveFilterCount()}
                      </span>
                    )}
                  </button>

                  <Select
                    value={`${filters.sortBy}-${filters.sortOrder}`}
                    onValueChange={(value) => {
                      const [sortBy, sortOrder] = value.split('-');
                      handleFilterChange('sortBy', sortBy);
                      handleFilterChange('sortOrder', sortOrder);
                    }}
                  >
                    <SelectTrigger className="hidden md:flex w-[170px] h-12 rounded-xl border border-gray-200">
                      <span className="flex items-center gap-2 text-gray-700">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                        </svg>
                        {t('properties.sort.label')}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="createdAt-desc">{t('properties.sort.newest')}</SelectItem>
                      <SelectItem value="createdAt-asc">{t('properties.sort.oldest')}</SelectItem>
                      <SelectItem value="price-asc">{t('properties.sort.priceAsc')}</SelectItem>
                      <SelectItem value="price-desc">{t('properties.sort.priceDesc')}</SelectItem>
                      <SelectItem value="views-desc">{t('properties.sort.popular')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="container-max py-10 lg:py-12 px-4 lg:px-0">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Filters Sidebar - Desktop */}
            <div className="hidden lg:block lg:w-80 lg:sticky lg:top-24 lg:h-fit">
              <div className="space-y-6">
                {/* Status Filter - Moved to top */}
                <div className="bg-white/95 rounded-2xl border border-white/70 shadow-sm shadow-basira-gold/5 p-5">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-base font-semibold text-gray-900">{t('properties.filters.status', { defaultValue: 'Status' })}</h3>
                    <button
                      onClick={() => handleFilterChange('status', '')}
                      className="text-sm text-gray-600 hover:text-primary-600"
                    >
                      {t('properties.filters.reset')}
                    </button>
                  </div>
                  <div className="flex gap-3.5">
                    {[
                      { value: '', label: t('properties.filterOptions.status.any', { defaultValue: 'Any' }) },
                      { value: 'for-sale', label: t('properties.filterOptions.status.forSale', { defaultValue: 'For Sale' }) },
                      { value: 'for-rent', label: t('properties.filterOptions.status.forRent', { defaultValue: 'For Rent' }) }
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handleFilterChange('status', option.value)}
                        className={`flex-1 px-4 py-2.5 rounded-full border-2 text-sm font-medium transition-all ${
                          filters.status === option.value
                            ? 'bg-primary-600 text-white border-primary-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-primary-400'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Location */}
                <div className="bg-white/95 rounded-2xl border border-white/70 shadow-sm shadow-basira-gold/5 p-5">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-base font-semibold text-gray-900">{t('properties.filters.location')}</h3>
                        <button
                          onClick={() => {
                            handleFilterChange('governorate', '');
                            handleFilterChange('city_ref', '');
                            handleFilterChange('area_ref', '');
                          }}
                          className="text-sm text-gray-600 hover:text-primary-600"
                        >
                          {t('properties.filters.reset')}
                        </button>
                  </div>
                  
                  <div className="space-y-3">
                    {/* Governorate */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('properties.filters.governorate')}</label>
                      <Select 
                        value={filters.governorate || 'all'} 
                        onValueChange={(value) => {
                          const actualValue = value === 'all' ? '' : value;
                          handleFilterChange('governorate', actualValue);
                          handleFilterChange('city_ref', '');
                          handleFilterChange('area_ref', '');
                        }}
                      >
                        <SelectTrigger className="w-full h-11">
                          <span className="text-gray-700">
                            {filters.governorate 
                              ? governoratesData?.governorates?.find(g => getEntityId(g) === filters.governorate)?.name 
                              : t('properties.labels.allGovernorates')}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t('properties.labels.allGovernorates')}</SelectItem>
                          {governoratesData?.governorates?.map((gov) => {
                            const governorateId = getEntityId(gov);
                            if (!governorateId) return null;
                            return (
                              <SelectItem key={governorateId} value={governorateId}>
                                {gov.name}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* City */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('properties.filters.city')}</label>
                      <Select 
                        value={filters.city_ref || 'all'} 
                        onValueChange={(value) => {
                          const actualValue = value === 'all' ? '' : value;
                          handleFilterChange('city_ref', actualValue);
                          handleFilterChange('area_ref', '');
                        }}
                        disabled={!filters.governorate}
                      >
                        <SelectTrigger className="w-full h-11" disabled={!filters.governorate}>
                          <span className="text-gray-700">
                            {filters.city_ref
                              ? citiesByGovernorateData?.cities?.find(c => getEntityId(c) === filters.city_ref)?.name
                              : filters.governorate ? t('properties.labels.allCities') : t('properties.filters.selectGovernorateFirst')}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{filters.governorate ? t('properties.labels.allCities') : t('properties.filters.selectGovernorateFirst')}</SelectItem>
                          {citiesByGovernorateData?.cities?.map((city) => {
                            const cityId = getEntityId(city);
                            if (!cityId) return null;
                            return (
                              <SelectItem key={cityId} value={cityId}>
                                {city.name}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Area */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('properties.filters.area')}</label>
                      <Select 
                        value={filters.area_ref || 'all'} 
                        onValueChange={(value) => {
                          const actualValue = value === 'all' ? '' : value;
                          handleFilterChange('area_ref', actualValue);
                        }}
                        disabled={!filters.city_ref}
                      >
                        <SelectTrigger className="w-full h-11" disabled={!filters.city_ref}>
                          <span className="text-gray-700">
                            {filters.area_ref
                              ? areasByCityData?.areas?.find(a => getEntityId(a) === filters.area_ref)?.name
                              : filters.city_ref ? t('properties.labels.allAreas') : t('properties.filters.selectCityFirst')}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{filters.city_ref ? t('properties.labels.allAreas') : t('properties.filters.selectCityFirst')}</SelectItem>
                          {areasByCityData?.areas?.map((area) => {
                            const areaId = getEntityId(area);
                            if (!areaId) return null;
                            return (
                              <SelectItem key={areaId} value={areaId}>
                                {area.name}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Developers */}
                <div className="bg-white/95 rounded-2xl border border-white/70 shadow-sm shadow-basira-gold/5 p-5">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-base font-semibold text-gray-900">{t('properties.filters.developers')}</h3>
                    <button
                      onClick={() => handleFilterChange('developer', '')}
                      className="text-sm text-gray-600 hover:text-primary-600"
                    >
                      {t('properties.filters.reset')}
                    </button>
                  </div>
                  {developersData?.developers && developersData.developers.length > 0 && (
                    <div className="space-y-3.5">
                      {(showAllDevelopers ? developersData.developers : developersData.developers.slice(0, 5)).map((dev, index) => {
                        const developerId = getEntityId(dev) || dev.slug || `developer-${index}`;
                        return (
                        <label key={developerId} className="flex items-center cursor-pointer py-0.5">
                          <input
                            type="checkbox"
                            checked={filters.developer === dev.slug}
                            onChange={(e) => handleFilterChange('developer', e.target.checked ? dev.slug : '')}
                            className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                          />
                        <span className={`${inlineMarginClass} text-sm text-gray-700`}>{dev.name}</span>
                        </label>
                      )})}
                      {developersData.developers.length > 5 && (
                        <button 
                          onClick={() => setShowAllDevelopers(!showAllDevelopers)}
                          className="text-sm text-primary-600 hover:underline mt-2"
                        >
                          {showAllDevelopers ? t('properties.actions.seeLess', { defaultValue: 'See Less' }) : t('properties.actions.seeMore')}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Bedrooms */}
                <div className="bg-white/95 rounded-2xl border border-white/70 shadow-sm shadow-basira-gold/5 p-5">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-base font-semibold text-gray-900">{t('properties.filters.bedrooms')}</h3>
                    <button
                      onClick={() => handleFilterChange('bedrooms', '')}
                      className="text-sm text-gray-600 hover:text-primary-600"
                    >
                      {t('properties.filters.reset')}
                    </button>
                  </div>
                  <div className="flex gap-3.5">
                    {['1', '2', '3', '4', '5+'].map((value) => (
                      <button
                        key={value}
                        onClick={() => handleFilterChange('bedrooms', value)}
                        className={`w-12 h-12 flex items-center justify-center rounded-full border-2 text-sm font-medium transition-all ${
                          filters.bedrooms === value
                            ? 'bg-primary-600 text-white border-primary-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-primary-400'
                        }`}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bathrooms */}
                <div className="bg-white/95 rounded-2xl border border-white/70 shadow-sm shadow-basira-gold/5 p-5">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-base font-semibold text-gray-900">{t('properties.filters.bathrooms')}</h3>
                    <button
                      onClick={() => handleFilterChange('bathrooms', '')}
                      className="text-sm text-gray-600 hover:text-primary-600"
                    >
                      {t('properties.filters.reset')}
                    </button>
                  </div>
                  <div className="flex gap-3.5">
                    {['1', '2', '3', '4', '5+'].map((value) => (
                      <button
                        key={value}
                        onClick={() => handleFilterChange('bathrooms', value)}
                        className={`w-12 h-12 flex items-center justify-center rounded-full border-2 text-sm font-medium transition-all ${
                          filters.bathrooms === value
                            ? 'bg-primary-600 text-white border-primary-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-primary-400'
                        }`}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>


                {/* Property Types */}
                <div className="bg-white/95 rounded-2xl border border-white/70 shadow-sm shadow-basira-gold/5 p-5">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-base font-semibold text-gray-900">{t('properties.filters.propertyTypes')}</h3>
                    <button
                      onClick={() => handleFilterChange('type', '')}
                      className="text-sm text-gray-600 hover:text-primary-600"
                    >
                      {t('properties.filters.reset')}
                    </button>
                  </div>
                  <div className="space-y-3.5 max-h-64 overflow-y-auto">
                    {PROPERTY_TYPE_OPTIONS.map((option) => (
                      <label key={option.value} className="flex items-center cursor-pointer py-0.5">
                        <input
                          type="checkbox"
                          checked={filters.type === option.value}
                          onChange={(e) => handleFilterChange('type', e.target.checked ? option.value : '')}
                          className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <span className={`${inlineMarginClass} text-sm text-gray-700`}>{t(option.labelKey)}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Furnishing */}
                <div className="bg-white/95 rounded-2xl border border-white/70 shadow-sm shadow-basira-gold/5 p-5">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-base font-semibold text-gray-900">{t('properties.filters.furnishing')}</h3>
                    <button
                      onClick={() => handleFilterChange('furnished', '')}
                      className="text-sm text-gray-600 hover:text-primary-600"
                    >
                      {t('properties.filters.reset')}
                    </button>
                  </div>
                  <div className="space-y-3.5">
                    {FURNISHING_OPTIONS.map((option) => (
                      <label key={option.value} className="flex items-center cursor-pointer py-0.5">
                        <input
                          type="checkbox"
                          checked={filters.furnished === option.value}
                          onChange={(e) => handleFilterChange('furnished', e.target.checked ? option.value : '')}
                          className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <span className={`${inlineMarginClass} text-sm text-gray-700`}>{t(option.labelKey)}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Price Range - Airbnb Style */}
                <div className="bg-white/95 rounded-2xl border border-white/70 shadow-sm shadow-basira-gold/5 p-5">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-base font-semibold text-gray-900">{t('properties.filters.price')}</h3>
                    <button
                      onClick={() => {
                        handleFilterChange('minPrice', '');
                        handleFilterChange('maxPrice', '');
                      }}
                      className="text-sm text-gray-600 hover:text-primary-600"
                    >
                      {t('properties.filters.reset')}
                    </button>
                  </div>
                  <RangeSlider
                    min={PRICE_RANGE.min}
                    max={PRICE_RANGE.max}
                    step={PRICE_RANGE.step}
                    value={{
                      min: filters.minPrice ? Number(filters.minPrice) : undefined,
                      max: filters.maxPrice ? Number(filters.maxPrice) : undefined,
                    }}
                    onChange={(range) => {
                      handleFilterChange('minPrice', range.min.toString());
                      handleFilterChange('maxPrice', range.max.toString());
                    }}
                    formatLabel={(val, type) => {
                      // Get actual min/max from histogram data
                      const prices = validHistogramData && validHistogramData.length > 0
                        ? validHistogramData.map(p => p.price || 0).filter(p => p > 0)
                        : [];
                      const actualMinPrice = prices.length > 0 ? Math.min(...prices) : PRICE_RANGE.min;
                      const actualMaxPrice = prices.length > 0 ? Math.max(...prices) : PRICE_RANGE.max;
                      
                      if (type === 'max' && val >= actualMaxPrice * 0.95) {
                        return `${formatValue(val, actualMaxPrice)}+ ${t('properties.currency.egp', { defaultValue: 'EGP' })}`;
                      }
                      return `${formatValue(val, type === 'min' ? actualMinPrice : actualMaxPrice)} ${t('properties.currency.egp', { defaultValue: 'EGP' })}`;
                    }}
                    histogramData={validHistogramData}
                    histogramField="price"
                    useDataMax={true}
                    useDataMin={true}
                  />
                </div>

                {/* Unit Area - Airbnb Style */}
                <div className="bg-white/95 rounded-2xl border border-white/70 shadow-sm shadow-basira-gold/5 p-5">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-base font-semibold text-gray-900">{t('properties.filters.unitArea')}</h3>
                    <button
                      onClick={() => {
                        handleFilterChange('minArea', '');
                        handleFilterChange('maxArea', '');
                      }}
                      className="text-sm text-gray-600 hover:text-primary-600"
                    >
                      {t('properties.filters.reset')}
                    </button>
                  </div>
                  <RangeSlider
                    min={AREA_RANGE.min}
                    max={AREA_RANGE.max}
                    step={AREA_RANGE.step}
                    value={{
                      min: filters.minArea ? Number(filters.minArea) : undefined,
                      max: filters.maxArea ? Number(filters.maxArea) : undefined,
                    }}
                    onChange={(range) => {
                      handleFilterChange('minArea', range.min.toString());
                      handleFilterChange('maxArea', range.max.toString());
                    }}
                    formatLabel={(val, type) => {
                      // Get actual min/max from histogram data
                      const areas = validHistogramData && validHistogramData.length > 0
                        ? validHistogramData.map(p => p.specifications?.area || 0).filter(a => a > 0)
                        : [];
                      const actualMinArea = areas.length > 0 ? Math.min(...areas) : AREA_RANGE.min;
                      const actualMaxArea = areas.length > 0 ? Math.max(...areas) : AREA_RANGE.max;
                      
                      if (type === 'max' && val >= actualMaxArea * 0.95) {
                        return `${formatValue(val, actualMaxArea)}+ ${t('properties.cards.areaUnit')}`;
                      }
                      return `${formatValue(val, type === 'min' ? actualMinArea : actualMaxArea)} ${t('properties.cards.areaUnit')}`;
                    }}
                    histogramData={validHistogramData}
                    histogramField="area"
                    useDataMax={true}
                    useDataMin={true}
                  />
                </div>

                {/* Amenities */}
                <div className="bg-white rounded-lg border border-gray-200 p-5">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-base font-semibold text-gray-900">{t('properties.filters.amenities')}</h3>
                    <button
                      onClick={() => handleFilterChange('amenities', [])}
                      className="text-sm text-gray-600 hover:text-primary-600"
                    >
                      {t('properties.filters.reset')}
                    </button>
                  </div>
                  <div className="space-y-3.5 max-h-64 overflow-y-auto">
                    {AMENITY_OPTIONS.map((amenity) => (
                      <label key={amenity.value} className="flex items-center cursor-pointer py-0.5">
                        <input
                          type="checkbox"
                          checked={filters.amenities.includes(amenity.value)}
                          onChange={(e) => {
                            const newAmenities = e.target.checked
                              ? [...filters.amenities, amenity.value]
                              : filters.amenities.filter(a => a !== amenity.value);
                            handleFilterChange('amenities', newAmenities);
                          }}
                          className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <span className={`${inlineMarginClass} text-sm text-gray-700`}>{t(amenity.labelKey)}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Most Popular Properties */}
                <div className="bg-white rounded-lg border border-gray-200 p-5">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-base font-semibold text-gray-900">{t('properties.filters.mostPopular')}</h4>
                    {filters.featured && (
                      <button
                        onClick={() => handleFilterChange('featured', '')}
                        className="text-xs text-red-600 hover:text-red-800 font-medium"
                      >
                        {t('properties.filters.reset')}
                      </button>
                    )}
                  </div>
                  <div className="space-y-3">
                    <label className="flex items-center cursor-pointer py-0.5">
                      <input
                        type="radio"
                        name="featured-desktop"
                        checked={filters.featured === ''}
                        onChange={() => handleFilterChange('featured', '')}
                        className="w-5 h-5 text-primary-600 border-gray-300 focus:ring-primary-500"
                      />
                      <span className={`${inlineMarginClass} text-sm text-gray-700`}>{t('properties.filters.allProperties')}</span>
                    </label>
                    <label className="flex items-center cursor-pointer py-0.5">
                      <input
                        type="radio"
                        name="featured-desktop"
                        checked={filters.featured === 'true'}
                        onChange={() => handleFilterChange('featured', 'true')}
                        className="w-5 h-5 text-primary-600 border-gray-300 focus:ring-primary-500"
                      />
                      <span className={`${inlineMarginClass} text-sm text-gray-700`}>{t('properties.filters.onlyFeatured')}</span>
                    </label>
                  </div>
                </div>

                {/* Reset All Filters Button */}
                <button
                  onClick={clearFilters}
                  className="w-full h-12 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors mt-6"
                >
                  {t('properties.filters.resetAll')}
                </button>
              </div>
            </div>

            {/* Mobile Filter Drawer */}
            <AnimatePresence>
              {showFilters && (
                <>
                  {/* Backdrop */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => setShowFilters(false)}
                    className="lg:hidden fixed inset-0 bg-[#131c2b]/40 backdrop-blur-sm z-40"
                  />
                  
                  {/* Drawer */}
                  <motion.div
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                    className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl"
                    style={{ maxHeight: '75vh' }}
                  >
                    {/* Drawer Header */}
                    <div className="sticky top-0 bg-white border-b-2 border-gray-200 px-5 py-4 flex items-center justify-between z-10 rounded-t-2xl">
                      <h2 className="text-lg font-bold text-gray-900">{t('properties.filters.title')}</h2>
                      <button
                        onClick={() => setShowFilters(false)}
                        className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
                      >
                        <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    {/* Drawer Content - Scrollable */}
                    <div className="overflow-y-auto px-5 py-6 space-y-5" style={{ maxHeight: 'calc(75vh - 64px)' }}>
                      {/* All filter sections go here with mobile-optimized spacing */}
                      {/* Status Filter - Moved to top */}
                      <div className="bg-white rounded-lg border border-gray-200 p-5">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-base font-semibold text-gray-900">{t('properties.filters.status', { defaultValue: 'Status' })}</h3>
                          <button
                            onClick={() => handleFilterChange('status', '')}
                            className="text-sm text-gray-600 hover:text-primary-600"
                          >
                            {t('properties.filters.reset')}
                          </button>
                        </div>
                        <div className="flex gap-3.5">
                          {[
                            { value: '', label: t('properties.filterOptions.status.any', { defaultValue: 'Any' }) },
                            { value: 'for-sale', label: t('properties.filterOptions.status.forSale', { defaultValue: 'For Sale' }) },
                            { value: 'for-rent', label: t('properties.filterOptions.status.forRent', { defaultValue: 'For Rent' }) }
                          ].map((option) => (
                            <button
                              key={option.value}
                              onClick={() => handleFilterChange('status', option.value)}
                              className={`flex-1 px-4 py-2.5 rounded-full border-2 text-sm font-medium transition-all ${
                                filters.status === option.value
                                  ? 'bg-primary-600 text-white border-primary-600'
                                  : 'bg-white text-gray-700 border-gray-300 hover:border-primary-400'
                              }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Areas */}
                      <div className="bg-white rounded-lg border border-gray-200 p-5">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-base font-semibold text-gray-900">{t('properties.filters.location')}</h3>
                          <button
                            onClick={() => handleFilterChange('city', '')}
                            className="text-sm text-gray-600 hover:text-primary-600"
                          >
                            {t('properties.filters.reset')}
                          </button>
                        </div>
                        {citiesData?.cities && citiesData.cities.length > 0 ? (
                          <div className="space-y-3.5">
                            {citiesData.cities.slice(0, 5).map((city) => {
                              const cityId = getEntityId(city) || city.slug || city.name;
                              // Check if city matches by name or slug
                              const isChecked = filters.city === city.name || filters.city === city.slug;
                              return (
                              <label key={cityId} className="flex items-center cursor-pointer py-0.5">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => handleFilterChange('city', e.target.checked ? city.name : '')}
                                  className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                                />
                                <span className={`${inlineMarginClass} text-sm text-gray-700`}>{city.name}</span>
                              </label>
                            )})}
                            {citiesData.cities.length > 5 && (
                              <button className="text-sm text-primary-600 hover:underline mt-2">
                                {t('properties.actions.seeMore')}
                              </button>
                            )}
                          </div>
                        ) : (
                          <input
                            type="text"
                            placeholder={t('properties.searchPlaceholderMobile')}
                            className="w-full h-11 px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            value={filters.city}
                            onChange={(e) => handleFilterChange('city', e.target.value)}
                          />
                        )}
                      </div>

                      {/* Developers */}
                      <div className="bg-white rounded-lg border border-gray-200 p-5">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-base font-semibold text-gray-900">{t('properties.filters.developers')}</h3>
                          <button
                            onClick={() => handleFilterChange('developer', '')}
                            className="text-sm text-gray-600 hover:text-primary-600"
                          >
                            {t('properties.filters.reset')}
                          </button>
                        </div>
                        {developersData?.developers && developersData.developers.length > 0 && (
                          <div className="space-y-3.5">
                            {(showAllDevelopersMobile ? developersData.developers : developersData.developers.slice(0, 5)).map((dev) => {
                              const developerId = getEntityId(dev) || dev.slug || dev.name;
                              return (
                              <label key={developerId} className="flex items-center cursor-pointer py-0.5">
                                <input
                                  type="checkbox"
                                  checked={filters.developer === dev.slug}
                                  onChange={(e) => handleFilterChange('developer', e.target.checked ? dev.slug : '')}
                                  className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                                />
                                <span className={`${inlineMarginClass} text-sm text-gray-700`}>{dev.name}</span>
                              </label>
                            )})}
                            {developersData.developers.length > 5 && (
                              <button 
                                onClick={() => setShowAllDevelopersMobile(!showAllDevelopersMobile)}
                                className="text-sm text-primary-600 hover:underline mt-2"
                              >
                                {showAllDevelopersMobile ? t('properties.actions.seeLess', { defaultValue: 'See Less' }) : t('properties.actions.seeMore')}
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Bedrooms */}
                      <div className="bg-white rounded-lg border border-gray-200 p-5">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-base font-semibold text-gray-900">{t('properties.filters.bedrooms')}</h3>
                          <button
                            onClick={() => handleFilterChange('bedrooms', '')}
                            className="text-sm text-gray-600 hover:text-primary-600"
                          >
                            {t('properties.filters.reset')}
                          </button>
                        </div>
                        <div className="flex gap-3.5">
                          {['1', '2', '3', '4', '5+'].map((value) => (
                            <button
                              key={value}
                              onClick={() => handleFilterChange('bedrooms', value)}
                              className={`w-12 h-12 flex items-center justify-center rounded-full border-2 text-sm font-medium transition-all ${
                                filters.bedrooms === value
                                  ? 'bg-primary-600 text-white border-primary-600'
                                  : 'bg-white text-gray-700 border-gray-300 hover:border-primary-400'
                              }`}
                            >
                              {value}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Bathrooms */}
                      <div className="bg-white rounded-lg border border-gray-200 p-5">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-base font-semibold text-gray-900">{t('properties.filters.bathrooms')}</h3>
                          <button
                            onClick={() => handleFilterChange('bathrooms', '')}
                            className="text-sm text-gray-600 hover:text-primary-600"
                          >
                            {t('properties.filters.reset')}
                          </button>
                        </div>
                        <div className="flex gap-3.5">
                          {['1', '2', '3', '4', '5+'].map((value) => (
                            <button
                              key={value}
                              onClick={() => handleFilterChange('bathrooms', value)}
                              className={`w-12 h-12 flex items-center justify-center rounded-full border-2 text-sm font-medium transition-all ${
                                filters.bathrooms === value
                                  ? 'bg-primary-600 text-white border-primary-600'
                                  : 'bg-white text-gray-700 border-gray-300 hover:border-primary-400'
                              }`}
                            >
                              {value}
                            </button>
                          ))}
                        </div>
                      </div>


                      {/* Property Types */}
                      <div className="bg-white rounded-lg border border-gray-200 p-5">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-base font-semibold text-gray-900">{t('properties.filters.propertyTypes')}</h3>
                          <button
                            onClick={() => handleFilterChange('type', '')}
                            className="text-sm text-gray-600 hover:text-primary-600"
                          >
                            {t('properties.filters.reset')}
                          </button>
                        </div>
                        <div className="space-y-3.5 max-h-48 overflow-y-auto">
                          {PROPERTY_TYPE_OPTIONS.map((option) => (
                            <label key={option.value} className="flex items-center cursor-pointer py-0.5">
                              <input
                                type="checkbox"
                                checked={filters.type === option.value}
                                onChange={(e) => handleFilterChange('type', e.target.checked ? option.value : '')}
                                className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                              />
                              <span className={`${inlineMarginClass} text-sm text-gray-700`}>{t(option.labelKey)}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Furnishing */}
                      <div className="bg-white rounded-lg border border-gray-200 p-5">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-base font-semibold text-gray-900">{t('properties.filters.furnishing')}</h3>
                          <button
                            onClick={() => handleFilterChange('furnished', '')}
                            className="text-sm text-gray-600 hover:text-primary-600"
                          >
                            {t('properties.filters.reset')}
                          </button>
                        </div>
                        <div className="space-y-3.5">
                          {FURNISHING_OPTIONS.map((option) => (
                            <label key={option.value} className="flex items-center cursor-pointer py-0.5">
                              <input
                                type="checkbox"
                                checked={filters.furnished === option.value}
                                onChange={(e) => handleFilterChange('furnished', e.target.checked ? option.value : '')}
                                className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                              />
                              <span className={`${inlineMarginClass} text-sm text-gray-700`}>{t(option.labelKey)}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Price Range - Airbnb Style Mobile */}
                      <div className="bg-white rounded-lg border border-gray-200 p-5">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-base font-semibold text-gray-900">{t('properties.filters.price')}</h3>
                          <button
                            onClick={() => {
                              handleFilterChange('minPrice', '');
                              handleFilterChange('maxPrice', '');
                            }}
                            className="text-sm text-gray-600 hover:text-primary-600"
                          >
                            {t('properties.filters.reset')}
                          </button>
                        </div>
                        <RangeSlider
                          min={PRICE_RANGE.min}
                          max={PRICE_RANGE.max}
                          step={PRICE_RANGE.step}
                          value={{
                            min: filters.minPrice ? Number(filters.minPrice) : undefined,
                            max: filters.maxPrice ? Number(filters.maxPrice) : undefined,
                          }}
                          onChange={(range) => {
                            handleFilterChange('minPrice', range.min.toString());
                            handleFilterChange('maxPrice', range.max.toString());
                          }}
                          formatLabel={(val, type) => {
                            // Get actual min/max from histogram data
                            const prices = validHistogramData && validHistogramData.length > 0
                              ? validHistogramData.map(p => p.price || 0).filter(p => p > 0)
                              : [];
                            const actualMinPrice = prices.length > 0 ? Math.min(...prices) : PRICE_RANGE.min;
                            const actualMaxPrice = prices.length > 0 ? Math.max(...prices) : PRICE_RANGE.max;
                            
                            if (type === 'max' && val >= actualMaxPrice * 0.95) {
                              return `${formatValue(val, actualMaxPrice)}+ ${t('properties.currency.egp', { defaultValue: 'EGP' })}`;
                            }
                            return `${formatValue(val, type === 'min' ? actualMinPrice : actualMaxPrice)} ${t('properties.currency.egp', { defaultValue: 'EGP' })}`;
                          }}
                          histogramData={validHistogramData}
                          histogramField="price"
                          useDataMax={true}
                          useDataMin={true}
                        />
                      </div>

                      {/* Unit Area - Airbnb Style Mobile */}
                      <div className="bg-white rounded-lg border border-gray-200 p-5">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-base font-semibold text-gray-900">{t('properties.filters.unitArea')}</h3>
                          <button
                            onClick={() => {
                              handleFilterChange('minArea', '');
                              handleFilterChange('maxArea', '');
                            }}
                            className="text-sm text-gray-600 hover:text-primary-600"
                          >
                            {t('properties.filters.reset')}
                          </button>
                        </div>
                  <RangeSlider
                    min={AREA_RANGE.min}
                    max={AREA_RANGE.max}
                    step={AREA_RANGE.step}
                    value={{
                      min: filters.minArea ? Number(filters.minArea) : undefined,
                      max: filters.maxArea ? Number(filters.maxArea) : undefined,
                    }}
                    onChange={(range) => {
                      handleFilterChange('minArea', range.min.toString());
                      handleFilterChange('maxArea', range.max.toString());
                    }}
                    formatLabel={(val, type) => {
                      // Get actual min/max from histogram data
                      const areas = validHistogramData && validHistogramData.length > 0
                        ? validHistogramData.map(p => p.specifications?.area || 0).filter(a => a > 0)
                        : [];
                      const actualMinArea = areas.length > 0 ? Math.min(...areas) : AREA_RANGE.min;
                      const actualMaxArea = areas.length > 0 ? Math.max(...areas) : AREA_RANGE.max;
                      
                      if (type === 'max' && val >= actualMaxArea * 0.95) {
                        return `${formatValue(val, actualMaxArea)}+ ${t('properties.cards.areaUnit')}`;
                      }
                      return `${formatValue(val, type === 'min' ? actualMinArea : actualMaxArea)} ${t('properties.cards.areaUnit')}`;
                    }}
                    histogramData={validHistogramData}
                    histogramField="area"
                    useDataMax={true}
                    useDataMin={true}
                  />
                      </div>

                      {/* Amenities */}
                      <div className="bg-white rounded-lg border border-gray-200 p-5">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-base font-semibold text-gray-900">{t('properties.filters.amenities')}</h3>
                          <button
                            onClick={() => handleFilterChange('amenities', [])}
                            className="text-sm text-gray-600 hover:text-primary-600"
                          >
                            {t('properties.filters.reset')}
                          </button>
                        </div>
                        <div className="space-y-3.5 max-h-48 overflow-y-auto">
                          {AMENITY_OPTIONS.map((amenity) => (
                            <label key={amenity.value} className="flex items-center cursor-pointer py-0.5">
                              <input
                                type="checkbox"
                                checked={filters.amenities.includes(amenity.value)}
                                onChange={(e) => {
                                  const newAmenities = e.target.checked
                                    ? [...filters.amenities, amenity.value]
                                    : filters.amenities.filter(a => a !== amenity.value);
                                  handleFilterChange('amenities', newAmenities);
                                }}
                                className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                              />
                              <span className={`${inlineMarginClass} text-sm text-gray-700`}>{t(amenity.labelKey)}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Most Popular Properties - Mobile */}
                      <div className="bg-white rounded-lg border border-gray-200 p-5">
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="text-base font-semibold text-gray-900">{t('properties.filters.mostPopular')}</h4>
                          {filters.featured && (
                            <button
                              onClick={() => handleFilterChange('featured', '')}
                              className="text-xs text-red-600 hover:text-red-800 font-medium"
                            >
                              {t('properties.filters.reset')}
                            </button>
                          )}
                        </div>
                        <div className="space-y-3">
                          <label className="flex items-center cursor-pointer py-0.5">
                            <input
                              type="radio"
                              name="featured-mobile"
                              checked={filters.featured === ''}
                              onChange={() => handleFilterChange('featured', '')}
                              className="w-5 h-5 text-primary-600 border-gray-300 focus:ring-primary-500"
                            />
                          <span className={`${inlineMarginClass} text-sm text-gray-700`}>{t('properties.filters.allProperties')}</span>
                          </label>
                          <label className="flex items-center cursor-pointer py-0.5">
                            <input
                              type="radio"
                              name="featured-mobile"
                              checked={filters.featured === 'true'}
                              onChange={() => handleFilterChange('featured', 'true')}
                              className="w-5 h-5 text-primary-600 border-gray-300 focus:ring-primary-500"
                            />
                          <span className={`${inlineMarginClass} text-sm text-gray-700`}>{t('properties.filters.onlyFeatured')}</span>
                          </label>
                        </div>
                      </div>

                      {/* Reset All Filters Button */}
                      <button
                        onClick={() => {
                          clearFilters();
                          setShowFilters(false);
                        }}
                        className="w-full h-12 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
                      >
                        {t('properties.filters.resetAll')}
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            {/* Mobile Sort Drawer */}
            <AnimatePresence>
              {showSort && (
                <>
                  {/* Backdrop */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => setShowSort(false)}
                    className="lg:hidden fixed inset-0 bg-[#131c2b]/40 backdrop-blur-sm z-40"
                  />
                  
                  {/* Drawer */}
                  <motion.div
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                    className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl"
                  >
                    {/* Drawer Header */}
                    <div className="sticky top-0 bg-white border-b-2 border-gray-200 px-5 py-4 flex items-center justify-between z-10 rounded-t-2xl">
                      <h2 className="text-lg font-bold text-gray-900">{t('properties.sort.label')}</h2>
                      <button
                        onClick={() => setShowSort(false)}
                        className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
                      >
                        <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    {/* Drawer Content */}
                    <div className="px-5 py-6 space-y-3">
                      {[
                        { label: t('properties.sort.newest'), value: 'createdAt-desc' },
                        { label: t('properties.sort.oldest'), value: 'createdAt-asc' },
                        { label: t('properties.sort.priceAsc'), value: 'price-asc' },
                        { label: t('properties.sort.priceDesc'), value: 'price-desc' },
                        { label: t('properties.sort.popular'), value: 'views-desc' }
                      ].map((option) => (
                        <button
                          key={option.value}
                          onClick={() => {
                            const [sortBy, sortOrder] = option.value.split('-');
                            handleFilterChange('sortBy', sortBy);
                            handleFilterChange('sortOrder', sortOrder);
                            setShowSort(false);
                          }}
                          className={`w-full text-left px-5 py-4 rounded-lg border-2 transition-all ${
                            `${filters.sortBy}-${filters.sortOrder}` === option.value
                              ? 'bg-primary-50 border-primary-600 text-primary-700 font-medium'
                              : 'bg-white border-gray-200 text-gray-700 hover:border-primary-300 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-base">{option.label}</span>
                            {`${filters.sortBy}-${filters.sortOrder}` === option.value && (
                              <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            {/* Properties Grid */}
            <div className="flex-1">
              {/* Loading State */}
              {isLoading && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="card animate-pulse">
                      <div className="h-48 md:h-64 bg-gray-200"></div>
                      <div className="p-4 md:p-6 space-y-4">
                        <div className="h-4 bg-gray-200 rounded"></div>
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="text-center py-12">
                  <p className="text-red-600 mb-4">{t('properties.states.error')}</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="btn-primary"
                  >
                    {t('properties.buttons.tryAgain')}
                  </button>
                </div>
              )}

              {/* Properties Grid */}
              {!isLoading && data?.properties && (
                <>
                  {data.properties.length === 0 ? (
                    <div className="text-center py-12 px-4">
                      <p className="text-gray-600 mb-4">{t('properties.states.empty')}</p>
                      <button
                        onClick={clearFilters}
                        className="btn-primary"
                      >
                        {t('properties.buttons.clearFilters')}
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6 mb-8">
                        {data.properties.map((property, index) => {
                          const propertyId = getEntityId(property) || property.slug || `property-${index}`;
                          return (
                            <PropertyCard 
                              key={propertyId} 
                              property={property}
                              isFavorited={favoriteIds.includes(propertyId)}
                              onToggleFavorite={() => toggleFavorite(propertyId, favoriteIds.includes(propertyId))}
                            />
                          );
                        })}
                      </div>

                      {/* Pagination */}
                      {data.pagination?.totalPages > 1 && (
                        <div className="flex flex-wrap justify-center items-center gap-2">
                          <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={!data.pagination?.hasPrev}
                            className="btn-outline text-sm md:text-base px-3 md:px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {t('properties.buttons.previous')}
                          </button>
                          
                          <div className="flex gap-1">
                            {[...Array(Math.min(5, data.pagination.totalPages))].map((_, i) => {
                              const page = i + 1;
                              return (
                                <button
                                  key={page}
                                  onClick={() => setCurrentPage(page)}
                                  className={`px-2.5 md:px-3 py-2 text-sm md:text-base rounded-lg ${
                                    currentPage === page
                                      ? 'bg-primary-600 text-white'
                                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                  }`}
                                >
                                  {page}
                                </button>
                              );
                            })}
                          </div>
                          
                          <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, data.pagination.totalPages))}
                            disabled={!data.pagination.hasNext}
                            className="btn-outline text-sm md:text-base px-3 md:px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {t('properties.buttons.next')}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      </PageLayout>
    </>
  );
};

export default Properties;
