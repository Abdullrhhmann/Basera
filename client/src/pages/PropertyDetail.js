import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useQuery } from 'react-query';
import { useForm } from 'react-hook-form';
import { propertiesAPI, inquiriesAPI, citiesAPI, videosAPI, videoPlaylistsAPI } from '../utils/api';
import { FiMapPin, FiMaximize, FiHeart, FiShare2, FiLayers, FiVideo, FiBed, FiDroplet, FiCar } from '../icons/feather';
import { showSuccess, showError } from '../utils/sonner';
import { useAuth } from '../context/AuthContext';
import PageLayout from '../components/layout/PageLayout';
import OpenStreetMapComponent from '../components/common/OpenStreetMap';
import PropertyROICalculator from '../components/property/PropertyROICalculator';
import { useTranslation } from 'react-i18next';
import {
  generateSEOTags,
  generateRealEstateListingSchema,
  generateBreadcrumbSchema,
  getCanonicalUrl
} from '../utils/seo';
import MultipleStructuredData from '../components/seo/StructuredData';

const PropertyDetail = () => {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showInquiryForm, setShowInquiryForm] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const { register, handleSubmit, formState: { errors }, setValue, reset } = useForm();
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';
  const isRTL = i18n.dir() === 'rtl';
  const numberFormatter = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short' }),
    [locale]
  );
  const formatNumber = useCallback(
    (value) => (value != null && value !== '' ? numberFormatter.format(Number(value)) : ''),
    [numberFormatter]
  );
  const getCurrencyLabel = useCallback(
    (currency) => {
      if (!currency) return '';
      const key = currency.toLowerCase();
      return t(`properties.currency.${key}`, { defaultValue: currency });
    },
    [t]
  );
  const getPropertyTypeLabel = useCallback(
    (type) => {
      if (!type) return t('propertyDetail.titleFallback');
      const key = type.toLowerCase().replace(/\s+/g, '-');
      return t(`properties.propertyTypeLabels.${key}`, { defaultValue: type.replace('-', ' ') });
    },
    [t]
  );
  const inlineMarginClass = isRTL ? 'ml-2' : 'mr-2';
  const locationSeparator = isRTL ? '، ' : ', ';

  // Helper function to get location label with hierarchical structure
  const getLocationLabel = (property) => {
    if (!property) return t('propertyDetail.locationUnknown');
    
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
    const segments = [
      property.location?.address,
      property.location?.city,
      property.location?.state,
    ].filter(Boolean);
    
    return segments.length > 0 ? segments.join(locationSeparator) : t('propertyDetail.locationUnknown');
  };

  // Pre-fill form with user data if logged in
  useEffect(() => {
    if (isAuthenticated && user && showInquiryForm) {
      setValue('contactInfo.name', user.name || '');
      setValue('contactInfo.email', user.email || '');
      setValue('contactInfo.phone', user.phone || '');
    }
  }, [isAuthenticated, user, showInquiryForm, setValue]);

  // Fetch property data
  const { data, isLoading, error } = useQuery(
    ['property', id],
    async () => {
      try {
        // Add cache-busting parameter to get fresh data with populated fields
        const response = await propertiesAPI.getProperty(id, { _t: Date.now() });
        return response.data;
      } catch (err) {
        console.error('API Call Error:', err);
        console.error('Error Response:', err.response);
        throw err;
      }
    },
    {
      enabled: !!id,
      retry: 1,
      staleTime: 0,
      cacheTime: 0
    }
  );

  const property = data?.property;

  // Fetch videos for property, compound, or launch
  const { data: propertyVideosData } = useQuery(
    ['property-videos', property?._id],
    async () => {
      if (!property?._id) return { videos: [] };
      try {
        const response = await videosAPI.getVideosByProperty(property._id);
        return response.data;
      } catch (err) {
        console.error('Error fetching property videos:', err);
        return { videos: [] };
      }
    },
    {
      enabled: !!property?._id,
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000
    }
  );

  const { data: compoundVideosData } = useQuery(
    ['compound-videos', property?.compound],
    async () => {
      if (!property?.compound || (typeof property.compound === 'string' && !property.compound)) return { videos: [] };
      const compoundId = typeof property.compound === 'object' ? property.compound._id : property.compound;
      if (!compoundId) return { videos: [] };
      
      try {
        const response = await videosAPI.getVideosByCompound(compoundId);
        return response.data;
      } catch (err) {
        console.error('Error fetching compound videos:', err);
        return { videos: [] };
      }
    },
    {
      enabled: !!property?.compound && (typeof property.compound === 'object' ? !!property.compound._id : !!property.compound),
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000
    }
  );

  // Determine which video to show (priority: property > compound)
  const propertyVideos = propertyVideosData?.videos || [];
  const compoundVideos = compoundVideosData?.videos || [];
  const hasVideo = propertyVideos.length > 0 || compoundVideos.length > 0;
  const firstVideo = propertyVideos[0] || compoundVideos[0];
  const videoUrl = firstVideo ? `/videos/${firstVideo._id || firstVideo.id}` : null;

  // If multiple videos, check for playlist
  const allVideos = [...propertyVideos, ...compoundVideos];
  const hasMultipleVideos = allVideos.length > 1;
  
  const compoundId = property?.compound && typeof property.compound === 'object' ? property.compound._id : (typeof property?.compound === 'string' ? property.compound : null);
  
  const { data: playlistData } = useQuery(
    ['auto-playlist-compound', compoundId],
    async () => {
      if (!hasMultipleVideos || !compoundId) return null;
      try {
        const response = await videoPlaylistsAPI.getAutoPlaylistForCompound(compoundId);
        return response.data;
      } catch (err) {
        console.error('Error fetching compound playlist:', err);
        return null;
      }
    },
    {
      enabled: hasMultipleVideos && !!compoundId,
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000
    }
  );

  const playlist = playlistData?.playlist;
  const playlistUrl = playlist ? `/videos/playlist/${playlist._id || playlist.id}` : null;

  // Fetch city data for appreciation rate
  const { data: cityData } = useQuery(
    ['city-for-property', property?.city_ref?._id || property?.location?.city],
    async () => {
      if (!property) return null;

      try {
        // Priority 1: Use hierarchical city_ref if available (already populated)
        if (property.city_ref && property.city_ref._id) {
          return property.city_ref; // Already populated with appreciation rate
        }

        // Priority 2: Fetch by old location.city
        if (property.location?.city) {
        const response = await citiesAPI.getCities({ 
            search: property.location.city,
          limit: 1 
        });
        // Find exact match (case-insensitive)
        const city = response.data?.cities?.find(
            c => c.name.toLowerCase() === property.location.city.toLowerCase()
        );
        return city || null;
        }

        return null;
      } catch (err) {
        console.error('City fetch error:', err);
        return null;
      }
    },
    {
      enabled: !!(data?.property?.city_ref?._id || data?.property?.location?.city),
      staleTime: 10 * 60 * 1000, // 10 minutes
      retry: 1
    }
  );

  // Set active image to hero image when property loads
  useEffect(() => {
    if (data?.property?.images) {
      const heroIndex = data.property.images.findIndex(img => img.isHero);
      if (heroIndex !== -1) {
        setActiveImageIndex(heroIndex);
      }
    }
  }, [data?.property?.images]);

  const onSubmitInquiry = async (inquiryData) => {
    try {
      // Transform the form data to match server expectations
      const transformedData = {
        contactInfo: {
          name: inquiryData.contactInfo?.name || '',
          email: inquiryData.contactInfo?.email || '',
          phone: inquiryData.contactInfo?.phone || ''
        },
        message: inquiryData.message || ''
      };

      await inquiriesAPI.createInquiry(id, transformedData);
      showSuccess(t('propertyDetail.inquiry.successTitle'), t('propertyDetail.inquiry.successSubtitle'));
      setShowInquiryForm(false);
      reset(); // Clear the form
    } catch (error) {
      console.error('Inquiry submission error:', error);
      console.error('Error response:', error.response?.data);
      showError(
        t('propertyDetail.inquiry.errorTitle'),
        error.response?.data?.message || error.message || t('propertyDetail.errors.noMessage')
      );
    }
  };

  const handleFavorite = () => {
    setIsFavorited(!isFavorited);
    showSuccess(
      isFavorited ? t('properties.toast.removed') : t('properties.toast.added')
    );
  };

  const handleShare = async () => {
    const url = window.location.href;
    const propertyTypeLabel = property ? getPropertyTypeLabel(property.type) : '';
    const currencyLabel = getCurrencyLabel(property?.currency || '');
    const priceString =
      property?.price != null
        ? t('properties.cards.price', {
            value: formatNumber(property.price),
            currency: currencyLabel
          })
        : t('propertyDetail.price.onRequest');
    const shareText = property
      ? t('properties.cards.shareText', {
          type: propertyTypeLabel,
          title: property.title,
          price: priceString
        })
      : t('propertyDetail.share.fallback');
    
    // Check if Web Share API is available (mobile devices)
    if (navigator.share) {
      try {
        await navigator.share({
          title: property?.title || t('propertyDetail.share.title'),
          text: shareText,
          url: url
        });
        showSuccess(t('properties.toast.shareSuccess'));
      } catch (error) {
        // User cancelled or error occurred
        if (error.name !== 'AbortError') {
          console.error('Error sharing:', error);
          // Fallback to clipboard
          await copyToClipboard(url);
        }
      }
    } else {
      // Fallback to clipboard for desktop
      await copyToClipboard(url);
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


  if (isLoading) {
    return (
      <PageLayout showMobileNav={true}>
      <div className="min-h-screen bg-[#131c2b] flex items-center justify-center px-4" dir={i18n.dir()}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#A88B32] mx-auto mb-4"></div>
          <p className="text-gray-300 text-sm md:text-base">{t('propertyDetail.loading.message')}</p>
        </div>
      </div>
      </PageLayout>
    );
  }

  if (error || !data || !data.property) {
    return (
      <PageLayout showMobileNav={true}>
      <div className="min-h-screen bg-[#131c2b] flex items-center justify-center px-4" dir={i18n.dir()}>
        <div className="text-center max-w-md">
          <p className="text-red-400 mb-3 md:mb-4 text-base md:text-lg font-semibold">{t('propertyDetail.errors.notFound')}</p>
          <p className="text-gray-400 mb-2 text-xs md:text-sm">{t('propertyDetail.errors.id', { id })}</p>
          <p className="text-gray-400 mb-4 md:mb-6 text-xs md:text-sm">
            {t('propertyDetail.errors.message', { message: error?.message || t('propertyDetail.errors.noMessage') })}
          </p>
          <Link to="/properties" className="inline-block px-6 py-3 bg-gradient-to-r from-[#A88B32] to-[#C09C3D] text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-[#A88B32]/30 transition-all text-sm md:text-base">
            {t('propertyDetail.errors.back')}
          </Link>
        </div>
      </div>
      </PageLayout>
    );
  }

  const propertyTitle = property?.title || t('propertyDetail.titleFallback');
  const metaDescription =
    property?.description?.substring(0, 160) || t('propertyDetail.metaDescriptionFallback');
  const currencyLabel = getCurrencyLabel(property?.currency || '');
  const priceLabel =
    property?.price != null
      ? t('propertyDetail.price.label', {
          value: formatNumber(property.price),
          currency: currencyLabel
        })
      : t('propertyDetail.price.onRequest');
  const statusKey = (property?.status || '').toLowerCase().replace(/\s+/g, '-');
  const statusLabel =
    property?.status != null
      ? t(`propertyDetail.status.${statusKey}`, {
          defaultValue: property.status.replace('-', ' ')
        })
      : '';
  const pricePerSqmValue =
    property?.price && property?.specifications?.area
      ? Math.round(property.price / property.specifications.area)
      : null;
  const compound = property?.compound || null;
  const compoundStatusLabel = compound?.status
    ? t(`compound.status.${compound.status}`, { defaultValue: compound.status.replace('-', ' ') })
    : null;
  const compoundLaunchLabel = compound?.launchDate
    ? dateFormatter.format(new Date(compound.launchDate))
    : null;
  const compoundHandoverLabel = compound?.handoverDate
    ? dateFormatter.format(new Date(compound.handoverDate))
    : null;
  const compoundLocationLabel = compound
    ? [compound.area_ref?.name, compound.city_ref?.name, compound.governorate_ref?.name]
        .filter(Boolean)
        .join(locationSeparator)
    : '';
  const compoundDeveloperName = compound?.developer?.name || '';
  const isCompoundOverview = Boolean(property?.isCompound);

  // Generate SEO tags
  const propertyImage = property?.images && property.images.length > 0 
    ? property.images[0].url 
    : '/HEROOOO.png';
  
  const seoTags = generateSEOTags({
    title: t('propertyDetail.metaTitle', { title: propertyTitle }),
    description: metaDescription,
    url: getCanonicalUrl(`/properties/${id}`),
    image: propertyImage,
    type: 'product',
    locale: i18n.language === 'ar' ? 'ar' : 'en',
    alternateLocale: i18n.language === 'ar' ? 'en' : 'ar',
    keywords: `${propertyTitle}, ${getLocationLabel(property)}, ${property?.type || 'property'}, real estate Egypt`
  });

  // Generate structured data
  const realEstateSchema = generateRealEstateListingSchema(property);
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Properties', url: '/properties' },
    { name: propertyTitle, url: `/properties/${id}` }
  ]);

  return (
    <>
      <Helmet>
        <title>{seoTags.title}</title>
        <meta name="description" content={seoTags.description} />
        <meta name="keywords" content={seoTags.keywords} />
        <link rel="canonical" href={seoTags.canonical} />
        
        {/* Open Graph Tags */}
        <meta property="og:title" content={seoTags['og:title']} />
        <meta property="og:description" content={seoTags['og:description']} />
        <meta property="og:image" content={seoTags['og:image']} />
        <meta property="og:image:width" content={seoTags['og:image:width']} />
        <meta property="og:image:height" content={seoTags['og:image:height']} />
        <meta property="og:url" content={seoTags['og:url']} />
        <meta property="og:type" content={seoTags['og:type']} />
        <meta property="og:locale" content={seoTags['og:locale']} />
        <meta property="og:locale:alternate" content={seoTags['og:locale:alternate']} />
        
        {/* Twitter Card Tags */}
        <meta name="twitter:card" content={seoTags['twitter:card']} />
        <meta name="twitter:title" content={seoTags['twitter:title']} />
        <meta name="twitter:description" content={seoTags['twitter:description']} />
        <meta name="twitter:image" content={seoTags['twitter:image']} />
        
        {/* Language Alternates */}
        <link rel="alternate" hrefLang="en" href={getCanonicalUrl(`/properties/${id}`)} />
        <link rel="alternate" hrefLang="ar" href={getCanonicalUrl(`/properties/${id}`)} />
        <link rel="alternate" hrefLang="x-default" href={getCanonicalUrl(`/properties/${id}`)} />
        
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
        />
        <style>{`
          /* Mobile Optimizations */
          * {
            -webkit-tap-highlight-color: transparent;
            touch-action: manipulation;
          }
          
          input, textarea, select {
            font-size: 16px !important;
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
            text-size-adjust: 100%;
          }
          
          @media (max-width: 768px) {
            html, body {
              overflow-x: hidden;
            }
            
            * {
              max-width: 100vw;
            }
          }

          /* Smooth scrolling */
          html {
            scroll-behavior: smooth;
          }
          
          /* Custom scrollbar for dark theme */
          ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          
          ::-webkit-scrollbar-track {
            background: rgba(0, 0, 0, 0.1);
          }
          
          ::-webkit-scrollbar-thumb {
            background: rgba(168, 139, 50, 0.3);
            border-radius: 4px;
          }
          
          ::-webkit-scrollbar-thumb:hover {
            background: rgba(168, 139, 50, 0.5);
          }
        `}</style>
      </Helmet>
      
      {/* Structured Data */}
      <MultipleStructuredData schemas={[realEstateSchema, breadcrumbSchema].filter(Boolean)} />

      <PageLayout showMobileNav={true}>
        <div className="min-h-screen bg-[#131c2b] relative overflow-hidden" dir={i18n.dir()}>
        {/* Background Effects */}
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[#A88B32]/5 via-transparent to-[#A88B32]/10"></div>
          <div className="absolute top-20 right-20 w-72 h-72 bg-[#A88B32]/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 left-20 w-96 h-96 bg-[#A88B32]/5 rounded-full blur-3xl"></div>
        </div>

        <div className="container-max py-4 md:py-8 px-4 md:px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {/* Image Gallery */}
              <div className="relative rounded-2xl md:rounded-3xl border border-white/20 bg-[#131c2b]/40 backdrop-blur-md p-2 md:p-4 shadow-2xl mb-4 md:mb-8 overflow-hidden">
                {/* Card Background Effects */}
                <div className="absolute inset-0 rounded-2xl md:rounded-3xl overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[#A88B32]/5 via-transparent to-[#A88B32]/5"></div>
                </div>

                {property?.images && property.images.length > 0 ? (
                  <>
                    {/* Main Image Display */}
                    <div className="relative z-10">
                      <img
                        src={property.images[activeImageIndex]?.url}
                        alt={property?.title || 'Property'}
                        className="w-full h-56 sm:h-72 md:h-80 lg:h-96 object-cover rounded-xl md:rounded-2xl"
                      />
                      
                      {/* Image Counter */}
                      <div className="absolute bottom-2 left-2 md:bottom-4 md:left-4 bg-[#131c2b]/80 backdrop-blur-sm text-white px-2 py-1 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-semibold border border-[#A88B32]/30">
                        {activeImageIndex + 1} / {property.images.length}
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="absolute top-2 right-2 md:top-4 md:right-4 flex space-x-1.5 md:space-x-2">
                        <button 
                          onClick={handleFavorite}
                          className={`w-9 h-9 md:w-10 md:h-10 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg transition-all touch-manipulation ${
                            isFavorited 
                              ? 'bg-red-500 text-white active:bg-red-600 shadow-red-500/50' 
                              : 'bg-[#131c2b]/80 text-white active:bg-[#A88B32] border border-white/30 shadow-[#131c2b]/50'
                          }`}
                        >
                          <FiHeart className={`w-4 h-4 md:w-5 md:h-5 ${isFavorited ? 'fill-current' : ''}`} />
                        </button>
                        <button 
                          onClick={handleShare}
                          className="w-9 h-9 md:w-10 md:h-10 bg-[#131c2b]/80 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg shadow-[#131c2b]/50 active:bg-[#A88B32] transition-all text-white border border-white/30 touch-manipulation"
                          aria-label={t('properties.cards.shareTooltip')}
                          title={t('properties.cards.shareTooltip')}
                        >
                          <FiShare2 className="w-4 h-4 md:w-5 md:h-5" />
                        </button>
                      </div>
                      
                      {/* Navigation Arrows */}
                      {property.images.length > 1 && (
                        <>
                          <button
                            onClick={() => setActiveImageIndex(prev => prev > 0 ? prev - 1 : property.images.length - 1)}
                            className="absolute left-2 md:left-4 top-1/2 transform -translate-y-1/2 w-9 h-9 md:w-10 md:h-10 bg-[#131c2b]/80 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg shadow-[#131c2b]/50 active:bg-[#A88B32] transition-all text-white border border-white/30 text-base md:text-lg font-bold touch-manipulation"
                          >
                            ←
                          </button>
                          <button
                            onClick={() => setActiveImageIndex(prev => prev < property.images.length - 1 ? prev + 1 : 0)}
                            className="absolute right-2 md:right-4 top-1/2 transform -translate-y-1/2 w-9 h-9 md:w-10 md:h-10 bg-[#131c2b]/80 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg shadow-[#131c2b]/50 active:bg-[#A88B32] transition-all text-white border border-white/30 text-base md:text-lg font-bold touch-manipulation"
                          >
                            →
                          </button>
                        </>
                      )}
                    </div>
                    
                    {/* Image Thumbnails */}
                    {property.images.length > 1 && (
                      <div className="p-2 md:p-4 relative z-10">
                        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-1.5 md:gap-2">
                          {property.images.map((image, index) => (
                            <button
                              key={index}
                              onClick={() => setActiveImageIndex(index)}
                              className={`relative h-12 sm:h-14 md:h-16 rounded-md md:rounded-lg overflow-hidden group transition-all touch-manipulation ${
                                index === activeImageIndex 
                                  ? 'ring-2 ring-[#A88B32] scale-105' 
                                  : 'ring-1 ring-white/20 active:ring-[#A88B32]/50'
                              }`}
                            >
                              <img
                                src={image.url}
                                alt={image.caption || `${property?.title || 'Property'} ${index + 1}`}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                              />
                              {image.isHero && (
                                <div className="absolute top-0.5 left-0.5 md:top-1 md:left-1 bg-[#A88B32] text-white text-[10px] md:text-xs px-1 md:px-2 py-0.5 rounded font-semibold">
                                  {t('propertyDetail.gallery.hero')}
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                        
                        {/* Image Caption */}
                        {property.images[activeImageIndex]?.caption && (
                          <p className="text-xs md:text-sm text-gray-300 mt-2 md:mt-3 text-center">
                            {property.images[activeImageIndex].caption}
                          </p>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="h-56 sm:h-72 md:h-96 bg-white/5 flex items-center justify-center rounded-xl md:rounded-2xl border border-white/10">
                    <span className="text-sm md:text-base text-gray-400">{t('propertyDetail.gallery.noImages')}</span>
                  </div>
                )}
              </div>

              {/* Property Details */}
              <div className="relative rounded-2xl md:rounded-3xl border border-white/20 bg-[#131c2b]/40 backdrop-blur-md p-4 md:p-6 lg:p-8 shadow-2xl mb-4 md:mb-8 overflow-hidden">
                {/* Card Background Effects */}
                <div className="absolute inset-0 rounded-2xl md:rounded-3xl overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[#A88B32]/5 via-transparent to-[#A88B32]/5"></div>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4 md:mb-6 relative z-10">
                  <div className="flex-1 w-full sm:w-auto">
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-2">{propertyTitle}</h1>
                    <div className={`flex items-center text-gray-300 text-sm md:text-base mb-2 md:mb-4 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                      <FiMapPin className={`w-4 h-4 md:w-5 md:h-5 text-[#A88B32] flex-shrink-0 ${inlineMarginClass}`} />
                      <span className="line-clamp-2">{getLocationLabel(property)}</span>
                    </div>
                  </div>
                  <div className={`${isRTL ? 'text-right' : 'text-left'} sm:text-right w-full sm:w-auto sm:flex-shrink-0`}>
                    <div className="text-2xl sm:text-2xl md:text-3xl font-bold text-[#A88B32] mb-1 md:mb-2">
                      {priceLabel}
                    </div>
                    {statusLabel && (
                      <div className="text-xs md:text-sm text-gray-300 capitalize">
                        {statusLabel}
                      </div>
                    )}
                    {isCompoundOverview && (
                      <div className="mt-1 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-500/15 text-blue-200 text-xs font-semibold border border-blue-500/30">
                        <FiLayers className="w-3.5 h-3.5" />
                        {t('propertyDetail.compound.overviewBadge')}
                      </div>
                    )}
                  </div>
                </div>

                {/* Watch Video, Floor Plan & Master Plan Buttons */}
                <div className="flex flex-wrap gap-2 md:gap-3 mb-4 md:mb-6 relative z-10">
                  {hasVideo && (
                    <Link
                      to={playlistUrl || videoUrl || '#'}
                      className="flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 bg-gradient-to-r from-[#A88B32]/20 to-[#C09C3D]/20 border-2 border-[#A88B32] text-[#A88B32] font-semibold rounded-lg hover:bg-gradient-to-r hover:from-[#A88B32] hover:to-[#C09C3D] hover:text-white active:from-[#A88B32] active:to-[#C09C3D] active:text-white transition-all text-sm md:text-base touch-manipulation"
                    >
                      <FiVideo className="w-4 h-4 md:w-5 md:h-5" />
                      <span>
                        {hasMultipleVideos && playlist
                          ? t('propertyDetail.watchVideo.playlist', { defaultValue: 'Watch Videos' })
                          : t('propertyDetail.watchVideo.single', { defaultValue: 'Watch Video' })}
                      </span>
                    </Link>
                  )}
                  
                  {property?.floorPlan?.url ? (
                    <a
                      href={property.floorPlan.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 bg-gradient-to-r from-[#A88B32]/20 to-[#C09C3D]/20 border-2 border-[#A88B32] text-[#A88B32] font-semibold rounded-lg hover:bg-gradient-to-r hover:from-[#A88B32] hover:to-[#C09C3D] hover:text-white active:from-[#A88B32] active:to-[#C09C3D] active:text-white transition-all text-sm md:text-base touch-manipulation"
                    >
                      <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>{t('propertyDetail.floorPlan.view')}</span>
                    </a>
                  ) : (
                    <div className="flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 bg-white/5 border-2 border-white/20 text-gray-400 font-semibold rounded-lg text-sm md:text-base opacity-60">
                      <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>{t('propertyDetail.floorPlan.unavailable')}</span>
                    </div>
                  )}
                  
                  {property?.masterPlan?.url ? (
                    <a
                      href={property.masterPlan.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 bg-gradient-to-r from-[#A88B32]/20 to-[#C09C3D]/20 border-2 border-[#A88B32] text-[#A88B32] font-semibold rounded-lg hover:bg-gradient-to-r hover:from-[#A88B32] hover:to-[#C09C3D] hover:text-white active:from-[#A88B32] active:to-[#C09C3D] active:text-white transition-all text-sm md:text-base touch-manipulation"
                    >
                      <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                      <span>{t('propertyDetail.masterPlan.view')}</span>
                    </a>
                  ) : (
                    <div className="flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 bg-white/5 border-2 border-white/20 text-gray-400 font-semibold rounded-lg text-sm md:text-base opacity-60">
                      <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                      <span>{t('propertyDetail.masterPlan.unavailable')}</span>
                    </div>
                  )}
                </div>

                {/* Developer Information */}
                {(property?.developerStatus || property?.developer) && (
                  <div className="mb-6 md:mb-8 relative z-10">
                    <h2 className="text-lg md:text-xl lg:text-2xl font-semibold text-white mb-3 md:mb-4">{t('propertyDetail.developer.heading')}</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                      {property?.developerStatus && (
                        <div className="p-3 md:p-4 bg-[#A88B32]/20 rounded-lg border border-[#A88B32]/30 backdrop-blur-sm">
                          <div className="text-xs md:text-sm text-gray-300 mb-1">{t('propertyDetail.developer.status')}</div>
                          <div className="text-base md:text-lg font-semibold text-[#A88B32] capitalize">
                            {property.developerStatus.replace('-', ' ')}
                          </div>
                        </div>
                      )}
                      {property?.developer && (
                        <Link 
                          to={`/developers/${property.developer.slug}`}
                          className="p-3 md:p-4 bg-gradient-to-br from-[#A88B32]/10 to-[#A88B32]/5 rounded-lg hover:from-[#A88B32]/20 hover:to-[#A88B32]/10 active:from-[#A88B32]/20 active:to-[#A88B32]/10 transition-all border border-[#A88B32]/30 hover:border-[#A88B32]/50 group backdrop-blur-sm touch-manipulation"
                        >
                          <div className="flex items-center gap-2 md:gap-3">
                            {property.developer.logo && (
                              <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-lg flex items-center justify-center p-1.5 md:p-2 shadow-sm group-hover:shadow-md transition-shadow flex-shrink-0">
                                <img 
                                  src={typeof property.developer.logo === 'string' ? property.developer.logo : property.developer.logo.url} 
                                  alt={property.developer.name}
                                  className="w-full h-full object-contain"
                                />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="text-xs md:text-sm text-gray-300 mb-0.5 md:mb-1">{t('propertyDetail.developer.label')}</div>
                              <div className="text-sm md:text-base lg:text-lg font-semibold text-[#A88B32] group-hover:text-[#C09C3D] transition-colors truncate">
                                {property.developer.name}
                              </div>
                              <div className="text-[10px] md:text-xs text-gray-300 mt-0.5 md:mt-1 flex items-center gap-1">
                                {t('propertyDetail.developer.viewAll')}
                                <svg className="w-2.5 h-2.5 md:w-3 md:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </div>
                            </div>
                          </div>
                          {property.developer.description && (
                            <p className="text-xs md:text-sm text-gray-300 mt-2 md:mt-3 line-clamp-2">
                              {property.developer.description}
                            </p>
                          )}
                        </Link>
                      )}
                    </div>
                  </div>
                )}

                {compound && (
                  <div className="mb-6 md:mb-8 relative z-10">
                    <h2 className="text-lg md:text-xl lg:text-2xl font-semibold text-white mb-3 md:mb-4">
                      {t('propertyDetail.compound.heading')}
                    </h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                      <div className="p-4 md:p-5 bg-white/5 border border-white/10 rounded-xl backdrop-blur-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-base md:text-lg font-semibold text-white">
                              {compound.name}
                            </div>
                            {compoundLocationLabel && (
                              <div className="text-xs md:text-sm text-slate-300 mt-1">
                                {compoundLocationLabel}
                              </div>
                            )}
                          </div>
                          {compoundStatusLabel && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-500/15 text-blue-200 text-xs font-semibold border border-blue-500/30">
                              <FiLayers className="w-3.5 h-3.5" />
                              {compoundStatusLabel}
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                          {compoundLaunchLabel && (
                            <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                              <div className="text-xs text-slate-400 uppercase tracking-wide">
                                {t('propertyDetail.compound.launchDate')}
                              </div>
                              <div className="text-sm font-semibold text-white mt-1">
                                {compoundLaunchLabel}
                              </div>
                            </div>
                          )}
                          {compoundHandoverLabel && (
                            <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                              <div className="text-xs text-slate-400 uppercase tracking-wide">
                                {t('propertyDetail.compound.handoverDate')}
                              </div>
                              <div className="text-sm font-semibold text-white mt-1">
                                {compoundHandoverLabel}
                              </div>
                            </div>
                          )}
                        </div>

                        {compoundDeveloperName && (
                          <div className="mt-4 text-sm text-slate-300">
                            {t('propertyDetail.compound.developer', { developer: compoundDeveloperName })}
                          </div>
                        )}

                        <div className="mt-3 text-xs text-slate-400 leading-relaxed">
                          {isCompoundOverview
                            ? t('propertyDetail.compound.overviewDescription')
                            : t('propertyDetail.compound.linkedDescription')}
                        </div>
                      </div>

                      {compound.heroImage?.url ? (
                        <div className="rounded-xl overflow-hidden border border-white/10 bg-white/5">
                          <img
                            src={compound.heroImage.url}
                            alt={compound.name}
                            className="w-full h-48 sm:h-56 md:h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="rounded-xl border border-white/10 bg-white/5 flex items-center justify-center p-6 text-sm text-slate-400">
                          {t('propertyDetail.compound.noHero')}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Specifications */}
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 lg:gap-4 mb-6 md:mb-8 relative z-10">
                    {property?.specifications?.bedrooms != null && (
                    <div className="text-center p-3 md:p-4 bg-white/5 rounded-lg border border-white/10 backdrop-blur-sm">
                      <FiBed className="w-5 h-5 md:w-6 md:h-6 text-[#A88B32] mx-auto mb-1 md:mb-2" />
                      <div className="text-base md:text-lg font-semibold text-[#A88B32]">{property.specifications.bedrooms}</div>
                      <div className="text-xs md:text-sm text-gray-300">{t('propertyDetail.specs.bedrooms')}</div>
                    </div>
                  )}
                  {property?.specifications?.bathrooms != null && (
                    <div className="text-center p-3 md:p-4 bg-white/5 rounded-lg border border-white/10 backdrop-blur-sm">
                      <FiDroplet className="w-5 h-5 md:w-6 md:h-6 text-[#A88B32] mx-auto mb-1 md:mb-2" />
                      <div className="text-base md:text-lg font-semibold text-[#A88B32]">{property.specifications.bathrooms}</div>
                      <div className="text-xs md:text-sm text-gray-300">{t('propertyDetail.specs.bathrooms')}</div>
                    </div>
                  )}
                  <div className="text-center p-3 md:p-4 bg-white/5 rounded-lg border border-white/10 backdrop-blur-sm">
                    <FiMaximize className="w-5 h-5 md:w-6 md:h-6 text-[#A88B32] mx-auto mb-1 md:mb-2" />
                    <div className="text-base md:text-lg font-semibold text-[#A88B32]">{formatNumber(property?.specifications?.area || 0)}</div>
                    <div className="text-xs md:text-sm text-gray-300">{t('propertyDetail.specs.areaUnit')}</div>
                  </div>
                  {property?.specifications?.parking != null && (
                    <div className="text-center p-3 md:p-4 bg-white/5 rounded-lg border border-white/10 backdrop-blur-sm">
                      <FiCar className="w-5 h-5 md:w-6 md:h-6 text-[#A88B32] mx-auto mb-1 md:mb-2" />
                      <div className="text-base md:text-lg font-semibold text-[#A88B32]">{property.specifications.parking}</div>
                      <div className="text-xs md:text-sm text-gray-300">{t('propertyDetail.specs.parking')}</div>
                    </div>
                  )}
                </div>

                {/* Description */}
                <div className="mb-6 md:mb-8 relative z-10">
                  <h2 className="text-lg md:text-xl lg:text-2xl font-semibold text-white mb-3 md:mb-4">{t('propertyDetail.description.heading')}</h2>
                  <p className="text-sm md:text-base text-gray-300 leading-relaxed">{property?.description || t('propertyDetail.description.empty')}</p>
                </div>

                {/* Features */}
                {property?.features && property.features.length > 0 && (
                  <div className="mb-6 md:mb-8 relative z-10">
                    <h2 className="text-lg md:text-xl lg:text-2xl font-semibold text-white mb-3 md:mb-4">{t('propertyDetail.features.heading')}</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
                      {property.features.map((feature, index) => (
                        <div key={index} className={`flex items-center text-gray-300 text-sm md:text-base ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                          <div className={`w-1.5 h-1.5 md:w-2 md:h-2 bg-[#A88B32] rounded-full flex-shrink-0 ${isRTL ? 'ml-2 md:ml-3' : 'mr-2 md:mr-3'}`}></div>
                          <span className="capitalize">{feature.replace('-', ' ')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Investment Info */}
                {property?.investment && (
                  <div className="mb-6 md:mb-8 relative z-10">
                    <h2 className="text-lg md:text-xl lg:text-2xl font-semibold text-white mb-3 md:mb-4">{t('propertyDetail.investment.heading')}</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                      {property.investment.expectedROI && (
                        <div className="text-center p-3 md:p-4 bg-green-500/10 rounded-lg border border-green-500/30 backdrop-blur-sm">
                          <div className="text-xl md:text-2xl font-bold text-green-400">
                            {property.investment.expectedROI}%
                          </div>
                          <div className="text-xs md:text-sm text-gray-300">{t('propertyDetail.investment.expectedROI')}</div>
                        </div>
                      )}
                      {property.investment.rentalYield && (
                        <div className="text-center p-3 md:p-4 bg-blue-500/10 rounded-lg border border-blue-500/30 backdrop-blur-sm">
                          <div className="text-xl md:text-2xl font-bold text-blue-400">
                            {property.investment.rentalYield}%
                          </div>
                          <div className="text-xs md:text-sm text-gray-300">{t('propertyDetail.investment.rentalYield')}</div>
                        </div>
                      )}
                      <div className="text-center p-3 md:p-4 bg-purple-500/10 rounded-lg border border-purple-500/30 backdrop-blur-sm">
                        <div className="text-xl md:text-2xl font-bold text-purple-400">
                          {pricePerSqmValue != null ? formatNumber(pricePerSqmValue) : '0'}
                        </div>
                        <div className="text-xs md:text-sm text-gray-300">
                          {t('propertyDetail.investment.pricePerSqm', { unit: t('propertyDetail.specs.areaUnit') })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Property Location Map */}
              {property?.location?.coordinates?.latitude && property?.location?.coordinates?.longitude && (
                <div className="relative rounded-2xl md:rounded-3xl border border-white/20 bg-[#131c2b]/40 backdrop-blur-md p-4 md:p-6 lg:p-8 shadow-2xl mb-4 md:mb-8 overflow-hidden">
                  {/* Card Background Effects */}
                  <div className="absolute inset-0 rounded-2xl md:rounded-3xl overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[#A88B32]/5 via-transparent to-[#A88B32]/5"></div>
                  </div>

                  <h2 className="text-lg md:text-xl lg:text-2xl font-semibold text-white mb-4 md:mb-6 relative z-10">{t('propertyDetail.location.heading')}</h2>
                  <OpenStreetMapComponent
                    latitude={property.location.coordinates.latitude}
                    longitude={property.location.coordinates.longitude}
                    title={propertyTitle}
                    address={getLocationLabel(property)}
                    price={property?.price}
                    currency={property?.currency}
                    image={property?.images?.[0]?.url}
                    className="w-full"
                  />
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              {/* Inquiry Form */}
              <div className="relative rounded-2xl md:rounded-3xl border border-white/20 bg-[#131c2b]/40 backdrop-blur-md p-4 md:p-6 shadow-2xl mb-4 md:mb-8 overflow-hidden">
                {/* Card Background Effects */}
                <div className="absolute inset-0 rounded-2xl md:rounded-3xl overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[#A88B32]/5 via-transparent to-[#A88B32]/5"></div>
                </div>

                <h3 className="text-lg md:text-xl font-semibold text-white mb-3 md:mb-4 relative z-10">{t('propertyDetail.inquiry.heading')}</h3>
                
                {!showInquiryForm ? (
                  <div className="space-y-3 md:space-y-4 relative z-10">
                    <button
                      onClick={() => setShowInquiryForm(true)}
                      className="w-full px-4 md:px-6 py-3 md:py-3.5 bg-gradient-to-r from-[#A88B32] to-[#C09C3D] text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-[#A88B32]/30 transition-all active:-translate-y-0.5 text-sm md:text-base touch-manipulation"
                    >
                      {isAuthenticated ? t('propertyDetail.inquiry.cta') : t('propertyDetail.inquiry.ctaLogin')}
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit(onSubmitInquiry)} className="space-y-3 md:space-y-4 relative z-10">
                    {isAuthenticated ? (
                      <div className="mb-3 md:mb-4 p-2.5 md:p-3 bg-green-500/10 border border-green-500/30 rounded-lg backdrop-blur-sm">
                        <p className="text-xs md:text-sm text-green-300">
                          {t('propertyDetail.inquiry.loggedIn', { name: user?.name, email: user?.email })}
                        </p>
                        <p className="text-[10px] md:text-xs text-gray-300 mt-1">
                          {t('propertyDetail.inquiry.loggedInNote')}
                        </p>
                      </div>
                    ) : (
                      <div className="mb-3 md:mb-4 p-2.5 md:p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg backdrop-blur-sm">
                        <p className="text-xs md:text-sm text-yellow-300">
                          {t('propertyDetail.inquiry.guest')}
                        </p>
                        <p className="text-[10px] md:text-xs text-gray-300 mt-1">
                          <Link to="/login" className="underline hover:text-[#A88B32]">
                            {t('propertyDetail.inquiry.loginPrompt')}
                          </Link> {t('propertyDetail.inquiry.loginNote')}
                        </p>
                      </div>
                    )}

                    <div>
                      <input
                        type="text"
                        placeholder={t('propertyDetail.inquiry.labels.name')}
                        className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:border-[#A88B32] focus:outline-none focus:ring-2 focus:ring-[#A88B32]/30 disabled:opacity-50 text-sm md:text-base"
                        style={{ fontSize: '16px' }}
                        {...register('contactInfo.name', { required: t('propertyDetail.inquiry.validation.nameRequired') })}
                        disabled={isAuthenticated}
                      />
                      {errors.contactInfo?.name && (
                        <p className="text-red-400 text-xs md:text-sm mt-1">{errors.contactInfo.name.message}</p>
                      )}
                    </div>

                    <div>
                      <input
                        type="email"
                        placeholder={t('propertyDetail.inquiry.labels.email')}
                        className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:border-[#A88B32] focus:outline-none focus:ring-2 focus:ring-[#A88B32]/30 disabled:opacity-50 text-sm md:text-base"
                        style={{ fontSize: '16px' }}
                        {...register('contactInfo.email', { 
                          required: t('propertyDetail.inquiry.validation.emailRequired'),
                          pattern: {
                            value: /^\S+@\S+$/i,
                            message: t('propertyDetail.inquiry.validation.emailInvalid')
                          }
                        })}
                        disabled={isAuthenticated}
                      />
                      {errors.contactInfo?.email && (
                        <p className="text-red-400 text-xs md:text-sm mt-1">{errors.contactInfo.email.message}</p>
                      )}
                    </div>

                    <div>
                      <input
                        type="tel"
                        placeholder={t('propertyDetail.inquiry.labels.phone')}
                        className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:border-[#A88B32] focus:outline-none focus:ring-2 focus:ring-[#A88B32]/30 disabled:opacity-50 text-sm md:text-base"
                        style={{ fontSize: '16px' }}
                        {...register('contactInfo.phone', { 
                          required: t('propertyDetail.inquiry.validation.phoneRequired'),
                          pattern: {
                            value: /^[+]?[1-9][\d]{0,15}$/,
                            message: t('propertyDetail.inquiry.validation.phoneInvalid')
                          }
                        })}
                        disabled={isAuthenticated}
                      />
                      {errors.contactInfo?.phone && (
                        <p className="text-red-400 text-xs md:text-sm mt-1">{errors.contactInfo.phone.message}</p>
                      )}
                    </div>

                    <div>
                      <textarea
                        placeholder={t('propertyDetail.inquiry.labels.message')}
                        rows="4"
                        className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:border-[#A88B32] focus:outline-none focus:ring-2 focus:ring-[#A88B32]/30 resize-none text-sm md:text-base"
                        style={{ fontSize: '16px' }}
                        {...register('message', { 
                          required: t('propertyDetail.inquiry.validation.messageRequired'),
                          minLength: {
                            value: 10,
                            message: t('propertyDetail.inquiry.validation.messageMin')
                          },
                          maxLength: {
                            value: 1000,
                            message: t('propertyDetail.inquiry.validation.messageMax')
                          }
                        })}
                      />
                      {errors.message && (
                        <p className="text-red-400 text-xs md:text-sm mt-1">{errors.message.message}</p>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                      <button
                        type="submit"
                        className="flex-1 px-4 md:px-6 py-2.5 md:py-3 bg-gradient-to-r from-[#A88B32] to-[#C09C3D] text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-[#A88B32]/30 transition-all active:-translate-y-0.5 text-sm md:text-base touch-manipulation"
                      >
                        {t('propertyDetail.inquiry.buttons.submit')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowInquiryForm(false)}
                        className="px-4 md:px-6 py-2.5 md:py-3 border-2 border-white/20 text-white font-semibold rounded-lg hover:border-[#A88B32] hover:text-[#A88B32] active:border-[#A88B32] active:text-[#A88B32] transition-all text-sm md:text-base touch-manipulation"
                      >
                        {t('propertyDetail.inquiry.buttons.cancel')}
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* ROI Calculator */}
              {property?.price && (
                <PropertyROICalculator
                  propertyPrice={property.price}
                  appreciationRate={cityData?.annualAppreciationRate || 8}
                  cityName={property.city_ref?.name || property.location?.city}
                />
              )}

            </div>
          </div>
        </div>
      </div>
      </PageLayout>
    </>
  );
};

export default PropertyDetail;
