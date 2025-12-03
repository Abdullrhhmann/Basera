import React, { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import PageLayout from '../components/layout/PageLayout';
import { useTranslation } from 'react-i18next';
import { FiFileText, FiShield, FiSettings } from '../icons/feather';

gsap.registerPlugin(ScrollTrigger);

const Legal = () => {
  const { t } = useTranslation();
  const heroRef = useRef(null);
  const privacyRef = useRef(null);
  const termsRef = useRef(null);
  const cookieRef = useRef(null);
  const [activeSection, setActiveSection] = useState('');

  // Handle hash-based scrolling on mount and hash changes
  useEffect(() => {
    const handleHashScroll = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash) {
        setTimeout(() => {
          const element = document.getElementById(hash);
          if (element) {
            const yOffset = -96; // Account for fixed header
            const y = element.getBoundingClientRect().top + window.scrollY + yOffset;
            window.scrollTo({ top: y, behavior: 'smooth' });
            setActiveSection(hash);
          }
        }, 100);
      }
    };

    handleHashScroll();
    window.addEventListener('hashchange', handleHashScroll);
    return () => window.removeEventListener('hashchange', handleHashScroll);
  }, []);

  // Track active section on scroll for TOC highlighting
  useEffect(() => {
    const sections = [
      { id: 'privacy-policy', ref: privacyRef },
      { id: 'terms-of-service', ref: termsRef },
      { id: 'cookie-policy', ref: cookieRef },
    ];

    const scrollTriggers = sections.map(({ id, ref }) => {
      return ScrollTrigger.create({
        trigger: ref.current,
        start: 'top 150px',
        end: 'bottom 150px',
        onEnter: () => setActiveSection(id),
        onEnterBack: () => setActiveSection(id),
      });
    });

    return () => {
      scrollTriggers.forEach(trigger => trigger.kill());
    };
  }, []);

  // GSAP animations
  useEffect(() => {
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

    // Section animations
    const sections = [privacyRef, termsRef, cookieRef];
    sections.forEach((sectionRef, index) => {
      if (sectionRef.current) {
        ScrollTrigger.create({
          trigger: sectionRef.current,
          start: 'top 80%',
          onEnter: () => {
            gsap.fromTo(
              sectionRef.current.querySelectorAll('.section-card'),
              { opacity: 0, y: 50 },
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

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, []);

  const handleTocClick = (sectionId) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      const yOffset = -96;
      const y = element.getBoundingClientRect().top + window.scrollY + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <>
      <Helmet>
        <title>{t('legal.metaTitle')}</title>
        <meta name="description" content={t('legal.metaDescription')} />
      </Helmet>

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
                    {t('legal.hero.badge')}
                  </p>
                  <div className="h-px w-8 sm:w-12 md:w-16 bg-gradient-to-l from-transparent to-[#A88B32]"></div>
                </div>

                <h1 className="hero-text font-heading text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl text-white leading-tight font-bold mb-4 sm:mb-6 px-2">
                  {t('legal.hero.title')}
                </h1>

                <p className="hero-text text-base sm:text-lg md:text-xl text-gray-300 leading-relaxed max-w-3xl mx-auto px-4 sm:px-0">
                  {t('legal.hero.subtitle')}
                </p>
              </div>
            </div>
          </section>

          {/* Main Content with TOC */}
          <div className="relative py-12 sm:py-16 md:py-20 lg:py-32">
            <div className="container-max px-4 sm:px-6">
              <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
                {/* Table of Contents - Desktop Sidebar */}
                <aside className="hidden lg:block lg:w-64 xl:w-80 flex-shrink-0">
                  <div className="sticky top-24">
                    <div className="backdrop-blur-xl bg-gradient-to-br from-white/[0.12] via-white/[0.08] to-white/[0.04] border-2 border-[#A88B32]/30 rounded-2xl p-6 shadow-2xl">
                      <h3 className="font-heading text-lg text-white font-bold mb-4 text-[#A88B32]">
                        {t('legal.tableOfContents.title')}
                      </h3>
                      <nav className="space-y-2">
                        {[
                          { id: 'privacy-policy', icon: FiShield, label: t('legal.tableOfContents.privacyPolicy') },
                          { id: 'terms-of-service', icon: FiFileText, label: t('legal.tableOfContents.termsOfService') },
                          { id: 'cookie-policy', icon: FiSettings, label: t('legal.tableOfContents.cookiePolicy') },
                        ].map(({ id, icon: Icon, label }) => (
                          <button
                            key={id}
                            onClick={() => handleTocClick(id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 text-left ${
                              activeSection === id
                                ? 'bg-[#A88B32]/20 border-2 border-[#A88B32]/50 text-[#A88B32]'
                                : 'border-2 border-transparent text-gray-300 hover:bg-white/5 hover:text-white'
                            }`}
                          >
                            <Icon className="w-5 h-5 flex-shrink-0" />
                            <span className="text-sm font-medium">{label}</span>
                          </button>
                        ))}
                      </nav>
                      <p className="mt-6 text-xs text-gray-400">
                        {t('legal.lastUpdated')}: {new Date().toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </aside>

                {/* Main Content */}
                <div className="flex-1 space-y-12 md:space-y-16">
                  {/* Privacy Policy Section */}
                  <section
                    id="privacy-policy"
                    ref={privacyRef}
                    className="scroll-mt-24"
                  >
                    <div className="section-card backdrop-blur-xl bg-gradient-to-br from-white/[0.12] via-white/[0.08] to-white/[0.04] border-2 border-[#A88B32]/30 rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-10 lg:p-12 shadow-2xl">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#A88B32]/40 via-[#A88B32]/30 to-[#A88B32]/45 border-2 border-[#A88B32]/50">
                          <FiShield className="h-6 w-6 text-[#A88B32]" />
                        </div>
                        <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl text-white font-bold">
                          {t('legal.privacyPolicy.title')}
                        </h2>
                      </div>

                      <div className="prose prose-invert max-w-none">
                        {Object.keys(t('legal.privacyPolicy.sections', { returnObjects: true })).map((key) => {
                          const section = t(`legal.privacyPolicy.sections.${key}`, { returnObjects: true });
                          return (
                            <div key={key} className="mb-8">
                              <h3 className="font-heading text-xl sm:text-2xl text-[#A88B32] font-bold mb-4">
                                {section.title}
                              </h3>
                              {Array.isArray(section.content) ? (
                                <ul className="space-y-3 text-gray-300">
                                  {section.content.map((item, idx) => (
                                    <li key={idx} className="flex gap-3">
                                      <div className="flex-shrink-0 mt-1.5">
                                        <div className="w-2 h-2 rounded-full bg-[#A88B32]"></div>
                                      </div>
                                      <span>{item}</span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-gray-300 leading-relaxed">{section.content}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </section>

                  {/* Terms of Service Section */}
                  <section
                    id="terms-of-service"
                    ref={termsRef}
                    className="scroll-mt-24"
                  >
                    <div className="section-card backdrop-blur-xl bg-gradient-to-br from-white/[0.12] via-white/[0.08] to-white/[0.04] border-2 border-[#A88B32]/30 rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-10 lg:p-12 shadow-2xl">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#A88B32]/40 via-[#A88B32]/30 to-[#A88B32]/45 border-2 border-[#A88B32]/50">
                          <FiFileText className="h-6 w-6 text-[#A88B32]" />
                        </div>
                        <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl text-white font-bold">
                          {t('legal.termsOfService.title')}
                        </h2>
                      </div>

                      <div className="prose prose-invert max-w-none">
                        {Object.keys(t('legal.termsOfService.sections', { returnObjects: true })).map((key) => {
                          const section = t(`legal.termsOfService.sections.${key}`, { returnObjects: true });
                          return (
                            <div key={key} className="mb-8">
                              <h3 className="font-heading text-xl sm:text-2xl text-[#A88B32] font-bold mb-4">
                                {section.title}
                              </h3>
                              {Array.isArray(section.content) ? (
                                <ul className="space-y-3 text-gray-300">
                                  {section.content.map((item, idx) => (
                                    <li key={idx} className="flex gap-3">
                                      <div className="flex-shrink-0 mt-1.5">
                                        <div className="w-2 h-2 rounded-full bg-[#A88B32]"></div>
                                      </div>
                                      <span>{item}</span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-gray-300 leading-relaxed">{section.content}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </section>

                  {/* Cookie Policy Section */}
                  <section
                    id="cookie-policy"
                    ref={cookieRef}
                    className="scroll-mt-24"
                  >
                    <div className="section-card backdrop-blur-xl bg-gradient-to-br from-white/[0.12] via-white/[0.08] to-white/[0.04] border-2 border-[#A88B32]/30 rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-10 lg:p-12 shadow-2xl">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#A88B32]/40 via-[#A88B32]/30 to-[#A88B32]/45 border-2 border-[#A88B32]/50">
                          <FiSettings className="h-6 w-6 text-[#A88B32]" />
                        </div>
                        <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl text-white font-bold">
                          {t('legal.cookiePolicy.title')}
                        </h2>
                      </div>

                      <div className="prose prose-invert max-w-none">
                        {Object.keys(t('legal.cookiePolicy.sections', { returnObjects: true })).map((key) => {
                          const section = t(`legal.cookiePolicy.sections.${key}`, { returnObjects: true });
                          return (
                            <div key={key} className="mb-8">
                              <h3 className="font-heading text-xl sm:text-2xl text-[#A88B32] font-bold mb-4">
                                {section.title}
                              </h3>
                              {Array.isArray(section.content) ? (
                                <ul className="space-y-3 text-gray-300">
                                  {section.content.map((item, idx) => (
                                    <li key={idx} className="flex gap-3">
                                      <div className="flex-shrink-0 mt-1.5">
                                        <div className="w-2 h-2 rounded-full bg-[#A88B32]"></div>
                                      </div>
                                      <span>{item}</span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-gray-300 leading-relaxed">{section.content}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PageLayout>
    </>
  );
};

export default Legal;

