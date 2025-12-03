import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { launchesAPI } from '../utils/api';
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
  FiPhone,
  FiMail,
  FiShare2,
  FiHeart,
  FiChevronLeft,
  FiChevronRight,
  FiMaximize2,
} from 'react-icons/fi';

gsap.registerPlugin(ScrollTrigger);

const LaunchDetail = () => {
  const { id } = useParams();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);

  // Refs for animations
  const heroRef = useRef(null);
  const detailsRef = useRef(null);
  const featuresRef = useRef(null);
  const ctaRef = useRef(null);

  // Fetch launch details
  const { data: launchData, isLoading, error } = useQuery(
    ['launch', id],
    async () => {
      const response = await launchesAPI.get(`/launches/${id}`);
      return response.data;
    },
    {
      enabled: !!id,
    }
  );

  const launch = launchData?.data;

  // GSAP Animations
  useEffect(() => {
    if (!launch) return;

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
  }, [launch]);

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

  const formatPrice = (price, currency) => {
    return `${currency} ${price.toLocaleString()}`;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getDaysUntilLaunch = (launchDate) => {
    const today = new Date();
    const launch = new Date(launchDate);
    const diffTime = launch - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const nextImage = () => {
    if (launch?.images && launch.images.length > 0) {
      setCurrentImageIndex((prev) => 
        prev === launch.images.length - 1 ? 0 : prev + 1
      );
    }
  };

  const prevImage = () => {
    if (launch?.images && launch.images.length > 0) {
      setCurrentImageIndex((prev) => 
        prev === 0 ? launch.images.length - 1 : prev - 1
      );
    }
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

  if (error || !launch) {
    return (
      <PageLayout showMobileNav={true}>
        <div className="min-h-screen bg-[#131c2b] flex items-center justify-center px-4">
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">Launch Not Found</h1>
            <Link to="/launches" className="text-[#A88B32] hover:underline text-sm sm:text-base">
              Return to Launches
            </Link>
          </div>
        </div>
      </PageLayout>
    );
  }

  const StatusIcon = getStatusIcon(launch.status);
  const daysUntilLaunch = getDaysUntilLaunch(launch.launchDate);
  const images = launch.images && launch.images.length > 0 ? launch.images : [launch.image];

  return (
    <>
      <Helmet>
        <title>{launch.title} | Basira Launches</title>
        <meta name="description" content={launch.description} />
      </Helmet>

      <PageLayout showMobileNav={true}>
        <div className="min-h-screen bg-[#131c2b]">
          {/* Hero Image Gallery */}
          <section ref={heroRef} className="relative h-[400px] sm:h-[500px] md:h-[600px] overflow-hidden">
            {/* Image Carousel */}
            <div className="absolute inset-0">
              <img
                src={images[currentImageIndex]}
                alt={launch.title}
                className="w-full h-full object-cover"
              />
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
                  <Link to="/launches" className="hover:text-[#A88B32] transition-colors">Launches</Link>
                  <span>/</span>
                  <span className="text-white">{launch.title}</span>
                </nav>

                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                  <div className="flex-1">
                    {/* Status & Featured Badges */}
                    <div className="flex items-center gap-2 mb-3">
                      {launch.isFeatured && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#A88B32] to-[#C09C3D] text-white text-xs font-bold rounded-full">
                          <FiAward className="h-3.5 w-3.5" />
                          FEATURED
                        </span>
                      )}
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r ${getStatusColor(launch.status)} text-white text-xs font-bold rounded-full backdrop-blur-sm`}>
                        <StatusIcon className="h-3.5 w-3.5" />
                        {launch.status}
                      </span>
                    </div>

                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-2 leading-tight">
                      {launch.title}
                    </h1>
                    <p className="text-lg sm:text-xl text-gray-300">
                      by {launch.developer}
                    </p>
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
                  {/* Price Card */}
                  <div className="detail-card backdrop-blur-xl bg-gradient-to-br from-white/[0.08] via-white/[0.05] to-white/[0.02] border-2 border-white/10 rounded-xl" style={{ padding: '2rem', boxSizing: 'border-box' }}>
                    <p className="text-sm text-gray-400 mb-2">Starting Price</p>
                    <p className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#A88B32] to-[#C09C3D]">
                      {formatPrice(launch.startingPrice, launch.currency)}
                    </p>
                  </div>

                  {/* Launch Details Card */}
                  <div className="detail-card backdrop-blur-xl bg-gradient-to-br from-white/[0.08] via-white/[0.05] to-white/[0.02] border-2 border-white/10 rounded-xl" style={{ padding: '2rem', boxSizing: 'border-box' }}>
                    <h3 className="text-lg font-bold text-white mb-4">Launch Details</h3>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <FiCalendar className="w-5 h-5 text-[#A88B32] flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-400">Launch Date</p>
                          <p className="text-white font-medium">{formatDate(launch.launchDate)}</p>
                          {daysUntilLaunch > 0 && (
                            <p className="text-xs text-[#A88B32] mt-1">In {daysUntilLaunch} days</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <FiMapPin className="w-5 h-5 text-[#A88B32] flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-400">Location</p>
                          <p className="text-white font-medium">{launch.location}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <FiHome className="w-5 h-5 text-[#A88B32] flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-400">Property Type</p>
                          <p className="text-white font-medium">{launch.propertyType}</p>
                        </div>
                      </div>
                      {launch.area && (
                        <div className="flex items-start gap-3">
                          <FiMaximize2 className="w-5 h-5 text-[#A88B32] flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm text-gray-400">Area</p>
                            <p className="text-white font-medium">{launch.area} {launch.areaUnit}</p>
                          </div>
                        </div>
                      )}
                      {(launch.bedrooms || launch.bathrooms) && (
                        <div className="flex items-start gap-3">
                          <FiHome className="w-5 h-5 text-[#A88B32] flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm text-gray-400">Configuration</p>
                            <p className="text-white font-medium">
                              {launch.bedrooms && `${launch.bedrooms} Bedrooms`}
                              {launch.bedrooms && launch.bathrooms && ' • '}
                              {launch.bathrooms && `${launch.bathrooms} Bathrooms`}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Countdown Timer (if upcoming) */}
                  {daysUntilLaunch > 0 && (
                    <div className="detail-card backdrop-blur-xl bg-gradient-to-br from-[#A88B32]/10 via-[#A88B32]/5 to-transparent border-2 border-[#A88B32]/30 rounded-xl" style={{ padding: '2rem', boxSizing: 'border-box' }}>
                      <div className="text-center">
                        <p className="text-sm text-gray-300 mb-2">Launching In</p>
                        <p className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#A88B32] to-[#C09C3D]">
                          {daysUntilLaunch}
                        </p>
                        <p className="text-sm text-gray-300 mt-1">Days</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Main Content */}
                <div className="lg:col-span-2 space-y-8">
                  {/* Description */}
                  <div className="detail-card backdrop-blur-xl bg-gradient-to-br from-white/[0.08] via-white/[0.05] to-white/[0.02] border-2 border-white/10 rounded-xl" style={{ padding: '2rem', boxSizing: 'border-box' }}>
                    <h2 className="text-2xl font-bold text-white mb-4">About This Launch</h2>
                    <div className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                      {launch.description}
                    </div>
                  </div>

                  {/* Features & Amenities */}
                  {(launch.features?.length > 0 || launch.amenities?.length > 0) && (
                    <div ref={featuresRef} className="detail-card backdrop-blur-xl bg-gradient-to-br from-white/[0.08] via-white/[0.05] to-white/[0.02] border-2 border-white/10 rounded-xl" style={{ padding: '2rem', boxSizing: 'border-box' }}>
                      {launch.features?.length > 0 && (
                        <div className="mb-6">
                          <h3 className="text-xl font-bold text-white mb-4">Key Features</h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {launch.features.map((feature, index) => (
                              <div key={index} className="feature-item flex items-center gap-2.5">
                                <div className="w-2 h-2 rounded-full bg-[#A88B32]"></div>
                                <span className="text-gray-300 text-sm">{feature}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {launch.amenities?.length > 0 && (
                        <div>
                          <h3 className="text-xl font-bold text-white mb-4">Amenities</h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {launch.amenities.map((amenity, index) => (
                              <div key={index} className="feature-item flex items-center gap-2.5">
                                <div className="w-2 h-2 rounded-full bg-[#A88B32]"></div>
                                <span className="text-gray-300 text-sm">{amenity}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Payment Plans */}
                  {launch.paymentPlans?.length > 0 && (
                    <div className="detail-card backdrop-blur-xl bg-gradient-to-br from-white/[0.08] via-white/[0.05] to-white/[0.02] border-2 border-white/10 rounded-xl" style={{ padding: '2rem', boxSizing: 'border-box' }}>
                      <h3 className="text-xl font-bold text-white mb-4">Payment Plans</h3>
                      <div className="space-y-4">
                        {launch.paymentPlans.map((plan, index) => (
                          <div key={index} className="bg-white/5 border border-white/10 rounded-lg p-4">
                            <h4 className="text-white font-semibold mb-2">{plan.name}</h4>
                            {plan.description && (
                              <p className="text-gray-400 text-sm mb-3">{plan.description}</p>
                            )}
                            <div className="flex flex-wrap gap-4 text-sm">
                              {plan.downPayment && (
                                <span className="text-gray-300">
                                  <span className="text-[#A88B32] font-semibold">{plan.downPayment}%</span> down
                                </span>
                              )}
                              {plan.installments && (
                                <span className="text-gray-300">
                                  <span className="text-[#A88B32] font-semibold">{plan.installments}</span> installments
                                </span>
                              )}
                            </div>
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
          {launch && launch._id && (
            <section className="container mx-auto px-4 sm:px-6 py-8">
              <EmbeddedVideoSection
                associatedType="launch"
                associatedId={launch._id}
                launchTitle={launch.title}
              />
            </section>
          )}

          {/* Contact CTA */}
          <section ref={ctaRef} className="w-full py-10 sm:py-12 md:py-16 pb-12 sm:pb-16 md:pb-20">
            <div className="w-full max-w-4xl mx-auto px-4 sm:px-6" style={{ boxSizing: 'border-box' }}>
              <div className="backdrop-blur-xl bg-gradient-to-br from-white/[0.08] via-white/[0.05] to-white/[0.02] border-2 border-white/10 rounded-2xl overflow-hidden">
                <div style={{ padding: '3rem', boxSizing: 'border-box' }}>
                  <div className="text-center mb-8">
                    <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
                      Interested in This Launch?
                    </h2>
                    <p className="text-gray-300 text-lg">
                      Register your interest and our team will contact you with exclusive details
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
                        Register Interest
                      </button>
                    </div>
                  </div>

                  {launch.contactInfo && (
                    <div className="mt-8 pt-8 border-t border-white/10 flex flex-wrap items-center justify-center gap-6">
                      {launch.contactInfo.phone && (
                        <a href={`tel:${launch.contactInfo.phone}`} className="flex items-center gap-2 text-gray-300 hover:text-[#A88B32] transition-colors">
                          <FiPhone className="w-4 h-4" />
                          <span className="text-sm">{launch.contactInfo.phone}</span>
                        </a>
                      )}
                      {launch.contactInfo.email && (
                        <a href={`mailto:${launch.contactInfo.email}`} className="flex items-center gap-2 text-gray-300 hover:text-[#A88B32] transition-colors">
                          <FiMail className="w-4 h-4" />
                          <span className="text-sm">{launch.contactInfo.email}</span>
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </PageLayout>
    </>
  );
};

export default LaunchDetail;
