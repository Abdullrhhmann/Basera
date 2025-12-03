import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useForm } from 'react-hook-form';
import { showSuccess, showError } from '../utils/sonner';
import { inquiriesAPI } from '../utils/api';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/shadcn';
import PageLayout from '../components/layout/PageLayout';
import { FiMail, FiPhone, FiMapPin, FiSend, FiUser, FiMessageSquare, FiHome, FiBriefcase, FiTarget } from 'react-icons/fi';
import { useSiteSettings } from '../hooks/useSiteSettings';
import { useTranslation } from 'react-i18next';
import { generateSEOTags, generateBreadcrumbSchema, getCanonicalUrl } from '../utils/seo';
import MultipleStructuredData from '../components/seo/StructuredData';

// Register GSAP ScrollTrigger
gsap.registerPlugin(ScrollTrigger);

const Contact = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm({
    defaultValues: {
      service: '',
    },
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { settings } = useSiteSettings();
  
  // Refs for animations
  const heroRef = useRef(null);
  const contactCardsRef = useRef(null);
  const formRef = useRef(null);
  const mapRef = useRef(null);

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

      // Contact cards animation
      if (contactCardsRef.current) {
        ScrollTrigger.create({
          trigger: contactCardsRef.current,
          start: 'top 80%',
          onEnter: () => {
            gsap.fromTo(
              contactCardsRef.current.querySelectorAll('.contact-card'),
              { opacity: 0, y: 50, scale: 0.9 },
              {
                opacity: 1,
                y: 0,
                scale: 1,
                duration: 0.8,
                stagger: 0.15,
                ease: 'back.out(1.7)',
              }
            );
          },
          once: true,
        });
      }

      // Form animation
      if (formRef.current) {
        ScrollTrigger.create({
          trigger: formRef.current,
          start: 'top 80%',
          onEnter: () => {
            gsap.fromTo(
              formRef.current.querySelectorAll('.form-field'),
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
      }

      // Map animation
      if (mapRef.current) {
        ScrollTrigger.create({
          trigger: mapRef.current,
          start: 'top 80%',
          onEnter: () => {
            gsap.fromTo(
              mapRef.current,
              { opacity: 0, scale: 0.95 },
              {
                opacity: 1,
                scale: 1,
                duration: 1,
                ease: 'power3.out',
              }
            );
          },
          once: true,
        });
      }
    });

    return () => ctx.revert();
  }, []);

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      const leadData = {
        name: `${data.firstName} ${data.lastName}`,
        email: data.email,
        phone: data.phone,
        requiredService: data.service,
        message: data.message,
        propertyType: data.propertyType || 'apartment',
        purpose: data.purpose || 'personal-use',
        budget: data.budget
      };

      await inquiriesAPI.createLead(leadData);
      showSuccess(t('contact.toast.success.title'), t('contact.toast.success.subtitle'));
      reset();
    } catch (error) {
      console.error('Contact form error:', error);
      showError(
        t('contact.toast.error.title'),
        error.response?.data?.message || t('contact.toast.error.subtitle')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get contact info from settings with fallbacks
  const email = settings?.email || 'info@basira-realestate.com';
  const phone = settings?.phoneNumbers?.[0] || '+20 XXX XXX XXXX';

  const contactInfo = useMemo(() => [
    {
      icon: FiMail,
      title: t('contact.cards.email.title'),
      subtitle: t('contact.cards.email.subtitle'),
      details: email,
      link: `mailto:${email}`,
      color: 'from-blue-500 to-blue-600'
    },
    {
      icon: FiPhone,
      title: t('contact.cards.phone.title'),
      subtitle: t('contact.cards.phone.subtitle'),
      details: phone,
      link: `tel:${phone}`,
      color: 'from-emerald-500 to-emerald-600'
    },
    {
      icon: FiMapPin,
      title: t('contact.cards.address.title'),
      subtitle: t('contact.cards.address.subtitle'),
      details: t('contact.cards.address.details'),
      link: '#map',
      color: 'from-purple-500 to-purple-600'
    }
  ], [email, phone, t]);

  const featureList = useMemo(() => {
    const items = t('contact.features', { returnObjects: true });
    if (!Array.isArray(items)) {
      return [];
    }
    const icons = [FiTarget, FiHome, FiBriefcase];
    return items.map((item, index) => ({
      icon: icons[index] || FiTarget,
      title: item?.title ?? '',
      description: item?.description ?? '',
    }));
  }, [t]);

  const iconPositionClass = isRTL ? 'right-4' : 'left-4';
  const inputPaddingClass = isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4';
  const textareaPaddingClass = isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4';

  // Generate SEO tags
  const seoTags = generateSEOTags({
    title: t('contact.metaTitle'),
    description: t('contact.metaDescription'),
    url: getCanonicalUrl('/contact'),
    locale: i18n.language === 'ar' ? 'ar' : 'en'
  });
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Contact', url: '/contact' }
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
        <link rel="alternate" hrefLang="en" href={getCanonicalUrl('/contact')} />
        <link rel="alternate" hrefLang="ar" href={getCanonicalUrl('/contact')} />
      </Helmet>
      <MultipleStructuredData schemas={[breadcrumbSchema]} />

      <PageLayout showMobileNav={true}>
        <div className="min-h-screen bg-[#131c2b]">
          {/* Hero Section */}
          <section ref={heroRef} className="relative pt-20 pb-8 sm:pt-24 sm:pb-10 md:pt-28 md:pb-12 overflow-hidden">
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
                    {t('contact.hero.badge')}
                  </p>
                  <div className="h-px w-12 bg-gradient-to-l from-transparent to-[#A88B32]"></div>
                </div>

                <h1 className="hero-text text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
                  {t('contact.hero.title')}
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#A88B32] to-[#C09C3D]">
                    {t('contact.hero.highlight')}
                  </span>
                </h1>

                <p className="hero-text text-sm sm:text-base md:text-lg text-gray-300 leading-relaxed max-w-2xl mx-auto">
                  {t('contact.hero.subtitle')}
                </p>
              </div>
            </div>
          </section>

          {/* Contact Cards Section */}
          <section ref={contactCardsRef} className="w-full py-10 sm:py-12 md:py-16">
            <div className="w-full max-w-6xl mx-auto px-4 sm:px-6" style={{ boxSizing: 'border-box' }}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
                {contactInfo.map((item, index) => {
                  const Icon = item.icon;
                  const arrowPositionStyle = {
                    bottom: '2rem',
                    [isRTL ? 'left' : 'right']: '2rem',
                  };
                  return (
                    <a
                      key={index}
                      href={item.link}
                      className="contact-card group relative block w-full overflow-hidden rounded-xl backdrop-blur-xl bg-gradient-to-br from-white/[0.08] via-white/[0.05] to-white/[0.02] border-2 border-white/10 hover:border-[#A88B32]/50 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-[#A88B32]/20"
                      style={{ padding: '2rem', boxSizing: 'border-box' }}
                    >
                      {/* Glow Effect */}
                      <div className="absolute inset-0 bg-gradient-to-br from-[#A88B32]/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                      {/* Icon */}
                      <div className="relative" style={{ marginBottom: '1.5rem' }}>
                        <div className={`rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg`} style={{ width: '4rem', height: '4rem' }}>
                          <Icon style={{ width: '2rem', height: '2rem' }} className="text-white" />
                        </div>
                      </div>

                      {/* Content */}
                      <h3 className="relative text-lg font-bold text-white group-hover:text-[#A88B32] transition-colors duration-300" style={{ marginBottom: '0.75rem' }}>
                        {item.title}
                      </h3>
                      {item.subtitle && (
                        <p className="relative text-gray-400 text-sm leading-relaxed mb-2">
                          {item.subtitle}
                        </p>
                      )}
                      <p className="relative text-gray-300 text-sm leading-relaxed">
                        {item.details}
                      </p>

                      {/* Arrow Icon */}
                      <div
                        className={`absolute opacity-0 group-hover:opacity-100 transition-all duration-300 ${
                          isRTL ? '-translate-x-2 group-hover:translate-x-0' : 'translate-x-2 group-hover:translate-x-0'
                        }`}
                        style={arrowPositionStyle}
                      >
                        <FiSend
                          style={{ width: '1.25rem', height: '1.25rem' }}
                          className={`text-[#A88B32] ${isRTL ? 'transform scale-x-[-1]' : ''}`}
                        />
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Form Section */}
          <section className="w-full py-10 sm:py-12 md:py-16">
            <div className="w-full max-w-5xl mx-auto px-4 sm:px-6" style={{ boxSizing: 'border-box' }}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                {/* Left Side - Info */}
                <div>
                  <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
                    {t('contact.form.infoTitle')}
                  </h2>
                  <p className="text-gray-300 text-lg mb-8 leading-relaxed">
                    {t('contact.form.infoDescription')}
                  </p>

                  <div className="space-y-8">
                    {featureList.map((feature, idx) => {
                      const Icon = feature.icon;
                      return (
                        <div className="flex items-start gap-5" key={idx}>
                          <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-[#A88B32]/20 to-[#C09C3D]/20 border-2 border-[#A88B32]/30 flex items-center justify-center shadow-lg">
                            <Icon className="w-7 h-7 text-[#A88B32]" />
                          </div>
                          <div>
                            <h3 className="text-white font-semibold mb-3 text-lg">{feature.title}</h3>
                            <p className="text-gray-400 text-base leading-relaxed">{feature.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right Side - Form */}
                <div ref={formRef} className="relative w-full backdrop-blur-xl bg-gradient-to-br from-white/[0.08] via-white/[0.05] to-white/[0.02] border-2 border-white/10 rounded-xl shadow-2xl" style={{ padding: '2rem', boxSizing: 'border-box' }}>
                  <h3 className="text-xl font-bold text-white" style={{ marginBottom: '1.5rem' }}>{t('contact.form.title')}</h3>
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                      {/* Name Fields */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="form-field">
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            {t('contact.form.fields.firstName.label')}
                          </label>
                          <div className="relative">
                            <FiUser className={`absolute ${iconPositionClass} top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400`} />
                            <input
                              type="text"
                              placeholder={t('contact.form.fields.firstName.placeholder')}
                              className={`w-full ${inputPaddingClass} py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-[#A88B32] focus:outline-none focus:ring-2 focus:ring-[#A88B32]/30 transition-all ${isRTL ? 'text-right' : ''}`}
                              {...register('firstName', { required: t('contact.validation.firstNameRequired') })}
                            />
                          </div>
                          {errors.firstName && (
                            <p className="text-red-400 text-xs mt-1">{errors.firstName.message}</p>
                          )}
                        </div>
                        <div className="form-field">
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            {t('contact.form.fields.lastName.label')}
                          </label>
                          <input
                            type="text"
                            placeholder={t('contact.form.fields.lastName.placeholder')}
                            className={`w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-[#A88B32] focus:outline-none focus:ring-2 focus:ring-[#A88B32]/30 transition-all ${isRTL ? 'text-right' : ''}`}
                            {...register('lastName', { required: t('contact.validation.lastNameRequired') })}
                          />
                          {errors.lastName && (
                            <p className="text-red-400 text-xs mt-1">{errors.lastName.message}</p>
                          )}
                        </div>
                      </div>

                      {/* Email */}
                      <div className="form-field">
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          {t('contact.form.fields.email.label')}
                        </label>
                        <div className="relative">
                          <FiMail className={`absolute ${iconPositionClass} top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400`} />
                          <input
                            type="email"
                            placeholder={t('contact.form.fields.email.placeholder')}
                            className={`w-full ${inputPaddingClass} py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-[#A88B32] focus:outline-none focus:ring-2 focus:ring-[#A88B32]/30 transition-all ${isRTL ? 'text-right' : ''}`}
                            {...register('email', {
                              required: t('contact.validation.emailRequired'),
                              pattern: {
                                value: /^\S+@\S+$/i,
                                message: t('contact.validation.emailInvalid')
                              }
                            })}
                          />
                        </div>
                        {errors.email && (
                          <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>
                        )}
                      </div>

                      {/* Phone */}
                      <div className="form-field">
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          {t('contact.form.fields.phone.label')}
                        </label>
                        <div className="relative">
                          <FiPhone className={`absolute ${iconPositionClass} top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400`} />
                          <input
                            type="tel"
                            placeholder={t('contact.form.fields.phone.placeholder')}
                            className={`w-full ${inputPaddingClass} py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-[#A88B32] focus:outline-none focus:ring-2 focus:ring-[#A88B32]/30 transition-all ${isRTL ? 'text-right' : ''}`}
                            {...register('phone', { required: t('contact.validation.phoneRequired') })}
                          />
                        </div>
                        {errors.phone && (
                          <p className="text-red-400 text-xs mt-1">{errors.phone.message}</p>
                        )}
                      </div>

                      {/* Service Selection */}
                      <div className="form-field">
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          {t('contact.form.fields.service.label')}
                        </label>
                        <input type="hidden" {...register('service', { required: t('contact.validation.serviceRequired') })} />
                        <Select onValueChange={(value) => setValue('service', value, { shouldValidate: true })}>
                          <SelectTrigger className={`w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:border-[#A88B32] focus:outline-none focus:ring-2 focus:ring-[#A88B32]/30 transition-all ${isRTL ? 'text-right' : ''}`}>
                            <SelectValue placeholder={t('contact.form.selectPlaceholder')} />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1a1a1a] border-white/10" dir={isRTL ? 'rtl' : 'ltr'}>
                            <SelectItem value="buy" className="text-white hover:bg-[#A88B32]/20">{t('contact.form.services.buy')}</SelectItem>
                            <SelectItem value="sell" className="text-white hover:bg-[#A88B32]/20">{t('contact.form.services.sell')}</SelectItem>
                            <SelectItem value="rent" className="text-white hover:bg-[#A88B32]/20">{t('contact.form.services.rent')}</SelectItem>
                            <SelectItem value="consultation" className="text-white hover:bg-[#A88B32]/20">{t('contact.form.services.consultation')}</SelectItem>
                            <SelectItem value="investment" className="text-white hover:bg-[#A88B32]/20">{t('contact.form.services.investment')}</SelectItem>
                          </SelectContent>
                        </Select>
                        {errors.service && (
                          <p className="text-red-400 text-xs mt-1">{errors.service.message}</p>
                        )}
                      </div>

                      {/* Message */}
                      <div className="form-field">
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          {t('contact.form.fields.message.label')}
                        </label>
                        <div className="relative">
                          <FiMessageSquare className={`absolute ${iconPositionClass} top-4 w-5 h-5 text-gray-400`} />
                          <textarea
                            placeholder={t('contact.form.fields.message.placeholder')}
                            rows="4"
                            className={`w-full ${textareaPaddingClass} py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-[#A88B32] focus:outline-none focus:ring-2 focus:ring-[#A88B32]/30 transition-all resize-none ${isRTL ? 'text-right' : ''}`}
                            {...register('message')}
                          />
                        </div>
                      </div>

                      {/* Submit Button */}
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-4 px-6 rounded-lg bg-gradient-to-r from-[#A88B32] to-[#C09C3D] text-white font-bold text-lg hover:shadow-lg hover:shadow-[#A88B32]/50 transform hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                      >
                        {isSubmitting ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            {t('contact.form.sending')}
                          </>
                        ) : (
                          <>
                            <FiSend className={`w-5 h-5 ${isRTL ? 'transform scale-x-[-1]' : ''}`} />
                            {t('contact.form.submitLabel')}
                          </>
                        )}
                      </button>
                    </form>
                </div>
              </div>
            </div>
          </section>

          {/* Map Section */}
          <section ref={mapRef} className="w-full py-10 sm:py-12 md:py-16 pb-12 sm:pb-16 md:pb-20">
            <div className="w-full max-w-6xl mx-auto px-4 sm:px-6" style={{ boxSizing: 'border-box' }}>
              <div className="text-center mb-8 sm:mb-10">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 sm:mb-4">
                  {t('contact.map.title')}
                </h2>
                <p className="text-gray-300 text-base sm:text-lg">
                  {t('contact.map.subtitle')}
                </p>
              </div>
              <div className="w-full rounded-xl overflow-hidden border-2 border-white/10 shadow-2xl backdrop-blur-xl bg-white/5" style={{ height: '300px', boxSizing: 'border-box' }}>
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d221074.41983049427!2d29.84839935!3d30.0444196!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x14583fa60b21beeb%3A0x79dfb296e8423bba!2sCairo%2C%20Egypt!5e0!3m2!1sen!2s!4v1234567890"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen=""
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title={t('contact.map.iframeTitle')}
                ></iframe>
              </div>
            </div>
          </section>
        </div>
      </PageLayout>
    </>
  );
};

export default Contact;
