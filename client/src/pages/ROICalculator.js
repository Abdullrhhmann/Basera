import React from 'react';
import { Helmet } from 'react-helmet-async';
import PageLayout from '../components/layout/PageLayout';
import ROICalculatorSection from '../components/sections/ROICalculatorSection';
import { useTranslation } from 'react-i18next';

const ROICalculator = () => {
  const { t, i18n } = useTranslation('translation', { keyPrefix: 'roi' });
  return (
    <>
      <Helmet>
        <title>{t('metaTitle')}</title>
        <meta
          name="description"
          content={t('metaDescription')}
        />
        <meta
          name="keywords"
          content={t('metaKeywords')}
        />
      </Helmet>

      <PageLayout showMobileNav={true}>
        <div dir={i18n.dir()}>
          <ROICalculatorSection />
        </div>
      </PageLayout>
    </>
  );
};

export default ROICalculator;

