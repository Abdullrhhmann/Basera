import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from 'react-query';
import { FiTrendingUp, FiHome, FiDollarSign, FiMapPin } from '../../icons/feather';
import { citiesAPI, governoratesAPI, areasAPI } from '../../utils/api';
import { Select, SelectContent, SelectItem, SelectTrigger } from '../ui/shadcn/select';
import { useTranslation } from 'react-i18next';

const ROICalculatorSection = () => {
  const { t: tRoi, i18n } = useTranslation('translation', { keyPrefix: 'roi' });
  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';
  const isRTL = i18n.dir() === 'rtl';
  const translate = useCallback(
    (key, options) => tRoi(key, options),
    [tRoi]
  );
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
  const compactFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        notation: 'compact',
        compactDisplay: 'short',
        maximumFractionDigits: 1,
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

  // Calculator mode state
  const [isAdvancedMode, setIsAdvancedMode] = useState(true);
  
  // Hierarchical location state
  const [selectedGovernorate, setSelectedGovernorate] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedArea, setSelectedArea] = useState('');
  
  // Fetch governorates
  const { data: governoratesData } = useQuery(
    ['roi-governorates'],
    async () => {
      const response = await governoratesAPI.getGovernorates({ limit: 100, sortBy: 'name', sortOrder: 'asc' });
      return response.data;
    },
    {
      staleTime: 1000 * 60 * 10,
      retry: 1,
      refetchOnWindowFocus: false,
    }
  );

  // Fetch cities for selected governorate
  const { data: citiesByGovernorateData } = useQuery(
    ['roi-cities-by-governorate', selectedGovernorate],
    async () => {
      if (!selectedGovernorate) return { cities: [] };
      const response = await citiesAPI.getCitiesByGovernorate(selectedGovernorate);
      return response.data;
    },
    {
      enabled: !!selectedGovernorate,
      staleTime: 1000 * 60 * 10,
      retry: 1,
      refetchOnWindowFocus: false,
    }
  );

  // Fetch areas for selected city
  const { data: areasByCityData } = useQuery(
    ['roi-areas-by-city', selectedCity],
    async () => {
      if (!selectedCity) return { areas: [] };
      const response = await areasAPI.getAreasByCity(selectedCity);
      return response.data;
    },
    {
      enabled: !!selectedCity,
      staleTime: 1000 * 60 * 10,
      retry: 1,
      refetchOnWindowFocus: false,
    }
  );

  // Fetch cities for appreciation rate auto-population (legacy)
  const { data: _legacyCitiesData } = useQuery(
    ['roi-cities'],
    async () => {
      const response = await citiesAPI.getCities({ limit: 100, sortBy: 'name', sortOrder: 'asc' });
      return response.data;
    },
    {
      staleTime: 1000 * 60 * 10, // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    }
  );

  const governoratesList = governoratesData?.governorates || [];
  const citiesByGovernorateList = citiesByGovernorateData?.cities || [];
  const areasList = useMemo(
    () => areasByCityData?.areas || [],
    [areasByCityData]
  );
  
  const formatCurrency = useCallback(
    (amount) => currencyFormatter.format(amount || 0),
    [currencyFormatter]
  );

  const formatCompact = useCallback(
    (amount) => compactFormatter.format(amount || 0),
    [compactFormatter]
  );

  const formatPercentage = useCallback(
    (value, digits = 1) => {
      const formatter = digits > 1 ? percentFormatterDetailed : percentFormatter;
      return formatter.format((value ?? 0) / 100);
    },
    [percentFormatter, percentFormatterDetailed]
  );

  const yearsLabel = useCallback(
    (value) => translate('inputs.years', { count: value }),
    [translate]
  );

  const selectedAreaData = useMemo(
    () => areasList.find((area) => area._id === selectedArea),
    [areasList, selectedArea]
  );
  const getFormattedAppreciationRate = useCallback(
    (value) => formatPercentage(value),
    [formatPercentage]
  );

  // Calculator state
  const [inputs, setInputs] = useState({
    propertyPrice: 2000000, // EGP 2M default
    monthlyRent: 15000, // EGP 15K default
    investmentPeriod: 5, // 5 years default
    appreciationRate: 8, // 8% default for Egypt
    downPayment: 20, // 20% default
    mortgageRate: 12, // 12% default for Egypt
    propertyTaxRate: 0.5, // 0.5% default Egypt rate
    maintenanceRate: 2, // 2% default
    vacancyRate: 5, // 5% default
    rentIncreaseRate: 5, // 5% default
  });

  // Calculate ROI and related metrics
  const calculations = useMemo(() => {
    const {
      propertyPrice,
      monthlyRent,
      investmentPeriod,
      appreciationRate,
      downPayment,
      mortgageRate,
      propertyTaxRate,
      maintenanceRate,
      vacancyRate,
      rentIncreaseRate,
    } = inputs;

    // Convert percentages to decimals
    const appreciationDecimal = appreciationRate / 100;

    // Calculate future property value
    const futureValue = propertyPrice * Math.pow(1 + appreciationDecimal, investmentPeriod);

    // Calculate capital appreciation
    const capitalAppreciation = futureValue - propertyPrice;

    if (!isAdvancedMode) {
      // Simple mode calculations (no financing costs)
      const totalRentalIncome = monthlyRent * 12 * investmentPeriod;
      const totalReturns = totalRentalIncome + capitalAppreciation;
      const roi = propertyPrice > 0 ? (totalReturns / propertyPrice) * 100 : 0;
      const annualROI = investmentPeriod > 0 ? roi / investmentPeriod : 0;
      const monthlyCashFlow = monthlyRent;

      return {
        futureValue,
        capitalAppreciation,
        totalRentalIncome,
        totalReturns,
        roi,
        annualROI,
        monthlyCashFlow,
        isSimpleMode: true,
      };
    }

    // Advanced mode calculations (with financing costs)
    const mortgageDecimal = mortgageRate / 100;
    const propertyTaxDecimal = propertyTaxRate / 100;
    const maintenanceDecimal = maintenanceRate / 100;
    const vacancyDecimal = vacancyRate / 100;
    const rentIncreaseDecimal = rentIncreaseRate / 100;

    // Calculate down payment amount
    const downPaymentAmount = propertyPrice * (downPayment / 100);
    const loanAmount = propertyPrice - downPaymentAmount;

    // Calculate monthly mortgage payment
    const monthlyRate = mortgageDecimal / 12;
    const totalPayments = investmentPeriod * 12;
    const monthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) / 
                          (Math.pow(1 + monthlyRate, totalPayments) - 1);

    // Calculate total rental income over investment period
    let totalRentalIncome = 0;
    let currentRent = monthlyRent;
    for (let year = 0; year < investmentPeriod; year++) {
      const annualRent = currentRent * 12 * (1 - vacancyDecimal);
      totalRentalIncome += annualRent;
      currentRent *= (1 + rentIncreaseDecimal);
    }

    // Calculate total costs
    const totalMortgagePayments = monthlyPayment * totalPayments;
    const totalPropertyTax = propertyPrice * propertyTaxDecimal * investmentPeriod;
    const totalMaintenance = propertyPrice * maintenanceDecimal * investmentPeriod;
    const totalCosts = downPaymentAmount + totalMortgagePayments + totalPropertyTax + totalMaintenance;

    // Calculate net rental income (after vacancy)
    const netRentalIncome = totalRentalIncome;

    // Calculate total returns
    const totalReturns = netRentalIncome + capitalAppreciation;

    // Calculate ROI
    const roi = totalCosts > 0 ? ((totalReturns - totalCosts) / totalCosts) * 100 : 0;

    // Calculate annual ROI
    const annualROI = investmentPeriod > 0 ? roi / investmentPeriod : 0;

    // Calculate cash flow per year
    const annualCashFlow = (netRentalIncome - (totalMortgagePayments + totalPropertyTax + totalMaintenance)) / investmentPeriod;

    return {
      futureValue,
      downPaymentAmount,
      loanAmount,
      monthlyPayment,
      totalRentalIncome,
      totalMortgagePayments,
      totalPropertyTax,
      totalMaintenance,
      totalCosts,
      netRentalIncome,
      capitalAppreciation,
      totalReturns,
      roi,
      annualROI,
      annualCashFlow,
      isSimpleMode: false,
    };
  }, [inputs, isAdvancedMode]);

  // Handle input changes
  const handleInputChange = (field, value) => {
    setInputs(prev => ({
      ...prev,
      [field]: parseFloat(value) || 0
    }));
  };

  // Handle governorate selection
  const handleGovernorateChange = (governorateId) => {
    setSelectedGovernorate(governorateId);
    setSelectedCity(''); // Reset dependent selections
    setSelectedArea('');
  };

  // Handle city selection
  const handleCityChange = (cityId) => {
    setSelectedCity(cityId);
    setSelectedArea(''); // Reset dependent selection
  };

  // Handle area selection
  const handleAreaChange = (areaId) => {
    setSelectedArea(areaId);
    if (areaId) {
      const area = areasList.find(a => a._id === areaId);
      if (area) {
        setInputs(prev => ({
          ...prev,
          appreciationRate: area.annualAppreciationRate
        }));
      }
    }
  };

  return (
    <section
      className={`relative ${isAdvancedMode ? 'py-24' : 'py-16'} bg-[#131c2b] overflow-hidden`}
      dir={i18n.dir()}
    >
      

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className={`text-center ${isAdvancedMode ? 'mb-12' : 'mb-6'}`}>
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 bg-basira-gold/10 border border-basira-gold/20 rounded-full text-basira-gold font-medium ${isAdvancedMode ? 'text-sm mb-4' : 'text-xs mb-3'}`}>
            <FiTrendingUp className="w-4 h-4" />
            {translate('section.badge')}
          </div>
          <h2 className={`font-bold text-white leading-tight ${isAdvancedMode ? 'text-3xl md:text-4xl mb-4' : 'text-2xl md:text-3xl mb-3'}`}>
            {translate('section.titleLine1')}
            <span className="block bg-gradient-to-r from-basira-gold to-yellow-400 bg-clip-text text-transparent">
              {translate('section.titleLine2')}
            </span>
          </h2>
          <p className={`text-slate-300 max-w-2xl mx-auto leading-relaxed ${isAdvancedMode ? 'text-lg mb-6' : 'text-base mb-4'}`}>
            {isAdvancedMode
              ? translate('section.description.advanced')
              : translate('section.description.simple')}
          </p>
          
          {/* Mode Toggle Switch */}
          <div className="flex items-center justify-center gap-4">
            <span
              className={`text-lg font-medium transition-colors duration-300 ${!isAdvancedMode ? 'text-basira-gold' : 'text-slate-400'} ${
                isRTL ? 'order-3' : 'order-1'
              }`}
            >
              {translate('section.mode.simple')}
            </span>
            <button
              onClick={() => setIsAdvancedMode(!isAdvancedMode)}
              className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-basira-gold focus:ring-offset-2 focus:ring-offset-slate-900 ${
                isAdvancedMode ? 'bg-basira-gold' : 'bg-slate-600'
              } ${isRTL ? 'order-2' : 'order-2'}`}
            >
              <span
                className="absolute top-1 h-6 w-6 rounded-full bg-white shadow-sm transition-all duration-300"
                style={
                  isRTL
                    ? { right: isAdvancedMode ? '4px' : '36px' }
                    : { left: isAdvancedMode ? '36px' : '4px' }
                }
              />
            </button>
            <span
              className={`text-lg font-medium transition-colors duration-300 ${isAdvancedMode ? 'text-basira-gold' : 'text-slate-400'} ${
                isRTL ? 'order-1' : 'order-3'
              }`}
            >
              {translate('section.mode.advanced')}
            </span>
          </div>
        </div>

        <div className={`grid lg:grid-cols-2 items-start ${isAdvancedMode ? 'gap-8' : 'gap-6'}`}>
          {/* Calculator Inputs */}
          <div className={`${isAdvancedMode ? 'space-y-6' : 'space-y-3'}`}>
            <div className={`bg-white/5 backdrop-blur-md rounded-3xl border border-white/20 ${isAdvancedMode ? 'p-6' : 'p-4'}`}>
              <h3 className={`font-bold text-white flex items-center gap-2 ${isAdvancedMode ? 'text-xl mb-4' : 'text-lg mb-3'} ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                <FiHome className="w-5 h-5 text-basira-gold" />
                {isAdvancedMode ? translate('inputs.propertyDetails') : translate('inputs.basicDetails')}
              </h3>
              
              <div className={`${isAdvancedMode ? 'space-y-4' : 'space-y-3'}`}>
                {/* Property Price */}
                <div>
                  <label className={`block text-sm font-medium text-slate-300 ${isAdvancedMode ? 'mb-3' : 'mb-2'}`}>
                    {translate('inputs.propertyPriceLabel')}
                  </label>
                  <div className="relative">
                    <input
                      type="range"
                      min="500000"
                      max="50000000"
                      step="100000"
                      value={inputs.propertyPrice}
                      onChange={(e) => handleInputChange('propertyPrice', e.target.value)}
                      className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer slider"
                    />
                    <div className="flex justify-between text-xs text-slate-400 mt-2">
                      <span>{formatCompact(500000)}</span>
                      <span>{formatCompact(50000000)}</span>
                    </div>
                  </div>
                  <div className={`font-bold text-basira-gold mt-1 ${isAdvancedMode ? 'text-xl' : 'text-lg'}`}>
                    {formatCurrency(inputs.propertyPrice)}
                  </div>
                </div>

                {/* Monthly Rent */}
                <div>
                  <label className={`block text-sm font-medium text-slate-300 ${isAdvancedMode ? 'mb-2' : 'mb-1'}`}>
                    {translate('inputs.monthlyRentLabel')}
                  </label>
                  <div className="relative">
                    <input
                      type="range"
                      min="5001"
                      max="500000"
                      step="1000"
                      value={inputs.monthlyRent}
                      onChange={(e) => handleInputChange('monthlyRent', e.target.value)}
                      className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer slider"
                    />
                    <div className="flex justify-between text-xs text-slate-400 mt-1">
                      <span>{formatCompact(5001)}</span>
                      <span>{formatCompact(500000)}</span>
                    </div>
                  </div>
                  <div className={`font-bold text-basira-gold mt-1 ${isAdvancedMode ? 'text-xl' : 'text-lg'}`}>
                    {formatCurrency(inputs.monthlyRent)}
                  </div>
                </div>

                {/* Investment Period */}
                <div>
                  <label className={`block text-sm font-medium text-slate-300 ${isAdvancedMode ? 'mb-2' : 'mb-1'}`}>
                    {translate('inputs.investmentPeriodLabel')}
                  </label>
                  <div className="relative">
                    <input
                      type="range"
                      min="1"
                      max="30"
                      step="1"
                      value={inputs.investmentPeriod}
                      onChange={(e) => handleInputChange('investmentPeriod', e.target.value)}
                      className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer slider"
                    />
                    <div className="flex justify-between text-xs text-slate-400 mt-1">
                      <span>{translate('inputs.investmentPeriodRangeMin')}</span>
                      <span>{translate('inputs.investmentPeriodRangeMax')}</span>
                    </div>
                  </div>
                  <div className={`font-bold text-basira-gold mt-1 ${isAdvancedMode ? 'text-xl' : 'text-lg'}`}>
                    {yearsLabel(inputs.investmentPeriod)}
                  </div>
                </div>

                {/* Location Selector - Hierarchical */}
                {governoratesList.length > 0 && (
                  <div className="space-y-3 bg-slate-800/30 p-4 rounded-lg border border-slate-700">
                    <div className={`flex items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                      <FiMapPin className="w-4 h-4 text-basira-gold" />
                      <span className="text-sm font-medium text-slate-300">
                        {translate('inputs.location.heading')}
                      </span>
                    </div>

                    {/* Governorate */}
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">
                        {translate('inputs.location.governorate')}
                      </label>
                      <Select
                        value={selectedGovernorate || 'none'}
                        onValueChange={(value) => handleGovernorateChange(value === 'none' ? '' : value)}
                      >
                        <SelectTrigger className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-basira-gold text-sm h-auto">
                          <span>
                            {selectedGovernorate
                              ? governoratesList.find(g => g._id === selectedGovernorate)?.name
                              : translate('inputs.location.governoratePlaceholder')}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">
                            {translate('inputs.location.governoratePlaceholder')}
                          </SelectItem>
                          {governoratesList.map((gov) => (
                            <SelectItem key={gov._id} value={gov._id}>
                              {gov.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* City */}
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">
                        {translate('inputs.location.city')}
                      </label>
                      <Select
                        value={selectedCity || 'none'}
                        onValueChange={(value) => handleCityChange(value === 'none' ? '' : value)}
                        disabled={!selectedGovernorate}
                      >
                        <SelectTrigger className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-basira-gold text-sm h-auto disabled:opacity-50" disabled={!selectedGovernorate}>
                          <span>
                            {selectedCity
                              ? citiesByGovernorateList.find(c => c._id === selectedCity)?.name
                              : selectedGovernorate
                                ? translate('inputs.location.cityPlaceholder')
                                : translate('inputs.location.cityPlaceholderDisabled')}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">
                            {selectedGovernorate
                              ? translate('inputs.location.cityPlaceholder')
                              : translate('inputs.location.cityPlaceholderDisabled')}
                          </SelectItem>
                          {citiesByGovernorateList.map((city) => (
                            <SelectItem key={city._id} value={city._id}>
                              {city.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Area */}
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">
                        {translate('inputs.location.area')}
                      </label>
                      <Select
                        value={selectedArea || 'none'}
                        onValueChange={(value) => handleAreaChange(value === 'none' ? '' : value)}
                        disabled={!selectedCity}
                      >
                        <SelectTrigger className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-basira-gold text-sm h-auto disabled:opacity-50" disabled={!selectedCity}>
                          <span>
                            {selectedArea
                              ? translate('inputs.location.areaSelected', {
                                  name: selectedAreaData?.name,
                                  rate: getFormattedAppreciationRate(selectedAreaData?.annualAppreciationRate)
                                })
                              : selectedCity
                                ? translate('inputs.location.areaPlaceholder')
                                : translate('inputs.location.areaPlaceholderDisabled')}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">
                            {selectedCity
                              ? translate('inputs.location.areaPlaceholder')
                              : translate('inputs.location.areaPlaceholderDisabled')}
                          </SelectItem>
                          {areasList.map((area) => (
                            <SelectItem key={area._id} value={area._id}>
                              {translate('inputs.location.areaOption', {
                                name: area.name,
                                rate: getFormattedAppreciationRate(area.annualAppreciationRate)
                              })}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* Appreciation Rate - Always shown */}
                <div>
                  <label className={`block text-sm font-medium text-slate-300 ${isAdvancedMode ? 'mb-2' : 'mb-1'}`}>
                    {selectedArea
                      ? translate('inputs.appreciationRate.labelSelected', {
                          name: selectedAreaData?.name
                        })
                      : translate('inputs.appreciationRate.label')}
                  </label>
                  <div className="relative">
                    <input
                      type="range"
                      min="3"
                      max="20"
                      step="0.5"
                      value={inputs.appreciationRate}
                      onChange={(e) => handleInputChange('appreciationRate', e.target.value)}
                      className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer slider"
                    />
                    <div className="flex justify-between text-xs text-slate-400 mt-1">
                      <span>{translate('inputs.appreciationRate.min')}</span>
                      <span>{translate('inputs.appreciationRate.max')}</span>
                    </div>
                  </div>
                  <div className={`font-bold text-basira-gold mt-1 ${isAdvancedMode ? 'text-xl' : 'text-lg'}`}>
                    {formatPercentage(inputs.appreciationRate)}
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Parameters - Only in Advanced Mode */}
            {isAdvancedMode && (
              <div className="bg-white/5 backdrop-blur-md rounded-3xl border border-white/20 p-4">
                <h3 className={`text-lg font-bold text-white mb-4 flex items-center gap-2 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                  <FiDollarSign className="w-5 h-5 text-basira-gold" />
                  {translate('inputs.financialHeading')}
                </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Down Payment */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    {translate('inputs.downPayment')}
                  </label>
                  <div className="relative">
                    <input
                      type="range"
                      min="10"
                      max="50"
                      step="5"
                      value={inputs.downPayment}
                      onChange={(e) => handleInputChange('downPayment', e.target.value)}
                      className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer slider"
                    />
                  </div>
                  <div className="text-base font-bold text-basira-gold mt-1">
                    {formatPercentage(inputs.downPayment)}
                  </div>
                </div>

                {/* Mortgage Rate */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    {translate('inputs.mortgageRate')}
                  </label>
                  <div className="relative">
                    <input
                      type="range"
                      min="8"
                      max="20"
                      step="0.5"
                      value={inputs.mortgageRate}
                      onChange={(e) => handleInputChange('mortgageRate', e.target.value)}
                      className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer slider"
                    />
                  </div>
                  <div className="text-base font-bold text-basira-gold mt-1">
                    {formatPercentage(inputs.mortgageRate)}
                  </div>
                </div>

                {/* Property Tax Rate */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    {translate('inputs.propertyTaxRate')}
                  </label>
                  <div className="relative">
                    <input
                      type="range"
                      min="0"
                      max="2.5"
                      step="0.1"
                      value={inputs.propertyTaxRate}
                      onChange={(e) => handleInputChange('propertyTaxRate', e.target.value)}
                      className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer slider"
                    />
                  </div>
                  <div className="text-base font-bold text-basira-gold mt-1">
                    {formatPercentage(inputs.propertyTaxRate)}
                  </div>
                </div>

                {/* Maintenance Rate */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    {translate('inputs.maintenanceRate')}
                  </label>
                  <div className="relative">
                    <input
                      type="range"
                      min="1"
                      max="5"
                      step="0.1"
                      value={inputs.maintenanceRate}
                      onChange={(e) => handleInputChange('maintenanceRate', e.target.value)}
                      className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer slider"
                    />
                  </div>
                  <div className="text-base font-bold text-basira-gold mt-1">
                    {formatPercentage(inputs.maintenanceRate)}
                  </div>
                </div>

                {/* Vacancy Rate */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    {translate('inputs.vacancyRate')}
                  </label>
                  <div className="relative">
                    <input
                      type="range"
                      min="0"
                      max="20"
                      step="1"
                      value={inputs.vacancyRate}
                      onChange={(e) => handleInputChange('vacancyRate', e.target.value)}
                      className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer slider"
                    />
                  </div>
                  <div className="text-base font-bold text-basira-gold mt-1">
                    {formatPercentage(inputs.vacancyRate)}
                  </div>
                </div>
              </div>
            </div>
            )}
          </div>

          {/* Results Display */}
          <div className={`${isAdvancedMode ? 'space-y-4' : 'space-y-3'}`}>
            {/* Main ROI Display */}
            <div className={`bg-white/5 backdrop-blur-md rounded-3xl border border-white/20 text-center ${isAdvancedMode ? 'p-6' : 'p-4'}`}>
              <h3 className={`font-bold text-white flex items-center justify-center gap-2 ${isAdvancedMode ? 'text-xl mb-4' : 'text-lg mb-3'} ${isRTL ? 'flex-row-reverse' : ''}`}>
                <FiTrendingUp className="w-5 h-5 text-basira-gold" />
                {isAdvancedMode ? translate('results.investmentReturns') : translate('results.quickResults')}
              </h3>
              
              <div className={`${isAdvancedMode ? 'mb-6' : 'mb-4'}`}>
                <div className={`font-bold mb-2 ${isAdvancedMode ? 'text-4xl md:text-5xl' : 'text-3xl md:text-4xl'}`}>
                  <span className={calculations.roi >= 0 ? 'text-green-400' : 'text-red-400'}>
                    {formatPercentage(calculations.roi)}
                  </span>
                </div>
                <div className={`text-slate-300 ${isAdvancedMode ? 'text-lg' : 'text-base'}`}>
                  {isAdvancedMode ? translate('results.totalROI') : translate('results.simpleROI')}
                </div>
                <div className={`text-slate-400 ${isAdvancedMode ? 'text-base' : 'text-sm'}`}>
                  {translate('results.annualROI', { value: formatPercentage(calculations.annualROI) })}
                </div>
              </div>

              {/* ROI Progress Bar */}
              <div className={`w-full bg-slate-600 rounded-full ${isAdvancedMode ? 'h-2 mb-3' : 'h-2 mb-2'}`}>
                <div 
                  className={`rounded-full transition-all duration-1000 ${
                    calculations.roi >= 0 ? 'bg-gradient-to-r from-green-400 to-green-500' : 'bg-gradient-to-r from-red-400 to-red-500'
                  } h-2`}
                  style={{ width: `${Math.min(Math.abs(calculations.roi), 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Detailed Breakdown */}
            <div className={`bg-white/5 backdrop-blur-md rounded-3xl border border-white/20 ${isAdvancedMode ? 'p-6' : 'p-4'}`}>
              <h4 className={`font-bold text-white ${isAdvancedMode ? 'text-lg mb-4' : 'text-base mb-3'}`}>
                {isAdvancedMode ? translate('results.breakdown.investment') : translate('results.breakdown.simple')}
              </h4>
              
              <div className={`${isAdvancedMode ? 'space-y-3' : 'space-y-2'}`}>
                <div className="flex justify-between items-center py-2 border-b border-slate-600/30">
                  <span className="text-slate-300">{translate('results.futureValue')}</span>
                  <span className="text-white font-semibold">{formatCurrency(calculations.futureValue)}</span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-slate-600/30">
                  <span className="text-slate-300">{translate('results.totalRentalIncome')}</span>
                  <span className="text-white font-semibold">{formatCurrency(calculations.totalRentalIncome)}</span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-slate-600/30">
                  <span className="text-slate-300">{translate('results.capitalAppreciation')}</span>
                  <span className="text-white font-semibold">{formatCurrency(calculations.capitalAppreciation)}</span>
                </div>
                
                {isAdvancedMode && (
                  <div className="flex justify-between items-center py-2 border-b border-slate-600/30">
                    <span className="text-slate-300">{translate('results.totalCosts')}</span>
                    <span className="text-white font-semibold">{formatCurrency(calculations.totalCosts)}</span>
                  </div>
                )}
                
                <div className="flex justify-between items-center py-3 bg-slate-700/30 rounded-lg px-4">
                  <span className="text-lg font-semibold text-white">
                    {isAdvancedMode ? translate('results.netProfit') : translate('results.totalReturns')}
                  </span>
                  <span className={`text-lg font-bold ${calculations.totalReturns - (calculations.totalCosts || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCurrency(calculations.totalReturns - (calculations.totalCosts || 0))}
                  </span>
                </div>
              </div>
            </div>

            {/* Monthly Details */}
            <div className={`bg-white/5 backdrop-blur-md rounded-3xl border border-white/20 ${isAdvancedMode ? 'p-6' : 'p-4'}`}>
              <h4 className={`font-bold text-white ${isAdvancedMode ? 'text-lg mb-4' : 'text-base mb-3'}`}>
                {isAdvancedMode ? translate('results.monthlyDetails') : translate('results.simpleDetails')}
              </h4>
              
              <div className={`${isAdvancedMode ? 'space-y-3' : 'space-y-2'}`}>
                {isAdvancedMode && (
                  <div className="flex justify-between items-center py-2 border-b border-slate-600/30">
                    <span className="text-slate-300">{translate('results.monthlyMortgage')}</span>
                    <span className="text-white font-semibold">{formatCurrency(calculations.monthlyPayment)}</span>
                  </div>
                )}
                
                <div className="flex justify-between items-center py-2 border-b border-slate-600/30">
                  <span className="text-slate-300">{translate('results.monthlyIncome')}</span>
                  <span className="text-white font-semibold">{formatCurrency(inputs.monthlyRent)}</span>
                </div>
                
                <div className="flex justify-between items-center py-3 bg-slate-700/30 rounded-lg px-4">
                  <span className="text-lg font-semibold text-white">
                    {isAdvancedMode ? translate('results.monthlyCashFlow') : translate('results.monthlyIncomeSimple')}
                  </span>
                  <span className={`text-lg font-bold ${(calculations.annualCashFlow || calculations.monthlyCashFlow) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCurrency(isAdvancedMode ? (calculations.annualCashFlow / 12) : calculations.monthlyCashFlow)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className={`text-center ${isAdvancedMode ? 'mt-12' : 'mt-8'}`}>
          <div className={`relative bg-white/5 backdrop-blur-md rounded-3xl shadow-2xl border border-white/20 overflow-hidden ${isAdvancedMode ? 'p-8' : 'p-6'}`}>
            <div className="absolute inset-0 bg-gradient-to-r from-basira-gold/10 to-transparent"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"></div>
            <div className="relative">
              <h3 className={`font-bold text-white ${isAdvancedMode ? 'text-2xl md:text-3xl mb-3' : 'text-xl md:text-2xl mb-3'}`}>
                {translate('cta.headingLine1')}
                <span className="block text-basira-gold">{translate('cta.headingHighlight')}</span>
              </h3>
              <p className={`text-slate-300 max-w-2xl mx-auto leading-relaxed ${isAdvancedMode ? 'mb-6 text-base' : 'mb-4 text-sm'}`}>
                {translate('cta.text')}
              </p>
              <div className={`flex flex-col sm:flex-row gap-4 justify-center ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
                <button className={`group bg-gradient-to-r from-basira-gold to-yellow-400 text-slate-900 rounded-xl font-bold hover:shadow-2xl hover:shadow-basira-gold/25 transition-all duration-300 transform hover:-translate-y-1 inline-flex items-center justify-center ${isAdvancedMode ? 'px-6 py-3 text-base' : 'px-5 py-2 text-sm'}`}>
                  <span className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    {translate('cta.primary')}
                    <FiTrendingUp className={`w-5 h-5 transition-transform ${isRTL ? 'group-hover:-translate-x-1' : 'group-hover:translate-x-1'}`} />
                  </span>
                </button>
                <button className={`border-2 border-basira-gold text-basira-gold rounded-xl font-bold hover:bg-basira-gold hover:text-slate-900 transition-all duration-300 backdrop-blur-sm inline-flex items-center justify-center ${isAdvancedMode ? 'px-6 py-3 text-base' : 'px-5 py-2 text-sm'}`}>
                  {translate('cta.secondary')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #A88B32;
          cursor: pointer;
          box-shadow: 0 4px 8px rgba(168, 139, 50, 0.3);
        }
        
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #A88B32;
          cursor: pointer;
          border: none;
          box-shadow: 0 4px 8px rgba(168, 139, 50, 0.3);
        }
      ` }} />
    </section>
  );
};

export default ROICalculatorSection;
