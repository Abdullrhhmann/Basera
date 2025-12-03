import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
} from "react";
import { Helmet } from "react-helmet-async";
import {
  generateSEOTags,
  generateOrganizationSchema,
  generateWebsiteSchema,
  generateBreadcrumbSchema,
  getCanonicalUrl
} from "../utils/seo";
import MultipleStructuredData from "../components/seo/StructuredData";
import { Link, useNavigate } from "react-router-dom";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { useAuth } from "../context/AuthContext";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
  Select as ShadcnSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/shadcn";
import { useQuery } from "react-query";
import { showSuccess, showError } from "../utils/sonner";
import { inquiriesAPI, propertiesAPI, citiesAPI, compoundsAPI, areasAPI, governoratesAPI, developersAPI } from "../utils/api";
import PropertyCard3D from "../components/common/PropertyCard3D";
import LaunchesSection from "../components/sections/LaunchesSection";
import Footer from "../components/layout/Footer";
import KineticSection from "../components/KineticSection";
import MarqueeSection from "../components/ui/MarqueeSection";
import { useSiteSettings } from "../hooks/useSiteSettings";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import LeadCaptureForm from "../components/lead/LeadCaptureForm";
import "../styles/Home.css";

import {
  FiArrowLeft,
  FiArrowRight,
  FiHome,
  FiUsers,
  FiLayers,
  FiBuilding,
  FiBriefcase,
  FiMapPin,
  FiTrendingUp,
  FiX,
} from "../icons/feather";

// Register ScrollTrigger plugin
gsap.registerPlugin(ScrollTrigger);

const PROPERTY_TYPES = [
  { labelKey: "home.propertyTypes.luxuryVillas", value: "villa", icon: FiHome },
  { labelKey: "home.propertyTypes.twinVillas", value: "twin-villa", icon: FiUsers },
  { labelKey: "home.propertyTypes.duplexResidences", value: "duplex", icon: FiLayers },
  { labelKey: "home.propertyTypes.signatureApartments", value: "apartment", icon: FiBuilding },
  { labelKey: "home.propertyTypes.commercialSpaces", value: "commercial", icon: FiBriefcase },
  { labelKey: "home.propertyTypes.primeLand", value: "land", icon: FiMapPin },
];

const STATUS_OPTIONS = [
  { labelKey: "home.statusOptions.any", value: "" },
  { labelKey: "home.statusOptions.forSale", value: "for-sale" },
  { labelKey: "home.statusOptions.forRent", value: "for-rent" },
];

const PRICE_OPTIONS = [
  { value: "", isAny: true, labelKey: "home.search.priceOptions.any" },
  { value: "1000000", labelKey: "home.search.priceOptions.egp1m" },
  { value: "2500000", labelKey: "home.search.priceOptions.egp2_5m" },
  { value: "5000000", labelKey: "home.search.priceOptions.egp5m" },
  { value: "10000000", labelKey: "home.search.priceOptions.egp10m" },
  { value: "15000000", labelKey: "home.search.priceOptions.egp15m" },
  { value: "25000000", labelKey: "home.search.priceOptions.egp25m" },
];

const getEntityId = (entity) => {
  if (!entity) return "";
  if (typeof entity === "string") return entity;
  if (typeof entity === "object") {
    return entity._id || entity.id || entity.slug || entity.value || "";
  }
  return "";
};

// Simple text animation function to replace SplitText
const animateText = (element, delay = 0) => {
  if (!element) return;
  
  const text = element.textContent;
  const isRTLDocument =
    typeof document !== "undefined" &&
    document.documentElement?.dir === "rtl";

  if (isRTLDocument) {
    element.textContent = text;
    gsap.fromTo(
      element,
      { opacity: 0, y: -40 },
      {
        opacity: 1,
        y: 0,
        duration: 0.6,
        delay,
        ease: "power2.out",
      }
    );
    return;
  }

  element.innerHTML = "";
  
  for (let i = 0; i < text.length; i++) {
    const span = document.createElement("span");
    span.textContent = text[i];
    span.style.display = "inline-block";
    span.style.transform = "translateY(-200px)";
    span.style.opacity = "0";
    element.appendChild(span);
    
    gsap.to(span, {
      y: 0,
      opacity: 1,
      duration: 0.5,
      delay: delay + i * 0.01,
      ease: "power2.out",
    });
  }
};

const Home = () => {
  // All hooks must be called at the top level
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === "rtl";
  const { settings } = useSiteSettings();
  const prefersReducedMotion = usePrefersReducedMotion();
  const menuOverlayRef = useRef(null);
  const pageContentRef = useRef(null);
  const toggleButtonRef = useRef(null);
  const menuTimelineRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const smoothScrollRef = useRef(null);
  const citiesSliderRef = useRef(null);
  const developersSliderRef = useRef(null);
  // Initialize Lenis smooth scrolling for Home page
  useEffect(() => {
    if (prefersReducedMotion) {
      return undefined;
    }

    const lenis = new Lenis({
      duration: 1.1,
      smoothWheel: true,
      smoothTouch: false,
      normalizeWheel: true,
    });

    smoothScrollRef.current = lenis;

    const handleLenisScroll = () => {
      ScrollTrigger.update();
    };

    lenis.on("scroll", handleLenisScroll);

    let animationFrame;
    const raf = (time) => {
      lenis.raf(time);
      animationFrame = requestAnimationFrame(raf);
    };

    animationFrame = requestAnimationFrame(raf);

    return () => {
      lenis.off("scroll", handleLenisScroll);
      cancelAnimationFrame(animationFrame);
      lenis.destroy();
      smoothScrollRef.current = null;
    };
  }, [prefersReducedMotion]);

  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  // Add error boundary state
  const [hasError, setHasError] = useState(false);
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedType, setSelectedType] = useState("");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [formFilters, setFormFilters] = useState({
    city: "",
    type: "",
    status: "",
    minPrice: "",
    maxPrice: "",
    compound: "",
    area_ref: "",
    governorate: "",
  });
  const [appliedFilters, setAppliedFilters] = useState({
    city: "",
    type: "",
    status: "",
    minPrice: "",
    maxPrice: "",
    compound: "",
    area_ref: "",
    governorate: "",
  });
  const [locationSearch, setLocationSearch] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [_selectedLocationType, setSelectedLocationType] = useState(null); // Track selected location type
  const locationSearchTimeoutRef = useRef(null);
  const [heroStage, setHeroStage] = useState(prefersReducedMotion ? 4 : 0);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    requiredService: "buy",
    propertyType: "villa",
    location: "",
    budget: {
      min: "",
      max: "",
      currency: "EGP",
    },
  });

  const {
    register: _register,
    reset,
    formState: { errors: _errors },
    watch,
  } = useForm({
    defaultValues: formData,
  });

  const FORM_STEPS = useMemo(
    () => [
      {
        field: "name",
        label: t("home.leadSteps.name.label"),
        type: "text",
        placeholder: t("home.leadSteps.name.placeholder"),
        validation: {
          required: t("home.leadSteps.name.required"),
          minLength: {
            value: 2,
            message: t("home.leadSteps.name.min"),
          },
        },
      },
      {
        field: "email",
        label: t("home.leadSteps.email.label"),
        type: "email",
        placeholder: t("home.leadSteps.email.placeholder"),
        validation: {
          required: t("home.leadSteps.email.required"),
          pattern: {
            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
            message: t("home.leadSteps.email.invalid"),
          },
        },
      },
      {
        field: "phone",
        label: t("home.leadSteps.phone.label"),
        type: "tel",
        placeholder: t("home.leadSteps.phone.placeholder"),
        validation: {
          required: t("home.leadSteps.phone.required"),
          pattern: {
            value: /^\+?[1-9]\d{0,15}$/,
            message: t("home.leadSteps.phone.invalid"),
          },
        },
      },
      {
        field: "requiredService",
        label: t("home.leadSteps.service.label"),
        type: "select",
        options: [
          { value: "buy", label: t("home.leadSteps.service.options.buy") },
          { value: "rent", label: t("home.leadSteps.service.options.rent") },
          { value: "sell", label: t("home.leadSteps.service.options.sell") },
          { value: "invest", label: t("home.leadSteps.service.options.invest") },
        ],
        validation: { required: t("home.leadSteps.service.required") },
      },
      {
        field: "propertyType",
        label: t("home.leadSteps.propertyType.label"),
        type: "select",
        options: [
          { value: "villa", label: t("home.leadSteps.propertyType.options.villa") },
          { value: "apartment", label: t("home.leadSteps.propertyType.options.apartment") },
          { value: "townhouse", label: t("home.leadSteps.propertyType.options.townhouse") },
          { value: "penthouse", label: t("home.leadSteps.propertyType.options.penthouse") },
          { value: "duplex", label: t("home.leadSteps.propertyType.options.duplex") },
        ],
        validation: { required: t("home.leadSteps.propertyType.required") },
      },
      {
        field: "location",
        label: t("home.leadSteps.location.label"),
        type: "text",
        placeholder: t("home.leadSteps.location.placeholder"),
        validation: { required: t("home.leadSteps.location.required") },
      },
    ],
    [t]
  );

  const handleStepSubmit = useCallback(async () => {
    if (isSubmittingLead) return;
    
    setIsSubmittingLead(true);
        try {
          const values = watch();
      
      // Try to submit to API, but don't fail if it's not available
      try {
        await inquiriesAPI.createLead(values);
        showSuccess(
          t("home.leadSteps.stepToast.successTitle"),
          t("home.leadSteps.stepToast.successSubtitle")
        );
          } catch (apiError) {
        showSuccess(
          t("home.leadSteps.stepToast.successTitle"),
          t("home.leadSteps.stepToast.fallbackSubtitle")
        );
      }
      
      // Reset form
      setCurrentStep(0);
      setFormData({
        name: "",
        email: "",
        phone: "",
        requiredService: "buy",
        propertyType: "villa",
        location: "",
        budget: {
          min: "",
          max: "",
          currency: "EGP",
        },
      });
      reset(formData);
    } catch (error) {
      console.error("Form submission error:", error);
      showError(
        t("home.leadSteps.stepToast.errorTitle"),
        t("home.leadSteps.stepToast.errorSubtitle")
      );
    } finally {
      setIsSubmittingLead(false);
    }
  }, [watch, reset, formData, isSubmittingLead, t]);

  // Step-by-step form handlers
  const handleNext = useCallback(() => {
    const currentStepData = FORM_STEPS[currentStep];
    const fieldName = currentStepData.field;
    const value = watch(fieldName);

    // Validate current field
    let isValid = true;
    let errorMessage = "";
    const fieldValidation = currentStepData.validation || {};

    if (fieldValidation.required) {
      const requiredMessage =
        typeof fieldValidation.required === "string"
          ? fieldValidation.required
          : t("home.leadSteps.genericRequired");
      if (!value || (typeof value === "string" && !value.trim())) {
        isValid = false;
        errorMessage = requiredMessage;
      }
    }

    if (isValid && fieldValidation.minLength?.value) {
      if (!value || value.trim().length < fieldValidation.minLength.value) {
        isValid = false;
        errorMessage = fieldValidation.minLength.message;
      }
    }

    if (isValid && fieldValidation.pattern?.value) {
      if (!value || !fieldValidation.pattern.value.test(value)) {
        isValid = false;
        errorMessage = fieldValidation.pattern.message;
      }
    }

    if (isValid && currentStep < FORM_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else if (!isValid) {
      showError(t("home.leadSteps.validationError"), errorMessage);
    }
  }, [currentStep, watch, FORM_STEPS, t]);


  // eslint-disable-next-line no-unused-vars
  const handleTypeSelect = (value) => {
    const nextValue = value === selectedType ? "" : value;
    setSelectedType(nextValue);
    // Also update the search filters
    setFormFilters((prev) => ({ ...prev, type: nextValue }));
    setAppliedFilters((prev) => ({ ...prev, type: nextValue }));
    
    // Navigate to properties page with the selected type filter
    if (nextValue) {
      // Build URL with all current applied filters plus the new type
      const params = new URLSearchParams();
      if (nextValue) params.set("type", nextValue);
      if (appliedFilters.city) params.set("city", appliedFilters.city);
      if (appliedFilters.status) params.set("status", appliedFilters.status);
      if (appliedFilters.minPrice)
        params.set("minPrice", appliedFilters.minPrice);
      if (appliedFilters.maxPrice)
        params.set("maxPrice", appliedFilters.maxPrice);
      
      navigate(`/properties?${params.toString()}`);
    } else {
      navigate("/properties");
    }
  };

  // Search filter handlers
  const handleFilterChange = (field, value) => {
    setFormFilters((prev) => {
      const next = { ...prev, [field]: value };
      return next;
    });

    if (field === "search") {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      const trimmedValue = value.trim();

      if (trimmedValue) {
        searchTimeoutRef.current = window.setTimeout(() => {
          trackSearch(trimmedValue);
          searchTimeoutRef.current = null;
        }, 1500);
      } else {
        searchTimeoutRef.current = null;
      }
    }
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    if (
      formFilters.minPrice &&
      formFilters.maxPrice &&
      Number(formFilters.minPrice) > Number(formFilters.maxPrice)
    ) {
      showError(
        t("home.search.invalidPriceTitle"),
        t("home.search.invalidPriceMessage")
      );
      return;
    }
    
    // Build URL parameters from filters
    const params = new URLSearchParams();
    if (formFilters.city) params.append("city", formFilters.city);
    if (formFilters.type) params.append("type", formFilters.type);
    if (formFilters.status) params.append("status", formFilters.status);
    if (formFilters.minPrice) params.append("minPrice", formFilters.minPrice);
    if (formFilters.maxPrice) params.append("maxPrice", formFilters.maxPrice);
    if (formFilters.compound) params.append("compound", formFilters.compound);
    if (formFilters.area_ref) params.append("area_ref", formFilters.area_ref);
    if (formFilters.governorate) params.append("governorate", formFilters.governorate);
    
    // Navigate to properties page with filters
    if (params.toString()) {
      navigate(`/properties?${params.toString()}`);
    } else {
      navigate("/properties");
    }
  };

  const handleClearFilters = () => {
    const emptyFilters = {
      city: "",
      type: "",
      status: "",
      minPrice: "",
      maxPrice: "",
      compound: "",
      area_ref: "",
      governorate: "",
    };
    setFormFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setSelectedType("");
    setLocationSearch("");
    setSelectedLocationType(null);
    setLocationSuggestions([]);
    setShowLocationSuggestions(false);
  };

  // Featured Properties data fetching for homepage
  const {
    data: propertiesData,
    isLoading: isLoadingProperties,
    isError: isPropertiesError,
    refetch: refetchProperties,
    isFetching: isFetchingProperties,
  } = useQuery(
    ["featured-properties"],
    async () => {
      const searchParams = {
        limit: 6,
        sortBy: "createdAt",
        sortOrder: "desc",
        featured: "true", // Only fetch featured properties
        _t: Date.now(), // Cache busting
      };

      const response = await propertiesAPI.getProperties(searchParams);
      return response.data;
    },
    {
      keepPreviousData: false,
      staleTime: 1000 * 60 * 2, // Reduced to 2 minutes
      cacheTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: true, // Refetch on window focus
    }
  );

  // Client-side safety filter: ALWAYS exclude sold/rented properties
  const propertyList = (propertiesData?.properties || []).filter(
    property => property.status !== 'sold' && property.status !== 'rented'
  );

  // Fetch total properties count from database
  const {
    data: totalCountData,
    isLoading: isLoadingTotalProperties,
  } = useQuery(
    ["total-properties-count"],
    async () => {
      const response = await propertiesAPI.getProperties({
        limit: 1,
        page: 1,
      });
      return response.data;
    },
    {
      staleTime: 1000 * 60 * 10,
      retry: 1,
      refetchOnWindowFocus: false,
    }
  );

  const totalPropertiesOnWebsite = totalCountData?.pagination?.totalProperties || 0;

  // Fetch cities
  const { data: citiesData, isLoading: isLoadingCities } = useQuery(
    ["travel-cities"],
    async () => {
      const response = await citiesAPI.getCities({
        limit: 1000, // Increased limit to show all cities
        sortBy: "name",
        sortOrder: "asc",
      });
      return response.data;
    },
    {
      staleTime: 1000 * 60 * 10, // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    }
  );

  const citiesList = citiesData?.cities || [];

  // Fetch developers
  const { data: developersData, isLoading: isLoadingDevelopers } = useQuery(
    ["home-developers"],
    async () => {
      const response = await developersAPI.getDevelopers({
        limit: 1000, // Increased limit to show all developers
        sortBy: "name",
        sortOrder: "asc",
      });
      return response.data;
    },
    {
      staleTime: 1000 * 60 * 10, // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    }
  );

  const developersList = developersData?.developers || [];

  const trackSearch = useCallback(
    async (searchQuery) => {
      if (!searchQuery) return;

      try {
        const { searchAPI } = await import("../utils/api");
        await searchAPI.trackSearch({
          query: searchQuery,
          resultsCount: propertyList.length,
          filters: {
            type: formFilters.type,
            status: formFilters.status,
            city: formFilters.city,
            minPrice: formFilters.minPrice ? Number(formFilters.minPrice) : null,
            maxPrice: formFilters.maxPrice ? Number(formFilters.maxPrice) : null,
          },
        });
      } catch (error) {
        console.error("Error tracking search:", error);
      }
    },
    [formFilters.city, formFilters.maxPrice, formFilters.minPrice, formFilters.status, formFilters.type, propertyList.length]
  );

  // Scroll handlers for sliders
  const scrollCities = (direction) => {
    if (citiesSliderRef.current) {
      const scrollAmount = citiesSliderRef.current.clientWidth * 0.8;
      const scrollLeft = citiesSliderRef.current.scrollLeft;
      const newScrollLeft = direction === 'left' 
        ? scrollLeft - scrollAmount 
        : scrollLeft + scrollAmount;
      citiesSliderRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth'
      });
    }
  };

  const scrollDevelopers = (direction) => {
    if (developersSliderRef.current) {
      const scrollAmount = developersSliderRef.current.clientWidth * 0.8;
      const scrollLeft = developersSliderRef.current.scrollLeft;
      const newScrollLeft = direction === 'left' 
        ? scrollLeft - scrollAmount 
        : scrollLeft + scrollAmount;
      developersSliderRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth'
      });
    }
  };

  // Location search function
  const searchLocations = useCallback(async (query) => {
    if (!query || query.trim().length < 2) {
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
      return;
    }

    const searchTerm = query.trim().toLowerCase();
    const results = [];

    try {
      // Search all location types in parallel
      const [citiesRes, compoundsRes, areasRes, governoratesRes] = await Promise.allSettled([
        citiesAPI.getCities({ search: searchTerm, limit: 5 }),
        compoundsAPI.getCompounds({ search: searchTerm, limit: 5 }),
        areasAPI.getAreas({ search: searchTerm, limit: 5 }),
        governoratesAPI.getGovernorates({ search: searchTerm, limit: 5 }),
      ]);

      // Add cities
      if (citiesRes.status === 'fulfilled' && citiesRes.value?.data?.cities) {
        citiesRes.value.data.cities.forEach((city) => {
          const cityId = getEntityId(city) || city.slug || city.name;
          if (!cityId) return;
          results.push({
            id: cityId,
            name: city.name,
            type: 'city',
            slug: city.slug,
            label: `${city.name} (${t('home.locationTypes.city', { defaultValue: 'City' })})`,
          });
        });
      }

      // Add compounds
      if (compoundsRes.status === 'fulfilled' && compoundsRes.value?.data?.compounds) {
        compoundsRes.value.data.compounds.forEach((compound) => {
          const compoundId = getEntityId(compound) || compound.slug || compound.name;
          if (!compoundId) return;
          results.push({
            id: compoundId,
            name: compound.name,
            type: 'compound',
            slug: compound.slug,
            label: `${compound.name} (${t('home.locationTypes.compound', { defaultValue: 'Compound' })})`,
          });
        });
      }

      // Add areas
      if (areasRes.status === 'fulfilled' && areasRes.value?.data?.areas) {
        areasRes.value.data.areas.forEach((area) => {
          const areaId = getEntityId(area) || area.slug || area.name;
          if (!areaId) return;
          results.push({
            id: areaId,
            name: area.name,
            type: 'area',
            slug: area.slug,
            label: `${area.name} (${t('home.locationTypes.area', { defaultValue: 'Area' })})`,
          });
        });
      }

      // Add governorates
      if (governoratesRes.status === 'fulfilled' && governoratesRes.value?.data?.governorates) {
        governoratesRes.value.data.governorates.forEach((governorate) => {
          const governorateId = getEntityId(governorate) || governorate.slug || governorate.name;
          if (!governorateId) return;
          results.push({
            id: governorateId,
            name: governorate.name,
            type: 'governorate',
            slug: governorate.slug,
            label: `${governorate.name} (${t('home.locationTypes.governorate', { defaultValue: 'Governorate' })})`,
          });
        });
      }

      // Limit to top 10 results
      setLocationSuggestions(results.slice(0, 10));
      setShowLocationSuggestions(results.length > 0);
    } catch (error) {
      console.error('Location search error:', error);
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
    }
  }, [t]);

  // Handle location input change with debounce
  const handleLocationInputChange = useCallback((value) => {
    setLocationSearch(value);
    
    // If the input is cleared, clear all location filters
    if (!value || value.trim() === '') {
      setFormFilters((prev) => ({ 
        ...prev, 
        city: "",
        compound: "",
        area_ref: "",
        governorate: "",
      }));
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
      setSelectedLocationType(null);
      if (locationSearchTimeoutRef.current) {
        clearTimeout(locationSearchTimeoutRef.current);
      }
      return;
    }
    
    // Keep city filter as the raw input for now
    setFormFilters((prev) => ({ ...prev, city: value }));

    // Clear previous timeout
    if (locationSearchTimeoutRef.current) {
      clearTimeout(locationSearchTimeoutRef.current);
    }

    // Debounce search - only search if there are at least 2 characters
    if (value.trim().length >= 2) {
      locationSearchTimeoutRef.current = setTimeout(() => {
        searchLocations(value);
      }, 300);
    } else {
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
    }
  }, [searchLocations]);

  // Handle location selection
  const handleLocationSelect = useCallback((suggestion) => {
    setLocationSearch(suggestion.name);
    setShowLocationSuggestions(false);
    setSelectedLocationType(suggestion.type);
    
    // Clear all location filters first
    const baseFilters = {
      city: "",
      compound: "",
      area_ref: "",
      governorate: "",
    };
    
    // Set the appropriate filter based on type
    if (suggestion.type === 'city') {
      setFormFilters((prev) => ({ ...prev, ...baseFilters, city: suggestion.name }));
      setAppliedFilters((prev) => ({ ...prev, ...baseFilters, city: suggestion.name }));
    } else if (suggestion.type === 'compound') {
      // For compound, use the compound filter
      setFormFilters((prev) => ({ ...prev, ...baseFilters, compound: suggestion.id, city: suggestion.name }));
      setAppliedFilters((prev) => ({ ...prev, ...baseFilters, compound: suggestion.id, city: suggestion.name }));
    } else if (suggestion.type === 'area') {
      // For area, store the area_ref
      setFormFilters((prev) => ({ ...prev, ...baseFilters, area_ref: suggestion.id, city: suggestion.name }));
      setAppliedFilters((prev) => ({ ...prev, ...baseFilters, area_ref: suggestion.id, city: suggestion.name }));
    } else if (suggestion.type === 'governorate') {
      // For governorate, store the governorate_ref
      setFormFilters((prev) => ({ ...prev, ...baseFilters, governorate: suggestion.id, city: suggestion.name }));
      setAppliedFilters((prev) => ({ ...prev, ...baseFilters, governorate: suggestion.id, city: suggestion.name }));
    }
  }, []);

  // Search form render functions
  const renderLocationField = (wrapperClass = "") => {
    return (
      <div className={`${wrapperClass} relative`}>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-gray-300">
          {t("home.search.locationLabel")}
        </label>
        <div className="relative">
          <input
            type="text"
            value={locationSearch || formFilters.city}
            onChange={(event) => handleLocationInputChange(event.target.value)}
            onFocus={() => {
              if (locationSearch && locationSuggestions.length > 0) {
                setShowLocationSuggestions(true);
              }
            }}
            onBlur={() => {
              // Delay to allow click on suggestion
              setTimeout(() => setShowLocationSuggestions(false), 200);
            }}
            placeholder={t("home.search.locationPlaceholder")}
            className="w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder-gray-400 focus:border-[#A88B32] focus:outline-none focus:ring-2 focus:ring-[#A88B32]/30"
          />
          
          {/* Suggestions dropdown */}
          {showLocationSuggestions && locationSuggestions.length > 0 && (
            <div className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-xl border border-white/20 bg-gray-900/95 backdrop-blur-xl shadow-2xl">
              {locationSuggestions.map((suggestion, index) => {
                const suggestionKey =
                  suggestion.id ||
                  suggestion.slug ||
                  suggestion.value ||
                  `${suggestion.type}-${suggestion.name || index}`;
                return (
                <button
                  key={`${suggestion.type}-${suggestionKey}`}
                  type="button"
                  onClick={() => handleLocationSelect(suggestion)}
                  className={`w-full px-4 py-3 text-left text-sm text-white hover:bg-[#A88B32]/20 transition-colors ${
                    index !== locationSuggestions.length - 1 ? 'border-b border-white/10' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FiMapPin className="h-4 w-4 text-[#A88B32] flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{suggestion.name}</div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {suggestion.type === 'city' && (t('home.locationTypes.city', { defaultValue: 'City' }))}
                        {suggestion.type === 'compound' && (t('home.locationTypes.compound', { defaultValue: 'Compound' }))}
                        {suggestion.type === 'area' && (t('home.locationTypes.area', { defaultValue: 'Area' }))}
                        {suggestion.type === 'governorate' && (t('home.locationTypes.governorate', { defaultValue: 'Governorate' }))}
                      </div>
                    </div>
                  </div>
                </button>
              );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  const propertyTypeOptions = useMemo(
    () => [
      { label: t("home.propertyTypes.any"), value: "" },
      ...PROPERTY_TYPES.map((type) => ({
        label: t(type.labelKey),
        value: type.value,
      })),
    ],
    [t]
  );

  const priceOptions = useMemo(
    () =>
      PRICE_OPTIONS.map((option) => ({
        ...option,
        label: option.isAny ? t("common.all") : t(option.labelKey),
      })),
    [t]
  );

  const maxPriceOptions = useMemo(
    () =>
      PRICE_OPTIONS.map((option) => ({
        ...option,
        label: option.isAny ? t("common.all") : t("home.search.maxPriceOption", { price: t(option.labelKey) }),
      })),
    [t]
  );

  const statusOptions = useMemo(
    () =>
      STATUS_OPTIONS.map((option) => ({
        ...option,
        label: t(option.labelKey),
      })),
    [t]
  );

  const renderSelectField = (
    label,
    value,
    options,
    onChange,
    wrapperClass = "",
    instanceId
  ) => (
    <div className={wrapperClass}>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-gray-300">
        {label}
      </label>
      <ShadcnSelect
        value={value || "all"}
        onValueChange={(newValue) =>
          onChange(newValue === "all" ? "" : newValue)
        }
      >
        <SelectTrigger className="w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white focus:border-[#A88B32] focus:outline-none focus:ring-2 focus:ring-[#A88B32]/30">
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("common.all")}</SelectItem>
          {options
            .filter((option) => option.value !== "")
            .map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
        </SelectContent>
      </ShadcnSelect>
    </div>
  );

  const renderTypeField = (wrapperClass = "") =>
    renderSelectField(
      t("home.search.typeLabel"),
      formFilters.type,
      propertyTypeOptions,
      (val) => handleFilterChange("type", val),
      wrapperClass,
      "property-type-filter"
    );

  const renderStatusField = (wrapperClass = "") =>
    renderSelectField(
      t("home.search.statusLabel"),
      formFilters.status,
      statusOptions,
      (val) => handleFilterChange("status", val),
      wrapperClass,
      "status-filter"
    );

  const renderMinPriceField = (wrapperClass = "") =>
    renderSelectField(
      t("home.search.minPriceLabel"),
      formFilters.minPrice,
      priceOptions,
      (val) => handleFilterChange("minPrice", val),
      wrapperClass,
      "min-price-filter"
    );

  const renderMaxPriceField = (wrapperClass = "") =>
    renderSelectField(
      t("home.search.maxPriceLabel"),
      formFilters.maxPrice,
      maxPriceOptions,
      (val) => handleFilterChange("maxPrice", val),
      wrapperClass,
      "max-price-filter"
    );

  // Error boundary effect
  useEffect(() => {
    const handleError = (error) => {
      console.error("Home error:", error);
      setHasError(true);
    };

    window.addEventListener("error", handleError);
    return () => window.removeEventListener("error", handleError);
  }, []);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) {
      setHeroStage(4);
      return undefined;
    }

    setHeroStage(0);

    const timers = [
      window.setTimeout(() => setHeroStage(1), 80),
      window.setTimeout(() => setHeroStage(2), 200),
      window.setTimeout(() => setHeroStage(3), 360),
      window.setTimeout(() => setHeroStage(4), 520),
    ];

    return () => {
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [prefersReducedMotion]);

  useEffect(() => {
    const container = pageContentRef.current;
    if (!container) {
      return undefined;
    }

    const sections = Array.from(
      container.querySelectorAll("[data-fade-section]")
    );

    if (!sections.length) {
      return undefined;
    }

    if (prefersReducedMotion) {
      sections.forEach((section) => {
        section.classList.add("is-visible");
      });
      return undefined;
    }

    sections.forEach((section) => section.classList.remove("is-visible"));

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.2,
        rootMargin: "0px 0px -10% 0px",
      }
    );

    sections.forEach((section) => observer.observe(section));

    return () => {
      observer.disconnect();
    };
  }, [prefersReducedMotion, propertyList.length, citiesList.length, developersList.length]);

  // Handle Enter key press
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        if (currentStep < FORM_STEPS.length - 1) {
          handleNext();
        } else {
          handleStepSubmit();
        }
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    return () => {
      document.removeEventListener("keydown", handleKeyPress);
    };
  }, [currentStep, handleNext, handleStepSubmit, FORM_STEPS.length]);


  // Enhanced scroll animations for features
  useEffect(() => {
    if (prefersReducedMotion) {
      return undefined;
    }

    const container = pageContentRef.current;
    if (!container) {
      return undefined;
    }

    const hoverCleanup = [];
    const ctx = gsap.context(() => {
      const features = gsap.utils.toArray(".feature");

      features.forEach((feature) => {
        const content = feature.querySelector(".feature__content");
        const image = feature.querySelector(".feature__image img");

        if (!content || !image) return;

        gsap.set([content, image], { willChange: "transform" });
        gsap.set(content, { opacity: 0, y: 60 });
        gsap.set(image, { scale: 1.1, opacity: 0 });

        gsap.to(content, {
          opacity: 1,
          y: 0,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: feature,
            start: "top 70%",
            end: "top 30%",
            toggleActions: "play none none reverse",
          },
        });

        gsap.to(image, {
          scale: 1,
          opacity: 1,
          duration: 1.2,
          delay: 0.25,
          ease: "power3.out",
          scrollTrigger: {
            trigger: feature,
            start: "top 70%",
            end: "top 30%",
            toggleActions: "play none none reverse",
          },
        });

        const imageContainer = feature.querySelector(".feature__image");
        if (!imageContainer) return;

        const handleEnter = () => {
          gsap.to(image, { scale: 1.05, duration: 0.3, ease: "power2.out" });
        };

        const handleLeave = () => {
          gsap.to(image, { scale: 1, duration: 0.3, ease: "power2.out" });
        };

        imageContainer.addEventListener("mouseenter", handleEnter);
        imageContainer.addEventListener("mouseleave", handleLeave);
        hoverCleanup.push(() => {
          imageContainer.removeEventListener("mouseenter", handleEnter);
          imageContainer.removeEventListener("mouseleave", handleLeave);
        });
      });
    }, container);

    return () => {
      hoverCleanup.forEach((dispose) => dispose());
      ctx.revert();
    };
  }, [prefersReducedMotion]);

  // GSAP animations effect
  useEffect(() => {
    const menuOverlay = menuOverlayRef.current;
    const pageContent = pageContentRef.current;
    const toggleButton = toggleButtonRef.current;

    if (!menuOverlay || !pageContent || !toggleButton) {
      return undefined;
    }

    const hoverCleanup = [];
    const clickCleanup = [];
    let timerId = null;

    const ctx = gsap.context(() => {
      let menuTimeline;
      timerId = window.setTimeout(() => {
        const menuItems = menuOverlay.querySelectorAll(".menu-overlay__main ul li");
        const backgroundImages = menuOverlay.querySelectorAll(".menu-overlay__bg-img img");
        const linkTexts = menuOverlay.querySelectorAll("[data-text-anim]");
        const toggleLineTop = toggleButton.querySelector(".toggle-line-top");
        const toggleLineBottom = toggleButton.querySelector(".toggle-line-bottom");

        if (!menuItems.length || !backgroundImages.length || !toggleLineTop || !toggleLineBottom) {
          return;
        }

        gsap.set(backgroundImages, { opacity: 0, scale: 1, willChange: "opacity, transform" });
        gsap.set(backgroundImages[0], { opacity: 1 });
        gsap.set(menuOverlay, { autoAlpha: 0, pointerEvents: "none" });

        menuItems.forEach((item, index) => {
          const handleEnter = () => {
            const targetImage = backgroundImages[index + 1] || backgroundImages[0];

            gsap.to(backgroundImages, {
              opacity: 0,
              scale: 1,
              duration: 0.45,
              ease: "power2.inOut",
            });
            gsap.to(targetImage, {
              opacity: 1,
              scale: prefersReducedMotion ? 1 : 1.15,
              duration: 0.45,
              ease: "power3.inOut",
            });
          };

          const handleLeave = () => {
            gsap.to(backgroundImages, {
              opacity: 0,
              scale: 1,
              duration: 0.45,
              ease: "power2.inOut",
            });
            gsap.to(backgroundImages[0], {
              opacity: 1,
              duration: 0.45,
              ease: "power3.inOut",
            });
          };

          item.addEventListener("mouseenter", handleEnter);
          item.addEventListener("mouseleave", handleLeave);
          hoverCleanup.push(() => {
            item.removeEventListener("mouseenter", handleEnter);
            item.removeEventListener("mouseleave", handleLeave);
          });
        });

        menuTimeline = gsap.timeline({ paused: true });
        menuTimelineRef.current = menuTimeline;

        if (prefersReducedMotion) {
          linkTexts.forEach((el) => {
            el.style.visibility = "visible";
          });

          menuTimeline
            .set(menuOverlay, { visibility: "visible" })
            .to(
              menuOverlay,
              {
                autoAlpha: 1,
                duration: 0.3,
                ease: "power2.out",
                onStart: () => {
                  menuOverlay.style.pointerEvents = "auto";
                },
              },
              0
            )
            .to(
              pageContent,
              {
                filter: "blur(6px)",
                duration: 0.3,
                ease: "power2.out",
              },
              0
            )
            .to(
              toggleLineTop,
              {
                transformOrigin: "center",
                y: 4,
                rotation: 45,
                duration: 0.3,
              },
              0
            )
            .to(
              toggleLineBottom,
              {
                transformOrigin: "center",
                y: -4,
                rotation: -45,
                duration: 0.3,
              },
              0
            );
        } else {
          menuTimeline
            .to(
              menuOverlay,
              {
                clipPath: "polygon(0% 0%, 100% 0%, 100% 120%, 0% 100%)",
                duration: 0.8,
                ease: "power3.inOut",
                onStart: () => {
                  menuOverlay.style.pointerEvents = "none";
                },
                onComplete: () => {
                  menuOverlay.style.clipPath = "none";
                  menuOverlay.style.pointerEvents = "auto";
                },
              },
              0
            )
            .to(
              pageContent,
              {
                yPercent: 20,
                rotation: 18,
                scale: 1.3,
                transformOrigin: "left top",
                duration: 0.8,
                ease: "power3.inOut",
              },
              0
            )
            .to(
              backgroundImages,
              {
                scale: 1.1,
                duration: 1,
                ease: "power3.inOut",
              },
              0
            )
            .add(() => {
              linkTexts.forEach((el, index) => {
                gsap.set(el, { visibility: "visible" });
                animateText(el, 0.2 + index * 0.1);
              });
            }, 0)
            .to(
              toggleLineTop,
              {
                transformOrigin: "center",
                y: 4,
                scaleX: 0.8,
                rotation: 45,
                duration: 0.4,
                ease: "back.out(1.5)",
              },
              0.2
            )
            .to(
              toggleLineBottom,
              {
                transformOrigin: "center",
                y: -4,
                scaleX: 0.8,
                rotation: -45,
                duration: 0.4,
                ease: "back.out(1.5)",
              },
              0.2
            );
        }

        const handleToggleClick = () => {
          if (!menuTimelineRef.current) return;

          if (menuTimelineRef.current.progress() === 1) {
            menuTimelineRef.current.reverse();
            menuTimelineRef.current.eventCallback("onReverseComplete", () => {
              if (prefersReducedMotion) {
                menuOverlay.style.pointerEvents = "none";
                pageContent.style.filter = "none";
                menuOverlay.style.visibility = "hidden";
                gsap.set(menuOverlay, { autoAlpha: 0 });
              } else {
                menuOverlay.style.pointerEvents = "none";
                gsap.set(menuOverlay, { autoAlpha: 0 });
              }
              menuTimelineRef.current.eventCallback("onReverseComplete", null);
            });
          } else {
            menuTimelineRef.current.play();
            menuTimelineRef.current.eventCallback("onReverseComplete", null);
          }
        };

        toggleButton.addEventListener("click", handleToggleClick);
        clickCleanup.push(() => toggleButton.removeEventListener("click", handleToggleClick));
      }, 80);
    }, menuOverlay);

    return () => {
      if (timerId) {
        window.clearTimeout(timerId);
      }
      hoverCleanup.forEach((dispose) => dispose());
      clickCleanup.forEach((dispose) => dispose());
      menuTimelineRef.current?.eventCallback("onReverseComplete", null);
      if (menuTimelineRef.current) {
        menuTimelineRef.current.kill();
        menuTimelineRef.current = null;
      }
      ctx.revert();
    };
  }, [prefersReducedMotion]);

  const handleMenuToggle = useCallback(() => {
    const timeline = menuTimelineRef.current;
    const menuOverlay = menuOverlayRef.current;
    const pageContent = pageContentRef.current;

    if (!timeline || !menuOverlay || !pageContent) {
      return;
    }

    if (timeline.progress() === 1) {
      timeline.reverse();
      timeline.eventCallback("onReverseComplete", () => {
        if (prefersReducedMotion) {
          menuOverlay.style.pointerEvents = "none";
          pageContent.style.filter = "none";
          menuOverlay.style.visibility = "hidden";
          gsap.set(menuOverlay, { autoAlpha: 0 });
        } else {
          menuOverlay.style.pointerEvents = "none";
          gsap.set(menuOverlay, { autoAlpha: 0 });
        }
        timeline.eventCallback("onReverseComplete", null);
      });
    } else {
      gsap.set(menuOverlay, { autoAlpha: 1, pointerEvents: "auto" });
      menuOverlay.style.visibility = "visible";
      timeline.eventCallback("onReverseComplete", null);
      timeline.play();
    }
  }, [prefersReducedMotion]);

  // Show error boundary if there's an error
  if (hasError) {
    return (
      <div
        style={{
          padding: "2rem",
          textAlign: "center",
          backgroundColor: "#f8f9fa",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <h1 style={{ color: "#dc3545", marginBottom: "1rem" }}>
          {t("home.errorBoundary.title")}
        </h1>
        <p style={{ color: "#6c757d", marginBottom: "2rem" }}>
          {t("home.errorBoundary.subtitle")}
        </p>
        <button 
          onClick={() => window.location.reload()}
          style={{
            padding: "0.75rem 1.5rem",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "0.375rem",
            cursor: "pointer",
          }}
        >
          {t("home.errorBoundary.cta")}
        </button>
      </div>
    );
  }


  // Generate SEO tags
  const seoTags = generateSEOTags({
    title: t("home.metaTitle"),
    description: t("home.metaDescription"),
    url: getCanonicalUrl('/'),
    image: '/HEROOOO.png',
    locale: i18n.language === 'ar' ? 'ar' : 'en',
    alternateLocale: i18n.language === 'ar' ? 'en' : 'ar'
  });

  // Generate structured data
  const organizationSchema = generateOrganizationSchema();
  const websiteSchema = generateWebsiteSchema();
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: '/' }
  ]);

  return (
    <>
      <Helmet>
        <title>{seoTags.title}</title>
        <meta name="description" content={seoTags.description} />
        <meta name="keywords" content={seoTags.keywords} />
        <link rel="canonical" href={seoTags.canonical} />
        
        {/* Open Graph Tags */}
        <meta property="og:title" content={seoTags['og:title']} />
        <meta property="og:description" content={seoTags['og:description']} />
        <meta property="og:image" content={seoTags['og:image']} />
        <meta property="og:image:width" content={seoTags['og:image:width']} />
        <meta property="og:image:height" content={seoTags['og:image:height']} />
        <meta property="og:url" content={seoTags['og:url']} />
        <meta property="og:type" content={seoTags['og:type']} />
        <meta property="og:locale" content={seoTags['og:locale']} />
        <meta property="og:locale:alternate" content={seoTags['og:locale:alternate']} />
        
        {/* Twitter Card Tags */}
        <meta name="twitter:card" content={seoTags['twitter:card']} />
        <meta name="twitter:title" content={seoTags['twitter:title']} />
        <meta name="twitter:description" content={seoTags['twitter:description']} />
        <meta name="twitter:image" content={seoTags['twitter:image']} />
        
        {/* Language Alternates */}
        <link rel="alternate" hrefLang="en" href={getCanonicalUrl('/')} />
        <link rel="alternate" hrefLang="ar" href={getCanonicalUrl('/')} />
        <link rel="alternate" hrefLang="x-default" href={getCanonicalUrl('/')} />
        
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Anton&family=Mona+Sans:wght@400;600&family=Outfit:wght@400;800&family=Quantico:wght@400&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.cdnfonts.com/css/longsile"
          rel="stylesheet"
        />
        <link
          href="https://fonts.cdnfonts.com/css/thegoodmonolith"
          rel="stylesheet"
        />
      </Helmet>
      
      {/* Structured Data */}
      <MultipleStructuredData schemas={[organizationSchema, websiteSchema, breadcrumbSchema]} />

      <div
        className="container relative bg-[#131c2b] overflow-x-hidden"
        data-hero-stage={heroStage}
      >
        {/* Background Elements matching Launches Section */}
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-basira-gold/5 via-transparent to-basira-gold/10"></div>
          <div className="absolute top-20 right-20 w-72 h-72 bg-basira-gold/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 left-20 w-96 h-96 bg-basira-gold/5 rounded-full blur-3xl"></div>
        </div>
        <div className="menu-overlay relative z-50" ref={menuOverlayRef}>
           <div className="menu-overlay__bg-container" aria-hidden="true">
             <div className="menu-overlay__bg-img">
              <img
                src="HEROOOO.png"
                data-bg-for="default"
                alt="Luxury Real Estate"
              />
             </div>
             <div className="menu-overlay__bg-img">
              <img
                src="HEROOOO.png "
                data-bg-for="home"
                alt="Modern Home"
              />
             </div>
             <div className="menu-overlay__bg-img">
              <img
                src="https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=2053&q=80"
                data-bg-for="about"
                alt="Luxury Villa"
              />
             </div>
             <div className="menu-overlay__bg-img">
              <img
                src="https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=2070&q=80"
                data-bg-for="explore"
                alt="Penthouse View"
              />
             </div>
             <div className="menu-overlay__bg-img">
              <img
                src="https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=2070&q=80"
                data-bg-for="services"
                alt="Luxury Apartment"
              />
             </div>
             <div className="menu-overlay__bg-img">
              <img
                src="https://images.unsplash.com/photo-1523217582562-09d0def993a6?auto=format&fit=crop&w=2070&q=80"
                data-bg-for="contact"
                alt="Modern House"
              />
             </div>
           </div>

          <div className="menu-overlay__content">
            <div className="menu-overlay__links">
               <div className="menu-overlay__main">
                 <ul>
                   
                   <li>
                    <a
                      href="/about"
                      data-text-anim
                      className={isRTL ? "rtl-menu-link" : "uppercase tracking-[0.3em]"}
                    >
                      {t("navigation.about")}
                    </a>
                   </li>
                   <li>
                    <a
                      href="/properties"
                      data-text-anim
                      className={isRTL ? "rtl-menu-link" : "uppercase tracking-[0.3em]"}
                    >
                      {t("navigation.properties")}
                    </a>
                   </li>
                   
                   <li>
                    <a
                      href="/compounds"
                      data-text-anim
                      className={isRTL ? "rtl-menu-link" : "uppercase tracking-[0.3em]"}
                    >
                      {t("navigation.compounds")}
                    </a>
                   </li>
                   
                   
                   <li>
                    <a
                      href="/videos"
                      data-text-anim
                      className={isRTL ? "rtl-menu-link" : "uppercase tracking-[0.3em]"}
                    >
                      {t("navigation.videos")}
                    </a>
                   </li>
                   <li>
                    <a
                      href="/contact"
                      data-text-anim
                      className={isRTL ? "rtl-menu-link" : "uppercase tracking-[0.3em]"}
                    >
                      {t("navigation.contact")}
                    </a>
                   </li>
                 </ul>
               </div>
               
               {/* Mobile Auth Buttons */}
               <div className="menu-overlay__auth">
                 {user ? (
                   <>
                     <a
                       href="/profile"
                       className={`menu-auth-btn ${isRTL ? "rtl-action-btn" : ""}`}
                     >
                       <span className={isRTL ? "rtl-menu-link" : "uppercase tracking-[0.3em]"}>
                         {t("navigation.profile")}
                       </span>
                     </a>
                     <button 
                       onClick={logout} 
                       className={`menu-auth-btn menu-auth-btn--logout ${isRTL ? "rtl-action-btn" : ""}`}
                     >
                       <span className={isRTL ? "rtl-menu-link" : "uppercase tracking-[0.3em]"}>
                         {t("navigation.logout")}
                       </span>
                     </button>
                   </>
                 ) : (
                   <>
                     <a
                       href="/login"
                       className={`menu-auth-btn ${isRTL ? "rtl-action-btn" : ""}`}
                     >
                       <span className={isRTL ? "rtl-menu-link" : "uppercase tracking-[0.3em]"}>
                         {t("navigation.login")}
                       </span>
                     </a>
                     <a
                       href="/register"
                       className={`menu-auth-btn ${isRTL ? "rtl-action-btn" : ""}`}
                     >
                       <span className={isRTL ? "rtl-menu-link" : "uppercase tracking-[0.3em]"}>
                         {t("navigation.register")}
                       </span>
                     </a>
                   </>
                 )}
                <button
                  type="button"
                  onClick={() => i18n.changeLanguage(i18n.language?.startsWith("ar") ? "en" : "ar")}
                  className={`menu-auth-btn ${isRTL ? "rtl-action-btn" : ""}`}
                  aria-label={
                    i18n.language?.startsWith("ar")
                      ? t("language.switchToEnglish")
                      : t("language.switchToArabic")
                  }
                >
                  <span className={isRTL ? "rtl-menu-link" : "uppercase tracking-[0.3em]"}>
                    {i18n.language?.startsWith("ar") ? "EN" : "AR"}
                  </span>
                </button>
               </div>
              <div className="menu-overlay__socials">
                <ul>
                  {settings?.socialMedia?.instagram && (
                    <li>
                      <a href={settings.socialMedia.instagram} target="_blank" rel="noopener noreferrer">
                        {t("home.social.instagram")}
                      </a>
                    </li>
                  )}
                  {settings?.socialMedia?.facebook && (
                    <li>
                      <a href={settings.socialMedia.facebook} target="_blank" rel="noopener noreferrer">
                        {t("home.social.facebook")}
                      </a>
                    </li>
                  )}
                  {settings?.whatsappNumbers?.length > 0 && (() => {
                    // Random selection for WhatsApp number
                    const randomIndex = Math.floor(Math.random() * settings.whatsappNumbers.length);
                    const selectedNumber = settings.whatsappNumbers[randomIndex];
                    const formattedNumber = selectedNumber.replace(/[^\d+]/g, '');
                    const message = settings.whatsappMessage || 'Hello! I\'m interested in your properties.';
                    const whatsappLink = `https://wa.me/${formattedNumber}?text=${encodeURIComponent(message)}`;
                    return (
                      <li>
                        <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                          {t("home.social.whatsapp")}
                        </a>
                      </li>
                    );
                  })()}
                </ul>
              </div>
            </div>
          </div>
        </div>

        <header className="navbar">
          <nav className="wrapper">
            <div className="menu-bar">
               <div
                 className={`logo-wrapper hero-stage ${
                   heroStage >= 1 ? "is-visible" : ""
                 }`}
               >
                 <img 
                   src="/logos/basiralogo.png" 
                   alt="Basera Real Estate" 
                   style={{ 
                    height: "32px",
                    width: "auto",
                    maxHeight: "40px",
                   }} 
                   className="logo-img"
                 />
               </div>
              <div className={`flex items-center gap-2 hero-stage ${heroStage >= 1 ? "is-visible" : ""} ${isRTL ? 'flex-row-reverse' : ''}`}>
                {/* Language Button - Mobile */}
                <button
                  type="button"
                  onClick={() => {
                    const currentLang = i18n.language?.split('-')[0] || 'en';
                    const nextLang = currentLang === 'ar' ? 'en' : 'ar';
                    i18n.changeLanguage(nextLang);
                  }}
                  style={{
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '8px',
                    background: '#fff0dc',
                    border: 'none',
                    cursor: 'pointer',
                    flexShrink: 0,
                    color: '#2f2411',
                    fontSize: '14px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    transition: 'all 0.3s ease'
                  }}
                  className="hover:bg-[#ffd8ac] hover:transform hover:scale-105"
                  aria-label={t('language.switchLanguage', { defaultValue: 'Switch language' })}
                >
                  {i18n.language?.split('-')[0] === 'ar' ? 'EN' : 'AR'}
                </button>
                
                {/* Mobile Menu Toggle */}
                <div
                  id="menu-toggle"
                  ref={toggleButtonRef}
                  onClick={handleMenuToggle}
                >
                  <span className="toggle-line-top"></span>
                  <span className="toggle-line-bottom"></span>
                </div>
              </div>
               <div
                 className={`navbar__buttons hero-stage ${
                   heroStage >= 1 ? "is-visible" : ""
                 }`}
               >
                 {user ? (
                   <>
                    <a
                      href="/profile"
                      className="navbar__btn btn navbar__btn--secondary"
                    >
                       <span className="btn-txt uppercase tracking-[0.3em]">
                         {t("navigation.profile")}
                       </span>
                     </a>
                     <button 
                       onClick={logout} 
                       className="navbar__btn btn navbar__btn--logout"
                     >
                       <span className="btn-txt uppercase tracking-[0.3em]">
                         {t("navigation.logout")}
                       </span>
                     </button>
                   </>
                ) : (
                  <>
                   <a
                     href="/login"
                     className="navbar__btn btn navbar__btn--secondary"
                   >
                      <span className="btn-txt uppercase tracking-[0.3em]">
                        {t("navigation.login")}
                      </span>
                    </a>
                   <a
                     href="/register"
                     className="navbar__btn btn navbar__btn--secondary"
                   >
                      <span className="btn-txt uppercase tracking-[0.3em]">
                        {t("navigation.register")}
                      </span>
                    </a>
                  </>
                )}
                 {/* <button
                   type="button"
                   onClick={() => i18n.changeLanguage(i18n.language?.startsWith("ar") ? "en" : "ar")}
                   className="navbar__btn btn navbar__btn--secondary"
                   aria-label={
                     i18n.language?.startsWith("ar")
                       ? t("language.switchToEnglish")
                       : t("language.switchToArabic")
                   }
                 >
                   <span className="btn-txt uppercase tracking-[0.3em]">
                     {i18n.language?.startsWith("ar") ? "EN" : "AR"}
                   </span>
                 </button> */}
                 <a href="/properties" className="navbar__btn btn">
                   <span className="btn-txt uppercase tracking-[0.3em]">
                     {t("home.hero.cta")}
                   </span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="14"
                    fill="none"
                  >
                    <path
                     fill="currentColor"
                      d="m17.76 6.857-5.727-5.688a.821.821 0 0 0-1.147.01.81.81 0 0 0-.01 1.139l4.33 4.3H.819a.821.821 0 0 0-.578.238.81.81 0 0 0 .578 1.388h14.389l-4.33 4.3a.813.813 0 0 0-.19.892.813.813 0 0 0 .765.505.824.824 0 0 0 .581-.248l5.727-5.688a.81.81 0 0 0 0-1.148Z"
                    />
                   </svg>
                 </a>
               </div>
            </div>
          </nav>
        </header>

        <div className="page-content relative z-10" ref={pageContentRef}>
          <section 
             id="hero-section" 
             className="bg-[#131c2b]"
             data-hero-stage={heroStage}
             style={{
               backgroundImage: "url('/HEROOOO.png')",
             }}
           >
            <div className="wrapper">
              <h1
                className={`hero__header ${
                  isRTL ? "rtl-heading text-[clamp(2rem,10vw+0.5rem,4rem)]" : ""
                } hero-stage ${heroStage >= 2 ? "is-visible" : ""}`}
                data-hero-stage="2"
              >
                {t("home.hero.title")}
              </h1>

              {/* Property Search Card */}
              <div
                className={`w-full max-w-7xl mx-auto px-6 hero-stage ${
                  heroStage >= 3 ? "is-visible" : ""
                }`}
                data-hero-stage="3"
              >
                <div className="relative rounded-3xl border border-white/20 bg-[#131c2b]/80 backdrop-blur-md p-8 shadow-2xl hero-search-card">
                  {/* Enhanced Background Effects */}
                  <div className="absolute inset-0 rounded-3xl overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-basira-gold/5 via-transparent to-basira-gold/5"></div>
                    <div className="absolute top-10 right-10 w-64 h-64 bg-basira-gold/10 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-10 left-10 w-64 h-64 bg-basira-gold/8 rounded-full blur-3xl"></div>
                  </div>

                  <form
                    onSubmit={handleSearchSubmit}
                    className="relative space-y-8"
                  >
                    <div
                      className={`flex flex-col gap-4 sm:flex-row sm:items-end md:items-end md:justify-between hero-stage ${
                        heroStage >= 3 ? "is-visible" : ""
                      }`}
                      data-hero-stage="3"
                    >
                      <div className="space-y-2">
                        <p className="font-heading text-xl font-bold text-white">
                          {t("home.search.title")}
                        </p>
                        <p className="text-sm text-gray-300 max-w-lg">
                          {t("home.search.subtitle")}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="hidden text-xs uppercase tracking-[0.3em] text-gray-300 sm:inline">
                          {isLoadingTotalProperties ? (
                            <span className="flex items-center gap-2">
                              <div className="w-3 h-3 border-2 border-[#A88B32]/30 border-t-[#A88B32] rounded-full animate-spin"></div>
                              {t("common.loading")}
                            </span>
                          ) : (
                            t("home.search.propertiesAvailable", {
                              count: totalPropertiesOnWebsite,
                            })
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="md:hidden">
                      <button
                        type="button"
                        onClick={() => setMobileFilterOpen((prev) => !prev)}
                        aria-expanded={mobileFilterOpen}
                        className="flex w-full items-center justify-between rounded-2xl border border-white/30 bg-white/10 px-4 py-3 font-heading text-xs uppercase tracking-[0.3em] text-white transition-colors hover:border-[#A88B32] hover:text-[#A88B32]"
                      >
                        <span>{t("home.search.filterButton")}</span>
                        <FiArrowRight
                          className={`h-4 w-4 transition-transform ${
                            mobileFilterOpen ? "rotate-90 text-[#A88B32]" : ""
                          } ${isRTL ? "scale-x-[-1]" : ""}`}
                        />
                      </button>
                      <div
                    className={`overflow-hidden transition-all duration-300 ${
                      mobileFilterOpen
                            ? "max-h-[900px] opacity-100 pt-4"
                            : "max-h-0 opacity-0 pointer-events-none"
                          }`}
                      >
                        <div className="space-y-4 rounded-2xl border border-white/20 bg-white/10 p-4">
                          {renderLocationField()}
                          {renderTypeField()}
                          {renderStatusField()}
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            {renderMinPriceField()}
                            {renderMaxPriceField()}
            </div>
                        </div>
                      </div>
                    </div>

                    <div className="hidden gap-4 md:grid md:grid-cols-5">
                      {renderLocationField()}
                      {renderTypeField()}
                      {renderStatusField()}
                      {renderMinPriceField()}
                      {renderMaxPriceField()}
                    </div>

                    <div
                      className={`flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between hero-stage ${
                        heroStage >= 3 ? "is-visible" : ""
                      }`}
                      data-hero-stage="3"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center hero-cta-group">
                        <button
                          type="submit"
                          className="group flex items-center justify-center gap-3 rounded-2xl bg-[#A88B32] px-10 py-4 font-heading text-sm font-semibold uppercase tracking-[0.2em] text-white transition-all duration-300 hover:-translate-y-1 hover:bg-[#C09C3D] hover:shadow-2xl hover:shadow-[#A88B32]/30"
                        >
                          <span>{t("home.search.searchButton")}</span>
                          <FiArrowRight
                            className={`h-4 w-4 transition-transform ${
                              isRTL ? "scale-x-[-1] group-hover:-translate-x-1" : "group-hover:translate-x-1"
                            }`}
                          />
                        </button>
                        <button
                          type="button"
                          onClick={handleClearFilters}
                          className="flex items-center justify-center gap-2 rounded-2xl border-2 border-white/30 bg-white/10 px-8 py-4 font-heading text-xs font-semibold uppercase tracking-[0.2em] text-white transition-all duration-300 hover:border-[#A88B32] hover:text-[#A88B32] hover:bg-[#A88B32]/20 hover:-translate-y-0.5"
                        >
                          <FiX className="h-3 w-3" />
                          <span>{t("home.search.resetButton")}</span>
                        </button>
                      </div>
                      <span className="text-xs uppercase tracking-[0.3em] text-gray-300 sm:hidden">
                        {isLoadingTotalProperties ? (
                          <span className="flex items-center gap-2">
                            <div className="w-3 h-3 border-2 border-[#A88B32]/30 border-t-[#A88B32] rounded-full animate-spin"></div>
                            {t("common.loading")}
                          </span>
                        ) : (
                          t("home.search.propertiesAvailable", {
                            count: totalPropertiesOnWebsite,
                          })
                        )}
                      </span>
                    </div>
                  </form>
                 </div>
               </div>
            </div>
          </section>
           


{/* Cities Section - Black Style with Glassy Cards */}
{!isLoadingCities && citiesList.length > 0 && (
            <section
              className="bg-transparent py-24 relative overflow-hidden"
              data-fade-section
            >
              {/* Enhanced Background Effects */}
                <div className="absolute inset-0">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-basira-gold/8 via-transparent to-basira-gold/8"></div>
                <div className="absolute top-20 right-20 w-96 h-96 bg-basira-gold/15 rounded-full blur-3xl animate-pulse"></div>
                <div
                  className="absolute bottom-20 left-20 w-96 h-96 bg-basira-gold/10 rounded-full blur-3xl animate-pulse"
                  style={{ animationDelay: "1s" }}
                ></div>
                {/* Subtle grid pattern */}
                <div
                  className="absolute inset-0 opacity-[0.03]"
                  style={{
                    backgroundImage:
                      "linear-gradient(rgba(168, 139, 50, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(168, 139, 50, 0.1) 1px, transparent 1px)",
                    backgroundSize: "50px 50px",
                  }}
                ></div>
                </div>

              <div className="mx-auto max-w-7xl px-6 relative z-10 mb-20">
                {/* Enhanced Section Header */}
                <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="h-px w-16 bg-gradient-to-r from-transparent to-[#A88B32]"></div>
                      <p className="font-heading text-sm uppercase tracking-[0.5em] text-[#A88B32] font-bold">
                        {t("home.sections.topLocationsLabel")}
                      </p>
                      <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[#A88B32]"></div>
                    </div>
                    <h2
                      className={`font-heading text-5xl md:text-6xl lg:text-7xl text-white leading-tight font-bold ${
                        isRTL ? "rtl-heading" : ""
                      }`}
                    >
                      {t("home.sections.topLocationsTitle")}
                    </h2>
                    <p className="text-lg md:text-xl text-gray-300 max-w-2xl leading-relaxed">
                      {t("home.sections.topLocationsDescription")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Enhanced Cities Grid - Horizontal Scrollable with Arrows - Full Width */}
              <div className="relative w-full">
                {/* Left Arrow Button */}
                <button
                  onClick={() => scrollCities('left')}
                  className={`absolute left-4 top-1/2 -translate-y-1/2 z-20 h-12 w-12 rounded-full bg-black/40 backdrop-blur-md border-2 border-[#A88B32]/50 text-[#A88B32] transition-all duration-300 hover:bg-[#A88B32]/20 hover:border-[#A88B32] hover:scale-110 flex items-center justify-center shadow-lg ${
                    isRTL ? 'rotate-180' : ''
                  }`}
                  aria-label={t("home.sections.scrollLeft", { defaultValue: "Scroll left" })}
                >
                  <FiArrowLeft className="h-6 w-6" />
                </button>

                {/* Right Arrow Button */}
                <button
                  onClick={() => scrollCities('right')}
                  className={`absolute right-4 top-1/2 -translate-y-1/2 z-20 h-12 w-12 rounded-full bg-black/40 backdrop-blur-md border-2 border-[#A88B32]/50 text-[#A88B32] transition-all duration-300 hover:bg-[#A88B32]/20 hover:border-[#A88B32] hover:scale-110 flex items-center justify-center shadow-lg ${
                    isRTL ? 'rotate-180' : ''
                  }`}
                  aria-label={t("home.sections.scrollRight", { defaultValue: "Scroll right" })}
                >
                  <FiArrowRight className="h-6 w-6" />
                </button>

                {/* Scrollable Container */}
                <div 
                  ref={citiesSliderRef}
                  className="cities-slider overflow-x-auto overflow-y-visible pb-10 pt-4"
                  style={{ 
                    scrollBehavior: 'smooth',
                    WebkitOverflowScrolling: 'touch',
                  }}
                >
                  <div className="flex gap-6 pl-20 pr-20 py-6">
                  {citiesList.map((city, index) => {
                    const cityId = getEntityId(city) || `city-${index}`;
                    const cityQuery = city?.slug || city?.name || cityId;
                    return (
                    <Link
                      key={cityId}
                      to={`/properties?city=${encodeURIComponent(cityQuery)}`}
                      className="group relative overflow-hidden rounded-2xl backdrop-blur-xl bg-gradient-to-br from-white/[0.12] via-white/[0.08] to-white/[0.04] border-2 border-[#A88B32]/30 p-6 shadow-2xl shadow-black/20 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-[#A88B32]/30 hover:border-[#A88B32]/60 flex-shrink-0 w-[220px] h-[280px]"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      {/* Background Gradient Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-br from-[#A88B32]/5 via-transparent to-[#A88B32]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                      {/* Enhanced Glowing Border Effect */}
                      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#A88B32]/30 via-[#A88B32]/15 to-[#A88B32]/10 blur-xl"></div>
                      </div>

                      {/* Top accent line */}
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#A88B32] to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>

                      {/* Content wrapper */}
                      <div className="relative z-10 flex flex-col items-center text-center h-full justify-between">
                        {/* Enhanced City Icon with stronger glow effect */}
                        <div className="mb-4 flex items-center justify-center relative">
                          {/* Outer glow ring */}
                          <div className="absolute inset-0 rounded-full bg-[#A88B32]/30 blur-2xl group-hover:scale-150 transition-all duration-500 opacity-50 group-hover:opacity-100"></div>

                          {/* Main icon container - Larger */}
                          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#A88B32]/40 via-[#A88B32]/30 to-[#A88B32]/45 backdrop-blur-md border-2 border-[#A88B32]/50 text-[#A88B32] group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 shadow-lg shadow-[#A88B32]/20">
                            <FiMapPin className="h-8 w-8" />
                          </div>
                        </div>

                        <div className="flex-1 flex flex-col justify-center">
                          {/* Enhanced City Name - Larger */}
                          <h3
                            className={`font-heading text-xl text-white mb-3 text-center group-hover:text-[#A88B32] transition-colors duration-300 font-bold px-2 leading-tight ${
                              isRTL ? "rtl-heading" : ""
                            }`}
                          >
                            {city.name}
                          </h3>

                          {/* Enhanced Appreciation Rate Badge - Larger */}
                          <div className="flex items-center justify-center gap-2 mb-3 px-3 py-2 rounded-full bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-2 border-green-500/40 backdrop-blur-sm group-hover:border-green-400/60 transition-colors duration-300">
                            <FiTrendingUp className="h-4 w-4 text-green-400 flex-shrink-0" />
                            <span className="text-sm font-bold text-green-400 whitespace-nowrap">
                              {t("home.sections.appreciationRate", {
                                rate: city.annualAppreciationRate,
                              })}
                            </span>
                          </div>

                          {/* Enhanced Properties Count - Larger */}
                          {city.propertiesCount > 0 && (
                            <div className="flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#A88B32]/20 to-[#C09C3D]/20 border-2 border-[#A88B32]/40 group-hover:border-[#A88B32]/60 transition-colors duration-300">
                              <FiHome className="h-4 w-4 text-[#A88B32]" />
                              <p className="text-sm font-bold text-[#A88B32] tracking-wide">
                                {t("home.sections.propertiesCount", {
                                  count: city.propertiesCount,
                                })}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Enhanced Shimmer effect on hover */}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none rounded-2xl overflow-hidden">
                        <div
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"
                          style={{ animation: "shimmer 2s infinite" }}
                        ></div>
                      </div>
                    </Link>
                  );
                  })}
                    </div>
                  </div>
                </div>

              {/* Enhanced View All Cities Link */}
              <div className="mx-auto max-w-7xl px-6 relative z-10 mt-20">
                <div className="text-center">
                  <Link
                    to="/properties"
                    className="group inline-flex items-center gap-4 rounded-2xl backdrop-blur-xl bg-gradient-to-r from-white/10 via-white/[0.15] to-white/10 border-2 border-[#A88B32]/60 px-10 py-5 font-heading text-sm font-bold uppercase tracking-[0.3em] text-[#A88B32] transition-all duration-500 hover:bg-gradient-to-r hover:from-[#A88B32] hover:to-[#9a7a2b] hover:text-white hover:-translate-y-1 hover:shadow-2xl hover:shadow-[#A88B32]/50 hover:border-[#A88B32]"
                  >
                    <span>{t("home.sections.viewAll")}</span>
                    <div
                      className={`transform transition-transform duration-300 ${
                        isRTL ? "group-hover:-translate-x-2 group-hover:rotate-[5deg]" : "group-hover:translate-x-2 group-hover:rotate-[-5deg]"
                      }`}
                    >
                      <FiArrowRight className={`h-5 w-5 ${isRTL ? "scale-x-[-1]" : ""}`} />
                    </div>
                  </Link>
                </div>
              </div>
            </section>
          )}

{/* Developers Section - Black Style with Glassy Cards */}
{!isLoadingDevelopers && developersList.length > 0 && (
            <section
              className="bg-transparent py-24 relative overflow-hidden"
              data-fade-section
            >
              {/* Enhanced Background Effects */}
                <div className="absolute inset-0">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-basira-gold/8 via-transparent to-basira-gold/8"></div>
                <div className="absolute top-20 right-20 w-96 h-96 bg-basira-gold/15 rounded-full blur-3xl animate-pulse"></div>
                <div
                  className="absolute bottom-20 left-20 w-96 h-96 bg-basira-gold/10 rounded-full blur-3xl animate-pulse"
                  style={{ animationDelay: "1s" }}
                ></div>
                {/* Subtle grid pattern */}
                <div
                  className="absolute inset-0 opacity-[0.03]"
                  style={{
                    backgroundImage:
                      "linear-gradient(rgba(168, 139, 50, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(168, 139, 50, 0.1) 1px, transparent 1px)",
                    backgroundSize: "50px 50px",
                  }}
                ></div>
                </div>

              <div className="mx-auto max-w-7xl px-6 relative z-10 mb-20">
                {/* Enhanced Section Header */}
                <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="h-px w-16 bg-gradient-to-r from-transparent to-[#A88B32]"></div>
                      <p className="font-heading text-sm uppercase tracking-[0.5em] text-[#A88B32] font-bold">
                        {t("home.sections.topDevelopersLabel", { defaultValue: "Top Developers" })}
                      </p>
                      <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[#A88B32]"></div>
                    </div>
                    <h2
                      className={`font-heading text-5xl md:text-6xl lg:text-7xl text-white leading-tight font-bold ${
                        isRTL ? "rtl-heading" : ""
                      }`}
                    >
                      {t("home.sections.topDevelopersTitle", { defaultValue: "Trusted Developers" })}
                    </h2>
                    <p className="text-lg md:text-xl text-gray-300 max-w-2xl leading-relaxed">
                      {t("home.sections.topDevelopersDescription", { defaultValue: "Discover properties from Egypt's most trusted and reputable real estate developers." })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Enhanced Developers Grid - Horizontal Scrollable - Logos Only with Arrows - Full Width */}
              <div className="relative w-full">
                {/* Left Arrow Button */}
                <button
                  onClick={() => scrollDevelopers('left')}
                  className={`absolute left-4 top-1/2 -translate-y-1/2 z-20 h-12 w-12 rounded-full bg-black/40 backdrop-blur-md border-2 border-[#A88B32]/50 text-[#A88B32] transition-all duration-300 hover:bg-[#A88B32]/20 hover:border-[#A88B32] hover:scale-110 flex items-center justify-center shadow-lg ${
                    isRTL ? 'rotate-180' : ''
                  }`}
                  aria-label={t("home.sections.scrollLeft", { defaultValue: "Scroll left" })}
                >
                  <FiArrowLeft className="h-6 w-6" />
                </button>

                {/* Right Arrow Button */}
                <button
                  onClick={() => scrollDevelopers('right')}
                  className={`absolute right-4 top-1/2 -translate-y-1/2 z-20 h-12 w-12 rounded-full bg-black/40 backdrop-blur-md border-2 border-[#A88B32]/50 text-[#A88B32] transition-all duration-300 hover:bg-[#A88B32]/20 hover:border-[#A88B32] hover:scale-110 flex items-center justify-center shadow-lg ${
                    isRTL ? 'rotate-180' : ''
                  }`}
                  aria-label={t("home.sections.scrollRight", { defaultValue: "Scroll right" })}
                >
                  <FiArrowRight className="h-6 w-6" />
                </button>

                {/* Scrollable Container */}
                <div 
                  ref={developersSliderRef}
                  className="developers-slider overflow-x-auto overflow-y-visible pb-10 pt-4"
                  style={{ 
                    scrollBehavior: 'smooth',
                    WebkitOverflowScrolling: 'touch',
                  }}
                >
                  <div className="flex gap-8 pl-20 pr-20 py-6 items-center">
                  {developersList.map((developer, index) => {
                    const developerId = getEntityId(developer) || `developer-${index}`;
                    const developerSlug = developer?.slug || developerId;
                    return (
                    <Link
                      key={developerId}
                      to={`/developers/${developerSlug}`}
                      className="group flex-shrink-0 transition-all duration-300 hover:scale-110 hover:opacity-100 opacity-70"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      {developer.logo ? (
                        <img
                          src={developer.logo}
                          alt={developer.name}
                          className="h-20 w-auto max-w-[200px] object-contain filter grayscale hover:grayscale-0 transition-all duration-300"
                        />
                      ) : (
                        <div className="h-20 w-20 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 group-hover:border-[#A88B32]/50 transition-colors duration-300">
                          <FiBuilding className="h-10 w-10 text-gray-400 group-hover:text-[#A88B32] transition-colors duration-300" />
                        </div>
                      )}
                    </Link>
                  );
                  })}
                    </div>
                  </div>
                </div>

              {/* Enhanced View All Developers Link */}
              <div className="mx-auto max-w-7xl px-6 relative z-10 mt-20">
                <div className="text-center">
                  <Link
                    to="/developers"
                    className="group inline-flex items-center gap-4 rounded-2xl backdrop-blur-xl bg-gradient-to-r from-white/10 via-white/[0.15] to-white/10 border-2 border-[#A88B32]/60 px-10 py-5 font-heading text-sm font-bold uppercase tracking-[0.3em] text-[#A88B32] transition-all duration-500 hover:bg-gradient-to-r hover:from-[#A88B32] hover:to-[#9a7a2b] hover:text-white hover:-translate-y-1 hover:shadow-2xl hover:shadow-[#A88B32]/50 hover:border-[#A88B32]"
                  >
                    <span>{t("home.sections.viewAllDevelopers", { defaultValue: "View All Developers" })}</span>
                    <div
                      className={`transform transition-transform duration-300 ${
                        isRTL ? "group-hover:-translate-x-2 group-hover:rotate-[5deg]" : "group-hover:translate-x-2 group-hover:rotate-[-5deg]"
                      }`}
                    >
                      <FiArrowRight className={`h-5 w-5 ${isRTL ? "scale-x-[-1]" : ""}`} />
                    </div>
                  </Link>
                </div>
              </div>
            </section>
          )}



          {/* Property Types Section - Enhanced Black Glassy Style */}
              {/* Property Types Section - Commented Out */}
              {/* 
              <section
                id="property-types"
            className="bg-transparent pt-24 pb-20 relative overflow-hidden"
          >
            {/* Enhanced Background Effects *\/}
            <div className="absolute inset-0">
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-basira-gold/8 via-transparent to-basira-gold/8"></div>
              <div className="absolute top-20 right-20 w-96 h-96 bg-basira-gold/15 rounded-full blur-3xl animate-pulse"></div>
              <div
                className="absolute bottom-20 left-20 w-96 h-96 bg-basira-gold/10 rounded-full blur-3xl animate-pulse"
                style={{ animationDelay: "1s" }}
              ></div>
              {/* Subtle grid pattern *\/}
              <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(168, 139, 50, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(168, 139, 50, 0.1) 1px, transparent 1px)",
                  backgroundSize: "50px 50px",
                }}
              ></div>
            </div>

            <div className="mx-auto max-w-7xl px-6 relative z-10">
              {/* Enhanced Section Header *\/}
              <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between mb-20">
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="h-px w-16 bg-gradient-to-r from-transparent to-[#A88B32]"></div>
                    <p className="font-heading text-sm uppercase tracking-[0.5em] text-[#A88B32] font-bold">
                        Property Collections
                      </p>
                    <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[#A88B32]"></div>
                  </div>
                  <h2
                    className={`font-heading text-5xl md:text-6xl lg:text-7xl text-white leading-tight font-bold ${
                      isRTL ? "rtl-heading" : ""
                    }`}
                  >
                    Explore by Lifestyle & Investment Focus
                        </h2>
                  <p className="max-w-2xl text-lg md:text-xl text-gray-300 leading-relaxed">
                    Discover curated property collections tailored to your
                    lifestyle preferences and investment goals. Each collection
                    represents a unique approach to luxury living.
                      </p>
                    </div>

                    {/* Quick stats *\/}
                <div className="flex gap-6"></div>
                  </div>

              {/* Enhanced Property Types Grid *\/}
              <div className="mt-16 overflow-x-auto">
                <div className="flex gap-12 overflow-x-auto pb-6 pt-6 px-4 bg-transparent">
                      {PROPERTY_TYPES.map((type, index) => {
                        const Icon = type.icon;
                        const isActive = selectedType === type.value;
                        
                        return (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() => handleTypeSelect(type.value)}
                        className="group flex min-w-[240px] flex-col items-center gap-8 transition-all duration-700 hover:-translate-y-2 hover:scale-105 px-4 py-6"
                            aria-pressed={isActive}
                            aria-label={`Filter by ${type.label}`}
                            style={{ animationDelay: `${index * 0.1}s` }}
                            >
                        {/* Enhanced Icon Container *\/}
                        <div className="relative">
                          {/* Outer glow ring *\/}
                          <div
                            className={`absolute inset-0 rounded-3xl blur-xl transition-all duration-700 ${
                              isActive
                                ? "bg-[#A88B32]/40 scale-150 opacity-100"
                                : "bg-[#A88B32]/20 scale-100 opacity-0 group-hover:opacity-100 group-hover:scale-150"
                            }`}
                          ></div>

                          {/* Main icon container *\/}
                            <span
                            className={`relative flex h-40 w-40 items-center justify-center rounded-3xl border-2 backdrop-blur-md transition-all duration-500 ${
                              isActive
                                ? "border-[#A88B32] bg-gradient-to-br from-[#A88B32]/30 via-[#A88B32]/20 to-[#A88B32]/35 text-white shadow-2xl shadow-[#A88B32]/60 group-hover:rotate-12"
                                : "border-white/20 bg-gradient-to-br from-white/[0.08] via-white/[0.05] to-white/[0.02] text-white group-hover:border-[#A88B32]/40 group-hover:bg-gradient-to-br group-hover:from-white/[0.12] group-hover:via-white/[0.08] group-hover:to-white/[0.04] group-hover:rotate-6 group-hover:shadow-xl group-hover:shadow-[#A88B32]/20"
                            }`}
                          >
                            <Icon className="h-16 w-16" />

                            {/* Top accent line *\/}
                            <div
                              className={`absolute top-0 left-0 right-0 h-1 rounded-t-3xl transition-opacity duration-700 ${
                                isActive
                                  ? "bg-gradient-to-r from-transparent via-white to-transparent opacity-100"
                                  : "bg-gradient-to-r from-transparent via-[#A88B32] to-transparent opacity-0 group-hover:opacity-100"
                              }`}
                            ></div>

                              {isActive && (
                              <div className="absolute -top-3 -right-3 w-8 h-8 bg-gradient-to-br from-white to-gray-100 rounded-full flex items-center justify-center shadow-lg border-2 border-[#A88B32]">
                                <FiCheck className="h-4 w-4 text-[#A88B32]" />
                                </div>
                              )}

                            {/* Shimmer effect on hover *\/}
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-3xl overflow-hidden pointer-events-none">
                              <div
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"
                                style={{ animation: "shimmer 2s infinite" }}
                              ></div>
                            </div>
                            </span>
                        </div>

                        {/* Enhanced Label *\/}
                        <span className="font-heading text-sm uppercase tracking-[0.3em] text-white group-hover:text-[#A88B32] transition-colors duration-500 font-bold text-center px-2">
                              {type.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </section>
              */}

              {/* Listings Section */}
          <section
            id="listings"
            className="bg-transparent py-24 relative overflow-hidden"
            data-fade-section
          >
            {/* Enhanced Background Effects */}
            <div className="absolute inset-0">
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-basira-gold/8 via-transparent to-basira-gold/8"></div>
              <div className="absolute top-20 right-20 w-96 h-96 bg-basira-gold/15 rounded-full blur-3xl animate-pulse"></div>
              <div
                className="absolute bottom-20 left-20 w-96 h-96 bg-basira-gold/10 rounded-full blur-3xl animate-pulse"
                style={{ animationDelay: "1s" }}
              ></div>
              {/* Subtle grid pattern */}
              <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(168, 139, 50, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(168, 139, 50, 0.1) 1px, transparent 1px)",
                  backgroundSize: "50px 50px",
                }}
              ></div>
            </div>

            <div className="mx-auto max-w-7xl px-6 relative z-10">
              <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between mb-20">
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="h-px w-16 bg-gradient-to-r from-transparent to-[#A88B32]"></div>
                    <p className="font-heading text-sm uppercase tracking-[0.5em] text-[#A88B32] font-bold">
                        {t("home.sections.featuredLabel")}
                      </p>
                    <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[#A88B32]"></div>
                  </div>
                  <h2
                    className={`font-heading text-5xl md:text-6xl lg:text-7xl text-white leading-tight font-bold ${
                      isRTL ? "rtl-heading" : ""
                    }`}
                  >
                        {t("home.sections.featuredTitle")}
                      </h2>
                  <p className="max-w-2xl text-lg md:text-xl text-gray-300 leading-relaxed">
                    {t("home.sections.featuredDescription")}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Link
                        to="/properties"
                        className="group rounded-2xl border-2 border-[#A88B32]/60 px-8 py-3 font-heading text-sm font-semibold uppercase tracking-[0.2em] text-[#A88B32] transition-all duration-300 hover:bg-[#A88B32] hover:text-white hover:-translate-y-0.5 hover:shadow-lg"
                      >
                        <span className="flex items-center gap-2">
                          {t("cta.exploreAllProperties")}
                          <FiArrowRight
                            className={`h-4 w-4 transition-transform ${
                              isRTL ? "scale-x-[-1] group-hover:-translate-x-1" : "group-hover:translate-x-1"
                            }`}
                          />
                        </span>
                      </Link>
                    </div>
                  </div>

                  {isPropertiesError && (
                    <div className="mt-10 rounded-3xl border border-[#ffb4a2]/40 bg-gray-900 p-10 text-center text-white shadow-lg shadow-[#202D46]/10">
                      <p className="font-heading text-xl text-[#A88B32]">
                        {t("home.listings.errorTitle")}
                      </p>
                      <p className="mt-2 text-sm text-gray-300">
                        {t("home.listings.errorMessage")}
                      </p>
                      <button
                        type="button"
                        onClick={() => refetchProperties()}
                        className="mt-4 rounded-full bg-[#A88B32] px-6 py-3 font-heading text-sm uppercase tracking-[0.3em] text-white transition-transform duration-300 hover:-translate-y-0.5 hover:bg-[#C09C3D]"
                      >
                        {t("home.listings.retry")}
                      </button>
                    </div>
                  )}

                  <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
                    {(isLoadingProperties ||
                      (isFetchingProperties && propertyList.length === 0)) &&
                      Array.from({ length: 3 }).map((_, index) => (
                        <div
                          key={`skeleton-${index}`}
                          className="h-full rounded-3xl border border-gray-700 bg-gray-900 p-6 shadow-lg shadow-[#202D46]/10"
                        >
                          <div className="h-56 rounded-2xl bg-gray-700" />
                          <div className="mt-6 space-y-4">
                            <div className="h-4 rounded bg-gray-700" />
                            <div className="h-4 w-3/4 rounded bg-gray-700" />
                            <div className="h-4 w-1/2 rounded bg-gray-700" />
                          </div>
                        </div>
                      ))}

                    {!isLoadingProperties &&
                      propertyList.map((property, index) => {
                        const propertyId = getEntityId(property) || `property-${index}`;
                        return (
                          <PropertyCard3D
                            key={propertyId}
                            property={{ ...property, _id: property._id || propertyId, id: property.id || propertyId }}
                          />
                        );
                      })}
                  </div>

                  {!isLoadingProperties &&
                    propertyList.length === 0 &&
                    !isPropertiesError && (
                      <div className="mt-10 rounded-3xl border border-gray-700 bg-gray-900 p-10 text-center shadow-lg shadow-[#202D46]/10">
                        <p className="font-heading text-xl text-[#A88B32]">
                      {Object.values(appliedFilters).some((filter) => filter)
                            ? t("home.listings.emptyFilters") 
                            : t("home.listings.emptyDefault")}
                        </p>
                        <p className="mt-2 text-sm text-gray-300">
                      {Object.values(appliedFilters).some((filter) => filter)
                            ? t("home.listings.adjustFilters")
                            : t("home.listings.checkBack")}
                        </p>
                        <div className="mt-4 flex flex-wrap justify-center gap-3">
                      {Object.values(appliedFilters).some(
                        (filter) => filter
                      ) && (
                            <button
                              onClick={handleClearFilters}
                              className="rounded-full border border-[#A88B32] px-6 py-3 font-heading text-xs uppercase tracking-[0.3em] text-[#A88B32] hover:bg-[#A88B32] hover:text-white transition-colors"
                            >
                              {t("home.listings.clearFilters")}
                            </button>
                          )}
                          <Link
                            to="/properties"
                            className="rounded-full bg-[#A88B32] px-6 py-3 font-heading text-xs uppercase tracking-[0.3em] text-white"
                          >
                            {t("home.listings.exploreAll")}
                          </Link>
                        </div>
                      </div>
                    )}
                </div>
              </section>



              {/* <section className="particles-section ">
                <ParticlesCanvas />
              </section> */}

              {/* Animated Image Slider Section
              <section className="py-12 md:py-20 ">
                <div className="w-full px-4 md:px-6 lg:px-8">
                  <div className="text-center mb-8 md:mb-12">
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
                      Explore Egypt's Premier Cities
                    </h2>
                    <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                      Discover prime real estate locations across Egypt's most sought-after destinations
                    </p>
                  </div>
                  <div className="relative w-full max-w-[900px] mx-auto">
                    <ImageSlider />
                  </div>
                </div>
              </section> */}

              {/* Partners Marquee Section */}
              <div data-fade-section>
                <MarqueeSection />
              </div>




          {/* Lead Generation Form Section */}
          <LeadCaptureForm />













              {/* Available Launches Section */}
              <div data-fade-section>
                <LaunchesSection />
              </div>

              
          
            
            
          {/* Kinetic Interactive Text Section */}
          <section className="kinetic-section" data-fade-section>
            <KineticSection />
          </section>


                          







          <div data-fade-section>
            <Footer />
          </div>
            </div>
      </div>
    </>
  );
};

export default Home;
