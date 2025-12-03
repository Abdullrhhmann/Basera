import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { FiSearch, FiBriefcase, FiGrid, FiArrowRight } from 'react-icons/fi';
import { developersAPI } from '../utils/api';
import PageLayout from '../components/layout/PageLayout';
import { useTranslation } from 'react-i18next';

gsap.registerPlugin(ScrollTrigger);

const Developers = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');

  // Refs for animations
  const heroRef = useRef(null);
  const cardsRef = useRef(null);

  // Fetch developers
  const { data, isLoading, error } = useQuery(
    ['developers', searchTerm, sortBy],
    async () => {
      const response = await developersAPI.getDevelopers({
        search: searchTerm,
        limit: 100,
        sortBy: sortBy === 'projects' ? 'propertiesCount' : 'name',
        sortOrder: sortBy === 'projects' ? 'desc' : 'asc'
      });
      return response.data;
    },
    {
      keepPreviousData: true,
    }
  );

  const developers = data?.developers || [];

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
      if (cardsRef.current && developers.length > 0) {
        ScrollTrigger.create({
          trigger: cardsRef.current,
          start: 'top 80%',
          onEnter: () => {
            gsap.fromTo(
              cardsRef.current.querySelectorAll('.developer-card'),
              { opacity: 0, y: 40, scale: 0.95 },
              {
                opacity: 1,
                y: 0,
                scale: 1,
                duration: 0.8,
                stagger: 0.1,
                ease: 'back.out(1.2)',
              }
            );
          },
          once: true,
        });
      }
    });

    return () => ctx.revert();
  }, [developers.length]);

  return (
    <>
      <Helmet>
        <title>{t('developers.metaTitle')}</title>
        <meta
          name="description"
          content={t('developers.metaDescription')}
        />
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
                    {t('developers.hero.badge')}
                  </p>
                  <div className="h-px w-12 bg-gradient-to-l from-transparent to-[#A88B32]"></div>
                </div>

                <h1 className="hero-text text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
                  {t('developers.hero.titleLine1')}
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#A88B32] to-[#C09C3D]">
                    {t('developers.hero.titleHighlight')}
                  </span>
                </h1>

                <p className="hero-text text-sm sm:text-base md:text-lg text-gray-300 leading-relaxed max-w-2xl mx-auto">
                  {t('developers.hero.subtitle')}
                </p>
              </div>
            </div>
          </section>

          {/* Search & Sort Section */}
          <section className="w-full py-6 sm:py-8">
            <div className="w-full max-w-7xl mx-auto px-4 sm:px-6" style={{ boxSizing: 'border-box' }}>
              <div className="backdrop-blur-xl bg-gradient-to-br from-white/[0.08] via-white/[0.05] to-white/[0.02] border-2 border-white/10 rounded-xl shadow-xl" style={{ padding: '1.5rem', boxSizing: 'border-box' }}>
                <div className="flex flex-col sm:flex-row gap-3">
                  {/* Search */}
                  <div className="flex-1 relative">
                    <FiSearch className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400`} />
                    <input
                      type="text"
                      placeholder={t('developers.controls.searchPlaceholder')}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className={`w-full ${isRTL ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4'} py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-[#A88B32] focus:outline-none focus:ring-2 focus:ring-[#A88B32]/30 transition-all`}
                    />
                  </div>

                  {/* Sort */}
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-400 whitespace-nowrap">{t('developers.controls.sortLabel')}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSortBy('name')}
                        className={`px-4 py-3 rounded-lg font-semibold text-xs uppercase tracking-wide transition-all ${
                          sortBy === 'name'
                            ? 'bg-gradient-to-r from-[#A88B32] to-[#C09C3D] text-white'
                            : 'bg-white/10 text-gray-300 hover:bg-white/20 border border-white/20'
                        }`}
                      >
                        {t('developers.controls.sortName')}
                      </button>
                      <button
                        onClick={() => setSortBy('projects')}
                        className={`px-4 py-3 rounded-lg font-semibold text-xs uppercase tracking-wide transition-all ${
                          sortBy === 'projects'
                            ? 'bg-gradient-to-r from-[#A88B32] to-[#C09C3D] text-white'
                            : 'bg-white/10 text-gray-300 hover:bg-white/20 border border-white/20'
                        }`}
                      >
                        {t('developers.controls.sortProjects')}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Results Count */}
                {!isLoading && (
                  <div className="mt-3 text-center">
                    <p className="text-gray-400 text-sm">
                      {t('developers.resultsCount', { count: developers.length })}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Developers Grid */}
          <section ref={cardsRef} className="w-full py-8 sm:py-10 md:py-12 pb-12 sm:pb-16 md:pb-20">
            <div className="w-full max-w-7xl mx-auto px-4 sm:px-6" style={{ boxSizing: 'border-box' }}>
              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="backdrop-blur-xl bg-gradient-to-br from-white/[0.08] via-white/[0.05] to-white/[0.02] border-2 border-white/10 rounded-xl animate-pulse" style={{ padding: '2rem', boxSizing: 'border-box' }}>
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-16 h-16 bg-white/10 rounded-xl" />
                        <div className="flex-1">
                          <div className="h-5 bg-white/10 rounded w-2/3 mb-2" />
                          <div className="h-4 bg-white/10 rounded w-1/3" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-4 bg-white/10 rounded w-full" />
                        <div className="h-4 bg-white/10 rounded w-5/6" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="text-center py-20">
                  <FiBriefcase className="mx-auto h-16 w-16 text-gray-600 mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">{t('developers.states.error.title')}</h3>
                  <p className="text-gray-400">{t('developers.states.error.subtitle')}</p>
                </div>
              ) : developers.length === 0 ? (
                <div className="text-center py-20">
                  <FiBriefcase className="mx-auto h-16 w-16 text-gray-600 mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">{t('developers.states.empty.title')}</h3>
                  <p className="text-gray-400">
                    {searchTerm ? t('developers.states.empty.search') : t('developers.states.empty.default')}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {developers.map((developer) => (
                    <Link
                      key={developer._id}
                      to={`/developers/${developer.slug}`}
                      className="developer-card group block w-full"
                      style={{ boxSizing: 'border-box' }}
                    >
                      <article className="w-full h-full backdrop-blur-xl bg-gradient-to-br from-white/[0.08] via-white/[0.05] to-white/[0.02] border-2 border-white/10 rounded-xl hover:border-[#A88B32]/50 hover:shadow-2xl hover:shadow-[#A88B32]/20 transition-all duration-500 hover:-translate-y-2" style={{ boxSizing: 'border-box' }}>
                        <div style={{ padding: '2rem', boxSizing: 'border-box' }}>
                          {/* Header */}
                          <div className="flex items-start gap-4 mb-4">
                            <div className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-white/10 border-2 border-[#A88B32]/30 flex items-center justify-center transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 p-2">
                              {developer.logo ? (
                                <img
                                  src={typeof developer.logo === 'string' ? developer.logo : developer.logo.url}
                                  alt={developer.name}
                                  className="w-full h-full object-contain"
                                />
                              ) : (
                                <FiBriefcase className="w-8 h-8 sm:w-10 sm:h-10 text-[#A88B32]" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-lg sm:text-xl font-bold text-white mb-2 line-clamp-1 group-hover:text-[#A88B32] transition-colors">
                                {developer.name}
                              </h3>
                              <div className="flex items-center gap-2 text-sm text-gray-400">
                                <FiGrid className="w-4 h-4 text-[#A88B32]" />
                                <span>
                                  {t('developers.cards.projects', { count: developer.propertiesCount || 0 })}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Description */}
                          {developer.description && (
                            <p className="text-gray-400 text-sm leading-relaxed line-clamp-3 mb-4">
                              {developer.description}
                            </p>
                          )}

                          {/* View Button */}
                          <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                            <span className="text-sm text-gray-500">
                              {t('developers.cards.ctaLabel')}
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-[#A88B32] font-semibold text-sm group-hover:gap-2.5 transition-all">
                              {t('developers.cards.ctaAction')}
                              <FiArrowRight className={`h-4 w-4 ${isRTL ? 'transform scale-x-[-1]' : ''}`} />
                            </span>
                          </div>
                        </div>
                      </article>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </PageLayout>
    </>
  );
};

export default Developers;
