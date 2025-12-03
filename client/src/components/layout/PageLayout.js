import React, { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Footer from './Footer';
import MobileHeader from './MobileHeader';
import MobileSideNav from './MobileSideNav';
import LanguageSwitcher from '../common/LanguageSwitcher';
import { useTranslation } from 'react-i18next';

const NAV_LINKS = [
  { labelKey: 'navigation.home', path: '/' },
  { labelKey: 'navigation.properties', path: '/properties' },
  { labelKey: 'navigation.developers', path: '/developers' },
  { labelKey: 'navigation.compounds', path: '/compounds' },
  { labelKey: 'navigation.launches', path: '/launches' },
  { labelKey: 'navigation.blog', path: '/blog' },
  { labelKey: 'navigation.about', path: '/about' },
  { labelKey: 'navigation.contact', path: '/contact' },
  { labelKey: 'navigation.roiCalculator', path: '/roi-calculator' },
];

const PageLayout = ({ children, title, description, hideNavOnMobile = false, showMobileNav = false }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const navLinks = useMemo(() => {
    if (!user) return NAV_LINKS;
    return [
      ...NAV_LINKS,
      { labelKey: 'navigation.submitProperty', path: '/submit-property' },
    ];
  }, [user]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Mobile Header - Show only when showMobileNav is true */}
      {showMobileNav && (
        <>
          <MobileHeader onMenuClick={() => setMobileNavOpen(true)} />
          <MobileSideNav 
            isOpen={mobileNavOpen} 
            onClose={() => setMobileNavOpen(false)} 
          />
        </>
      )}

      {/* Simple Navigation Header */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 bg-[#131c2b]/80 backdrop-blur-md border-b border-white/10 ${
          hideNavOnMobile || showMobileNav ? 'hidden lg:block' : ''
        }`}
        dir={i18n.dir()}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`flex items-center justify-between h-16 ${isRTL ? 'flex-row-reverse' : ''}`}>
            {/* Logo */}
            <Link
              to="/"
              className={`flex items-center ${isRTL ? 'flex-row-reverse' : ''}`}
              aria-label={t('navigation.home')}
            >
              <img
                src="/logos/basiralogo.png"
                alt="Basera Real Estate"
                className="h-8 w-auto"
              />
            </Link>

            {/* Navigation Links */}
            <div className={`hidden md:flex items-center gap-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
              {navLinks.map(({ path, labelKey }) => (
                <Link
                  key={path}
                  to={path}
                  className="text-white hover:text-basira-gold transition-colors text-sm font-medium"
                >
                  {t(labelKey)}
                </Link>
              ))}
            </div>

            {/* Auth Buttons */}
            <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <LanguageSwitcher variant="navbar" />
              {user ? (
                <>
                  {location.pathname !== '/profile' && (
                    <Link
                      to="/profile"
                      className="text-white hover:text-basira-gold transition-colors"
                    >
                      {t('navigation.profile')}
                    </Link>
                  )}
                  <button
                    onClick={logout}
                    className="px-4 py-2 bg-basira-gold text-white rounded-lg hover:bg-yellow-500 transition-colors"
                  >
                    {t('navigation.logout')}
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="text-white hover:text-basira-gold transition-colors"
                  >
                    {t('navigation.login')}
                  </Link>
                  <Link
                    to="/register"
                    className="px-4 py-2 bg-basira-gold text-white rounded-lg hover:bg-yellow-500 transition-colors"
                  >
                    {t('navigation.register')}
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Page Content */}
      <div className={showMobileNav ? 'pt-16 lg:pt-16' : (hideNavOnMobile ? 'lg:pt-16' : 'pt-16')}>
        {children}
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default PageLayout;

