import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { useQuery } from 'react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import PageLayout from '../components/layout/PageLayout';
import CompoundCard from '../components/common/CompoundCard';
import { compoundsAPI } from '../utils/api';
import {
  FiSearch,
  FiFilter,
  FiLayers,
  FiChevronDown,
  FiRefreshCcw,
  FiStar,
  FiX,
} from 'react-icons/fi';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { generateSEOTags, generateBreadcrumbSchema, getCanonicalUrl } from '../utils/seo';
import MultipleStructuredData from '../components/seo/StructuredData';

gsap.registerPlugin(ScrollTrigger);

const statusGradients = {
  planning: 'from-cyan-500/80 to-cyan-600/80',
  launching: 'from-indigo-500/80 to-indigo-600/80',
  active: 'from-emerald-500/80 to-emerald-600/80',
  delivered: 'from-amber-500/80 to-amber-600/80',
  'on-hold': 'from-rose-500/80 to-rose-600/80',
};

const Compounds = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const heroRef = useRef(null);
  const cardsRef = useRef(null);
  const filtersRef = useRef(null);

  const { data, isLoading, error, refetch, isFetching } = useQuery(
    ['compounds', searchTerm, statusFilter, showFeaturedOnly],
    async () => {
      const params = {
        limit: 100,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (statusFilter) params.status = statusFilter;
      if (showFeaturedOnly) params.featured = 'true';

      const response = await compoundsAPI.getCompounds(params);
      return response.data;
    },
    {
      keepPreviousData: true,
      staleTime: 2 * 60 * 1000,
      onError: (err) => {
        console.error('Compounds page fetch error:', err);
      },
    }
  );

  const compounds = data?.compounds || [];

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (heroRef.current) {
        gsap.fromTo(
          heroRef.current.querySelectorAll('.hero-text'),
          { opacity: 0, y: 35 },
          {
            opacity: 1,
            y: 0,
            duration: 1,
            stagger: 0.2,
            ease: 'power3.out',
          }
        );
      }

      if (cardsRef.current && compounds.length > 0) {
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
  }, [compounds.length]);

  useEffect(() => {
    if (!filtersRef.current) return;
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
  }, [showFilters]);

  const statusOptions = ['', 'planning', 'launching', 'active', 'delivered', 'on-hold'];

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setShowFeaturedOnly(false);
  };

  // Generate SEO tags
  const seoTags = generateSEOTags({
    title: t('compoundsPage.metaTitle'),
    description: t('compoundsPage.metaDescription'),
    url: getCanonicalUrl('/compounds'),
    locale: i18n.language === 'ar' ? 'ar' : 'en'
  });
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Compounds', url: '/compounds' }
  ]);

  return (
    <PageLayout>
      <>
        <Helmet>
          <title>{seoTags.title}</title>
          <meta name="description" content={seoTags.description} />
          <link rel="canonical" href={seoTags.canonical} />
          <meta property="og:title" content={seoTags['og:title']} />
          <meta property="og:description" content={seoTags['og:description']} />
          <meta property="og:url" content={seoTags['og:url']} />
          <meta name="twitter:card" content={seoTags['twitter:card']} />
          <link rel="alternate" hrefLang="en" href={getCanonicalUrl('/compounds')} />
          <link rel="alternate" hrefLang="ar" href={getCanonicalUrl('/compounds')} />
        </Helmet>
        <MultipleStructuredData schemas={[breadcrumbSchema]} />

      <div
        className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#101b2f] to-[#0b1221] text-white"
        dir={i18n.dir()}
      >
        <section ref={heroRef} className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-br from-[#0f172a]/85 via-[#101b2f]/70 to-[#0b1221]/80" />
            <div className="absolute -top-40 -left-32 h-80 w-80 rounded-full bg-[#A88B32]/25 blur-3xl" />
            <div className="absolute top-32 right-10 h-64 w-64 rounded-full bg-[#C09C3D]/20 blur-3xl" />
          </div>

          <div className="container-max relative px-4 py-16 md:py-20 lg:py-24">
            <div className="hero-text max-w-4xl space-y-6">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.35em] text-white/70">
                <FiLayers className="h-4 w-4" />
                {t('compoundsPage.hero.badge')}
              </span>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-light leading-tight text-white">
                {t('compoundsPage.hero.titleLine1')}
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#A88B32] to-[#C09C3D]">
                  {t('compoundsPage.hero.titleHighlight')}
                </span>
              </h1>
              <p className="text-base md:text-lg leading-relaxed text-white/70">
                {t('compoundsPage.hero.subtitle')}
              </p>
            </div>
          </div>
        </section>

        <section className="container-max px-4 pb-20">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 md:p-8 backdrop-blur-2xl shadow-lg shadow-black/20">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex w-full items-center gap-3">
                <div className="relative flex-1">
                  <FiSearch
                    className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 h-4 w-4 -translate-y-1/2 text-white/40`}
                  />
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    type="search"
                    placeholder={t('compoundsPage.filters.searchPlaceholder')}
                    className={`w-full ${isRTL ? 'pr-10 pl-4 text-right' : 'pl-10 pr-4'} rounded-xl border border-white/10 bg-white/[0.06] py-3 text-sm text-white placeholder-white/40 shadow-inner focus:outline-none focus:ring-2 focus:ring-[#A88B32]/70`}
                  />
                </div>
                <button
                  onClick={() => refetch()}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/[0.12]"
                >
                  <FiRefreshCcw className="h-4 w-4" />
                  {t('compoundsPage.filters.refresh')}
                </button>
                <button
                  onClick={() => setShowFilters((prev) => !prev)}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-white/[0.12]"
                >
                  <FiFilter className="h-4 w-4" />
                  {t('compoundsPage.filters.toggle')}
                  <FiChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                </button>
              </div>
              {isFetching && <div className="text-sm text-white/60">{t('compoundsPage.filters.syncing')}</div>}
            </div>

            <div ref={filtersRef} className="overflow-hidden" style={{ height: 0, opacity: 0 }}>
              <div className="mt-5 grid gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 md:grid-cols-2">
                <div className="flex flex-wrap items-center gap-2">
                  {statusOptions.map((value) => {
                    const active = statusFilter === value;
                    const gradient = statusGradients[value];
                    const indicatorClass = value && gradient ? gradient.replace('/80', '') : 'bg-white/40';
                    return (
                      <button
                        key={value || 'all'}
                        onClick={() => setStatusFilter(value)}
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition-all ${
                          active
                            ? 'border-transparent bg-gradient-to-r from-[#A88B32] to-[#C09C3D] text-white shadow-lg shadow-[#A88B32]/30'
                            : 'border-white/10 bg-white/[0.05] text-white/70 hover:bg-white/[0.12]'
                        }`}
                      >
                        <span className={`h-2.5 w-2.5 rounded-full ${indicatorClass}`} />
                        {value ? t(`compound.status.${value}`) : t('compoundsPage.filters.statusAll')}
                        {active && <FiX className="h-3.5 w-3.5" />}
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center gap-2 justify-start md:justify-end">
                  <button
                    onClick={() => setShowFeaturedOnly((prev) => !prev)}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition-all ${
                      showFeaturedOnly
                        ? 'border-transparent bg-gradient-to-r from-[#A88B32] to-[#C09C3D] text-white shadow-lg shadow-[#A88B32]/30'
                        : 'border-white/10 bg-white/[0.05] text-white/70 hover:bg-white/[0.12]'
                    }`}
                  >
                    <FiStar className="h-4 w-4" />
                    {t('compoundsPage.filters.featuredOnly')}
                  </button>
                  <button
                    onClick={clearFilters}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-sm font-semibold text-white/70 transition-all hover:bg-white/[0.12]"
                  >
                    {t('compoundsPage.filters.clear')}
                  </button>
                </div>
              </div>
            </div>

            {!isLoading && (
              <div className="mt-6 text-center text-sm text-white/60">
                {t('compoundsPage.resultsCount', { count: compounds.length })}
              </div>
            )}
          </div>

          <div ref={cardsRef} className="mt-12">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-white/60">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-[#A88B32]/80" />
                <p className="mt-4 text-sm font-medium uppercase tracking-[0.2em]">
                  {t('compoundsPage.loading')}
                </p>
              </div>
            ) : error ? (
              <div className="py-20 text-center text-white/70">
                <p className="mb-2 text-lg font-semibold text-rose-300">{t('compoundsPage.states.errorTitle')}</p>
                <p className="mb-6 text-sm">{error.message || t('compoundsPage.states.errorSubtitle')}</p>
                <button
                  onClick={() => refetch()}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#A88B32] to-[#C09C3D] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#A88B32]/30 transition-all hover:-translate-y-0.5 hover:shadow-[#A88B32]/50"
                >
                  {t('compoundsPage.actions.retry')}
                </button>
              </div>
            ) : compounds.length === 0 ? (
              <div className="py-20 text-center text-white/70">
                <FiLayers className="mx-auto mb-4 h-16 w-16 text-white/20" />
                <h3 className="text-xl font-semibold text-white mb-2">{t('compoundsPage.states.emptyTitle')}</h3>
                <p className="text-sm">{t('compoundsPage.states.emptySubtitle')}</p>
              </div>
            ) : (
              <AnimatePresence>
                <motion.div layout className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {compounds.map((compound) => (
                    <motion.div
                      key={compound._id}
                      layout
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ duration: 0.3 }}
                    >
                      <CompoundCard compound={compound} />
                    </motion.div>
                  ))}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </section>
      </div>
      </>
    </PageLayout>
  );
};

export default Compounds;