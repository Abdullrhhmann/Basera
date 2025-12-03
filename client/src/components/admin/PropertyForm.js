import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { FiUpload, FiX, FiPlus, FiTrash2, FiLink, FiMap, FiEdit, FiLayers } from '../../icons/feather';
import InfoIcon from '../common/InfoIcon';
import { useMutation, useQueryClient, useQuery } from 'react-query';
import { propertiesAPI, uploadsAPI, developersAPI, citiesAPI, governoratesAPI, areasAPI, compoundsAPI } from '../../utils/api';
import { showSuccess, showError, showInfo } from '../../utils/sonner';
import { parseGoogleMapsLink, isGoogleMapsLink } from '../../utils/mapsLinkParser';
import OpenStreetMapPicker from './OpenStreetMapPicker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/shadcn';

const getEntityId = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    return value._id || value.id || value.value || '';
  }
  return '';
};

const PropertyForm = ({ property, onSave, onCancel, isEditing = false }) => {
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [floorPlan, setFloorPlan] = useState(null);
  const [masterPlan, setMasterPlan] = useState(null);
  const [uploadingFloorPlan, setUploadingFloorPlan] = useState(false);
  const [uploadingMasterPlan, setUploadingMasterPlan] = useState(false);
  const [features, setFeatures] = useState([]);
  const [amenities, setAmenities] = useState([]);
  const [nearbyFacilities, setNearbyFacilities] = useState([]);
  const [newFeature, setNewFeature] = useState('');
  const [newAmenity, setNewAmenity] = useState('');
  const [newFacility, setNewFacility] = useState({ name: '', type: '', distance: '' });
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [mapsLink, setMapsLink] = useState('');
  const [activeLocationTab, setActiveLocationTab] = useState('link'); // 'link', 'map', 'manual'
  const [isExtracting, setIsExtracting] = useState(false);
  
  // Hierarchical location state
  const [selectedGovernorate, setSelectedGovernorate] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedArea, setSelectedArea] = useState('');

  // React Query hooks
  const queryClient = useQueryClient();

  // Fetch developers for dropdown
  const { data: developersData, isLoading: developersLoading } = useQuery(
    'developers-for-property-form',
    async () => {
      const response = await developersAPI.getDevelopers({ limit: 1000, sortBy: 'name', sortOrder: 'asc' });
      return response.data;
    },
    {
      staleTime: 10 * 60 * 1000, // 10 minutes
      onError: (error) => {
        console.error('Error fetching developers:', error);
        showError('Failed to load developers');
      }
    }
  );

  const { data: compoundsData, isLoading: compoundsLoading } = useQuery(
    'compounds-for-property-form',
    async () => {
      const response = await compoundsAPI.getCompounds({ limit: 1000, sortBy: 'name', sortOrder: 'asc' });
      return response.data;
    },
    {
      staleTime: 10 * 60 * 1000,
      onError: (error) => {
        console.error('Error fetching compounds:', error);
        showError('Failed to load compounds');
      }
    }
  );

  // Fetch governorates for dropdown
  const { data: governoratesData, isLoading: governoratesLoading } = useQuery(
    'governorates-for-property-form',
    async () => {
      const response = await governoratesAPI.getGovernorates({ limit: 1000, sortBy: 'name', sortOrder: 'asc' });
      return response.data;
    },
    {
      staleTime: 10 * 60 * 1000,
      onError: (error) => {
        console.error('Error fetching governorates:', error);
        showError('Failed to load governorates');
      }
    }
  );

  // Fetch cities for selected governorate
  const { data: citiesByGovernorateData, isLoading: citiesByGovernorateLoading } = useQuery(
    ['cities-by-governorate', selectedGovernorate],
    async () => {
      if (!selectedGovernorate) return { cities: [] };
      const response = await citiesAPI.getCitiesByGovernorate(selectedGovernorate);
      return response.data;
    },
    {
      enabled: !!selectedGovernorate,
      staleTime: 10 * 60 * 1000,
      onError: (error) => {
        console.error('Error fetching cities:', error);
        showError('Failed to load cities');
      }
    }
  );

  // Fetch areas for selected city
  const { data: areasByCityData, isLoading: areasByCityLoading } = useQuery(
    ['areas-by-city', selectedCity],
    async () => {
      if (!selectedCity) return { areas: [] };
      const response = await areasAPI.getAreasByCity(selectedCity);
      return response.data;
    },
    {
      enabled: !!selectedCity,
      staleTime: 10 * 60 * 1000,
      onError: (error) => {
        console.error('Error fetching areas:', error);
        showError('Failed to load areas');
      }
    }
  );

  // Fetch all cities for dropdown (keeping for backward compatibility with old properties)
  const { data: _citiesData, isLoading: _citiesLoading } = useQuery(
    'cities-for-property-form',
    async () => {
      const response = await citiesAPI.getCities({ limit: 1000, sortBy: 'name', sortOrder: 'asc' });
      return response.data;
    },
    {
      staleTime: 10 * 60 * 1000, // 10 minutes
      onError: (error) => {
        console.error('Error fetching cities:', error);
        showError('Failed to load cities');
      }
    }
  );

  // Log developers data for debugging
  useEffect(() => {
    if (developersData) {
    }
  }, [developersData]);

  // Mutations for property operations
  const createPropertyMutation = useMutation(
    (propertyData) => propertiesAPI.createProperty(propertyData),
    {
      onSuccess: async () => {
        showSuccess('Property created successfully');

        // Double refresh for instant visibility
        queryClient.invalidateQueries('admin-properties');
        queryClient.invalidateQueries('properties');

        // Show visual feedback for double refresh
        showInfo('Ensuring instant visibility...');

        // Small delay then refresh again to ensure visibility
        setTimeout(() => {
          queryClient.invalidateQueries('admin-properties');
          queryClient.invalidateQueries('properties');
        }, 100);

        onSave();
      },
      onError: (error) => {
        console.error('Create property error:', error);
        if (error.response?.data?.errors) {
          const validationErrors = error.response.data.errors;
          validationErrors.forEach(err => {
            showError(`${err.path}: ${err.msg}`);
          });
        } else if (error.response?.data?.message) {
          showError(error.response.data.message);
        } else {
          showError('Failed to create property');
        }
      }
    }
  );

  const updatePropertyMutation = useMutation(
    ({ id, propertyData }) => propertiesAPI.updateProperty(id, propertyData),
    {
      onSuccess: async () => {
        showSuccess('Property updated successfully');

        // Double refresh for instant visibility
        queryClient.invalidateQueries('admin-properties');
        queryClient.invalidateQueries('properties');

        // Show visual feedback for double refresh
        // toast.success('🔄 Ensuring instant visibility...');

        // Small delay then refresh again to ensure visibility
        setTimeout(() => {
          queryClient.invalidateQueries('admin-properties');
          queryClient.invalidateQueries('properties');
        }, 100);

        onSave();
      },
      onError: (error) => {
        console.error('Update property error:', error);
        if (error.response?.data?.errors) {
          const validationErrors = error.response.data.errors;
          validationErrors.forEach(err => {
            showError(`${err.path}: ${err.msg}`);
          });
        } else if (error.response?.data?.message) {
          showError(error.response.data.message);
        } else {
          showError('Failed to update property');
        }
      }
    }
  );

  // Default values for specifications - moved outside useEffect to avoid dependency issues
  const defaultSpecs = {
    floors: 1,
    parking: 0,
    bedrooms: 0,
    bathrooms: 0
  };

  const normalizeUploadedImage = (data) => {
    if (!data) return null;

    const url = data.secure_url || data.url;
    if (!url) return null;

    const publicId = data.publicId || data.public_id || null;

    return {
      url,
      publicId,
      caption: data.caption || '',
      isHero: Boolean(data.isHero),
      order: typeof data.order === 'number' ? data.order : undefined,
      // Keep local metadata for UX even if not persisted
      width: data.width,
      height: data.height,
      bytes: data.bytes ?? data.compressedSize ?? null,
      optimizedUrls: data.optimizedUrls || null,
    };
  };

  const formatImagesForSave = (imageList) => {
    if (!Array.isArray(imageList)) {
      return [];
    }

    const prepared = imageList.map((image, index) => {
      const {
        url,
        publicId,
        caption,
        isHero,
        order,
      } = image;

      return {
        url,
        ...(publicId ? { publicId } : {}),
        ...(caption ? { caption } : {}),
        isHero: Boolean(isHero),
        order: typeof order === 'number' ? order : index,
      };
    });

    if (!prepared.some((img) => img.isHero) && prepared.length > 0) {
      prepared[0].isHero = true;
    }

    return prepared;
  };

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm({
    defaultValues: {
      title: '',
      description: '',
      type: 'apartment',
      status: 'for-sale',
      price: '',
      currency: 'EGP',
      location: {
        address: '',
        city: '',
        state: '',
        country: 'Egypt'
      },
      specifications: {
        bedrooms: '',
        bathrooms: '',
        area: '',
        areaUnit: 'sqm',
        floors: '',
        parking: '',
        furnished: 'unfurnished'
      },
      investment: {
        expectedROI: '',
        rentalYield: '',
        pricePerSqft: ''
      },
      developerStatus: '',
      developer: '',
      isCompound: false,
      compound: ''
    }
  });

  const isCompoundListing = watch('isCompound');
  const selectedCompoundId = watch('compound');

  const selectedCompound = useMemo(() => {
    if (!selectedCompoundId || !compoundsData?.compounds) return null;
    return compoundsData.compounds.find(
      (compoundItem) => getEntityId(compoundItem) === selectedCompoundId
    );
  }, [selectedCompoundId, compoundsData]);

  useEffect(() => {
    if (!selectedCompound) {
      return;
    }

    const developerId = getEntityId(selectedCompound.developer);

    if (developerId) {
      setValue('developer', developerId);
    }

    const governorateId = getEntityId(selectedCompound.governorate_ref);
    const cityId = getEntityId(selectedCompound.city_ref);
    const areaId = getEntityId(selectedCompound.area_ref);

    if (governorateId) {
      setSelectedGovernorate(governorateId);
    }
    if (cityId) {
      setSelectedCity(cityId);
    }
    if (areaId) {
      setSelectedArea(areaId);
    }
  }, [selectedCompound, setValue]);


  // Initialize form with property data if editing
  useEffect(() => {
    if (property && isEditing) {
      
      // Reset form with property data (best practice for react-hook-form)
      const formData = {
        title: property.title || '',
        description: property.description || '',
        type: property.type || 'apartment',
        status: property.status || 'for-sale',
        price: property.price || '',
        currency: property.currency || 'EGP',
        location: {
          address: property.location?.address || '',
          city: property.location?.city || '',
          state: property.location?.state || '',
          country: property.location?.country || 'Egypt',
          coordinates: {
            latitude: property.location?.coordinates?.latitude || '',
            longitude: property.location?.coordinates?.longitude || ''
          }
        },
        specifications: {
          bedrooms: property.specifications?.bedrooms !== undefined ? property.specifications.bedrooms : '',
          bathrooms: property.specifications?.bathrooms !== undefined ? property.specifications.bathrooms : '',
          area: property.specifications?.area !== undefined ? property.specifications.area : '',
          areaUnit: property.specifications?.areaUnit || 'sqm',
          floors: property.specifications?.floors !== undefined ? property.specifications.floors : '',
          parking: property.specifications?.parking !== undefined ? property.specifications.parking : '',
          furnished: property.specifications?.furnished || 'unfurnished'
        },
        investment: {
          expectedROI: property.investment?.expectedROI !== undefined ? property.investment.expectedROI : '',
          rentalYield: property.investment?.rentalYield !== undefined ? property.investment.rentalYield : '',
          pricePerSqft: property.investment?.pricePerSqft !== undefined ? property.investment.pricePerSqft : ''
        },
        developerStatus: property.developerStatus || '',
        developer: getEntityId(property.developer),
        isCompound: Boolean(property.isCompound),
        compound: getEntityId(property.compound),
      };
      
      // Reset form with all the data at once
      reset(formData);
      setValue('isCompound', formData.isCompound);
      setValue('compound', formData.compound || '');
      
      // Set hierarchical location fields for new structure
      const govId = getEntityId(property.governorate_ref);
      if (govId) {
        setSelectedGovernorate(govId);
      }
      const cityId = getEntityId(property.city_ref);
      if (cityId) {
        setSelectedCity(cityId);
      }
      const areaId = getEntityId(property.area_ref);
      if (areaId) {
        setSelectedArea(areaId);
      }

      // Set arrays and files
      if (property.images) {
        setImages(property.images.map((img) => normalizeUploadedImage(img) || img));
      }
      if (property.floorPlan) {
        setFloorPlan(property.floorPlan);
      }
      if (property.masterPlan) {
        setMasterPlan(property.masterPlan);
      }
      if (property.features) setFeatures(property.features);
      if (property.amenities) setAmenities(property.amenities);
      if (property.nearbyFacilities) setNearbyFacilities(property.nearbyFacilities);
      
    }
  }, [property, isEditing, reset, setValue]);

  const handleImageUpload = async (event) => {
    const files = Array.from(event.target.files || []).filter(Boolean);
    if (files.length === 0) return;

    setUploading(true);

    try {
      const uploadResults = await Promise.allSettled(
        files.map(async (file) => {
          const formData = new FormData();
          formData.append('image', file);
          formData.append('folder', 'basira-properties');

          try {
            const response = await uploadsAPI.uploadImage(formData);
            const payload = response.data?.data || response.data?.image || response.data;
            const image = normalizeUploadedImage(payload);

            if (!image) {
              throw new Error('Upload response missing required image data');
            }

            return image;
          } catch (error) {
            const message = error?.response?.data?.message || error.message || 'Upload failed';
            showError(`Failed to upload ${file.name}`, message);
            throw error;
          }
        })
      );

      const successfulUploads = uploadResults
        .filter((result) => result.status === 'fulfilled')
        .map((result) => result.value)
        .filter(Boolean);

      const failedUploads = uploadResults.filter((result) => result.status === 'rejected');

      if (successfulUploads.length > 0) {
        setImages((prev) => {
          const combined = [...prev, ...successfulUploads];

          if (!combined.some((img) => img.isHero) && combined.length > 0) {
            combined[0] = { ...combined[0], isHero: true };
          }

          return combined;
        });

        showSuccess(
          successfulUploads.length === 1
            ? 'Image uploaded successfully'
            : `${successfulUploads.length} images uploaded successfully`
        );
      }

      if (failedUploads.length > 0) {
        showError(
          failedUploads.length === 1
            ? 'One image failed to upload'
            : `${failedUploads.length} images failed to upload`
        );
      }

      if (successfulUploads.length === 0 && failedUploads.length === 0) {
        showError('No images were uploaded');
      }
    } catch (error) {
      console.error('Image upload error:', error);
      showError('Failed to upload images');
    } finally {
      setUploading(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  // Handle Floor Plan Upload
  const handleFloorPlanUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingFloorPlan(true);

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('folder', 'basira-floor-plans');

      const response = await uploadsAPI.uploadImage(formData);
      const payload = response.data?.data || response.data?.image || response.data;
      
      const floorPlanData = {
        url: payload.secure_url || payload.url,
        publicId: payload.public_id || payload.publicId
      };

      setFloorPlan(floorPlanData);
      showSuccess('Floor plan uploaded successfully');
    } catch (error) {
      console.error('Floor plan upload error:', error);
      showError('Failed to upload floor plan');
    } finally {
      setUploadingFloorPlan(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const removeFloorPlan = () => {
    setFloorPlan(null);
  };

  // Handle Master Plan Upload
  const handleMasterPlanUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingMasterPlan(true);

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('folder', 'basira-master-plans');

      const response = await uploadsAPI.uploadImage(formData);
      const payload = response.data?.data || response.data?.image || response.data;
      
      const masterPlanData = {
        url: payload.secure_url || payload.url,
        publicId: payload.public_id || payload.publicId
      };

      setMasterPlan(masterPlanData);
      showSuccess('Master plan uploaded successfully');
    } catch (error) {
      console.error('Master plan upload error:', error);
      showError('Failed to upload master plan');
    } finally {
      setUploadingMasterPlan(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const removeMasterPlan = () => {
    setMasterPlan(null);
  };

  const setHeroImage = (index) => {
    setImages(prev => prev.map((img, i) => ({
      ...img,
      isHero: i === index
    })));
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      setFeatures(prev => [...prev, newFeature.trim()]);
      setNewFeature('');
    }
  };

  const removeFeature = (index) => {
    setFeatures(prev => prev.filter((_, i) => i !== index));
  };

  const addAmenity = () => {
    if (newAmenity.trim()) {
      setAmenities(prev => [...prev, newAmenity.trim()]);
      setNewAmenity('');
    }
  };

  const removeAmenity = (index) => {
    setAmenities(prev => prev.filter((_, i) => i !== index));
  };

  const addNearbyFacility = () => {
    if (newFacility.name.trim() && newFacility.type.trim() && newFacility.distance.trim()) {
      setNearbyFacilities(prev => [...prev, { ...newFacility, distance: parseFloat(newFacility.distance) }]);
      setNewFacility({ name: '', type: '', distance: '' });
    }
  };

  const removeNearbyFacility = (index) => {
    setNearbyFacilities(prev => prev.filter((_, i) => i !== index));
  };

  // Handle Google Maps link extraction
  const handleExtractCoordinates = async () => {
    if (!mapsLink.trim()) {
      showError('Please enter a Google Maps link');
      return;
    }

    if (!isGoogleMapsLink(mapsLink)) {
      showError('Invalid Google Maps link', 'Please enter a valid Google Maps URL');
      return;
    }

    try {
      setIsExtracting(true);
      showInfo('Extracting coordinates...', 'This may take a moment for shortened links');
      
      const coordinates = await parseGoogleMapsLink(mapsLink);
      
      if (coordinates) {
        setValue('location.coordinates.latitude', coordinates.latitude);
        setValue('location.coordinates.longitude', coordinates.longitude);
        showSuccess('Coordinates extracted successfully!', `Lat: ${coordinates.latitude.toFixed(6)}, Lng: ${coordinates.longitude.toFixed(6)}`);
        setMapsLink(''); // Clear the input
      } else {
        showError(
          'Unable to extract coordinates', 
          'This URL format is not supported. Try copying the full Google Maps URL or use manual entry.'
        );
      }
    } catch (error) {
      console.error('Error extracting coordinates:', error);
      showError('Error extracting coordinates', 'Network error. Please try again or use manual entry.');
    } finally {
      setIsExtracting(false);
    }
  };

  // Handle map picker confirmation
  const handleMapPickerConfirm = (coordinates) => {
    setValue('location.coordinates.latitude', coordinates.latitude);
    setValue('location.coordinates.longitude', coordinates.longitude);
    setShowMapPicker(false);
    showSuccess('Location selected!', `Lat: ${coordinates.latitude.toFixed(6)}, Lng: ${coordinates.longitude.toFixed(6)}`);
  };

  // Clear coordinates
  const handleClearCoordinates = () => {
    setValue('location.coordinates.latitude', '');
    setValue('location.coordinates.longitude', '');
    setMapsLink('');
    showInfo('Coordinates cleared');
  };

  // Function to apply default values for specifications
  const applyDefaults = () => {
    setValue('specifications.floors', defaultSpecs.floors);
    setValue('specifications.parking', defaultSpecs.parking);
    setValue('specifications.bedrooms', defaultSpecs.bedrooms);
    setValue('specifications.bathrooms', defaultSpecs.bathrooms);
    showSuccess('Default values applied');
  };

  // Function to validate and fix numeric inputs
  const validateNumericInput = (field, value, min = 0) => {
    const numValue = parseInt(value);
    if (isNaN(numValue) || numValue < min) {
      setValue(field, min);
      showError(`Invalid value. Set to minimum: ${min}`);
    }
  };

  // Function to sanitize form data before submission
  const sanitizeFormData = (data) => {
    const sanitized = { ...data };

    // Ensure specifications are properly formatted
    if (sanitized.specifications) {
      // Convert empty strings to appropriate defaults
      if (sanitized.specifications.floors === '' || sanitized.specifications.floors === null || sanitized.specifications.floors === undefined) {
        sanitized.specifications.floors = 1;
      } else {
        sanitized.specifications.floors = parseInt(sanitized.specifications.floors);
      }

      if (sanitized.specifications.parking === '' || sanitized.specifications.parking === null || sanitized.specifications.parking === undefined) {
        sanitized.specifications.parking = 0;
      } else {
        sanitized.specifications.parking = parseInt(sanitized.specifications.parking);
      }

      if (sanitized.specifications.bedrooms === '' || sanitized.specifications.bedrooms === null || sanitized.specifications.bedrooms === undefined) {
        sanitized.specifications.bedrooms = 0;
      } else {
        sanitized.specifications.bedrooms = parseInt(sanitized.specifications.bedrooms);
      }

      if (sanitized.specifications.bathrooms === '' || sanitized.specifications.bathrooms === null || sanitized.specifications.bathrooms === undefined) {
        sanitized.specifications.bathrooms = 0;
      } else {
        sanitized.specifications.bathrooms = parseInt(sanitized.specifications.bathrooms);
      }

      // Ensure area is a number
      if (sanitized.specifications.area === '' || sanitized.specifications.area === null || sanitized.specifications.area === undefined) {
        throw new Error('Area is required');
      } else {
        sanitized.specifications.area = parseFloat(sanitized.specifications.area);
      }
    }

    // Handle price field - ensure it's a number
    if (sanitized.price === '' || sanitized.price === null || sanitized.price === undefined) {
      throw new Error('Price is required');
    } else {
      // Remove commas from price string (e.g., "1,000,000" -> "1000000")
      const priceStr = String(sanitized.price).replace(/,/g, '');
      
      // Use Number() to parse the cleaned string
      const parsedPrice = Number(priceStr);
      
      // Check if the number is within safe integer range
      if (!Number.isSafeInteger(parsedPrice)) {
        console.warn('Sanitization - Price exceeds safe integer range, keeping as number');
        // Even for large numbers, send as number for MongoDB to handle
        sanitized.price = parsedPrice;
      } else {
        sanitized.price = parsedPrice;
      }
      
    }

    // Handle investment fields
    if (sanitized.investment) {
      // Handle pricePerSqft field - ensure it's a number
      if (sanitized.investment.pricePerSqft === '' || sanitized.investment.pricePerSqft === null || sanitized.investment.pricePerSqft === undefined) {
        sanitized.investment.pricePerSqft = null; // Optional field
      } else {
        sanitized.investment.pricePerSqft = parseFloat(sanitized.investment.pricePerSqft);
      }
      
      // Handle expectedROI field
      if (sanitized.investment.expectedROI === '' || sanitized.investment.expectedROI === null || sanitized.investment.expectedROI === undefined) {
        sanitized.investment.expectedROI = null; // Optional field
      } else {
        sanitized.investment.expectedROI = parseFloat(sanitized.investment.expectedROI);
      }
      
      // Handle rentalYield field
      if (sanitized.investment.rentalYield === '' || sanitized.investment.rentalYield === null || sanitized.investment.rentalYield === undefined) {
        sanitized.investment.rentalYield = null; // Optional field
      } else {
        sanitized.investment.rentalYield = parseFloat(sanitized.investment.rentalYield);
      }
    }

    // Handle currency field - always set to EGP
    sanitized.currency = 'EGP';
    
    // Handle specifications enum fields
    if (sanitized.specifications) {
      // Always set areaUnit to sqm
      sanitized.specifications.areaUnit = 'sqm';
      
      // Remove furnished field if empty (optional enum field)
      if (sanitized.specifications.furnished === '' || sanitized.specifications.furnished === null || sanitized.specifications.furnished === undefined) {
        delete sanitized.specifications.furnished;
      }
    }

    // Handle boolean fields - remove empty strings and set defaults
    if (sanitized.isActive === '' || sanitized.isActive === null || sanitized.isActive === undefined) {
      sanitized.isActive = true; // Default for new properties
    } else {
      sanitized.isActive = Boolean(sanitized.isActive);
    }

    if (sanitized.isFeatured === '' || sanitized.isFeatured === null || sanitized.isFeatured === undefined) {
      sanitized.isFeatured = false; // Default value
    } else {
      sanitized.isFeatured = Boolean(sanitized.isFeatured);
    }

    if (sanitized.isCompound === '' || sanitized.isCompound === null || sanitized.isCompound === undefined) {
      sanitized.isCompound = false;
    } else if (typeof sanitized.isCompound === 'string') {
      const normalized = sanitized.isCompound.toLowerCase();
      sanitized.isCompound = ['true', '1', 'yes', 'on'].includes(normalized);
    } else {
      sanitized.isCompound = Boolean(sanitized.isCompound);
    }

    if (sanitized.compound === '' || sanitized.compound === null || sanitized.compound === undefined) {
      delete sanitized.compound;
    }

    // Remove isArchived field if it's empty or undefined - let the model use its default
    if (sanitized.isArchived === '' || sanitized.isArchived === null || sanitized.isArchived === undefined) {
      delete sanitized.isArchived;
    } else {
      sanitized.isArchived = Boolean(sanitized.isArchived);
    }

    // Remove fields that are empty strings (not just null/undefined)
    // This prevents validation errors for optional enum fields
    if (sanitized.type === '' || sanitized.type === null || sanitized.type === undefined) {
      // Type should have a default, but just in case
      sanitized.type = 'apartment';
    }
    if (sanitized.developer === '' || sanitized.developer === null || sanitized.developer === undefined) {
      delete sanitized.developer;
    }
    if (sanitized.status === '' || sanitized.status === null || sanitized.status === undefined) {
      delete sanitized.status;
    }
    if (sanitized.developerStatus === '' || sanitized.developerStatus === null || sanitized.developerStatus === undefined) {
      delete sanitized.developerStatus;
    }

    return sanitized;
  };

  const onSubmit = (data) => {
    
    // Validate either old or new location structure
    const useNewLocationStructure = !!(selectedGovernorate && selectedCity && selectedArea);
    
    if (!useNewLocationStructure && !data.location?.city) {
      showError('Location is required', 'Please select governorate, city, and area OR provide legacy city/state');
      return;
    }
    
    if (data.isCompound && !data.compound) {
      showError('Compound is required', 'Please link this listing to a compound or create one before saving.');
      return;
    }
    
    // Sanitize the form data before submission
    const sanitizedData = sanitizeFormData(data);
    
    // Debug: Log the sanitized data

    const propertyData = {
      ...sanitizedData,
      images: formatImagesForSave(images),
      floorPlan: floorPlan || undefined,
      masterPlan: masterPlan || undefined,
      features,
      amenities,
      nearbyFacilities
    };

    // Add new hierarchical location structure if selected
    if (useNewLocationStructure) {
      propertyData.governorate_ref = selectedGovernorate;
      propertyData.city_ref = selectedCity;
      propertyData.area_ref = selectedArea;
      propertyData.useNewLocationStructure = true;
    } else {
      propertyData.useNewLocationStructure = false;
    }

    // Debug: Log the final property data

    if (isEditing) {
      updatePropertyMutation.mutate({ id: property._id, propertyData });
    } else {
      createPropertyMutation.mutate(propertyData);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic Information */}
      <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl shadow-xl border border-slate-700/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Basic Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Title *</label>
            <input
              {...register('title', { required: 'Title is required' })}
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400"
              placeholder="Enter property title"
            />
            {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Type *</label>
            <Select onValueChange={(value) => setValue('type', value)} value={watch('type') || 'apartment'}>
              <SelectTrigger className="w-full bg-slate-800/50 border border-slate-700/50 text-white">
                <SelectValue placeholder="Select property type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="apartment">Apartment</SelectItem>
                <SelectItem value="villa">Villa</SelectItem>
                <SelectItem value="twin-villa">Twin Villa</SelectItem>
                <SelectItem value="duplex">Duplex</SelectItem>
                <SelectItem value="land">Land</SelectItem>
                <SelectItem value="commercial">Commercial</SelectItem>
              </SelectContent>
            </Select>
            {errors.type && <p className="text-red-500 text-sm mt-1">{errors.type.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Status *</label>
            <Select onValueChange={(value) => setValue('status', value)} value={watch('status') || 'for-sale'}>
              <SelectTrigger className="w-full bg-slate-800/50 border border-slate-700/50 text-white">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="for-sale">For Sale</SelectItem>
                <SelectItem value="for-rent">For Rent</SelectItem>
                <SelectItem value="sold">Sold</SelectItem>
                <SelectItem value="rented">Rented</SelectItem>
              </SelectContent>
            </Select>
            {errors.status && <p className="text-red-500 text-sm mt-1">{errors.status.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Price (EGP) *</label>
            <input
              {...register('price', { required: 'Price is required', min: 0 })}
              type="text"
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400"
              placeholder="Enter price (e.g., 1,500,000)"
              value={watch('price') ? (() => {
                const price = watch('price');
                if (!price || price === '') return '';
                // Handle large numbers by parsing as string first
                const numPrice = typeof price === 'string' ? parseFloat(price) : price;
                return isNaN(numPrice) ? '' : numPrice.toLocaleString();
              })() : ''}
              onChange={(e) => {
                // Remove all non-numeric characters
                let value = e.target.value.replace(/[^\d]/g, '');
                
                // Limit to 12 digits (max 999 billion)
                if (value.length > 12) {
                  value = value.substring(0, 12);
                }
                
                const numValue = parseFloat(value);
                
                // Validate against maximum allowed value
                if (numValue > 999000000000) {
                  showError('Price too high', 'Maximum allowed price is 999 billion EGP');
                  return;
                }
                
                // Update the form value with the numeric value (without commas)
                setValue('price', value || '');
              }}
            />
            {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price.message}</p>}
          </div>
        </div>

      {/* Compound Association */}
      <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl shadow-xl border border-slate-700/50 p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <FiLayers className="w-5 h-5 text-blue-400" />
              Compound Association
            </h3>
            <p className="text-sm text-slate-300 mt-1">
              Link this listing with a compound or mark it as a compound overview card.
            </p>
          </div>
        </div>

        <div className="mt-4">
          <label className="inline-flex items-center gap-3">
            <input
              type="checkbox"
              className="w-4 h-4 text-blue-600 bg-slate-800 border-slate-600 rounded focus:ring-blue-500"
              checked={Boolean(isCompoundListing)}
              onChange={(event) => {
                const checked = event.target.checked;
                setValue('isCompound', checked);
                if (!checked) {
                  setValue('compound', '');
                }
              }}
            />
            <span className="text-sm font-medium text-slate-200">
              Mark this property card as a compound overview
            </span>
          </label>
          <p className="text-xs text-slate-400 mt-1">
            Compound overview cards highlight a compound rather than a single unit.
          </p>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Linked Compound
          </label>
          <div className="flex gap-2">
            <div className="flex-1">
              <Select
                value={selectedCompoundId || 'none'}
                onValueChange={(value) => setValue('compound', value === 'none' ? '' : value)}
                disabled={compoundsLoading}
              >
                <SelectTrigger className="w-full bg-slate-800/50 border border-slate-700/50 text-white">
                  <SelectValue
                    placeholder={
                      compoundsLoading
                        ? 'Loading compounds...'
                        : 'Select compound (optional)'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Compound</SelectItem>
                  {compoundsLoading ? (
                    <SelectItem value="__loading_compounds" disabled>
                      Loading compounds...
                    </SelectItem>
                  ) : compoundsData?.compounds?.length ? (
                    compoundsData.compounds.map((compoundOption) => {
                      const compoundId = getEntityId(compoundOption);
                      if (!compoundId) return null;
                      return (
                        <SelectItem key={compoundId} value={compoundId}>
                          {compoundOption.name || 'Unnamed compound'}
                        </SelectItem>
                      );
                    })
                  ) : (
                    <SelectItem value="__no_compounds" disabled>
                      No compounds found. Add one first!
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <a
              href="/admin/compounds/new"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-1 text-sm"
              title="Add new compound"
            >
              <FiPlus className="w-4 h-4" />
            </a>
          </div>
          {isCompoundListing && !compoundsLoading && (!compoundsData?.compounds || compoundsData.compounds.length === 0) && (
            <p className="text-xs text-yellow-300 mt-2">
              No compounds available yet. Please add a compound first.
            </p>
          )}
          {isCompoundListing && !selectedCompoundId && (!compoundsLoading || (compoundsData?.compounds && compoundsData.compounds.length > 0)) && (
            <p className="text-xs text-yellow-300 mt-2">
              Select a compound or create one before saving this compound overview.
            </p>
          )}
          {isCompoundListing && selectedCompound && (
            <div className="mt-3 bg-slate-800/60 border border-slate-700/50 rounded-lg p-3 text-sm text-slate-200">
              <div className="flex flex-col gap-1">
                <span className="font-semibold text-white">{selectedCompound.name}</span>
                <span className="text-xs text-slate-400">
                  {selectedCompound.developer?.name
                    ? `Developer: ${selectedCompound.developer.name}`
                    : 'Developer not linked'}
                </span>
                <span className="text-xs text-slate-400">
                  {selectedCompound.status ? `Status: ${selectedCompound.status}` : 'Status not set'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-slate-300 mb-2">Description *</label>
          <textarea
            {...register('description', { required: 'Description is required' })}
            rows={4}
            className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400"
            placeholder="Enter property description"
          />
          {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>}
        </div>
      </div>

      {/* Developer Information */}
      <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl shadow-xl border border-slate-700/50 p-6 pb-24 overflow-visible">
        <h3 className="text-lg font-semibold text-white mb-4">Developer Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-visible">
          <div className="overflow-visible relative">
            <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2 overflow-visible relative">
              Developer Status
              <InfoIcon 
                title="Developer Status" 
                description="Off-plan: Property under construction, not yet completed. On-plan: Property ready for immediate delivery. Secondary: Resale property, previously owned. Rental: Property available for rent only."
              />
            </label>
            <Select 
              onValueChange={(value) => setValue('developerStatus', value === 'none' ? '' : value)} 
              value={watch('developerStatus') || 'none'}
            >
              <SelectTrigger className="w-full bg-slate-800/50 border border-slate-700/50 text-white">
                <SelectValue placeholder="Select developer status (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="off-plan">Off-plan</SelectItem>
                <SelectItem value="on-plan">On-plan</SelectItem>
                <SelectItem value="secondary">Secondary</SelectItem>
                <SelectItem value="rental">Rental</SelectItem>
              </SelectContent>
            </Select>
          </div>

            <div className="overflow-visible relative">
              <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2 overflow-visible relative">
                Developer
                <InfoIcon
                  title="Developer"
                  description="Optional: Select the developer/builder responsible for this property. You can add new developers in the Developers section."
                />
              </label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Select 
                    onValueChange={(value) => {
                      // Convert "none" to empty string for backend
                      setValue('developer', value === 'none' ? '' : value);
                    }} 
                    value={watch('developer') || 'none'}
                    disabled={developersLoading}
                  >
                    <SelectTrigger className="w-full bg-slate-800/50 border border-slate-700/50 text-white">
                      <SelectValue placeholder={developersLoading ? "Loading developers..." : "Select developer (optional)"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Developer</SelectItem>
                      {developersLoading ? (
                        <SelectItem value="__loading_developers" disabled>
                          Loading developers...
                        </SelectItem>
                      ) : developersData?.developers?.length === 0 ? (
                        <SelectItem value="__no_developers" disabled>
                          No developers found. Add one first!
                        </SelectItem>
                      ) : (
                        developersData?.developers?.map((dev) => {
                          const developerId = getEntityId(dev);
                          if (!developerId) return null;
                          return (
                            <SelectItem key={developerId} value={developerId}>
                              {dev.name || 'Unnamed developer'}
                            </SelectItem>
                          );
                        })
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <a
                  href="/admin/developers/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-1 text-sm"
                  title="Add new developer"
                >
                  <FiPlus className="w-4 h-4" />
                </a>
              </div>
            </div>
        </div>
      </div>

      {/* Location */}
      <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl shadow-xl border border-slate-700/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Location</h3>
        
        {/* New Hierarchical Location Structure */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-4">
          <p className="text-sm text-blue-300 mb-3">
            <strong>✨ New Location System:</strong> Select from hierarchical structure (Governorate → City → Area)
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Governorate Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Governorate</label>
              {governoratesLoading ? (
                <div className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-400">
                  Loading...
                </div>
              ) : (
                <Select
                  value={selectedGovernorate}
                  onValueChange={(value) => {
                    setSelectedGovernorate(value);
                    setSelectedCity(''); // Reset dependent selections
                    setSelectedArea('');
                  }}
                >
                  <SelectTrigger className="w-full bg-slate-800/50 border-slate-700/50 text-white">
                    <SelectValue placeholder="Select governorate" />
                  </SelectTrigger>
                  <SelectContent>
                    {(governoratesData?.governorates || []).map((gov) => {
                      const governorateId = getEntityId(gov);
                      if (!governorateId) return null;
                      return (
                        <SelectItem key={governorateId} value={governorateId}>
                          {gov.name || 'Unnamed governorate'}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* City Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">City</label>
              {citiesByGovernorateLoading ? (
                <div className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-400">
                  Loading...
                </div>
              ) : (
                <Select
                  value={selectedCity}
                  onValueChange={(value) => {
                    setSelectedCity(value);
                    setSelectedArea(''); // Reset dependent selection
                  }}
                  disabled={!selectedGovernorate}
                >
                  <SelectTrigger className="w-full bg-slate-800/50 border-slate-700/50 text-white">
                    <SelectValue placeholder={selectedGovernorate ? "Select city" : "Select governorate first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {(citiesByGovernorateData?.cities || []).map((city) => {
                      const cityId = getEntityId(city);
                      if (!cityId) return null;
                      return (
                        <SelectItem key={cityId} value={cityId}>
                          {city.name || 'Unnamed city'}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Area Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Area</label>
              {areasByCityLoading ? (
                <div className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-400">
                  Loading...
                </div>
              ) : (
                <Select
                  value={selectedArea}
                  onValueChange={(value) => setSelectedArea(value)}
                  disabled={!selectedCity}
                >
                  <SelectTrigger className="w-full bg-slate-800/50 border-slate-700/50 text-white">
                    <SelectValue placeholder={selectedCity ? "Select area" : "Select city first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {(areasByCityData?.areas || []).map((area) => {
                      const areaId = getEntityId(area);
                      if (!areaId) return null;
                      return (
                        <SelectItem key={areaId} value={areaId}>
                          {area.name || 'Unnamed area'} ({area.annualAppreciationRate ?? 0}% appreciation)
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
              {selectedCity && (
                <a
                  href={`/admin/areas/new`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300 mt-1 inline-block"
                >
                  + Add new area
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Address *</label>
            <input
              {...register('location.address', { required: 'Address is required' })}
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400"
              placeholder="Enter address"
            />
            {errors.location?.address && <p className="text-red-500 text-sm mt-1">{errors.location.address.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Country</label>
            <input
              {...register('location.country')}
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400"
              placeholder="Enter country"
              defaultValue="Egypt"
            />
          </div>
        </div>

        {/* Coordinates Section with Tabs */}
        <div className="mt-6">
          <h4 className="text-md font-semibold text-white mb-4 flex items-center justify-between">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Map Coordinates (Optional)
            </div>
            {(watch('location.coordinates.latitude') || watch('location.coordinates.longitude')) && (
              <button
                type="button"
                onClick={handleClearCoordinates}
                className="text-xs text-red-400 hover:text-red-300 flex items-center space-x-1"
              >
                <FiX className="w-3 h-3" />
                <span>Clear</span>
              </button>
            )}
          </h4>

          {/* Tab Navigation */}
          <div className="flex space-x-2 mb-4">
            <button
              type="button"
              onClick={() => setActiveLocationTab('link')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                activeLocationTab === 'link'
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50'
              }`}
            >
              <FiLink className="w-4 h-4" />
              <span>Paste Link</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveLocationTab('map')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                activeLocationTab === 'map'
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50'
              }`}
            >
              <FiMap className="w-4 h-4" />
              <span>Pick on Map</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveLocationTab('manual')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                activeLocationTab === 'manual'
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50'
              }`}
            >
              <FiEdit className="w-4 h-4" />
              <span>Manual Entry</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/50">
            {/* Tab 1: Paste Google Maps Link */}
            {activeLocationTab === 'link' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Google Maps URL
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={mapsLink}
                      onChange={(e) => setMapsLink(e.target.value)}
                      className="flex-1 px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400"
                      placeholder="https://www.google.com/maps/..."
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleExtractCoordinates())}
                    />
                    <button
                      type="button"
                      onClick={handleExtractCoordinates}
                      disabled={isExtracting}
                      className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      {isExtracting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Extracting...</span>
                        </>
                      ) : (
                        'Extract'
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    Paste a Google Maps link and click "Extract" to automatically get coordinates
                  </p>
                  
                  {/* Quick Action Buttons */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setValue('location.coordinates.latitude', 30.0444);
                        setValue('location.coordinates.longitude', 31.2357);
                        showSuccess('Sample coordinates set!', 'Cairo, Egypt coordinates for testing');
                      }}
                      className="px-3 py-1 text-xs bg-slate-600 text-white rounded hover:bg-slate-700 transition-colors"
                    >
                      Use Sample (Cairo)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setValue('location.coordinates.latitude', 25.2048);
                        setValue('location.coordinates.longitude', 55.2708);
                        showSuccess('Sample coordinates set!', 'Dubai, UAE coordinates for testing');
                      }}
                      className="px-3 py-1 text-xs bg-slate-600 text-white rounded hover:bg-slate-700 transition-colors"
                    >
                      Use Sample (Dubai)
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveLocationTab('manual')}
                      className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      Switch to Manual Entry
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveLocationTab('map')}
                      className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                    >
                      Pick on Map Instead
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="text-sm text-blue-300">
                    <strong>How to get a Google Maps link:</strong>
                  </p>
                  <ol className="text-xs text-blue-300 mt-2 space-y-1 ml-4 list-decimal">
                    <li>Open Google Maps and search for the property location</li>
                    <li>Right-click on the exact location</li>
                    <li>Click on the coordinates to copy them, or copy the page URL</li>
                    <li>Paste the link here</li>
                  </ol>
                </div>
              </div>
            )}

            {/* Tab 2: Pick on Map */}
            {activeLocationTab === 'map' && (
              <div className="space-y-4">
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FiMap className="w-8 h-8 text-blue-400" />
                  </div>
                  <p className="text-slate-300 mb-4">
                    Click the button below to open an interactive map and select the property location
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowMapPicker(true)}
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg inline-flex items-center space-x-2"
                  >
                    <FiMap className="w-5 h-5" />
                    <span>Open Map Picker</span>
                  </button>
                </div>
              </div>
            )}

            {/* Tab 3: Manual Entry */}
            {activeLocationTab === 'manual' && (
              <div className="space-y-4">
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <p className="text-sm text-yellow-300">
                    <strong>💡 Quick Tip:</strong> To get coordinates from Google Maps:
                  </p>
                  <ol className="text-xs text-yellow-300 mt-2 space-y-1 ml-4 list-decimal">
                    <li>Right-click on the exact location in Google Maps</li>
                    <li>Click "What's here?" from the context menu</li>
                    <li>Copy the coordinates that appear (e.g., 30.0444, 31.2357)</li>
                    <li>Paste them in the fields below</li>
                  </ol>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Latitude</label>
                    <input
                      {...register('location.coordinates.latitude', { 
                        min: -90, 
                        max: 90,
                        pattern: {
                          value: /^-?([1-8]?[0-9](\.[0-9]+)?|90(\.0+)?)$/,
                          message: 'Latitude must be between -90 and 90'
                        }
                      })}
                      type="number"
                      step="any"
                      className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400"
                      placeholder="e.g., 30.0444"
                    />
                    {errors.location?.coordinates?.latitude && (
                      <p className="text-red-500 text-sm mt-1">{errors.location.coordinates.latitude.message}</p>
                    )}
                    <p className="text-xs text-slate-400 mt-1">Range: -90 to 90</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Longitude</label>
                    <input
                      {...register('location.coordinates.longitude', { 
                        min: -180, 
                        max: 180,
                        pattern: {
                          value: /^-?((1[0-7][0-9])|([1-9]?[0-9]))(\.[0-9]+)?$|^-?180(\.0+)?$/,
                          message: 'Longitude must be between -180 and 180'
                        }
                      })}
                      type="number"
                      step="any"
                      className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400"
                      placeholder="e.g., 31.2357"
                    />
                    {errors.location?.coordinates?.longitude && (
                      <p className="text-red-500 text-sm mt-1">{errors.location.coordinates.longitude.message}</p>
                    )}
                    <p className="text-xs text-slate-400 mt-1">Range: -180 to 180</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Current Coordinates Display */}
          {(watch('location.coordinates.latitude') || watch('location.coordinates.longitude')) && (
            <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-sm text-green-300 mb-2">
                <strong>✓ Coordinates Set:</strong>
              </p>
              <div className="flex items-center space-x-4 font-mono text-sm">
                <span className="text-white">
                  <span className="text-green-400">Lat:</span> {watch('location.coordinates.latitude') || 'Not set'}
                </span>
                <span className="text-white">
                  <span className="text-green-400">Lng:</span> {watch('location.coordinates.longitude') || 'Not set'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Specifications */}
      <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl shadow-xl border border-slate-700/50 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Specifications</h3>
          <button
            type="button"
            onClick={applyDefaults}
            className="px-3 py-1 text-sm bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 rounded-lg transition-colors"
          >
            Reset to Defaults
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Bedrooms</label>
            <input
              {...register('specifications.bedrooms', { 
                min: 0,
                onChange: (e) => validateNumericInput('specifications.bedrooms', e.target.value, 0)
              })}
              type="number"
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400"
              placeholder="0"
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Bathrooms</label>
            <input
              {...register('specifications.bathrooms', { 
                min: 0,
                onChange: (e) => validateNumericInput('specifications.bathrooms', e.target.value, 0)
              })}
              type="number"
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400"
              placeholder="0"
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Area (m²) *</label>
            <input
              {...register('specifications.area', { required: 'Area is required', min: 0 })}
              type="number"
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400"
              placeholder="0"
            />
            {errors.specifications?.area && <p className="text-red-500 text-sm mt-1">{errors.specifications.area.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Floors</label>
            <input
              {...register('specifications.floors', { 
                min: 1,
                onChange: (e) => validateNumericInput('specifications.floors', e.target.value, 1)
              })}
              type="number"
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400"
              placeholder="1"
              min="1"
            />
            <p className="text-xs text-slate-400 mt-1">Default: 1 floor</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Parking Spaces</label>
            <input
              {...register('specifications.parking', { 
                min: 0,
                onChange: (e) => validateNumericInput('specifications.parking', e.target.value, 0)
              })}
              type="number"
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400"
              placeholder="0"
              min="0"
            />
            <p className="text-xs text-slate-400 mt-1">Default: 0 parking spaces</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Furnished</label>
            <Select onValueChange={(value) => setValue('specifications.furnished', value)} value={watch('specifications.furnished') || 'unfurnished'}>
              <SelectTrigger className="w-full bg-slate-800/50 border border-slate-700/50 text-white">
                <SelectValue placeholder="Select furnished status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unfurnished">Unfurnished</SelectItem>
                <SelectItem value="semi-furnished">Semi-furnished</SelectItem>
                <SelectItem value="furnished">Furnished</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Images */}
      <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl shadow-xl border border-slate-700/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Images</h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-300 mb-2">Upload Images</label>
          <div className="flex items-center justify-center w-full">
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-600 border-dashed rounded-lg cursor-pointer bg-slate-800/50 hover:bg-slate-700/50">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <FiUpload className="w-8 h-8 mb-2 text-slate-400" />
                <p className="mb-2 text-sm text-slate-400">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-slate-400">PNG, JPG, GIF up to 10MB each</p>
              </div>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>
          {uploading && <p className="text-sm text-blue-400 mt-2">Uploading images...</p>}
        </div>

        {images.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {images.map((image, index) => {
              const imageKey = image?.publicId || image?.url || `image-${index}`;
              const imageSrc = image?.url || image;
              return (
                <div key={imageKey} className="relative group">
                <img
                  src={imageSrc}
                  alt={`Property ${index + 1}`}
                  className="w-full h-24 object-cover rounded-lg"
                />
                <div className="absolute inset-0 bg-[#131c2b] bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setHeroImage(index)}
                    className={`p-1 rounded text-white ${
                      image?.isHero ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                    title={image?.isHero ? 'Hero Image' : 'Set as Hero'}
                  >
                    {image?.isHero ? '✓' : '★'}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="p-1 rounded bg-red-600 hover:bg-red-700 text-white"
                    title="Remove Image"
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                </div>
                {image?.isHero && (
                  <div className="absolute top-1 left-1 bg-green-600 text-white text-xs px-2 py-1 rounded">
                    Hero
                  </div>
                )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floor Plan & Master Plan */}
      <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl shadow-xl border border-slate-700/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Floor Plan & Master Plan</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Floor Plan Upload */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Floor Plan</label>
            {!floorPlan ? (
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-600 border-dashed rounded-lg cursor-pointer bg-slate-800/50 hover:bg-slate-700/50">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <FiUpload className="w-8 h-8 mb-2 text-slate-400" />
                    <p className="mb-2 text-sm text-slate-400">
                      <span className="font-semibold">Upload Floor Plan</span>
                    </p>
                    <p className="text-xs text-slate-400">PNG, JPG, PDF up to 10MB</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFloorPlanUpload}
                    disabled={uploadingFloorPlan}
                    className="hidden"
                  />
                </label>
              </div>
            ) : (
              <div className="relative group">
                <div className="w-full h-32 bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 flex items-center justify-center">
                  <div className="text-center">
                    <svg className="w-12 h-12 text-[#A88B32] mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-xs text-slate-300">Floor Plan Uploaded</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={removeFloorPlan}
                  className="absolute top-2 right-2 p-1 rounded bg-red-600 hover:bg-red-700 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove Floor Plan"
                >
                  <FiX className="w-4 h-4" />
                </button>
                <a
                  href={floorPlan.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute bottom-2 left-2 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  View
                </a>
              </div>
            )}
            {uploadingFloorPlan && <p className="text-sm text-blue-400 mt-2">Uploading floor plan...</p>}
          </div>

          {/* Master Plan Upload */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Master Plan</label>
            {!masterPlan ? (
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-600 border-dashed rounded-lg cursor-pointer bg-slate-800/50 hover:bg-slate-700/50">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <FiUpload className="w-8 h-8 mb-2 text-slate-400" />
                    <p className="mb-2 text-sm text-slate-400">
                      <span className="font-semibold">Upload Master Plan</span>
                    </p>
                    <p className="text-xs text-slate-400">PNG, JPG, PDF up to 10MB</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleMasterPlanUpload}
                    disabled={uploadingMasterPlan}
                    className="hidden"
                  />
                </label>
              </div>
            ) : (
              <div className="relative group">
                <div className="w-full h-32 bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 flex items-center justify-center">
                  <div className="text-center">
                    <svg className="w-12 h-12 text-[#A88B32] mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                    <p className="text-xs text-slate-300">Master Plan Uploaded</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={removeMasterPlan}
                  className="absolute top-2 right-2 p-1 rounded bg-red-600 hover:bg-red-700 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove Master Plan"
                >
                  <FiX className="w-4 h-4" />
                </button>
                <a
                  href={masterPlan.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute bottom-2 left-2 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  View
                </a>
              </div>
            )}
            {uploadingMasterPlan && <p className="text-sm text-blue-400 mt-2">Uploading master plan...</p>}
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl shadow-xl border border-slate-700/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Features</h3>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newFeature}
            onChange={(e) => setNewFeature(e.target.value)}
            className="flex-1 px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400"
            placeholder="Add a feature (e.g., Pool, Garden, Balcony)"
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
          />
          <button
            type="button"
            onClick={addFeature}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg"
          >
            <FiPlus className="w-4 h-4" />
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {features.map((feature, index) => (
            <span
              key={`feature-${index}-${feature}`}
              className="inline-flex items-center gap-1 px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm"
            >
              {feature}
              <button
                type="button"
                onClick={() => removeFeature(index)}
                className="text-blue-400 hover:text-blue-300"
              >
                <FiX className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Amenities */}
      <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl shadow-xl border border-slate-700/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Amenities</h3>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newAmenity}
            onChange={(e) => setNewAmenity(e.target.value)}
            className="flex-1 px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400"
            placeholder="Add an amenity (e.g., Security, Gym, Pool)"
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAmenity())}
          />
          <button
            type="button"
            onClick={addAmenity}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg"
          >
            <FiPlus className="w-4 h-4" />
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {amenities.map((amenity, index) => (
            <span
              key={`amenity-${index}-${amenity}`}
              className="inline-flex items-center gap-1 px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm"
            >
              {amenity}
              <button
                type="button"
                onClick={() => removeAmenity(index)}
                className="text-green-400 hover:text-green-300"
              >
                <FiX className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Nearby Facilities */}
      <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl shadow-xl border border-slate-700/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Nearby Facilities</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-4">
          <input
            type="text"
            value={newFacility.name}
            onChange={(e) => setNewFacility(prev => ({ ...prev, name: e.target.value }))}
            className="px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400"
            placeholder="Facility name"
          />
          <Select
            value={newFacility.type}
            onValueChange={(value) => setNewFacility(prev => ({ ...prev, type: value }))}
          >
            <SelectTrigger className="px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="school">School</SelectItem>
              <SelectItem value="hospital">Hospital</SelectItem>
              <SelectItem value="mall">Mall</SelectItem>
              <SelectItem value="metro">Metro</SelectItem>
              <SelectItem value="restaurant">Restaurant</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          <input
            type="number"
            value={newFacility.distance}
            onChange={(e) => setNewFacility(prev => ({ ...prev, distance: e.target.value }))}
            className="px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400"
            placeholder="Distance (km)"
            step="0.1"
          />
          <button
            type="button"
            onClick={addNearbyFacility}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg"
          >
            <FiPlus className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-2">
          {nearbyFacilities.map((facility, index) => (
            <div key={`facility-${index}-${facility.name || 'facility'}`} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
              <div className="flex items-center gap-4">
                <span className="font-medium text-white">{facility.name}</span>
                <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-sm capitalize">
                  {facility.type}
                </span>
                <span className="text-sm text-slate-400">{facility.distance} km</span>
              </div>
              <button
                type="button"
                onClick={() => removeNearbyFacility(index)}
                className="text-red-400 hover:text-red-300"
              >
                <FiTrash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Investment Info */}
      <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl shadow-xl border border-slate-700/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Investment Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Expected ROI (%)</label>
            <input
              {...register('investment.expectedROI', { min: 0, max: 100 })}
              type="number"
              step="0.1"
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400"
              placeholder="0.0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Rental Yield (%)</label>
            <input
              {...register('investment.rentalYield', { min: 0, max: 100 })}
              type="number"
              step="0.1"
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400"
              placeholder="0.0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Price per m²</label>
            <input
              {...register('investment.pricePerSqft', { min: 0 })}
              type="text"
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400"
              placeholder="Enter price per m² (e.g., 15,000)"
              value={watch('investment.pricePerSqft') ? (() => {
                const value = watch('investment.pricePerSqft');
                const parts = String(value).split('.');
                if (parts.length > 1) {
                  return Number(parts[0]).toLocaleString() + '.' + parts[1];
                }
                return Number(value).toLocaleString();
              })() : ''}
              onChange={(e) => {
                // Remove non-numeric characters except decimal point
                let value = e.target.value.replace(/[^\d.]/g, '');
                
                // Handle decimal point (only allow one)
                const parts = value.split('.');
                if (parts.length > 2) {
                  value = parts[0] + '.' + parts.slice(1).join('');
                }
                
                // Update the form value with the numeric value
                setValue('investment.pricePerSqft', value || '');
              }}
            />
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-800/50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={createPropertyMutation.isLoading || updatePropertyMutation.isLoading}
          className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {(createPropertyMutation.isLoading || updatePropertyMutation.isLoading)
            ? (isEditing ? 'Updating...' : 'Creating...')
            : (isEditing ? 'Update Property' : 'Create Property')
          }
        </button>
      </div>

      {/* Map Picker Modal */}
      {showMapPicker && (
        <OpenStreetMapPicker
          onConfirm={handleMapPickerConfirm}
          onCancel={() => setShowMapPicker(false)}
          initialLat={watch('location.coordinates.latitude')}
          initialLng={watch('location.coordinates.longitude')}
        />
      )}
    </form>
  );
};

export default PropertyForm;
