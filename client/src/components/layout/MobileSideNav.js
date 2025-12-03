import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiX, 
  FiHome, 
  FiBuilding, 
  FiUsers, 
  FiZap, 
  FiFileText, 
  FiInfo, 
  FiPhone, 
  FiBarChart2,
  FiLayers 
} from '../../icons/feather';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../common/LanguageSwitcher';

const navLinks = [
  { path: '/', labelKey: 'navigation.home', icon: FiHome },
  { path: '/properties', labelKey: 'navigation.properties', icon: FiBuilding },
  { path: '/developers', labelKey: 'navigation.developers', icon: FiUsers },
  { path: '/compounds', labelKey: 'navigation.compounds', icon: FiLayers },
  { path: '/launches', labelKey: 'navigation.launches', icon: FiZap },
  { path: '/blog', labelKey: 'navigation.blog', icon: FiFileText },
  { path: '/about', labelKey: 'navigation.about', icon: FiInfo },
  { path: '/contact', labelKey: 'navigation.contact', icon: FiPhone },
  { path: '/roi-calculator', labelKey: 'navigation.roiCalculator', icon: FiBarChart2 },
];

const MobileSideNav = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#131c2b]/40 backdrop-blur-sm z-50 lg:hidden"
          />

          {/* Drawer */}
          <motion.nav
            initial={{ x: isRTL ? '100%' : '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: isRTL ? '100%' : '-100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={`fixed ${isRTL ? 'right-0' : 'left-0'} top-0 bottom-0 w-80 max-w-[85vw] bg-[#131c2b] z-[60] shadow-2xl overflow-y-auto lg:hidden`}
            dir={i18n.dir()}
          >
            {/* Header */}
            <div className={`flex items-center justify-between p-6 border-b border-white/10 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <img 
                src="/logos/basiralogo.png" 
                alt="Basera Real Estate" 
                className="h-10"
              />
              <button 
                onClick={onClose}
                className={`p-2 hover:bg-white/10 rounded-full transition-colors active:bg-white/20 touch-manipulation ${isRTL ? '-ml-2' : '-mr-2'}`}
                aria-label={t('navigation.closeMenu')}
              >
                <FiX className="w-6 h-6 text-white" />
              </button>
            </div>

            {/* Navigation */}
            <div className="py-2 flex flex-col gap-1">
              {navLinks.map(({ path, labelKey, icon: Icon }) => {
                const active = isActive(path);
                return (
                  <Link
                    key={path}
                    to={path}
                    onClick={onClose}
                    className={`flex items-center gap-4 px-6 py-4 hover:bg-white/5 transition-colors touch-manipulation ${
                      active ? 'bg-basira-gold/20 text-basira-gold' : 'text-white'
                    } ${isRTL ? 'flex-row-reverse text-right' : ''}`}
                  >
                    <Icon 
                      className={`w-5 h-5 flex-shrink-0 ${active ? 'text-basira-gold' : 'text-gray-400'}`} 
                    />
                    <span className="font-normal text-base">{t(labelKey)}</span>
                  </Link>
                );
              })}
              <div className="mt-4 px-6">
                <LanguageSwitcher variant="mobile" />
              </div>
            </div>
          </motion.nav>
        </>
      )}
    </AnimatePresence>
  );
};

export default MobileSideNav;

