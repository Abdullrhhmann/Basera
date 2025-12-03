import React, { useEffect, useRef, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import PageLayout from '../components/layout/PageLayout';
import {
  FiTarget,
  FiTrendingUp,
  FiUsers,
  FiGlobe,
  FiAward,
  FiZap,
  FiShield,
  FiStar,
} from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { generateSEOTags, generateBreadcrumbSchema, getCanonicalUrl } from '../utils/seo';
import MultipleStructuredData from '../components/seo/StructuredData';

gsap.registerPlugin(ScrollTrigger);

const About = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const heroRef = useRef(null);
  const visionRef = useRef(null);
  const missionRef = useRef(null);
  const objectivesRef = useRef(null);
  const valuesRef = useRef(null);

  useEffect(() => {
    // Hero animation
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

    // Vision cards animation
    ScrollTrigger.create({
      trigger: visionRef.current,
      start: 'top 80%',
      onEnter: () => {
        gsap.fromTo(
          visionRef.current.querySelectorAll('.vision-card'),
          { opacity: 0, y: 50 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            stagger: 0.15,
            ease: 'power3.out',
          }
        );
      },
      once: true,
    });

    // Mission elements animation
    ScrollTrigger.create({
      trigger: missionRef.current,
      start: 'top 80%',
      onEnter: () => {
        gsap.fromTo(
          missionRef.current.querySelectorAll('.mission-element'),
          { opacity: 0, x: -30 },
          {
            opacity: 1,
            x: 0,
            duration: 0.6,
            stagger: 0.1,
            ease: 'power2.out',
          }
        );
      },
      once: true,
    });

    // Objectives animation
    ScrollTrigger.create({
      trigger: objectivesRef.current,
      start: 'top 80%',
      onEnter: () => {
        gsap.fromTo(
          objectivesRef.current.querySelectorAll('.objective-card'),
          { opacity: 0, scale: 0.9 },
          {
            opacity: 1,
            scale: 1,
            duration: 0.7,
            stagger: 0.2,
            ease: 'back.out(1.2)',
          }
        );
      },
      once: true,
    });

    // Values animation
    ScrollTrigger.create({
      trigger: valuesRef.current,
      start: 'top 80%',
      onEnter: () => {
        gsap.fromTo(
          valuesRef.current.querySelectorAll('.value-card'),
          { opacity: 0, y: 40, rotation: -5 },
          {
            opacity: 1,
            y: 0,
            rotation: 0,
            duration: 0.8,
            stagger: 0.12,
            ease: 'power3.out',
          }
        );
      },
      once: true,
    });

    return () => {
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);

  const visionPillars = useMemo(() => {
    const items = t('about.vision.pillars', { returnObjects: true });
    const icons = [FiGlobe, FiTrendingUp, FiUsers, FiTarget];
    if (!Array.isArray(items)) {
      return [];
    }
    return items.map((item, index) => ({
      title: item?.title ?? '',
      description: item?.description ?? '',
      icon: icons[index] || FiGlobe,
    }));
  }, [t]);

  const missionElements = useMemo(() => {
    const items = t('about.mission.elements', { returnObjects: true });
    return Array.isArray(items) ? items : [];
  }, [t]);

  const objectives = useMemo(() => {
    const items = t('about.objectives.items', { returnObjects: true });
    return Array.isArray(items) ? items : [];
  }, [t]);

  const coreValues = useMemo(() => {
    const items = t('about.values.items', { returnObjects: true });
    const icons = [FiShield, FiZap, FiStar, FiAward];
    if (!Array.isArray(items)) {
      return [];
    }
    return items.map((item, index) => ({
      title: item?.title ?? '',
      description: item?.description ?? '',
      icon: icons[index] || FiShield,
    }));
  }, [t]);

  // Generate SEO tags
  const seoTags = generateSEOTags({
    title: t('about.metaTitle'),
    description: t('about.metaDescription'),
    url: getCanonicalUrl('/about'),
    locale: i18n.language === 'ar' ? 'ar' : 'en'
  });
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'About', url: '/about' }
  ]);

  return (
    <>
      <Helmet>
        <title>{seoTags.title}</title>
        <meta name="description" content={seoTags.description} />
        <link rel="canonical" href={seoTags.canonical} />
        <meta property="og:title" content={seoTags['og:title']} />
        <meta property="og:description" content={seoTags['og:description']} />
        <meta property="og:url" content={seoTags['og:url']} />
        <meta name="twitter:card" content={seoTags['twitter:card']} />
        <link rel="alternate" hrefLang="en" href={getCanonicalUrl('/about')} />
        <link rel="alternate" hrefLang="ar" href={getCanonicalUrl('/about')} />
      </Helmet>
      <MultipleStructuredData schemas={[breadcrumbSchema]} />

      <PageLayout showMobileNav={true}>
        <div className="min-h-screen bg-[#131c2b]">
          {/* Hero Section */}
          <section
            ref={heroRef}
            className="relative pt-24 pb-12 sm:pt-28 sm:pb-16 md:pt-32 md:pb-20 lg:pt-40 lg:pb-32 overflow-hidden"
          >
            {/* Background Effects */}
            <div className="absolute inset-0">
              <div className="absolute inset-0 bg-gradient-to-b from-[#A88B32]/10 via-transparent to-transparent"></div>
              <div className="absolute top-10 right-10 w-48 h-48 sm:top-20 sm:right-20 sm:w-64 sm:h-64 md:w-96 md:h-96 bg-[#A88B32]/15 rounded-full blur-3xl animate-pulse"></div>
              <div
                className="absolute bottom-10 left-10 w-48 h-48 sm:bottom-20 sm:left-20 sm:w-64 sm:h-64 md:w-96 md:h-96 bg-[#A88B32]/10 rounded-full blur-3xl animate-pulse"
                style={{ animationDelay: '1s' }}
              ></div>
            </div>

            <div className="container-max relative z-10 px-4 sm:px-6">
              <div className="text-center max-w-4xl mx-auto">
                <div className="flex items-center justify-center gap-2 sm:gap-3 mb-6 sm:mb-8 hero-text">
                  <div className="h-px w-8 sm:w-12 md:w-16 bg-gradient-to-r from-transparent to-[#A88B32]"></div>
                  <p className="font-heading text-xs sm:text-sm uppercase tracking-[0.3em] sm:tracking-[0.5em] text-[#A88B32] font-bold">
                    {t('about.hero.badge')}
                  </p>
                  <div className="h-px w-8 sm:w-12 md:w-16 bg-gradient-to-l from-transparent to-[#A88B32]"></div>
          </div>

                <h1 className="hero-text font-heading text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl text-white leading-tight font-bold mb-4 sm:mb-6 px-2">
                  {t('about.hero.title')}
                </h1>

                <p className="hero-text text-base sm:text-lg md:text-xl text-gray-300 leading-relaxed max-w-3xl mx-auto px-4 sm:px-0">
                  {t('about.hero.subtitle')}
                </p>
              </div>
            </div>
          </section>

          {/* Vision Section */}
          <section
            ref={visionRef}
            className="relative py-12 sm:py-16 md:py-20 lg:py-32 overflow-hidden"
          >
            {/* Background Effects */}
            <div className="absolute inset-0">
              <div className="absolute inset-0 bg-gradient-to-br from-[#A88B32]/5 via-transparent to-[#A88B32]/5"></div>
              <div
                className="absolute inset-0 opacity-[0.02]"
                style={{
                  backgroundImage:
                    'linear-gradient(rgba(168, 139, 50, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(168, 139, 50, 0.1) 1px, transparent 1px)',
                  backgroundSize: '50px 50px',
                }}
              ></div>
            </div>

            <div className="container-max relative z-10 px-4 sm:px-6">
              <div className="text-center mb-10 sm:mb-12 md:mb-16">
                <div className="flex items-center justify-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                  <div className="h-px w-8 sm:w-12 bg-gradient-to-r from-transparent to-[#A88B32]"></div>
                  <p className="font-heading text-xs sm:text-sm uppercase tracking-[0.2em] sm:tracking-[0.3em] text-[#A88B32] font-bold">
                    {t('about.vision.badge')}
                  </p>
                  <div className="h-px w-8 sm:w-12 bg-gradient-to-l from-transparent to-[#A88B32]"></div>
          </div>

                <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl text-white font-bold mb-4 sm:mb-6 md:mb-8 leading-tight px-2">
                  {t('about.vision.headline')}
                  <br className="hidden sm:block" />
                  <span className="text-[#A88B32]"> {t('about.vision.highlight')}</span>
                </h2>

                <p className="text-base sm:text-lg md:text-xl text-gray-300 leading-relaxed max-w-4xl mx-auto px-4 sm:px-0">
                  {t('about.vision.description')}
                </p>
              </div>

              {/* Vision Pillars Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 md:gap-8 max-w-6xl mx-auto">
                {visionPillars.map((pillar, index) => {
                  const Icon = pillar.icon;
                  return (
                    <div
                      key={index}
                      className="vision-card group relative overflow-hidden rounded-xl sm:rounded-2xl backdrop-blur-xl bg-gradient-to-br from-white/[0.12] via-white/[0.08] to-white/[0.04] border-2 border-[#A88B32]/30 p-5 sm:p-6 md:p-8 shadow-2xl shadow-black/20 transition-all duration-500 hover:-translate-y-1 sm:hover:-translate-y-2 hover:shadow-2xl hover:shadow-[#A88B32]/30 hover:border-[#A88B32]/60"
                    >
                      {/* Glow Effect */}
                      <div className="absolute inset-0 bg-gradient-to-br from-[#A88B32]/5 via-transparent to-[#A88B32]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                      {/* Icon */}
                      <div className="relative mb-4 sm:mb-6 flex items-center justify-center">
                        <div className="absolute inset-0 rounded-full bg-[#A88B32]/20 blur-xl group-hover:scale-150 transition-all duration-500 opacity-50 group-hover:opacity-100"></div>
                        <div className="relative flex h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#A88B32]/40 via-[#A88B32]/30 to-[#A88B32]/45 border-2 border-[#A88B32]/50 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
                          <Icon className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-[#A88B32]" />
                        </div>
                      </div>

                      {/* Content */}
                      <h3 className="relative font-heading text-lg sm:text-xl md:text-2xl text-white font-bold mb-3 sm:mb-4 group-hover:text-[#A88B32] transition-colors duration-300">
                        {pillar.title}
                      </h3>
                      <p className="relative text-sm sm:text-base text-gray-300 leading-relaxed">
                        {pillar.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Mission Section */}
          <section
            ref={missionRef}
            className="relative py-12 sm:py-16 md:py-20 lg:py-32 overflow-hidden"
          >
            <div className="container-max relative z-10 px-4 sm:px-6">
              <div className="max-w-5xl mx-auto">
                <div className="text-center mb-10 sm:mb-12 md:mb-16">
                  <div className="flex items-center justify-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                    <div className="h-px w-8 sm:w-12 bg-gradient-to-r from-transparent to-[#A88B32]"></div>
                    <p className="font-heading text-xs sm:text-sm uppercase tracking-[0.2em] sm:tracking-[0.3em] text-[#A88B32] font-bold">
                      {t('about.mission.badge')}
                    </p>
                    <div className="h-px w-8 sm:w-12 bg-gradient-to-l from-transparent to-[#A88B32]"></div>
                  </div>

                  <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-white font-bold mb-4 sm:mb-6 md:mb-8 leading-tight px-2">
                    {t('about.mission.headline')} <span className="text-[#A88B32]">{t('about.mission.highlight')}</span>
                  </h2>

                  <p className="text-base sm:text-lg md:text-xl text-gray-300 leading-relaxed px-4 sm:px-0">
                    {t('about.mission.description')}
                  </p>
                </div>

                {/* Mission Elements */}
                <div className="relative backdrop-blur-xl bg-gradient-to-br from-white/[0.08] via-white/[0.05] to-white/[0.02] border-2 border-[#A88B32]/20 rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-8 lg:p-12 shadow-2xl">
                  <div className="space-y-4 sm:space-y-5 md:space-y-6">
                    {missionElements.map((element, index) => (
                      <div
                        key={index}
                        className="mission-element flex gap-3 sm:gap-4 items-start group"
                      >
                        {/* Gold Bullet */}
                        <div className="flex-shrink-0 mt-1 sm:mt-1.5">
                          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#A88B32] group-hover:scale-125 transition-transform duration-300"></div>
                        </div>

                        {/* Text */}
                        <p className="text-sm sm:text-base text-gray-300 leading-relaxed group-hover:text-white transition-colors duration-300">
                          {element}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Strategic Objectives Section */}
          <section
            ref={objectivesRef}
            className="relative py-12 sm:py-16 md:py-20 lg:py-32 overflow-hidden"
          >
            {/* Background Effects */}
            <div className="absolute inset-0">
              <div className="absolute top-10 left-10 w-48 h-48 sm:top-20 sm:left-20 sm:w-64 sm:h-64 md:w-96 md:h-96 bg-[#A88B32]/10 rounded-full blur-3xl"></div>
            </div>

            <div className="container-max relative z-10 px-4 sm:px-6">
              <div className="text-center mb-10 sm:mb-12 md:mb-16">
                <div className="flex items-center justify-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                  <div className="h-px w-8 sm:w-12 bg-gradient-to-r from-transparent to-[#A88B32]"></div>
                  <p className="font-heading text-xs sm:text-sm uppercase tracking-[0.2em] sm:tracking-[0.3em] text-[#A88B32] font-bold">
                    {t('about.objectives.badge')}
                  </p>
                  <div className="h-px w-8 sm:w-12 bg-gradient-to-l from-transparent to-[#A88B32]"></div>
                </div>

                <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-white font-bold leading-tight px-2">
                  {t('about.objectives.headline')} <span className="text-[#A88B32]">{t('about.objectives.highlight')}</span>
                </h2>
              </div>

              {/* Objectives Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8 max-w-6xl mx-auto">
                {objectives.map((objective, index) => (
                  <div
                    key={index}
                    className="objective-card group relative overflow-hidden rounded-2xl backdrop-blur-xl bg-gradient-to-br from-white/[0.12] via-white/[0.08] to-white/[0.04] border-2 border-[#A88B32]/30 p-8 shadow-2xl shadow-black/20 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-[#A88B32]/40 hover:border-[#A88B32]/60"
                  >
                    {/* Glow Effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-[#A88B32]/10 via-transparent to-[#A88B32]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                    {/* Number Badge */}
                    <div className="relative mb-6">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#A88B32]/30 to-[#A88B32]/20 border-2 border-[#A88B32]/50 group-hover:scale-110 transition-transform duration-300">
                        <span className="font-heading text-2xl font-bold text-[#A88B32]">
                          {objective.number}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <h3 className="relative font-heading text-2xl text-white font-bold mb-4 group-hover:text-[#A88B32] transition-colors duration-300">
                      {objective.title}
                    </h3>
                    <p className="relative text-gray-300 leading-relaxed">
                      {objective.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Core Values Section */}
          <section
            ref={valuesRef}
            className="relative py-20 md:py-32 overflow-hidden"
          >
            {/* Background Effects */}
            <div className="absolute inset-0">
              <div className="absolute bottom-20 right-20 w-96 h-96 bg-[#A88B32]/15 rounded-full blur-3xl animate-pulse"></div>
            </div>

            <div className="container-max relative z-10 px-6">
              <div className="text-center mb-16">
                <div className="flex items-center justify-center gap-3 mb-6">
                  <div className="h-px w-12 bg-gradient-to-r from-transparent to-[#A88B32]"></div>
                  <p className="font-heading text-sm uppercase tracking-[0.3em] text-[#A88B32] font-bold">
                    {t('about.values.badge')}
                  </p>
                  <div className="h-px w-12 bg-gradient-to-l from-transparent to-[#A88B32]"></div>
                </div>

                <h2 className="font-heading text-4xl md:text-5xl text-white font-bold leading-tight mb-8">
                  {t('about.values.headline')} <span className="text-[#A88B32]">{t('about.values.highlight')}</span>
                </h2>

                <p className="text-lg text-gray-300 max-w-3xl mx-auto">
                  {t('about.values.description')}
                </p>
              </div>

              {/* Values Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                {coreValues.map((value, index) => {
                  const Icon = value.icon;
                  return (
                    <div
                      key={index}
                      className="value-card group relative overflow-hidden rounded-2xl backdrop-blur-xl bg-gradient-to-br from-white/[0.12] via-white/[0.08] to-white/[0.04] border-2 border-[#A88B32]/30 p-8 shadow-2xl shadow-black/20 transition-all duration-500 hover:-translate-y-3 hover:shadow-2xl hover:shadow-[#A88B32]/40 hover:border-[#A88B32] hover:rotate-1"
                    >
                      {/* Glow Effect */}
                      <div className="absolute inset-0 bg-gradient-to-br from-[#A88B32]/10 via-transparent to-[#A88B32]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                      {/* Icon */}
                      <div className="relative mb-6 flex justify-center">
                        <div className="absolute inset-0 rounded-full bg-[#A88B32]/20 blur-2xl group-hover:scale-150 transition-all duration-500 opacity-50 group-hover:opacity-100"></div>
                        <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#A88B32]/40 via-[#A88B32]/30 to-[#A88B32]/45 border-2 border-[#A88B32]/50 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
                          <Icon className="h-10 w-10 text-[#A88B32]" />
                        </div>
                      </div>

                      {/* Content */}
                      <h3 className="relative font-heading text-2xl text-white font-bold mb-4 text-center group-hover:text-[#A88B32] transition-colors duration-300">
                        {value.title}
                      </h3>
                      <p className="relative text-gray-300 leading-relaxed text-center">
                        {value.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Closing CTA Section */}
          <section className="relative py-20 md:py-32 overflow-hidden">
            <div className="absolute inset-0">
              <div className="absolute inset-0 bg-gradient-to-t from-[#A88B32]/10 via-transparent to-transparent"></div>
            </div>

            <div className="container-max relative z-10 px-6">
              <div className="text-center max-w-3xl mx-auto">
                <h2 className="font-heading text-4xl md:text-5xl text-white font-bold mb-6 leading-tight">
                  {t('about.cta.headline')} <span className="text-[#A88B32]">{t('about.cta.highlight')}</span>
                </h2>
                <p className="text-lg text-gray-300 mb-10">
                  {t('about.cta.description')}
                </p>
                <a
                  href="/properties"
                  className="inline-flex items-center gap-3 rounded-2xl backdrop-blur-xl bg-gradient-to-r from-[#A88B32] to-[#9a7a2b] border-2 border-[#A88B32] px-10 py-5 font-heading text-base font-bold uppercase tracking-[0.2em] text-white transition-all duration-500 hover:shadow-2xl hover:shadow-[#A88B32]/50 hover:-translate-y-1"
                >
                  <span>{t('about.cta.button')}</span>
                  <svg
                    className={`w-5 h-5 transition-transform ${isRTL ? 'transform scale-x-[-1]' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </a>
              </div>
            </div>
          </section>
      </div>
      </PageLayout>
    </>
  );
};

export default About;
