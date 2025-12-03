import React, { useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { Helmet } from 'react-helmet-async';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { FiBriefcase, FiGrid, FiMapPin, FiDollarSign, FiHome, FiArrowLeft, FiAward, FiTrendingUp, FiArrowRight } from 'react-icons/fi';
import { developersAPI } from '../utils/api';
import PageLayout from '../components/layout/PageLayout';

gsap.registerPlugin(ScrollTrigger);

const DeveloperDetail = () => {
  const { slug } = useParams();

  // Refs for animations
  const heroRef = useRef(null);
  const statsRef = useRef(null);
  const propertiesRef = useRef(null);

  // Fetch developer details
  const { data, isLoading, error } = useQuery(
    ['developer', slug],
    async () => {
      const response = await developersAPI.getDeveloper(slug);
      return response.data;
    }
  );

  const developer = data?.developer;
  const properties = developer?.properties || [];

  const getLocationLabel = (property) => {
    if (!property) return 'Location not specified';

    // New hierarchical structure
    if (property.governorate_ref || property.city_ref || property.area_ref) {
      const segments = [
        property.area_ref?.name,
        property.city_ref?.name,
        property.governorate_ref?.name,
      ].filter(Boolean);

      if (segments.length > 0) {
        return segments.join(', ');
      }
    }

    // Legacy location object
    if (property.location && typeof property.location === 'object') {
      const { address, city, state, country } = property.location;
      const segments = [address, city, state, country].filter(Boolean);
      if (segments.length > 0) {
        return segments.join(', ');
      }
    }

    if (typeof property.location === 'string') {
      return property.location;
    }

    return 'Location not specified';
  };

  const getPriceLabel = (property) => {
    if (!property || property.price == null) return null;
    const currency = property.currency || 'EGP';
    const price = Number(property.price);
    if (Number.isNaN(price)) return `${currency} ${property.price}`;
    return `${currency} ${price.toLocaleString()}`;
  };

  // GSAP Animations
  useEffect(() => {
    if (!developer) return;

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
            stagger: 0.15,
            ease: 'power3.out',
          }
        );
      }

      // Stats animation
      if (statsRef.current) {
        ScrollTrigger.create({
          trigger: statsRef.current,
          start: 'top 80%',
          onEnter: () => {
            gsap.fromTo(
              statsRef.current.querySelectorAll('.stat-card'),
              { opacity: 0, scale: 0.9, y: 20 },
              {
                opacity: 1,
                scale: 1,
                y: 0,
                duration: 0.6,
                stagger: 0.1,
                ease: 'back.out(1.7)',
              }
            );
          },
          once: true,
        });
      }

      // Properties animation
      if (propertiesRef.current && properties.length > 0) {
        ScrollTrigger.create({
          trigger: propertiesRef.current,
          start: 'top 80%',
          onEnter: () => {
            gsap.fromTo(
              propertiesRef.current.querySelectorAll('.property-card'),
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
  }, [developer, properties.length]);

  if (isLoading) {
    return (
      <PageLayout showMobileNav={true}>
        <div className="min-h-screen bg-[#131c2b] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:h-16 border-t-4 border-b-4 border-[#A88B32]"></div>
        </div>
      </PageLayout>
    );
  }

  if (error || !developer) {
    return (
      <PageLayout showMobileNav={true}>
        <div className="min-h-screen bg-[#131c2b] flex items-center justify-center px-4">
          <div className="text-center">
            <FiBriefcase className="mx-auto h-16 w-16 text-gray-600 mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Developer Not Found</h2>
            <p className="text-gray-400 mb-6">The developer you're looking for doesn't exist.</p>
            <Link
              to="/developers"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#A88B32] to-[#C09C3D] text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-[#A88B32]/50 transition-all"
            >
              <FiArrowLeft className="w-4 h-4" />
              Back to Developers
            </Link>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <>
      <Helmet>
        <title>{developer.name} - Properties | Basira</title>
        <meta
          name="description"
          content={developer.description || `View all properties by ${developer.name}`}
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
            </div>

            <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 relative z-10" style={{ boxSizing: 'border-box' }}>
              {/* Breadcrumb */}
              <nav className="hero-text flex items-center gap-2 text-xs sm:text-sm text-gray-400 mb-6">
                <Link to="/" className="hover:text-[#A88B32] transition-colors">Home</Link>
                <span>/</span>
                <Link to="/developers" className="hover:text-[#A88B32] transition-colors">Developers</Link>
                <span>/</span>
                <span className="text-white">{developer.name}</span>
              </nav>

              <div className="flex flex-col md:flex-row items-start gap-8">
                {/* Logo */}
                <div className="hero-text w-24 h-24 sm:w-32 sm:h-32 rounded-2xl bg-white/10 backdrop-blur-sm border-2 border-[#A88B32]/30 flex items-center justify-center flex-shrink-0 shadow-2xl p-4">
                  {developer.logo ? (
                    <img
                      src={typeof developer.logo === 'string' ? developer.logo : developer.logo.url}
                      alt={developer.name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <FiBriefcase className="w-12 h-12 sm:w-16 sm:h-16 text-[#A88B32]" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1">
                  <h1 className="hero-text text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
                    {developer.name}
                  </h1>
                  
                  {developer.description && (
                    <p className="hero-text text-base sm:text-lg text-gray-300 leading-relaxed mb-6 max-w-3xl">
                      {developer.description}
                    </p>
                  )}

                  <div className="hero-text flex items-center gap-6">
                    <div className="flex items-center gap-2 text-gray-300">
                      <FiGrid className="w-5 h-5 text-[#A88B32]" />
                      <span className="font-medium">
                        {developer.propertiesCount || properties.length || 0} Properties
                      </span>
                    </div>
                    <Link
                      to="/developers"
                      className="inline-flex items-center gap-2 text-[#A88B32] hover:text-[#C09C3D] font-medium transition-colors"
                    >
                      <FiArrowLeft className="w-4 h-4" />
                      All Developers
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Stats Section */}
          <section ref={statsRef} className="w-full py-8 sm:py-10 md:py-12">
            <div className="w-full max-w-7xl mx-auto px-4 sm:px-6" style={{ boxSizing: 'border-box' }}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {/* Total Properties */}
                <div className="stat-card backdrop-blur-xl bg-gradient-to-br from-white/[0.08] via-white/[0.05] to-white/[0.02] border-2 border-white/10 rounded-xl hover:border-[#A88B32]/50 transition-all" style={{ padding: '2rem', boxSizing: 'border-box' }}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                      <FiGrid className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-white mb-1">{properties.length}</p>
                  <p className="text-sm text-gray-400">Total Properties</p>
                </div>

                {/* Average Rating */}
                <div className="stat-card backdrop-blur-xl bg-gradient-to-br from-white/[0.08] via-white/[0.05] to-white/[0.02] border-2 border-white/10 rounded-xl hover:border-[#A88B32]/50 transition-all" style={{ padding: '2rem', boxSizing: 'border-box' }}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#A88B32] to-[#C09C3D] flex items-center justify-center">
                      <FiAward className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-white mb-1">Premium</p>
                  <p className="text-sm text-gray-400">Developer Tier</p>
                </div>

                {/* Active Listings */}
                <div className="stat-card backdrop-blur-xl bg-gradient-to-br from-white/[0.08] via-white/[0.05] to-white/[0.02] border-2 border-white/10 rounded-xl hover:border-[#A88B32]/50 transition-all" style={{ padding: '2rem', boxSizing: 'border-box' }}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                      <FiTrendingUp className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-white mb-1">
                    {properties.filter(p => p.status === 'for-sale' || p.status === 'for-rent').length}
                  </p>
                  <p className="text-sm text-gray-400">Active Listings</p>
                </div>
              </div>
            </div>
          </section>

          {/* Properties Section */}
          <section ref={propertiesRef} className="w-full py-8 sm:py-10 md:py-12 pb-12 sm:pb-16 md:pb-20">
            <div className="w-full max-w-7xl mx-auto px-4 sm:px-6" style={{ boxSizing: 'border-box' }}>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-8">
                Projects by {developer.name}
              </h2>

              {properties.length === 0 ? (
                <div className="text-center py-20 backdrop-blur-xl bg-gradient-to-br from-white/[0.08] via-white/[0.05] to-white/[0.02] border-2 border-white/10 rounded-xl">
                  <FiHome className="mx-auto h-16 w-16 text-gray-600 mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No Properties Yet</h3>
                  <p className="text-gray-400 mb-6">
                    This developer doesn't have any properties listed at the moment.
                  </p>
                  <Link
                    to="/properties"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#A88B32] to-[#C09C3D] text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-[#A88B32]/50 transition-all"
                  >
                    Browse All Properties
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {properties.map((property) => {
                    const locationLabel = getLocationLabel(property);
                    const priceLabel = getPriceLabel(property);

                    return (
                      <Link
                        key={property._id}
                        to={`/properties/${property._id}`}
                        className="property-card group block w-full"
                        style={{ boxSizing: 'border-box' }}
                      >
                      <article className="w-full h-full backdrop-blur-xl bg-gradient-to-br from-white/[0.08] via-white/[0.05] to-white/[0.02] border-2 border-white/10 rounded-xl overflow-hidden hover:border-[#A88B32]/50 hover:shadow-2xl hover:shadow-[#A88B32]/20 transition-all duration-500 hover:-translate-y-2" style={{ boxSizing: 'border-box' }}>
                        {/* Property Image */}
                        <div className="relative h-48 overflow-hidden bg-white/5">
                          {property.images && property.images.length > 0 ? (
                            <img
                              src={property.images[0].url || property.images[0]}
                              alt={property.title}
                              className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <FiHome className="w-12 h-12 text-gray-600" />
                            </div>
                          )}
                          
                          {/* Gradient Overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-[#131c2b]/60 via-transparent to-transparent"></div>
                          
                          {/* Status Badge */}
                          {property.status && (
                            <div className="absolute top-3 right-3">
                              <span className="px-3 py-1 bg-white/90 backdrop-blur-sm text-gray-800 text-xs font-semibold rounded-full capitalize">
                                {property.status.replace('-', ' ')}
                              </span>
                            </div>
                          )}

                          {/* Featured Badge */}
                          {property.isFeatured && (
                            <div className="absolute top-3 left-3">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-[#A88B32] to-[#C09C3D] text-white text-xs font-bold rounded-full">
                                <FiAward className="h-3 w-3" />
                                Featured
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Property Info */}
                        <div style={{ padding: '1.5rem', boxSizing: 'border-box' }}>
                          <h3 className="text-lg sm:text-xl font-bold text-white mb-2 line-clamp-1 group-hover:text-[#A88B32] transition-colors">
                            {property.title}
                          </h3>
                          
                          <div className="space-y-2 mb-4">
                            {locationLabel && locationLabel !== 'Location not specified' && (
                              <div className="flex items-center gap-2 text-sm text-gray-400">
                                <FiMapPin className="w-4 h-4 text-[#A88B32]" />
                                <span className="line-clamp-1">{locationLabel}</span>
                              </div>
                            )}
                            {priceLabel && (
                              <div className="flex items-center gap-2 text-sm">
                                <FiDollarSign className="w-4 h-4 text-[#A88B32]" />
                                <span className="font-semibold text-white">{priceLabel}</span>
                              </div>
                            )}
                          </div>

                          {/* View Button */}
                          <div className="pt-3 border-t border-white/10">
                            <span className="inline-flex items-center gap-1.5 text-[#A88B32] font-semibold text-sm group-hover:gap-2.5 transition-all">
                              View Property
                              <FiArrowRight className="h-4 w-4" />
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

export default DeveloperDetail;
