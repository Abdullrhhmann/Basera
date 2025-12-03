import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { FiUpload, FiX } from '../../icons/feather';
import { uploadsAPI } from '../../utils/api';
import { showSuccess, showError } from '../../utils/sonner';
import { Select, SelectContent, SelectItem, SelectTrigger } from '../ui/shadcn/select';

const PROPERTY_TYPE_OPTIONS = [
  'Villa',
  'Apartment',
  'Townhouse',
  'Penthouse',
  'Duplex',
  'Studio',
  'Commercial',
  'Land',
];

const LaunchForm = ({ initialData, onSubmit, isSubmitting, submitButtonText = 'Save Launch' }) => {
  const { register, handleSubmit, formState: { errors }, reset, control } = useForm({
    defaultValues: initialData || {}
  });

  const [image, setImage] = useState(initialData?.image || '');
  const [images, setImages] = useState(initialData?.images || []);
  const [uploading, setUploading] = useState(false);
  const [nearbyFacilities, setNearbyFacilities] = useState(initialData?.nearbyFacilities || []);
  const [paymentPlans, setPaymentPlans] = useState(initialData?.paymentPlans || []);

  // Normalize uploaded image data
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
      width: data.width,
      height: data.height,
    };
  };

  // Reset form when initialData changes
  useEffect(() => {
    if (initialData) {
      reset(initialData);
      setImage(initialData.image || '');
      setImages(initialData.images || []);
      setNearbyFacilities(initialData.nearbyFacilities || []);
      setPaymentPlans(initialData.paymentPlans || []);
    }
  }, [initialData, reset]);

  const handleImageUpload = async (event) => {
    const files = Array.from(event.target.files || []).filter(Boolean);
    if (files.length === 0) return;

    setUploading(true);

    try {
      const uploadResults = await Promise.allSettled(
        files.map(async (file) => {
          const formData = new FormData();
          formData.append('image', file);
          formData.append('folder', 'basira-launches');

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
            showError(`Failed to upload ${file.name}: ${message}`);
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
          return combined;
        });

        showSuccess(`Successfully uploaded ${successfulUploads.length} image(s)`);
      }

      if (failedUploads.length > 0) {
        showError(`Failed to upload ${failedUploads.length} image(s)`);
      }
    } catch (error) {
      console.error('Image upload error:', error);
      showError('Failed to upload images');
    } finally {
      setUploading(false);
      // Reset the input
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handlePrimaryImageUpload = async (event) => {
    const files = Array.from(event.target.files || []).filter(Boolean);
    if (files.length === 0) return;

    setUploading(true);

    try {
      const file = files[0]; // Only take the first file for primary image
      const formData = new FormData();
      formData.append('image', file);
      formData.append('folder', 'basira-launches');

      const response = await uploadsAPI.uploadImage(formData);
      const payload = response.data?.data || response.data?.image || response.data;
      const image = normalizeUploadedImage(payload);

      if (!image) {
        throw new Error('Upload response missing required image data');
      }

      setImage(image.url);
      showSuccess('Primary image uploaded successfully');
    } catch (error) {
      const message = error?.response?.data?.message || error.message || 'Upload failed';
      showError(`Failed to upload primary image: ${message}`);
    } finally {
      setUploading(false);
      // Reset the input
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const setHeroImage = (index) => {
    setImages(prev => prev.map((img, i) => ({
      ...img,
      isHero: i === index
    })));
  };


  // Nearby facilities and payment plans functionality can be added later if needed

  const onFormSubmit = (data) => {
    if (!image) {
      showError('Primary image is required');
      return;
    }

    const formData = {
      ...data,
      image,
      images: images.map(img => img.url || img), // Extract URLs from image objects
      nearbyFacilities: nearbyFacilities.filter(f => f.name.trim() !== ''),
      paymentPlans: paymentPlans.filter(p => p.name.trim() !== ''),
      launchDate: new Date(data.launchDate).toISOString(),
      startingPrice: parseFloat(data.startingPrice),
      area: parseFloat(data.area),
    };

    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-8">
      {/* Basic Information */}
      <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl shadow-xl border border-slate-700/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Basic Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Title *
            </label>
            <input
              type="text"
              {...register('title', { required: 'Title is required' })}
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400"
              placeholder="Enter launch title"
            />
            {errors.title && <p className="mt-1 text-sm text-red-400">{errors.title.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Developer *
            </label>
            <input
              type="text"
              {...register('developer', { required: 'Developer is required' })}
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400"
              placeholder="Enter developer name"
            />
            {errors.developer && <p className="mt-1 text-sm text-red-400">{errors.developer.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Location *
            </label>
            <input
              type="text"
              {...register('location', { required: 'Location is required' })}
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400"
              placeholder="Enter location"
            />
            {errors.location && <p className="mt-1 text-sm text-red-400">{errors.location.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Property Type *
            </label>
            <Controller
              name="propertyType"
              control={control}
              rules={{ required: 'Property type is required' }}
              render={({ field }) => (
                <Select value={field.value || 'none'} onValueChange={(v) => field.onChange(v === 'none' ? '' : v)}>
                  <SelectTrigger className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:ring-2 focus:ring-blue-500 h-auto">
                    <span>{field.value || 'Select property type'}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select property type</SelectItem>
                    {PROPERTY_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.propertyType && <p className="mt-1 text-sm text-red-400">{errors.propertyType.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Status *
            </label>
            <Controller
              name="status"
              control={control}
              rules={{ required: 'Status is required' }}
              render={({ field }) => (
                <Select value={field.value || 'none'} onValueChange={(v) => field.onChange(v === 'none' ? '' : v)}>
                  <SelectTrigger className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:ring-2 focus:ring-blue-500 h-auto">
                    <span>{field.value || 'Select status'}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select status</SelectItem>
                    <SelectItem value="Available">Available</SelectItem>
                    <SelectItem value="Coming Soon">Coming Soon</SelectItem>
                    <SelectItem value="Pre-Launch">Pre-Launch</SelectItem>
                    <SelectItem value="Sold Out">Sold Out</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.status && <p className="mt-1 text-sm text-red-400">{errors.status.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Launch Date *
            </label>
            <input
              type="date"
              {...register('launchDate', { required: 'Launch date is required' })}
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
            />
            {errors.launchDate && <p className="mt-1 text-sm text-red-400">{errors.launchDate.message}</p>}
          </div>
        </div>
      </div>

      {/* Pricing Information */}
      <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl shadow-xl border border-slate-700/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Pricing Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Starting Price *
            </label>
            <input
              type="number"
              step="0.01"
              {...register('startingPrice', { required: 'Starting price is required', min: 0 })}
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400"
              placeholder="0.00"
            />
            {errors.startingPrice && <p className="mt-1 text-sm text-red-400">{errors.startingPrice.message}</p>}
          </div>


          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Area *
            </label>
            <div className="flex">
              <input
                type="number"
                step="0.01"
                {...register('area', { required: 'Area is required', min: 0 })}
                className="flex-1 px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400"
                placeholder="0.00"
              />
              <Controller
                name="areaUnit"
                control={control}
                rules={{ required: 'Area unit is required' }}
                defaultValue="sqm"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-24 px-3 py-2 bg-slate-800/50 border border-l-0 border-slate-700/50 rounded-r-lg text-white focus:ring-2 focus:ring-blue-500 h-auto">
                      <span>{field.value}</span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sqm">sqm</SelectItem>
                      <SelectItem value="sqft">sqft</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            {errors.area && <p className="mt-1 text-sm text-red-400">{errors.area.message}</p>}
          </div>
        </div>
      </div>


      {/* Descriptions */}
      <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl shadow-xl border border-slate-700/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Descriptions</h3>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Short Description *
            </label>
            <textarea
              rows="3"
              {...register('description', { required: 'Description is required' })}
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400"
              placeholder="Enter short description"
            />
            {errors.description && <p className="mt-1 text-sm text-red-400">{errors.description.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Detailed Content *
            </label>
            <textarea
              rows="6"
              {...register('content', { required: 'Content is required' })}
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400"
              placeholder="Enter detailed content"
            />
            {errors.content && <p className="mt-1 text-sm text-red-400">{errors.content.message}</p>}
          </div>
        </div>
      </div>

      {/* Images */}
      <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl shadow-xl border border-slate-700/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Images</h3>
        
        {/* Primary Image */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Primary Image *
          </label>
          <div className="flex items-center justify-center w-full">
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-600 border-dashed rounded-lg cursor-pointer bg-slate-800/50 hover:bg-slate-700/50">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <FiUpload className="w-8 h-8 mb-2 text-slate-400" />
                <p className="mb-2 text-sm text-slate-300">
                  <span className="font-semibold">Click to upload primary image</span>
                </p>
                <p className="text-xs text-slate-400">PNG, JPG, GIF up to 10MB</p>
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handlePrimaryImageUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>
          {image && (
            <div className="mt-4">
              <img
                src={image}
                alt="Primary launch"
                className="w-32 h-24 object-cover rounded-lg"
              />
              <button
                type="button"
                onClick={() => setImage('')}
                className="mt-2 text-sm text-red-400 hover:text-red-300"
              >
                Remove
              </button>
            </div>
          )}
          {!image && (
            <p className="mt-1 text-sm text-red-400">Primary image is required</p>
          )}
        </div>

        {/* Additional Images */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Additional Images
          </label>
          <div className="flex items-center justify-center w-full">
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-600 border-dashed rounded-lg cursor-pointer bg-slate-800/50 hover:bg-slate-700/50">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <FiUpload className="w-8 h-8 mb-2 text-slate-400" />
                <p className="mb-2 text-sm text-slate-300">
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
            {images.map((image, index) => (
              <div key={index} className="relative group">
                <img
                  src={image.url || image}
                  alt={`Launch ${index + 1}`}
                  className="w-full h-24 object-cover rounded-lg"
                />
                <div className="absolute inset-0 bg-[#131c2b] bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setHeroImage(index)}
                    className={`p-1 rounded text-white ${
                      image.isHero ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                    title={image.isHero ? 'Hero Image' : 'Set as Hero'}
                  >
                    {image.isHero ? '✓' : '★'}
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
                {image.isHero && (
                  <div className="absolute top-1 left-1 bg-green-600 text-white text-xs px-2 py-1 rounded">
                    Hero
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>


      {/* Contact Information */}
      <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl shadow-xl border border-slate-700/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Contact Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Phone
            </label>
            <input
              type="tel"
              {...register('contactInfo.phone')}
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400"
              placeholder="Enter phone number"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Email
            </label>
            <input
              type="email"
              {...register('contactInfo.email')}
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400"
              placeholder="Enter email address"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Website
            </label>
            <input
              type="url"
              {...register('contactInfo.website')}
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400"
              placeholder="Enter website URL"
            />
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="px-6 py-2 border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-700/50 hover:text-white transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Saving...' : submitButtonText}
        </button>
      </div>
    </form>
  );
};

export default LaunchForm;
