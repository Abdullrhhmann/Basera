import React from 'react';
import { Link } from 'react-router-dom';
import { FiMenu } from '../../icons/feather';
import { useTranslation } from 'react-i18next';

const MobileHeader = ({ onMenuClick }) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const currentLang = i18n.language?.split('-')[0] || 'en';
  const nextLang = currentLang === 'ar' ? 'en' : 'ar';
  const ariaLabel =
    nextLang === 'ar' ? t('language.switchToArabic') : t('language.switchToEnglish');

  const handleToggleLanguage = () => {
    i18n.changeLanguage(nextLang);
  };

  return (
    <header
      className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[#131c2b] shadow-sm border-b border-white/10"
      dir={i18n.dir()}
    >
      <div className="relative flex items-center justify-between px-4 h-16">
        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={onMenuClick}
            className={`p-2 hover:bg-white/10 rounded-lg transition-colors active:bg-white/20 touch-manipulation ${
              isRTL ? '-mr-2' : '-ml-2'
            }`}
            aria-label={t('navigation.openMenu')}
          >
            <FiMenu className="w-6 h-6 text-white" />
          </button>
          <button
            type="button"
            onClick={handleToggleLanguage}
            className="min-w-[44px] px-3 py-2 rounded-lg border border-white/20 text-white text-xs font-semibold uppercase tracking-[0.2em] transition-colors hover:border-[#A88B32] hover:bg-[#A88B32]/10"
            aria-label={ariaLabel}
          >
            {nextLang.toUpperCase()}
          </button>
        </div>

        <Link to="/" className="absolute left-1/2 transform -translate-x-1/2">
          <img
            src="/logos/basiralogo.png"
            alt="Basera Real Estate"
            className="h-8"
          />
        </Link>

        <div className="w-16" aria-hidden="true" />
      </div>
    </header>
  );
};

export default MobileHeader;

