import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { launchesAPI } from '../utils/api';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import PageLayout from '../components/layout/PageLayout';
import {
  FiSearch,
  FiFilter,
  FiMapPin,
  FiCalendar,
  FiDollarSign,
  FiHome,
  FiArrowRight,
  FiAward,
  FiClock,
  FiCheck,
  FiX,
  FiChevronDown
} from 'react-icons/fi';
import { useTranslation } from 'react-i18next';

gsap.registerPlugin(ScrollTrigger);

const Launches = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';
  const numberFormatter = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [propertyTypeFilter, setPropertyTypeFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Refs for animations
  const heroRef = useRef(null);
  const cardsRef = useRef(null);
  const filtersRef = useRef(null);

  // Fetch all launches
  const { data: launchesData, isLoading } = useQuery(
    ['launches', searchTerm, statusFilter, propertyTypeFilter],
    async () => {
      const params = {
        page: 1,
        limit: 50,
        search: searchTerm,
        status: statusFilter,
        propertyType: propertyTypeFilter,
        sortBy: 'launchDate',
        sortOrder: 'desc'
      };

      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === null || params[key] === undefined) {
          delete params[key];
        }
      });

      const response = await launchesAPI.get('/launches', { params });
      return response.data;
    },
    {
      keepPreviousData: true,
      staleTime: 5 * 60 * 1000,
    }
  );

  const launches = launchesData?.data || [];

  // GSAP Animations
  useEffect(() => {
    const ctx = gsap.context(() => {
      // Hero animation
      if (heroRef.current) {
        gsap.fromTo(
          heroRef.current.querySelectorAll('.hero-text'),
          { opacity: 0, y: 30 },
          {
            opacity: 1,
            y: 0,
            duration: 1,
            stagger: 0.2,
            ease: 'power3.out',
          }
        );
      }

      // Cards animation
      if (cardsRef.current && launches.length > 0) {
        ScrollTrigger.create({
          trigger: cardsRef.current,
          start: 'top 80%',
          onEnter: () => {
            gsap.fromTo(
              cardsRef.current.querySelectorAll('.launch-card'),
              { opacity: 0, y: 40 },
              {
                opacity: 1,
                y: 0,
                duration: 0.8,
                stagger: 0.1,
                ease: 'power3.out',
              }
            );
          },
          once: true,
        });
      }
    });

    return () => ctx.revert();
  }, [launches.length]);

  // Filter animations
  useEffect(() => {
    if (filtersRef.current) {
      if (showFilters) {
        gsap.to(filtersRef.current, {
          height: 'auto',
          opacity: 1,
          duration: 0.3,
          ease: 'power2.out',
        });
      } else {
        gsap.to(filtersRef.current, {
          height: 0,
          opacity: 0,
          duration: 0.3,
          ease: 'power2.in',
        });
      }
    }
  }, [showFilters]);

  const statusOptionDefs = [
    { value: 'Available', color: 'from-emerald-500 to-emerald-600' },
    { value: 'Coming Soon', color: 'from-blue-500 to-blue-600' },
    { value: 'Pre-Launch', color: 'from-orange-500 to-orange-600' },
    { value: 'Sold Out', color: 'from-red-500 to-red-600' }
  ];

  const statusOptions = statusOptionDefs.map((option) => ({
    ...option,
    label: t(`launches.status.${option.value.toLowerCase().replace(/\s+/g, '-')}`, { defaultValue: option.value })
  }));

  const propertyTypeValues = ['Villa', 'Apartment', 'Townhouse', 'Penthouse', 'Duplex', 'Studio', 'Commercial', 'Land'];
  const propertyTypeOptions = propertyTypeValues.map((type) => ({
    value: type,
    label: t(`launches.filters.propertyTypes.${type.toLowerCase()}`, { defaultValue: type })
  }));

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setPropertyTypeFilter('');
  };

  const getStatusColor = (status) => {
    const colors = {
      'Available': 'from-emerald-500 to-emerald-600',
      'Coming Soon': 'from-blue-500 to-blue-600',
      'Pre-Launch': 'from-orange-500 to-orange-600',
      'Sold Out': 'from-red-500 to-red-600'
    };
    return colors[status] || 'from-gray-500 to-gray-600';
  };

  const getStatusIcon = (status) => {
    const icons = {
      'Available': FiCheck,
      'Coming Soon': FiClock,
      'Pre-Launch': FiCalendar,
      'Sold Out': FiX
    };
    return icons[status] || FiClock;
  };

  const translateCurrency = (currency) =>
    currency
      ? t(`launches.currency.${currency.toLowerCase()}`, { defaultValue: currency })
      : '';

  const formatPrice = (price, currency) => {
    if (price == null) {
      return '';
    }
    const formatted = numberFormatter.format(price);
    return t('launches.cards.price', {
      value: formatted,
      currency: translateCurrency(currency || '')
    }).trim();
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  const translateUnit = (unit) =>
    unit ? t(`launches.units.${unit.toLowerCase()}`, { defaultValue: unit }) : '';


  const getDaysUntilLaunch = (launchDate) => {
    const today = new Date();
    const launch = new Date(launchDate);
    const diffTime = launch - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <>
      <Helmet>
        <title>{t('launches.metaTitle')}</title>
        <meta name="description" content={t('launches.metaDescription')} />
      </Helmet>

      <PageLayout showMobileNav={true}>
        <div className="min-h-screen bg-[#131c2b]">
          {/* Hero Section */}
          <section ref={heroRef} className="relative pt-20 pb-10 sm:pt-24 sm:pb-12 md:pt-28 md:pb-16 overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0">
              <div className="absolute inset-0 bg-gradient-to-b from-[#A88B32]/10 via-transparent to-transparent"></div>
              <div className="absolute top-20 right-20 w-64 h-64 sm:w-96 sm:h-96 bg-[#A88B32]/15 rounded-full blur-3xl animate-pulse"></div>
              <div className="absolute bottom-20 left-20 w-64 h-64 sm:w-96 sm:h-96 bg-[#A88B32]/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
              {/* Grid Pattern */}
              <div
                className="absolute inset-0 opacity-[0.02]"
                style={{
                  backgroundImage:
                    'linear-gradient(rgba(168, 139, 50, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(168, 139, 50, 0.1) 1px, transparent 1px)',
                  backgroundSize: '50px 50px',
                }}
              ></div>
            </div>

            <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 relative z-10" style={{ boxSizing: 'border-box' }}>
              <div className="text-center w-full max-w-4xl mx-auto" style={{ boxSizing: 'border-box' }}>
                <div className="hero-text flex items-center justify-center gap-3 mb-4">
                  <div className="h-px w-12 bg-gradient-to-r from-transparent to-[#A88B32]"></div>
                  <p className="text-xs sm:text-sm uppercase tracking-widest text-[#A88B32] font-bold">
                    {t('launches.hero.badge')}
                  </p>
                  <div className="h-px w-12 bg-gradient-to-l from-transparent to-[#A88B32]"></div>
                </div>

                <h1 className="hero-text text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
                  {t('launches.hero.titleLine1')}
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#A88B32] to-[#C09C3D]">
                    {t('launches.hero.titleHighlight')}
                  </span>
                </h1>

                <p className="hero-text text-sm sm:text-base md:text-lg text-gray-300 leading-relaxed max-w-2xl mx-auto">
                  {t('launches.hero.subtitle')}
                </p>
              </div>
            </div>
          </section>

          {/* Search & Filters Section */}
          <section className="w-full py-6 sm:py-8">
            <div className="w-full max-w-7xl mx-auto px-4 sm:px-6" style={{ boxSizing: 'border-box' }}>
              <div className="backdrop-blur-xl bg-gradient-to-br from-white/[0.08] via-white/[0.05] to-white/[0.02] border-2 border-white/10 rounded-xl shadow-xl" style={{ padding: '1.5rem', boxSizing: 'border-box' }}>
                {/* Search Bar */}
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                  <div className="flex-1 relative">
                    <FiSearch className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400`} />
                    <input
                      type="text"
                      placeholder={t('launches.filters.searchPlaceholder')}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className={`w-full ${isRTL ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4'} py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-[#A88B32] focus:outline-none focus:ring-2 focus:ring-[#A88B32]/30 transition-all`}
                    />
                  </div>
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-white/10 border border-white/10 text-white hover:bg-white/20 hover:border-[#A88B32]/30 transition-all"
                  >
                    <FiFilter className="w-5 h-5" />
                    <span>{t('launches.filters.toggle')}</span>
                    <FiChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                {/* Advanced Filters */}
                <div
                  ref={filtersRef}
                  className="overflow-hidden"
                  style={{ height: showFilters ? 'auto' : 0, opacity: showFilters ? 1 : 0 }}
                >
                  <div className="pt-4 border-t border-white/10">
                    {/* Status Filter */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-300 mb-3">{t('launches.filters.statusLabel')}</label>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setStatusFilter('')}
                          className={`px-4 py-2 rounded-lg font-semibold text-xs uppercase tracking-wide transition-all ${
                            statusFilter === ''
                              ? 'bg-gradient-to-r from-[#A88B32] to-[#C09C3D] text-white'
                              : 'bg-white/10 text-gray-300 hover:bg-white/20 border border-white/20'
                          }`}
                        >
                          {t('launches.filters.statusAll')}
                        </button>
                        {statusOptions.map((option) => (
                          <button
                            key={option.value}
                            onClick={() => setStatusFilter(option.value)}
                            className={`px-4 py-2 rounded-lg font-semibold text-xs uppercase tracking-wide transition-all ${
                              statusFilter === option.value
                                ? 'bg-gradient-to-r from-[#A88B32] to-[#C09C3D] text-white'
                                : 'bg-white/10 text-gray-300 hover:bg-white/20 border border-white/20'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Property Type Filter */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-300 mb-3">{t('launches.filters.propertyTypeLabel')}</label>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setPropertyTypeFilter('')}
                          className={`px-4 py-2 rounded-lg font-semibold text-xs uppercase tracking-wide transition-all ${
                            propertyTypeFilter === ''
                              ? 'bg-gradient-to-r from-[#A88B32] to-[#C09C3D] text-white'
                              : 'bg-white/10 text-gray-300 hover:bg-white/20 border border-white/20'
                          }`}
                        >
                          {t('launches.filters.propertyTypeAll')}
                        </button>
                        {propertyTypeOptions.map((type) => (
                          <button
                            key={type.value}
                            onClick={() => setPropertyTypeFilter(type.value)}
                            className={`px-4 py-2 rounded-lg font-semibold text-xs uppercase tracking-wide transition-all ${
                              propertyTypeFilter === type.value
                                ? 'bg-gradient-to-r from-[#A88B32] to-[#C09C3D] text-white'
                                : 'bg-white/10 text-gray-300 hover:bg-white/20 border border-white/20'
                            }`}
                          >
                            {type.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Clear Filters */}
                    <div className="flex justify-end pt-2">
                      <button
                        onClick={clearFilters}
                        className="text-sm text-[#A88B32] hover:text-[#C09C3D] font-medium transition-colors"
                      >
                        {t('launches.filters.clearAll')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Results Count */}
              {!isLoading && (
                <div className="mt-6 text-center">
                  <p className="text-gray-400 text-sm">
                    {t('launches.resultsCount', { count: launches.length })}
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Launches Grid */}
          <section ref={cardsRef} className="w-full py-8 sm:py-10 md:py-12 pb-12 sm:pb-16 md:pb-20">
            <div className="w-full max-w-7xl mx-auto px-4 sm:px-6" style={{ boxSizing: 'border-box' }}>
              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="backdrop-blur-xl bg-gradient-to-br from-white/[0.08] via-white/[0.05] to-white/[0.02] border-2 border-white/10 rounded-xl overflow-hidden animate-pulse" style={{ boxSizing: 'border-box' }}>
                      <div className="h-48 bg-white/5"></div>
                      <div style={{ padding: '1.5rem' }}>
                        <div className="h-4 bg-white/10 rounded mb-2"></div>
                        <div className="h-4 bg-white/10 rounded w-3/4 mb-4"></div>
                        <div className="h-3 bg-white/10 rounded mb-2"></div>
                        <div className="h-3 bg-white/10 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : launches.length === 0 ? (
                <div className="text-center py-20">
                  <FiHome className="mx-auto h-16 w-16 text-gray-600 mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {t('launches.states.empty.title')}
                  </h3>
                  <p className="text-gray-400 mb-6">
                    {t('launches.states.empty.subtitle')}
                  </p>
                  <button
                    onClick={clearFilters}
                    className="px-6 py-3 bg-gradient-to-r from-[#A88B32] to-[#C09C3D] text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-[#A88B32]/50 transition-all"
                  >
                    {t('launches.states.empty.cta')}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {launches.map((launch) => {
                    const StatusIcon = getStatusIcon(launch.status);
                    const daysUntilLaunch = getDaysUntilLaunch(launch.launchDate);
                    const statusKey = (launch.status || '').toLowerCase().replace(/\s+/g, '-');
                    const statusLabel = t(`launches.status.${statusKey}`, { defaultValue: launch.status });
                    const propertyTypeKey = (launch.propertyType || '').toLowerCase().replace(/\s+/g, '-');
                    const propertyTypeLabel = t(`launches.filters.propertyTypes.${propertyTypeKey}`, {
                      defaultValue: launch.propertyType
                    });
                    const priceLabel = formatPrice(launch.startingPrice, launch.currency);
                    const countdownLabel =
                      daysUntilLaunch > 0 ? t('launches.cards.countdown', { count: daysUntilLaunch }) : '';
                    const areaParts = [];
                    if (launch.area) {
                      areaParts.push(
                        t('launches.cards.area', {
                          value: numberFormatter.format(launch.area),
                          unit: translateUnit(launch.areaUnit || 'sqm')
                        })
                      );
                    }
                    if (launch.bedrooms) {
                      areaParts.push(t('launches.cards.bedrooms', { count: launch.bedrooms }));
                    }
                    const detailsLine = areaParts.filter(Boolean).join(' • ');
                    
                    return (
                      <Link
                        key={launch._id}
                        to={`/launches/${launch._id}`}
                        className="launch-card group block w-full"
                        style={{ boxSizing: 'border-box' }}
                      >
                        <article className="w-full h-full backdrop-blur-xl bg-gradient-to-br from-white/[0.08] via-white/[0.05] to-white/[0.02] border-2 border-white/10 rounded-xl overflow-hidden hover:border-[#A88B32]/50 hover:shadow-2xl hover:shadow-[#A88B32]/20 transition-all duration-500 hover:-translate-y-2" style={{ boxSizing: 'border-box' }}>
                          {/* Image */}
                          <div className="relative h-48 overflow-hidden">
                            <img
                              src={launch.image}
                              alt={launch.title}
                              className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                            />
                            {/* Gradient Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-[#131c2b]/60 via-transparent to-transparent"></div>
                            
                            {/* Featured Badge */}
                            {launch.isFeatured && (
                              <div className="absolute top-4 left-4">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#A88B32] to-[#C09C3D] text-white text-xs font-bold rounded-full shadow-lg">
                                  <FiAward className="h-3.5 w-3.5" />
                                  {t('launches.cards.featured')}
                                </span>
                              </div>
                            )}
                            
                            {/* Status Badge */}
                            <div className="absolute top-4 right-4">
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r ${getStatusColor(launch.status)} text-white text-xs font-bold rounded-full shadow-lg backdrop-blur-sm`}>
                                <StatusIcon className="h-3.5 w-3.5" />
                                {statusLabel}
                              </span>
                            </div>
                          </div>

                          {/* Content */}
                          <div style={{ padding: '1.5rem', boxSizing: 'border-box' }}>
                            <h3 className="text-lg sm:text-xl font-bold text-white mb-2 line-clamp-1 group-hover:text-[#A88B32] transition-colors">
                              {launch.title}
                            </h3>
                            <p className="text-sm text-gray-400 mb-4">
                              {t('launches.cards.byDeveloper', { developer: launch.developer })}
                            </p>

                            <div className="space-y-2.5 mb-4">
                              <div className="flex items-center gap-2.5 text-sm text-gray-300">
                                <FiMapPin className="h-4 w-4 text-[#A88B32]" />
                                <span>{launch.location}</span>
                              </div>
                              <div className="flex items-center gap-2.5 text-sm text-gray-300">
                                <FiHome className="h-4 w-4 text-[#A88B32]" />
                                <span>{propertyTypeLabel}</span>
                              </div>
                              <div className="flex items-center gap-2.5 text-sm">
                                <FiDollarSign className="h-4 w-4 text-[#A88B32]" />
                                <span className="font-semibold text-white">
                                  {priceLabel}
                                </span>
                              </div>
                              <div className="flex items-center gap-2.5 text-sm text-gray-300">
                                <FiCalendar className="h-4 w-4 text-[#A88B32]" />
                                <span>
                                  {formatDate(launch.launchDate)}
                                  {countdownLabel && (
                                    <span className={`ml-1.5 text-[#A88B32] font-semibold ${isRTL ? 'mr-0' : ''}`}>
                                      {countdownLabel}
                                    </span>
                                  )}
                                </span>
                              </div>
                            </div>

                            {/* View Details Button */}
                            <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                              <span className="text-sm text-gray-500">
                                {detailsLine}
                              </span>
                              <span className="inline-flex items-center gap-1.5 text-[#A88B32] font-semibold text-sm group-hover:gap-2.5 transition-all">
                                {t('launches.cards.view')}
                                <FiArrowRight className={`h-4 w-4 ${isRTL ? 'transform scale-x-[-1]' : ''}`} />
                              </span>
                            </div>
                          </div>
                        </article>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      </PageLayout>
    </>
  );
};

export default Launches;
