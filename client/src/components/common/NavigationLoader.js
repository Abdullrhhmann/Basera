import React from 'react';
import { useTranslation } from 'react-i18next';

const NavigationLoader = () => {
  const { t, i18n } = useTranslation();

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white py-2 px-4 text-center" dir={i18n.dir()}>
      <div className="flex items-center justify-center gap-2">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" aria-hidden="true"></div>
        <span className="text-sm font-medium">{t('navigation.loading')}</span>
      </div>
    </div>
  );
};

export default NavigationLoader;
