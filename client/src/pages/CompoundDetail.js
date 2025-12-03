import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { compoundsAPI } from '../utils/api';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import PageLayout from '../components/layout/PageLayout';
import EmbeddedVideoSection from '../components/video/EmbeddedVideoSection';
import {
  FiMapPin,
  FiCalendar,
  FiHome,
  FiAward,
  FiClock,
  FiCheck,
  FiX,
  FiShare2,
  FiHeart,
  FiChevronLeft,
  FiChevronRight,
  FiMaximize2,
  FiArrowRight,
  FiDownload,
  FiFileText,
} from 'react-icons/fi';

gsap.registerPlugin(ScrollTrigger);

const CompoundDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);

  // Refs for animations
  const heroRef = useRef(null);
  const detailsRef = useRef(null);
  const featuresRef = useRef(null);
  const propertiesRef = useRef(null);
  const ctaRef = useRef(null);

  // Fetch compound details
  const { data: compoundData, isLoading, error } = useQuery(
    ['compound', id],
    async () => {
      const response = await compoundsAPI.getCompound(id);
      return response.data;
    },
    {
      enabled: !!id,
    }
  );

  const compound = compoundData?.compound;
  const relatedProperties = compound?.relatedProperties || [];

  // GSAP Animations
  useEffect(() => {
    if (!compound) return;

    const ctx = gsap.context(() => {
      // Details animation
      if (detailsRef.current) {
        ScrollTrigger.create({
          trigger: detailsRef.current,
          start: 'top 80%',
          onEnter: () => {
            gsap.fromTo(
              detailsRef.current.querySelectorAll('.detail-card'),
              { opacity: 0, y: 30 },
              {
                opacity: 1,
                y: 0,
                duration: 0.6,
                stagger: 0.1,
                ease: 'power2.out',
              }
            );
          },
          once: true,
        });
      }

      // Features animation
      if (featuresRef.current) {
        ScrollTrigger.create({
          trigger: featuresRef.current,
          start: 'top 80%',
          onEnter: () => {
            gsap.fromTo(
              featuresRef.current.querySelectorAll('.feature-item'),
              { opacity: 0, scale: 0.9 },
              {
                opacity: 1,
                scale: 1,
                duration: 0.5,
                stagger: 0.08,
                ease: 'back.out(1.7)',
              }
            );
          },
          once: true,
        });
      }

      // Properties animation
      if (propertiesRef.current) {
        ScrollTrigger.create({
          trigger: propertiesRef.current,
          start: 'top 80%',
          onEnter: () => {
            gsap.fromTo(
              propertiesRef.current.querySelectorAll('.property-card'),
              { opacity: 0, y: 30 },
              {
                opacity: 1,
                y: 0,
                duration: 0.6,
                stagger: 0.1,
                ease: 'power2.out',
              }
            );
          },
          once: true,
        });
      }

      // CTA animation
      if (ctaRef.current) {
        ScrollTrigger.create({
          trigger: ctaRef.current,
          start: 'top 80%',
          onEnter: () => {
            gsap.fromTo(
              ctaRef.current,
              { opacity: 0, y: 40 },
              {
                opacity: 1,
                y: 0,
                duration: 0.8,
                ease: 'power3.out',
              }
            );
          },
          once: true,
        });
      }
    });

    return () => ctx.revert();
  }, [compound]);

  const getStatusColor = (status) => {
    const colors = {
      'planning': 'from-cyan-500 to-cyan-600',
      'launching': 'from-indigo-500 to-indigo-600',
      'active': 'from-emerald-500 to-emerald-600',
      'delivered': 'from-amber-500 to-amber-600',
      'on-hold': 'from-rose-500 to-rose-600'
    };
    return colors[status] || 'from-gray-500 to-gray-600';
  };

  const getStatusIcon = (status) => {
    const icons = {
      'planning': FiClock,
      'launching': FiCalendar,
      'active': FiCheck,
      'delivered': FiCheck,
      'on-hold': FiX
    };
    return icons[status] || FiClock;
  };

  const formatPrice = (price, currency) => {
    if (!price) return 'Price on Request';
    return `${currency || 'EGP'} ${price.toLocaleString()}`;
  };

  const formatDate = (date) => {
    if (!date) return 'TBD';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const nextImage = () => {
    const images = getImages();
    if (images && images.length > 0) {
      setCurrentImageIndex((prev) => 
        prev === images.length - 1 ? 0 : prev + 1
      );
    }
  };

  const prevImage = () => {
    const images = getImages();
    if (images && images.length > 0) {
      setCurrentImageIndex((prev) => 
        prev === 0 ? images.length - 1 : prev - 1
      );
    }
  };

  const getImages = () => {
    if (!compound) return [];
    const galleryImages = compound.gallery?.map(img => img.url) || [];
    const heroImage = compound.heroImage?.url ? [compound.heroImage.url] : [];
    return galleryImages.length > 0 ? galleryImages : heroImage;
  };

  const handleViewAllProperties = () => {
    if (compound?._id) {
      navigate(`/properties?compound=${compound._id}`);
    }
  };

  const getLocationString = () => {
    if (!compound) return '';
    const parts = [
      compound.area_ref?.name,
      compound.city_ref?.name,
      compound.governorate_ref?.name,
    ].filter(Boolean);
    return parts.join(', ') || 'Location TBD';
  };

  if (isLoading) {
    return (
      <PageLayout showMobileNav={true}>
        <div className="min-h-screen bg-[#131c2b] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-t-4 border-b-4 border-[#A88B32]"></div>
        </div>
      </PageLayout>
    );
  }

  if (error || !compound) {
    return (
      <PageLayout showMobileNav={true}>
        <div className="min-h-screen bg-[#131c2b] flex items-center justify-center px-4">
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">Compound Not Found</h1>
            <Link to="/compounds" className="text-[#A88B32] hover:underline text-sm sm:text-base">
              Return to Compounds
            </Link>
          </div>
        </div>
      </PageLayout>
    );
  }

  const StatusIcon = getStatusIcon(compound.status);
  const images = getImages();
  const locationString = getLocationString();

  return (
    <>
      <Helmet>
        <title>{compound.name} | Basira Compounds</title>
        <meta name="description" content={compound.description || `${compound.name} - Premium compound by Basira`} />
      </Helmet>

      <PageLayout showMobileNav={true}>
        <div className="min-h-screen bg-[#131c2b]">
          {/* Hero Image Gallery */}
          <section ref={heroRef} className="relative h-[400px] sm:h-[500px] md:h-[600px] overflow-hidden">
            {/* Image Carousel */}
            <div className="absolute inset-0">
              {images.length > 0 && (
                <img
                  src={images[currentImageIndex]}
                  alt={compound.name}
                  className="w-full h-full object-cover"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#131c2b] via-[#131c2b]/50 to-transparent"></div>
            </div>

            {/* Navigation Arrows */}
            {images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#131c2b]/50 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-[#A88B32] hover:border-[#A88B32] transition-all z-10"
                >
                  <FiChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#131c2b]/50 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-[#A88B32] hover:border-[#A88B32] transition-all z-10"
                >
                  <FiChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </>
            )}

            {/* Content Overlay */}
            <div className="absolute bottom-0 left-0 right-0 z-10">
              <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 pb-8" style={{ boxSizing: 'border-box' }}>
                {/* Breadcrumb */}
                <nav className="flex items-center gap-2 text-xs sm:text-sm text-gray-300 mb-4">
                  <Link to="/" className="hover:text-[#A88B32] transition-colors">Home</Link>
                  <span>/</span>
                  <Link to="/compounds" className="hover:text-[#A88B32] transition-colors">Compounds</Link>
                  <span>/</span>
                  <span className="text-white">{compound.name}</span>
                </nav>

                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                  <div className="flex-1">
                    {/* Status & Featured Badges */}
                    <div className="flex items-center gap-2 mb-3">
                      {compound.isFeatured && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#A88B32] to-[#C09C3D] text-white text-xs font-bold rounded-full">
                          <FiAward className="h-3.5 w-3.5" />
                          FEATURED
                        </span>
                      )}
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r ${getStatusColor(compound.status)} text-white text-xs font-bold rounded-full backdrop-blur-sm`}>
                        <StatusIcon className="h-3.5 w-3.5" />
                        {compound.status?.toUpperCase() || 'UNKNOWN'}
                      </span>
                    </div>

                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-2 leading-tight">
                      {compound.name}
                    </h1>
                    {compound.developer && (
                      <p className="text-lg sm:text-xl text-gray-300">
                        by {compound.developer.name || compound.developer}
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setIsFavorited(!isFavorited)}
                      className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full backdrop-blur-sm border border-white/20 flex items-center justify-center transition-all ${
                        isFavorited ? 'bg-gradient-to-r from-[#A88B32] to-[#C09C3D] text-white' : 'bg-[#131c2b]/50 text-white hover:bg-white/10'
                      }`}
                    >
                      <FiHeart className={`w-5 h-5 ${isFavorited ? 'fill-current' : ''}`} />
                    </button>
                    <button className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#131c2b]/50 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-white/10 transition-all">
                      <FiShare2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Image Counter */}
                {images.length > 1 && (
                  <div className="mt-4 flex items-center justify-center gap-2">
                    {images.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`h-1.5 rounded-full transition-all ${
                          index === currentImageIndex ? 'w-8 bg-[#A88B32]' : 'w-1.5 bg-white/30 hover:bg-white/50'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Main Content */}
          <section ref={detailsRef} className="w-full py-10 sm:py-12 md:py-16">
            <div className="w-full max-w-7xl mx-auto px-4 sm:px-6" style={{ boxSizing: 'border-box' }}>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Sidebar - Key Details */}
                <div className="lg:col-span-1 space-y-6">
                  {/* Compound Details Card */}
                  <div className="detail-card backdrop-blur-xl bg-gradient-to-br from-white/[0.08] via-white/[0.05] to-white/[0.02] border-2 border-white/10 rounded-xl" style={{ padding: '2rem', boxSizing: 'border-box' }}>
                    <h3 className="text-lg font-bold text-white mb-4">Compound Details</h3>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <FiMapPin className="w-5 h-5 text-[#A88B32] flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-400">Location</p>
                          <p className="text-white font-medium">{locationString}</p>
                        </div>
                      </div>
                      {compound.launchDate && (
                        <div className="flex items-start gap-3">
                          <FiCalendar className="w-5 h-5 text-[#A88B32] flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm text-gray-400">Launch Date</p>
                            <p className="text-white font-medium">{formatDate(compound.launchDate)}</p>
                          </div>
                        </div>
                      )}
                      {compound.handoverDate && (
                        <div className="flex items-start gap-3">
                          <FiClock className="w-5 h-5 text-[#A88B32] flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm text-gray-400">Handover Date</p>
                            <p className="text-white font-medium">{formatDate(compound.handoverDate)}</p>
                          </div>
                        </div>
                      )}
                      {compound.developer && (
                        <div className="flex items-start gap-3">
                          <FiHome className="w-5 h-5 text-[#A88B32] flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm text-gray-400">Developer</p>
                            <p className="text-white font-medium">{compound.developer.name || compound.developer}</p>
                          </div>
                        </div>
                      )}
                      {relatedProperties.length > 0 && (
                        <div className="flex items-start gap-3">
                          <FiMaximize2 className="w-5 h-5 text-[#A88B32] flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm text-gray-400">Properties Available</p>
                            <p className="text-white font-medium">{relatedProperties.length} Properties</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Brochure Download Button */}
                  {compound.metadata?.brochureUrl && (
                    <div className="detail-card backdrop-blur-xl bg-gradient-to-br from-white/[0.08] via-white/[0.05] to-white/[0.02] border-2 border-white/10 rounded-xl" style={{ padding: '2rem', boxSizing: 'border-box' }}>
                      <a
                        href={compound.metadata.brochureUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-3 w-full px-6 py-4 bg-gradient-to-r from-[#A88B32] to-[#C09C3D] text-white font-bold rounded-lg hover:shadow-lg hover:shadow-[#A88B32]/50 transition-all"
                      >
                        <FiFileText className="w-5 h-5" />
                        <span>Download Brochure</span>
                        <FiDownload className="w-5 h-5" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Main Content */}
                <div className="lg:col-span-2 space-y-8">
                  {/* Description */}
                  {compound.description && (
                    <div className="detail-card backdrop-blur-xl bg-gradient-to-br from-white/[0.08] via-white/[0.05] to-white/[0.02] border-2 border-white/10 rounded-xl" style={{ padding: '2rem', boxSizing: 'border-box' }}>
                      <h2 className="text-2xl font-bold text-white mb-4">About This Compound</h2>
                      <div className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                        {compound.description}
                      </div>
                    </div>
                  )}

                  {/* Amenities */}
                  {compound.amenities && compound.amenities.length > 0 && (
                    <div ref={featuresRef} className="detail-card backdrop-blur-xl bg-gradient-to-br from-white/[0.08] via-white/[0.05] to-white/[0.02] border-2 border-white/10 rounded-xl" style={{ padding: '2rem', boxSizing: 'border-box' }}>
                      <h3 className="text-xl font-bold text-white mb-4">Amenities</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {compound.amenities.map((amenity, index) => (
                          <div key={index} className="feature-item flex items-center gap-2.5">
                            <div className="w-2 h-2 rounded-full bg-[#A88B32]"></div>
                            <span className="text-gray-300 text-sm">{amenity}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Video Orientations Section */}
          {compound && compound._id && (
            <section className="container mx-auto px-4 sm:px-6 py-8">
              <EmbeddedVideoSection
                associatedType="compound"
                associatedId={compound._id}
                launchTitle={compound.name}
              />
            </section>
          )}

          {/* Properties Section */}
          {relatedProperties.length > 0 && (
            <section ref={propertiesRef} className="w-full py-10 sm:py-12 md:py-16">
              <div className="w-full max-w-7xl mx-auto px-4 sm:px-6" style={{ boxSizing: 'border-box' }}>
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                      Properties in {compound.name}
                    </h2>
                    <p className="text-gray-400">
                      {relatedProperties.length} {relatedProperties.length === 1 ? 'property' : 'properties'} available
                    </p>
                  </div>
                  <button
                    onClick={handleViewAllProperties}
                    className="hidden sm:flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#A88B32] to-[#C09C3D] text-white font-bold rounded-lg hover:shadow-lg hover:shadow-[#A88B32]/50 transition-all"
                  >
                    View All Properties
                    <FiArrowRight className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  {relatedProperties.slice(0, 6).map((property) => (
                    <Link
                      key={property._id}
                      to={`/properties/${property._id}`}
                      className="property-card group backdrop-blur-xl bg-gradient-to-br from-white/[0.08] via-white/[0.05] to-white/[0.02] border-2 border-white/10 rounded-xl overflow-hidden hover:border-[#A88B32] transition-all"
                    >
                      <div className="relative h-48 overflow-hidden">
                        {property.images && property.images.length > 0 ? (
                          <img
                            src={property.images[0].url || property.images[0]}
                            alt={property.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-[#A88B32]/20 to-[#C09C3D]/20 flex items-center justify-center">
                            <FiHome className="w-16 h-16 text-[#A88B32]/50" />
                          </div>
                        )}
                        {property.isFeatured && (
                          <span className="absolute top-2 left-2 px-2 py-1 bg-[#A88B32] text-white text-xs font-bold rounded">
                            FEATURED
                          </span>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="text-lg font-bold text-white mb-2 line-clamp-2 group-hover:text-[#A88B32] transition-colors">
                          {property.title}
                        </h3>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#A88B32] to-[#C09C3D]">
                            {formatPrice(property.price, property.currency)}
                          </span>
                          <span className="px-2 py-1 bg-white/10 text-white text-xs rounded">
                            {property.type}
                          </span>
                        </div>
                        {property.developer && (
                          <p className="text-sm text-gray-400">
                            {typeof property.developer === 'object' ? property.developer.name : property.developer}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>

                {/* View All Button - Mobile */}
                <div className="sm:hidden text-center">
                  <button
                    onClick={handleViewAllProperties}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#A88B32] to-[#C09C3D] text-white font-bold rounded-lg hover:shadow-lg hover:shadow-[#A88B32]/50 transition-all"
                  >
                    View All Properties
                    <FiArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Contact CTA */}
          <section ref={ctaRef} className="w-full py-10 sm:py-12 md:py-16 pb-12 sm:pb-16 md:pb-20">
            <div className="w-full max-w-4xl mx-auto px-4 sm:px-6" style={{ boxSizing: 'border-box' }}>
              <div className="backdrop-blur-xl bg-gradient-to-br from-white/[0.08] via-white/[0.05] to-white/[0.02] border-2 border-white/10 rounded-2xl overflow-hidden">
                <div style={{ padding: '3rem', boxSizing: 'border-box' }}>
                  <div className="text-center mb-8">
                    <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
                      Interested in {compound.name}?
                    </h2>
                    <p className="text-gray-300 text-lg">
                      Contact our team for more information and exclusive details
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
                    <div className="space-y-4">
                      <div>
                        <input
                          type="text"
                          placeholder="Your Name"
                          className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-[#A88B32] focus:outline-none focus:ring-2 focus:ring-[#A88B32]/30 transition-all"
                        />
                      </div>
                      <div>
                        <input
                          type="email"
                          placeholder="Email Address"
                          className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-[#A88B32] focus:outline-none focus:ring-2 focus:ring-[#A88B32]/30 transition-all"
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <input
                          type="tel"
                          placeholder="Phone Number"
                          className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-[#A88B32] focus:outline-none focus:ring-2 focus:ring-[#A88B32]/30 transition-all"
                        />
                      </div>
                      <button className="w-full py-3 px-6 rounded-lg bg-gradient-to-r from-[#A88B32] to-[#C09C3D] text-white font-bold hover:shadow-lg hover:shadow-[#A88B32]/50 transition-all">
                        Request Information
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </PageLayout>
    </>
  );
};

export default CompoundDetail;

