import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiMapPin, FiPhone, FiMail, FiFacebook, FiTwitter, FiInstagram, FiLinkedin, FiArrowRight } from '../../icons/feather';
import { useSiteSettings } from '../../hooks/useSiteSettings';
import { newsletterAPI } from '../../utils/api';
import { showSuccess, showError } from '../../utils/sonner';

// YouTube SVG Icon Component
const YouTubeIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

// TikTok SVG Icon Component
const TikTokIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

// Telegram SVG Icon Component
const TelegramIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
  </svg>
);

const footerLinksConfig = {
  company: [
    { nameKey: 'navigation.about', path: '/about' },
    { nameKey: 'footer.links.ourTeam', path: '/about#team' },
    { nameKey: 'footer.links.careers', path: '/careers' },
    { nameKey: 'navigation.contact', path: '/contact' },
  ],
  services: [
    { nameKey: 'footer.links.buyProperty', path: '/properties?service=buy' },
    { nameKey: 'footer.links.sellProperty', path: '/properties?service=sell' },
    { nameKey: 'footer.links.rentProperty', path: '/properties?service=rent' },
    { nameKey: 'footer.links.propertyManagement', path: '/services' },
  ],
  resources: [
    { nameKey: 'footer.links.propertyGuide', path: '/guide' },
    { nameKey: 'footer.links.investmentCalculator', path: '/calculator' },
    { nameKey: 'footer.links.marketReports', path: '/reports' },
    { nameKey: 'navigation.blog', path: '/blog' },
  ],
  legal: [
    { nameKey: 'footer.links.privacyPolicy', path: '/legal#privacy-policy' },
    { nameKey: 'footer.links.terms', path: '/legal#terms-of-service' },
    { nameKey: 'footer.links.cookies', path: '/legal#cookie-policy' },
  ],
};

const Footer = () => {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();
  const { settings } = useSiteSettings();
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);

  // Get contact info from settings with fallbacks
  const phone = settings?.phoneNumbers?.[0] || '+20 11 0000 0000';
  const email = settings?.email || 'info@basira-realestate.com';

  // Build social links from settings
  const socialLinks = [
    settings?.socialMedia?.facebook && { name: 'Facebook', icon: FiFacebook, url: settings.socialMedia.facebook },
    settings?.socialMedia?.twitter && { name: 'Twitter', icon: FiTwitter, url: settings.socialMedia.twitter },
    settings?.socialMedia?.instagram && { name: 'Instagram', icon: FiInstagram, url: settings.socialMedia.instagram },
    settings?.socialMedia?.linkedin && { name: 'LinkedIn', icon: FiLinkedin, url: settings.socialMedia.linkedin },
    settings?.socialMedia?.youtube && { name: 'YouTube', icon: YouTubeIcon, url: settings.socialMedia.youtube },
    settings?.socialMedia?.tiktok && { name: 'TikTok', icon: TikTokIcon, url: settings.socialMedia.tiktok },
    settings?.socialMedia?.telegram && { name: 'Telegram', icon: TelegramIcon, url: settings.socialMedia.telegram },
  ].filter(Boolean); // Remove null/undefined entries

  // Handle newsletter subscription
  const handleNewsletterSubmit = async (e) => {
    e.preventDefault();
    
    if (!newsletterEmail.trim()) {
      showError(t('footer.newsletter.errors.emailRequired') || 'Please enter your email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newsletterEmail.trim())) {
      showError(t('footer.newsletter.errors.invalidEmail') || 'Please enter a valid email address');
      return;
    }

    setIsSubscribing(true);
    try {
      await newsletterAPI.subscribe(newsletterEmail.trim());
      showSuccess(t('footer.newsletter.success') || 'Successfully subscribed to newsletter!');
      setNewsletterEmail('');
    } catch (error) {
      const errorMessage = error.response?.data?.message || t('footer.newsletter.errors.subscriptionFailed') || 'Failed to subscribe. Please try again.';
      showError(errorMessage);
    } finally {
      setIsSubscribing(false);
    }
  };

  return (
    <footer
      className="relative bg-[#131c2b] text-white overflow-hidden bg-cover bg-center lg:bg-fixed"
      style={{ backgroundImage: 'url("/Pattern.png")' }}
    >
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-black/40 mix-blend-soft-light"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-[#0b1422]/95 via-[#0b1422]/75 to-[#070d18]/95 backdrop-blur-sm"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(168,139,50,0.25),_transparent_55%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.08),_transparent_50%)]"></div>
      </div>
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-[1]">
        <div className="absolute top-20 left-10 w-64 h-64 bg-[#A88B32]/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-48 h-48 bg-white/5 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-[#A88B32]/3 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>

      <div className="relative z-10 container-max section-padding">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-16">
          {/* Company Info */}
          <div className="lg:col-span-2 space-y-6">
            <Link to="/" className="flex items-center space-x-3 mb-8 group">
              <div className="">
                <img 
                  src="/logos/basiralogo.png" 
                  alt="Basera Real Estate" 
                  className="h-40 w-60 object-contain"
                />
              </div>
              
            </Link>
            
            

            {/* Contact Info */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3 text-gray-300/80 group hover:text-white transition-colors duration-300">
                <div className="w-10 h-10 rounded-full bg-[#A88B32]/20 flex items-center justify-center group-hover:bg-[#A88B32] transition-colors duration-300">
                  <FiMapPin className="w-5 h-5 text-[#A88B32] group-hover:text-white transition-colors duration-300" />
                </div>
                <span className="font-medium">{t('footer.location')}</span>
              </div>
              <a 
                href={`tel:${phone}`}
                className="flex items-center space-x-3 text-gray-300/80 group hover:text-white transition-colors duration-300"
              >
                <div className="w-10 h-10 rounded-full bg-[#A88B32]/20 flex items-center justify-center group-hover:bg-[#A88B32] transition-colors duration-300">
                  <FiPhone className="w-5 h-5 text-[#A88B32] group-hover:text-white transition-colors duration-300" />
                </div>
                <span className="font-medium">{phone}</span>
              </a>
              <a 
                href={`mailto:${email}`}
                className="flex items-center space-x-3 text-gray-300/80 group hover:text-white transition-colors duration-300"
              >
                <div className="w-10 h-10 rounded-full bg-[#A88B32]/20 flex items-center justify-center group-hover:bg-[#A88B32] transition-colors duration-300">
                  <FiMail className="w-5 h-5 text-[#A88B32] group-hover:text-white transition-colors duration-300" />
                </div>
                <span className="font-medium">{email}</span>
              </a>
            </div>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="text-lg font-bold font-heading mb-6 text-[#A88B32] uppercase tracking-[0.2em] text-sm">
              {t('footer.company')}
            </h3>
            <ul className="space-y-3">
              {footerLinksConfig.company.map((link) => (
                <li key={link.nameKey}>
                  <Link
                    to={link.path}
                    className="text-gray-300/70 hover:text-[#A88B32] transition-all duration-300 inline-flex items-center group"
                  >
                    <span className="group-hover:translate-x-1 transition-transform duration-300">{t(link.nameKey)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services Links */}
          <div>
            <h3 className="text-lg font-bold font-heading mb-6 text-[#A88B32] uppercase tracking-[0.2em] text-sm">
              {t('footer.services')}
            </h3>
            <ul className="space-y-3">
              {footerLinksConfig.services.map((link) => (
                <li key={link.nameKey}>
                  <Link
                    to={link.path}
                    className="text-gray-300/70 hover:text-[#A88B32] transition-all duration-300 inline-flex items-center group"
                  >
                    <span className="group-hover:translate-x-1 transition-transform duration-300">{t(link.nameKey)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources Links */}
          <div>
            <h3 className="text-lg font-bold font-heading mb-6 text-[#A88B32] uppercase tracking-[0.2em] text-sm">
              {t('footer.resources')}
            </h3>
            <ul className="space-y-3">
              {footerLinksConfig.resources.map((link) => (
                <li key={link.nameKey}>
                  <Link
                    to={link.path}
                    className="text-gray-300/70 hover:text-[#A88B32] transition-all duration-300 inline-flex items-center group"
                  >
                    <span className="group-hover:translate-x-1 transition-transform duration-300">{t(link.nameKey)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Newsletter Signup */}
        <div className="relative rounded-3xl overflow-hidden mb-16 backdrop-blur-xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-10">
          {/* Decorative elements */}
          <div className="absolute -top-4 -right-4 w-32 h-32 bg-[#A88B32]/10 rounded-full blur-2xl"></div>
          <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-white/5 rounded-full blur-xl"></div>
          
          <div className="relative z-10 max-w-3xl mx-auto text-center space-y-6">
            <div>
              <h3 className="text-3xl font-bold font-heading mb-3">{t('footer.stayUpdated')}</h3>
              <div className="flex items-center justify-center gap-2 mb-4">
                <div className="h-px w-8 bg-gradient-to-r from-transparent to-[#A88B32]"></div>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[#A88B32] max-w-16"></div>
              </div>
              <p className="text-gray-300/70 text-base max-w-xl mx-auto">
                {t('footer.newsletterCta')}
              </p>
            </div>
            <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto">
              <input
                type="email"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                placeholder={t('footer.emailPlaceholder')}
                disabled={isSubscribing}
                className="flex-1 px-6 py-4 rounded-2xl border border-white/20 bg-white/5 backdrop-blur-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#A88B32]/50 focus:border-[#A88B32] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                required
              />
              <button 
                type="submit"
                disabled={isSubscribing}
                className="group relative px-8 py-4 rounded-2xl bg-gradient-to-r from-[#A88B32] to-[#C09C3D] text-white font-heading font-bold uppercase tracking-[0.2em] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-[#A88B32]/40 overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {isSubscribing ? (t('footer.subscribing') || 'Subscribing...') : t('footer.subscribe')}
                  {!isSubscribing && <FiArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-[#C09C3D] to-[#A88B32] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
            </form>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="border-t border-white/10 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-gray-300/70 text-sm">
              <p>{t('footer.copyright', { year: currentYear })}</p>
            </div>

            {/* Social Links */}
            <div className="flex items-center gap-4">
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.name}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group w-12 h-12 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center text-gray-300/70 hover:text-[#A88B32] hover:border-[#A88B32]/50 hover:bg-[#A88B32]/10 transition-all duration-300 hover:-translate-y-1"
                  >
                    <Icon className="w-5 h-5" />
                  </a>
                );
              })}
            </div>

            {/* Legal Links */}
            <div className="flex items-center flex-wrap gap-6 justify-center">
              {footerLinksConfig.legal.map((link) => (
                <Link
                  key={link.nameKey}
                  to={link.path}
                  className="text-gray-300/60 hover:text-[#A88B32] transition-colors duration-300 text-xs uppercase tracking-[0.1em] font-medium"
                >
                  {t(link.nameKey)}
                </Link>
              ))}
              <Link
                to="/admin/login"
                className="text-gray-400/50 hover:text-gray-300/70 transition-colors duration-300 text-xs"
              >
                {t('footer.admin')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
