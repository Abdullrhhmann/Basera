import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { FiPlus, FiTrash2, FiUpload, FiX, FiFileText, FiDownload } from '../../icons/feather';
import {
  compoundsAPI,
  uploadsAPI,
  developersAPI,
  governoratesAPI,
  citiesAPI,
  areasAPI,
} from '../../utils/api';
import { showError, showSuccess } from '../../utils/sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/shadcn';

const statusOptions = [
  { value: 'planning', label: 'Planning' },
  { value: 'launching', label: 'Launching' },
  { value: 'active', label: 'Active' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'on-hold', label: 'On Hold' },
];

const formatDateForInput = (value) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
};

const normalizeUploadedImage = (payload) => {
  if (!payload) return null;

  const url = payload.secure_url || payload.url;
  if (!url) return null;

  return {
    url,
    publicId: payload.publicId || payload.public_id || undefined,
    caption: payload.caption || '',
    order: typeof payload.order === 'number' ? payload.order : undefined,
    isHero: Boolean(payload.isHero),
    width: payload.width,
    height: payload.height,
    bytes: payload.bytes ?? payload.compressedSize ?? null,
  };
};

const CompoundForm = ({ compound, onSave, onCancel, isEditing = false }) => {
  const queryClient = useQueryClient();
  const [heroImage, setHeroImage] = useState(null);
  const [heroUploading, setHeroUploading] = useState(false);
  const [gallery, setGallery] = useState([]);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [brochureUrl, setBrochureUrl] = useState(null);
  const [brochureUploading, setBrochureUploading] = useState(false);
  const [amenities, setAmenities] = useState([]);
  const [newAmenity, setNewAmenity] = useState('');
  const [selectedGovernorate, setSelectedGovernorate] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedArea, setSelectedArea] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: '',
      description: '',
      developer: '',
      status: 'planning',
      isFeatured: false,
      launchDate: '',
      handoverDate: '',
    },
  });

  // Fetch developers
  const { data: developersData, isLoading: developersLoading } = useQuery(
    'developers-for-compound-form',
    async () => {
      const response = await developersAPI.getDevelopers({
        limit: 1000,
        sortBy: 'name',
        sortOrder: 'asc',
      });
      return response.data;
    },
    {
      staleTime: 10 * 60 * 1000,
      onError: (error) => {
        console.error('CompoundForm: developers fetch error', error);
        showError('Failed to load developers');
      },
    }
  );

  // Fetch governorates
  const { data: governoratesData, isLoading: governoratesLoading } = useQuery(
    'governorates-for-compound-form',
    async () => {
      const response = await governoratesAPI.getGovernorates({
        limit: 1000,
        sortBy: 'name',
        sortOrder: 'asc',
      });
      return response.data;
    },
    {
      staleTime: 10 * 60 * 1000,
      onError: (error) => {
        console.error('CompoundForm: governorates fetch error', error);
        showError('Failed to load governorates');
      },
    }
  );

  // Fetch cities for selected governorate
  const { data: citiesData, isLoading: citiesLoading } = useQuery(
    ['cities-for-compound-form', selectedGovernorate],
    async () => {
      if (!selectedGovernorate) return { cities: [] };
      const response = await citiesAPI.getCitiesByGovernorate(selectedGovernorate);
      return response.data;
    },
    {
      enabled: !!selectedGovernorate,
      staleTime: 10 * 60 * 1000,
      onError: (error) => {
        console.error('CompoundForm: cities fetch error', error);
        showError('Failed to load cities');
      },
    }
  );

  // Fetch areas for selected city
  const { data: areasData, isLoading: areasLoading } = useQuery(
    ['areas-for-compound-form', selectedCity],
    async () => {
      if (!selectedCity) return { areas: [] };
      const response = await areasAPI.getAreasByCity(selectedCity);
      return response.data;
    },
    {
      enabled: !!selectedCity,
      staleTime: 10 * 60 * 1000,
      onError: (error) => {
        console.error('CompoundForm: areas fetch error', error);
        showError('Failed to load areas');
      },
    }
  );

  useEffect(() => {
    if (compound && isEditing) {
      const developerId =
        typeof compound.developer === 'object' ? compound.developer?._id : compound.developer;
      const governorateId =
        typeof compound.governorate_ref === 'object'
          ? compound.governorate_ref?._id
          : compound.governorate_ref;
      const cityId =
        typeof compound.city_ref === 'object' ? compound.city_ref?._id : compound.city_ref;
      const areaId =
        typeof compound.area_ref === 'object' ? compound.area_ref?._id : compound.area_ref;

      reset({
        name: compound.name || '',
        description: compound.description || '',
        developer: developerId || '',
        status: compound.status || 'planning',
        isFeatured: Boolean(compound.isFeatured),
        launchDate: formatDateForInput(compound.launchDate),
        handoverDate: formatDateForInput(compound.handoverDate),
      });

      setAmenities(Array.isArray(compound.amenities) ? compound.amenities : []);
      setSelectedGovernorate(governorateId || '');
      setSelectedCity(cityId || '');
      setSelectedArea(areaId || '');

      if (compound.heroImage?.url) {
        setHeroImage({
          url: compound.heroImage.url,
          publicId: compound.heroImage.publicId,
          caption: compound.heroImage.caption || '',
        });
      } else {
        setHeroImage(null);
      }

      if (Array.isArray(compound.gallery)) {
        setGallery(
          compound.gallery
            .map((item, index) => ({
              url: item.url,
              publicId: item.publicId,
              caption: item.caption || '',
              order: typeof item.order === 'number' ? item.order : index,
              isHero: Boolean(item.isHero),
            }))
            .sort((a, b) => a.order - b.order)
        );
      } else {
        setGallery([]);
      }

      // Initialize brochure URL
      if (compound.metadata?.brochureUrl) {
        setBrochureUrl(compound.metadata.brochureUrl);
      } else {
        setBrochureUrl(null);
      }
    }
  }, [compound, isEditing, reset]);

  const createCompoundMutation = useMutation(
    (payload) => compoundsAPI.createCompound(payload),
    {
      onSuccess: () => {
        showSuccess('Compound created successfully');
        queryClient.invalidateQueries('admin-compounds');
        queryClient.invalidateQueries('compounds');
        onSave();
      },
      onError: (error) => {
        const message = error.response?.data?.message || 'Failed to create compound';
        showError(message);
      },
    }
  );

  const updateCompoundMutation = useMutation(
    ({ id, payload }) => compoundsAPI.updateCompound(id, payload),
    {
      onSuccess: () => {
        showSuccess('Compound updated successfully');
        queryClient.invalidateQueries('admin-compounds');
        queryClient.invalidateQueries('compounds');
        if (compound?._id) {
          queryClient.invalidateQueries(['compound', compound._id]);
        }
        onSave();
      },
      onError: (error) => {
        const message = error.response?.data?.message || 'Failed to update compound';
        showError(message);
      },
    }
  );

  const handleHeroUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setHeroUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('folder', 'basira-compounds');

      const response = await uploadsAPI.uploadImage(formData);
      const payload = response.data?.data || response.data?.image || response.data;
      const normalized = normalizeUploadedImage(payload);
      if (!normalized) {
        throw new Error('Hero upload missing image data');
      }
      setHeroImage({
        url: normalized.url,
        publicId: normalized.publicId,
        caption: '',
      });
      showSuccess('Hero image uploaded successfully');
    } catch (error) {
      console.error('Hero image upload error:', error);
      showError('Failed to upload hero image');
    } finally {
      setHeroUploading(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleGalleryUpload = async (event) => {
    const files = Array.from(event.target.files || []).filter(Boolean);
    if (files.length === 0) return;

    setGalleryUploading(true);
    try {
      const uploads = await Promise.allSettled(
        files.map(async (file) => {
          const formData = new FormData();
          formData.append('image', file);
          formData.append('folder', 'basira-compounds/gallery');

          const response = await uploadsAPI.uploadImage(formData);
          const payload = response.data?.data || response.data?.image || response.data;
          const normalized = normalizeUploadedImage(payload);
          if (!normalized) {
            throw new Error('Upload response missing gallery image data');
          }
          return normalized;
        })
      );

      const successful = uploads
        .filter((result) => result.status === 'fulfilled' && result.value)
        .map((result) => result.value);

      if (successful.length === 0) {
        showError('Failed to upload gallery images');
        return;
      }

      setGallery((prev) => {
        const combined = [...prev, ...successful];
        return combined.map((item, index) => ({
          ...item,
          order: index,
        }));
      });
      showSuccess(`${successful.length} image(s) uploaded to gallery`);
    } catch (error) {
      console.error('Gallery upload error:', error);
      showError('Failed to upload gallery images');
    } finally {
      setGalleryUploading(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const removeGalleryImage = (index) => {
    setGallery((prev) => prev.filter((_, idx) => idx !== index).map((item, idx) => ({
      ...item,
      order: idx,
    })));
  };

  const handleBrochureUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate PDF
    if (file.type !== 'application/pdf') {
      showError('Only PDF files are allowed for brochures');
      return;
    }

    setBrochureUploading(true);
    try {
      const formData = new FormData();
      formData.append('brochure', file);

      const response = await uploadsAPI.uploadBrochure(formData);
      const payload = response.data?.data || response.data;
      
      if (!payload?.url) {
        throw new Error('Brochure upload missing URL');
      }

      setBrochureUrl(payload.url);
      showSuccess('Brochure uploaded successfully');
    } catch (error) {
      console.error('Brochure upload error:', error);
      const message = error.response?.data?.message || 'Failed to upload brochure';
      showError(message);
    } finally {
      setBrochureUploading(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const addAmenity = () => {
    const trimmed = newAmenity.trim();
    if (!trimmed) return;
    if (amenities.includes(trimmed)) {
      showError('Amenity already added');
      return;
    }
    setAmenities((prev) => [...prev, trimmed]);
    setNewAmenity('');
  };

  const removeAmenity = (amenity) => {
    setAmenities((prev) => prev.filter((item) => item !== amenity));
  };

  const governorateOptions = governoratesData?.governorates || [];
  const citiesOptions = citiesData?.cities || [];
  const areasOptions = areasData?.areas || [];
  const developers = developersData?.developers || [];

  const isSubmitting =
    createCompoundMutation.isLoading || updateCompoundMutation.isLoading;

  const onSubmit = (data) => {
    const payload = {
      name: data.name.trim(),
      description: data.description?.trim() || undefined,
      developer: data.developer || undefined,
      status: data.status || 'planning',
      isFeatured: Boolean(data.isFeatured),
      launchDate: data.launchDate || undefined,
      handoverDate: data.handoverDate || undefined,
      amenities,
    };

    if (selectedGovernorate) payload.governorate_ref = selectedGovernorate;
    if (selectedCity) payload.city_ref = selectedCity;
    if (selectedArea) payload.area_ref = selectedArea;

    if (heroImage?.url) {
      payload.heroImage = {
        url: heroImage.url,
        ...(heroImage.publicId ? { publicId: heroImage.publicId } : {}),
        ...(heroImage.caption ? { caption: heroImage.caption } : {}),
      };
    }

    if (gallery.length > 0) {
      payload.gallery = gallery.map((item, index) => ({
        url: item.url,
        ...(item.publicId ? { publicId: item.publicId } : {}),
        ...(item.caption ? { caption: item.caption } : {}),
        order: typeof item.order === 'number' ? item.order : index,
        isHero: Boolean(item.isHero),
      }));
    }

    if (!payload.launchDate) delete payload.launchDate;
    if (!payload.handoverDate) delete payload.handoverDate;
    if (!payload.developer) delete payload.developer;
    if (payload.amenities.length === 0) delete payload.amenities;
    if (!payload.heroImage) delete payload.heroImage;
    if (!payload.gallery) delete payload.gallery;

    // Add metadata with brochure URL
    if (brochureUrl) {
      payload.metadata = {
        brochureUrl: brochureUrl,
      };
    }

    if (isEditing) {
      updateCompoundMutation.mutate({ id: compound._id, payload });
    } else {
      createCompoundMutation.mutate(payload);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl shadow-xl border border-slate-700/50 p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Compound Name *
            </label>
            <input
              {...register('name', {
                required: 'Compound name is required',
                maxLength: {
                  value: 150,
                  message: 'Name cannot exceed 150 characters',
                },
              })}
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400"
              placeholder="Enter compound name"
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Status
            </label>
            <Select
              value={watch('status') || 'planning'}
              onValueChange={(value) => setValue('status', value)}
            >
              <SelectTrigger className="w-full bg-slate-800/50 border border-slate-700/50 text-white">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Description
          </label>
          <textarea
            {...register('description', {
              maxLength: {
                value: 5001,
                message: 'Description cannot exceed 5001 characters',
              },
            })}
            rows={5}
            className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400"
            placeholder="Enter compound description"
          />
          {errors.description && (
            <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Developer
            </label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Select
                  value={watch('developer') || 'none'}
                  onValueChange={(value) => setValue('developer', value === 'none' ? '' : value)}
                  disabled={developersLoading}
                >
                  <SelectTrigger className="w-full bg-slate-800/50 border border-slate-700/50 text-white">
                    <SelectValue
                      placeholder={
                        developersLoading ? 'Loading developers...' : 'Select developer (optional)'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Developer</SelectItem>
                    {developersLoading ? (
                      <div className="px-2 py-1.5 text-sm text-slate-400">
                        Loading developers...
                      </div>
                    ) : developers.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-slate-400">
                        No developers found. Add one first!
                      </div>
                    ) : (
                      developers.map((dev) => (
                        <SelectItem key={dev._id} value={dev._id}>
                          {dev.name}
                        </SelectItem>
                      ))
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

          <div className="flex items-center gap-3 mt-2 md:mt-6">
            <input
              type="checkbox"
              id="isFeatured"
              checked={watch('isFeatured') || false}
              onChange={(event) => setValue('isFeatured', event.target.checked)}
              className="w-4 h-4 text-blue-600 bg-slate-800 border-slate-600 rounded"
            />
            <label htmlFor="isFeatured" className="text-sm font-medium text-slate-300">
              Feature this compound
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Launch Date
            </label>
            <input
              type="date"
              {...register('launchDate')}
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Handover Date
            </label>
            <input
              type="date"
              {...register('handoverDate')}
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Governorate
            </label>
            {governoratesLoading ? (
              <div className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-400">
                Loading governorates...
              </div>
            ) : (
              <Select
                value={selectedGovernorate}
                onValueChange={(value) => {
                  setSelectedGovernorate(value);
                  setSelectedCity('');
                  setSelectedArea('');
                }}
              >
                <SelectTrigger className="w-full bg-slate-800/50 border border-slate-700/50 text-white">
                  <SelectValue placeholder="Select governorate" />
                </SelectTrigger>
                <SelectContent>
                  {governorateOptions.map((gov) => (
                    <SelectItem key={gov._id} value={gov._id}>
                      {gov.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                City
              </label>
              {citiesLoading ? (
                <div className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-400">
                  Loading cities...
                </div>
              ) : (
                <Select
                  value={selectedCity}
                  onValueChange={(value) => {
                    setSelectedCity(value);
                    setSelectedArea('');
                  }}
                  disabled={!selectedGovernorate}
                >
                  <SelectTrigger className="w-full bg-slate-800/50 border border-slate-700/50 text-white">
                    <SelectValue
                      placeholder={selectedGovernorate ? 'Select city' : 'Select governorate first'}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {citiesOptions.map((city) => (
                      <SelectItem key={city._id} value={city._id}>
                        {city.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Area
              </label>
              {areasLoading ? (
                <div className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-400">
                  Loading areas...
                </div>
              ) : (
                <Select
                  value={selectedArea}
                  onValueChange={(value) => setSelectedArea(value)}
                  disabled={!selectedCity}
                >
                  <SelectTrigger className="w-full bg-slate-800/50 border border-slate-700/50 text-white">
                    <SelectValue
                      placeholder={selectedCity ? 'Select area' : 'Select city first'}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {areasOptions.map((area) => (
                      <SelectItem key={area._id} value={area._id}>
                        {area.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Amenities
          </label>
          <div className="flex items-center gap-3">
            <input
              value={newAmenity}
              onChange={(event) => setNewAmenity(event.target.value)}
              className="flex-1 px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400"
              placeholder="Enter amenity and press Add"
            />
            <button
              type="button"
              onClick={addAmenity}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Add
            </button>
          </div>
          {amenities.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {amenities.map((amenity) => (
                <span
                  key={amenity}
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/30 text-sm"
                >
                  {amenity}
                  <button
                    type="button"
                    className="text-blue-200 hover:text-white"
                    onClick={() => removeAmenity(amenity)}
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Hero Image */}
      <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl shadow-xl border border-slate-700/50 p-6 space-y-4">
        <h3 className="text-lg font-semibold text-white">Hero Image</h3>
        {heroImage ? (
          <div className="relative inline-block">
            <img
              src={heroImage.url}
              alt="Compound hero"
              className="w-full md:w-96 aspect-video object-cover rounded-lg border border-slate-700/50"
            />
            <button
              type="button"
              onClick={() => setHeroImage(null)}
              className="absolute -top-2 -right-2 p-1 rounded-full bg-red-600 hover:bg-red-700 text-white"
              title="Remove hero image"
            >
              <FiX className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-slate-600 border-dashed rounded-lg cursor-pointer bg-slate-800/50 hover:bg-slate-700/50">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <FiUpload className="w-8 h-8 mb-2 text-slate-400" />
              <p className="mb-2 text-sm text-slate-400">
                <span className="font-semibold">Click to upload</span> hero image
              </p>
              <p className="text-xs text-slate-400">PNG, JPG (recommended: 1200x600px)</p>
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleHeroUpload}
              disabled={heroUploading}
              className="hidden"
            />
          </label>
        )}
        {heroUploading && <p className="text-sm text-blue-400">Uploading hero image...</p>}
      </div>

      {/* Gallery */}
      <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl shadow-xl border border-slate-700/50 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Gallery Images</h3>
          <label className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition-colors">
            <FiUpload className="w-4 h-4" />
            <span>Upload Images</span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleGalleryUpload}
              disabled={galleryUploading}
              className="hidden"
            />
          </label>
        </div>
        {galleryUploading && <p className="text-sm text-blue-400">Uploading gallery images...</p>}
        {gallery.length === 0 ? (
          <p className="text-sm text-slate-400">
            No gallery images uploaded yet. Upload images to showcase the compound.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {gallery.map((image, index) => (
              <div
                key={`${image.url}-${index}`}
                className="relative rounded-lg overflow-hidden border border-slate-700/50"
              >
                <img
                  src={image.url}
                  alt={`Compound gallery ${index + 1}`}
                  className="w-full h-40 object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeGalleryImage(index)}
                  className="absolute top-2 right-2 p-1 rounded-full bg-red-600/90 hover:bg-red-700 text-white"
                  title="Remove image"
                >
                  <FiTrash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Brochure Upload */}
      <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl shadow-xl border border-slate-700/50 p-6 space-y-4">
        <h3 className="text-lg font-semibold text-white">Brochure (PDF)</h3>
        {brochureUrl ? (
          <div className="flex items-center gap-4 p-4 bg-slate-800/50 border border-slate-700/50 rounded-lg">
            <FiFileText className="w-8 h-8 text-blue-400" />
            <div className="flex-1">
              <p className="text-sm text-slate-300 font-medium">Brochure uploaded</p>
              <a
                href={brochureUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 mt-1"
              >
                View brochure
                <FiDownload className="w-3 h-3" />
              </a>
            </div>
            <button
              type="button"
              onClick={() => setBrochureUrl(null)}
              className="p-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 transition-colors"
              title="Remove brochure"
            >
              <FiX className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-600 border-dashed rounded-lg cursor-pointer bg-slate-800/50 hover:bg-slate-700/50">
            <div className="flex flex-col items-center justify-center pt-4 pb-4">
              <FiUpload className="w-8 h-8 mb-2 text-slate-400" />
              <p className="mb-2 text-sm text-slate-400">
                <span className="font-semibold">Click to upload</span> brochure (PDF)
              </p>
              <p className="text-xs text-slate-400">Maximum file size: 5MB</p>
            </div>
            <input
              type="file"
              accept="application/pdf"
              onChange={handleBrochureUpload}
              disabled={brochureUploading}
              className="hidden"
            />
          </label>
        )}
        {brochureUploading && <p className="text-sm text-blue-400">Uploading brochure...</p>}
      </div>

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
          disabled={isSubmitting}
          className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (isEditing ? 'Updating...' : 'Creating...') : isEditing ? 'Update Compound' : 'Create Compound'}
        </button>
      </div>
    </form>
  );
};

export default CompoundForm;


