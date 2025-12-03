import React, { useState, useMemo, useCallback } from 'react';
import { FiTrendingUp, FiDollarSign, FiCalendar } from '../../icons/feather';
import { useTranslation, Trans } from 'react-i18next';

const PropertyROICalculator = ({ propertyPrice, appreciationRate, cityName }) => {
  const [investmentYears, setInvestmentYears] = useState(5);
  const { t: tRoi, i18n } = useTranslation('translation', { keyPrefix: 'roi' });
  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';
  const isRTL = i18n.dir() === 'rtl';
  const translate = useCallback(
    (key, options) => tRoi(key, options),
    [tRoi]
  );

  // Calculate ROI metrics
  const calculations = useMemo(() => {
    if (!propertyPrice || propertyPrice <= 0) {
      return null;
    }

    const rate = appreciationRate / 100; // Convert percentage to decimal
    const futureValue = propertyPrice * Math.pow(1 + rate, investmentYears);
    const totalAppreciation = futureValue - propertyPrice;
    const roiPercentage = (totalAppreciation / propertyPrice) * 100;

    return {
      currentValue: propertyPrice,
      futureValue,
      totalAppreciation,
      roiPercentage,
      annualizedReturn: roiPercentage / investmentYears
    };
  }, [propertyPrice, appreciationRate, investmentYears]);

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'EGP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }),
    [locale]
  );
  const percentFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: 'percent',
        signDisplay: 'auto',
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
      }),
    [locale]
  );
  const percentFormatterDetailed = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: 'percent',
        signDisplay: 'auto',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }),
    [locale]
  );

  const formatCurrency = useCallback(
    (amount) => currencyFormatter.format(amount ?? 0),
    [currencyFormatter]
  );

  const formatPercentage = useCallback(
    (value, digits = 1) => {
      const formatter = digits > 1 ? percentFormatterDetailed : percentFormatter;
      return formatter.format((value ?? 0) / 100);
    },
    [percentFormatter, percentFormatterDetailed]
  );

  const yearsLabel = useCallback(
    (value) => translate('propertyWidget.years', { count: value }),
    [translate]
  );

  const cityLabel = cityName
    ? translate('propertyWidget.cityAppreciation', {
        city: cityName,
        rate: formatPercentage(appreciationRate),
      })
    : null;

  const disclaimerCity = cityName || translate('propertyWidget.cityFallback');

  if (!calculations) {
    return null;
  }

  return (
    <div
      className="relative rounded-2xl md:rounded-3xl border border-white/20 bg-[#131c2b]/40 backdrop-blur-md shadow-2xl overflow-hidden mb-4 md:mb-8"
      dir={i18n.dir()}
    >
      {/* Card Background Effects */}
      <div className="absolute inset-0 rounded-2xl md:rounded-3xl overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[#A88B32]/5 via-transparent to-[#A88B32]/5"></div>
      </div>

      {/* Header with gradient background */}
      <div className="bg-gradient-to-br from-[#A88B32]/30 via-[#A88B32]/20 to-[#C09C3D]/30 p-4 md:p-6 relative z-10">
        <div className={`flex items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
          <FiTrendingUp className="w-4 h-4 md:w-5 md:h-5 text-white" />
          <h3 className="text-lg md:text-xl font-bold text-white">{translate('propertyWidget.title')}</h3>
        </div>
        {cityLabel && (
          <div className={`inline-flex items-center gap-2 px-2.5 md:px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
            <span className="text-xs md:text-sm text-white font-medium">
              {cityLabel}
            </span>
          </div>
        )}
      </div>

      {/* Calculator Content */}
      <div className="p-4 md:p-6 space-y-4 md:space-y-6 relative z-10">
        {/* Investment Period Slider */}
        <div>
          <div className={`flex items-center justify-between mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <label className={`flex items-center gap-2 text-xs md:text-sm font-medium text-gray-300 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <FiCalendar className="w-3.5 h-3.5 md:w-4 md:h-4" />
              {translate('propertyWidget.investmentPeriod')}
            </label>
            <span className={`text-base md:text-lg font-bold text-[#A88B32] ${isRTL ? 'text-left' : ''}`}>
              {yearsLabel(investmentYears)}
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="30"
            step="1"
            value={investmentYears}
            onChange={(e) => setInvestmentYears(parseInt(e.target.value))}
            className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer slider accent-[#A88B32]"
          />
          <div className={`flex justify-between text-[10px] md:text-xs text-gray-400 mt-1 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
            <span>{translate('propertyWidget.rangeMin')}</span>
            <span>{translate('propertyWidget.rangeMax')}</span>
          </div>
        </div>

        {/* Results Display */}
        <div className="space-y-3 md:space-y-4">
          {/* Current Value */}
          <div className={`flex items-center justify-between p-2.5 md:p-3 bg-white/5 rounded-lg border border-white/10 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
            <span className="text-xs md:text-sm font-medium text-gray-300">{translate('propertyWidget.currentValue')}</span>
            <span className="text-sm md:text-lg font-bold text-white">
              {formatCurrency(calculations.currentValue)}
            </span>
          </div>

          {/* Future Value */}
          <div className={`flex items-center justify-between p-3 md:p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg border-2 border-green-500/30 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
            <div className={`${isRTL ? 'text-right' : ''}`}>
              <span className="text-xs md:text-sm font-medium text-gray-300 block">
                {translate('propertyWidget.futureValue')}
              </span>
              <span className="text-[10px] md:text-xs text-gray-400">
                {translate('propertyWidget.afterYears', { count: investmentYears })}
              </span>
            </div>
            <span className="text-lg md:text-2xl font-bold text-green-400">
              {formatCurrency(calculations.futureValue)}
            </span>
          </div>

          {/* Total Appreciation */}
          <div className={`flex items-center justify-between p-2.5 md:p-3 bg-blue-500/10 rounded-lg border border-blue-500/30 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
            <span className="text-xs md:text-sm font-medium text-gray-300">{translate('propertyWidget.totalAppreciation')}</span>
            <span className="text-sm md:text-lg font-bold text-blue-400">
              {calculations.totalAppreciation >= 0
                ? translate('propertyWidget.positiveValue', { value: formatCurrency(calculations.totalAppreciation) })
                : translate('propertyWidget.negativeValue', { value: formatCurrency(Math.abs(calculations.totalAppreciation)) })}
            </span>
          </div>

          {/* ROI Percentage */}
          <div className={`flex items-center justify-between p-3 md:p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-lg border-2 border-purple-500/30 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
            <div className={`flex items-center gap-1.5 md:gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <FiDollarSign className="w-4 h-4 md:w-5 md:h-5 text-purple-400" />
              <span className="text-xs md:text-sm font-medium text-gray-300">{translate('propertyWidget.roi')}</span>
            </div>
            <span className="text-lg md:text-2xl font-bold text-purple-400">
              {formatPercentage(calculations.roiPercentage)}
            </span>
          </div>

          {/* Annualized Return */}
          <div className={`flex items-center justify-between p-2.5 md:p-3 bg-amber-500/10 rounded-lg border border-amber-500/30 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
            <span className="text-xs md:text-sm font-medium text-gray-300">{translate('propertyWidget.annualReturn')}</span>
            <span className="text-sm md:text-lg font-bold text-amber-400">
              {formatPercentage(calculations.annualizedReturn, 2)}
            </span>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="pt-3 md:pt-4 border-t border-white/10">
          <p className={`text-[10px] md:text-xs text-gray-400 leading-relaxed ${isRTL ? 'text-right' : ''}`}>
            <Trans
              i18nKey="roi.propertyWidget.disclaimer"
              values={{ city: disclaimerCity }}
              components={{ strong: <strong className="text-gray-300" /> }}
            />
          </p>
        </div>
      </div>
    </div>
  );
};

export default PropertyROICalculator;

