import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useForm } from 'react-hook-form';
import { useMutation } from 'react-query';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../../components/layout/PageLayout';
import { propertiesAPI, uploadsAPI } from '../../utils/api';
import { showSuccess, showError } from '../../utils/sonner';
import { FiArrowRight, FiInfo, FiUpload, FiTrash2 } from '../../icons/feather';

const PROPERTY_TYPES = [
  { value: 'apartment', label: 'Apartment' },
  { value: 'villa', label: 'Villa' },
  { value: 'twin-villa', label: 'Twin Villa' },
  { value: 'duplex', label: 'Duplex' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'land', label: 'Land' },
];

const enforceHeroImage = (list) =>
  list.map((image, index) => ({ ...image, isHero: index === 0 }));

const SubmitProperty = () => {
  const navigate = useNavigate();
  const [images, setImages] = useState([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const MAX_IMAGES = 6;
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      title: '',
      description: '',
      type: 'apartment',
      status: 'for-sale',
      price: '',
      currency: 'EGP',
      address: '',
      city: '',
      state: '',
      country: 'Egypt',
      area: '',
      bedrooms: '',
      bathrooms: '',
      floors: 1,
      parking: 0,
      furnished: 'unfurnished',
    },
  });

  const submissionMutation = useMutation(
    (payload) => propertiesAPI.createProperty(payload),
    {
      onSuccess: () => {
        showSuccess('Thanks! Your property was submitted for review.');
        reset();
        setImages([]);
        navigate('/profile', { replace: false });
      },
      onError: (error) => {
        const serverMessage =
          error.response?.data?.message ||
          error.response?.data?.errors?.[0]?.msg;
        showError(serverMessage || 'Unable to submit property right now.');
      },
    }
  );

  const handleImageUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const remainingSlots = MAX_IMAGES - images.length;
    if (remainingSlots <= 0) {
      showError(`You can upload up to ${MAX_IMAGES} images.`);
      event.target.value = '';
      return;
    }

    const filesToUpload = files.slice(0, remainingSlots);
    setIsUploadingImages(true);

    try {
      const results = await Promise.allSettled(
        filesToUpload.map(async (file) => {
          const formData = new FormData();
          formData.append('image', file);
          formData.append('folder', 'basira-user-properties');

          const response = await uploadsAPI.uploadImage(formData);
          const payload = response.data?.data || response.data?.image || response.data;
          const url = payload?.secure_url || payload?.url;
          const publicId = payload?.public_id || payload?.publicId;

          if (!url) {
            throw new Error('Upload response missing URL');
          }

          return {
            url,
            publicId,
            isHero: false,
          };
        })
      );

      const successful = results
        .filter((result) => result.status === 'fulfilled')
        .map((result) => result.value);

      if (successful.length) {
        setImages((prev) => {
          const next = [...prev, ...successful].slice(0, MAX_IMAGES);
          return enforceHeroImage(next);
        });
        showSuccess(
          successful.length === 1
            ? 'Image uploaded successfully.'
            : `${successful.length} images uploaded successfully.`
        );
      }

      const failedCount = results.filter((result) => result.status === 'rejected').length;
      if (failedCount) {
        showError(
          failedCount === 1
            ? 'One image failed to upload.'
            : `${failedCount} images failed to upload.`
        );
      }
    } catch (error) {
      console.error('Image upload error:', error);
      showError('Failed to upload images. Please try again.');
    } finally {
      setIsUploadingImages(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const removeImage = async (imageIndex) => {
    const image = images[imageIndex];
    setImages((prev) => {
      const next = prev.filter((_, idx) => idx !== imageIndex);
      return enforceHeroImage(next);
    });

    if (image?.publicId) {
      try {
        await uploadsAPI.deleteImage(image.publicId);
      } catch (error) {
        console.warn('Failed to delete image from Cloudinary:', error?.message);
      }
    }
  };

  const onSubmit = handleSubmit((values) => {
    if (!images.length) {
      showError('Please upload at least one property image.');
      return;
    }

    const payload = {
      title: values.title.trim(),
      description: values.description.trim(),
      type: values.type,
      status: values.status,
      price: Number(values.price),
      currency: values.currency,
      location: {
        address: values.address.trim(),
        city: values.city.trim(),
        state: values.state.trim(),
        country: values.country.trim() || 'Egypt',
      },
      specifications: {
        bedrooms: values.bedrooms ? Number(values.bedrooms) : 0,
        bathrooms: values.bathrooms ? Number(values.bathrooms) : 0,
        area: Number(values.area),
        areaUnit: 'sqm',
        floors: values.floors ? Number(values.floors) : 1,
        parking: values.parking ? Number(values.parking) : 0,
        furnished: values.furnished || 'unfurnished',
      },
      images: images.map((image, index) => ({
        url: image.url,
        publicId: image.publicId,
        isHero: index === 0,
        order: index,
      })),
    };

    submissionMutation.mutate(payload);
  });

  return (
    <>
      <Helmet>
        <title>Submit a Property | Basira</title>
        <meta
          name="description"
          content="Logged-in owners can submit their properties for review by the Basira team."
        />
      </Helmet>

      <PageLayout showMobileNav>
        <div className="min-h-screen bg-[#0d1729] relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-10 right-16 w-64 h-64 bg-basira-gold/15 rounded-full blur-3xl" />
            <div className="absolute bottom-10 left-8 w-72 h-72 bg-blue-500/15 rounded-full blur-[110px]" />
          </div>

          <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-16">
            <header className="text-center mb-10">
              <p className="text-basira-gold uppercase tracking-[0.4em] text-xs font-semibold mb-4">
                Submit Property
              </p>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Share your property with Basira
              </h1>
              <p className="text-gray-300 max-w-2xl mx-auto">
                Fill in the essential details below. Our advisory team will
                review the listing and publish it once it’s approved. You will
                receive an update via your registered email.
              </p>
            </header>

            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
              <div className="mb-6 flex items-start gap-3 bg-yellow-500/10 border border-yellow-500/40 text-yellow-100 rounded-2xl p-4">
                <FiInfo className="w-5 h-5 mt-1 shrink-0" />
                <p className="text-sm leading-relaxed">
                  Submissions from regular users are marked as{' '}
                  <strong>pending</strong>. A Basira admin will approve or
                  decline the listing within 1–2 business days.
                </p>
              </div>

              <form className="space-y-6" onSubmit={onSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-200 mb-2">
                      Title
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Contemporary villa in New Cairo"
                      className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-basira-gold focus:border-basira-gold transition"
                      {...register('title', {
                        required: 'Title is required',
                        minLength: { value: 5, message: 'Min 5 characters' },
                      })}
                    />
                    {errors.title && (
                      <p className="text-red-400 text-xs mt-1">
                        {errors.title.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-200 mb-2">
                      Property Type
                    </label>
                    <select
                      className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-white focus:ring-2 focus:ring-basira-gold focus:border-basira-gold transition capitalize"
                      {...register('type')}
                    >
                      {PROPERTY_TYPES.map((option) => (
                        <option
                          key={option.value}
                          value={option.value}
                          className="text-black"
                        >
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-200 mb-2">
                      Asking Price (EGP)
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="Example: 3500000"
                      className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-basira-gold focus:border-basira-gold transition"
                      {...register('price', {
                        required: 'Price is required',
                        valueAsNumber: true,
                        min: { value: 0, message: 'Price must be positive' },
                      })}
                    />
                    {errors.price && (
                      <p className="text-red-400 text-xs mt-1">
                        {errors.price.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-200 mb-2">
                      Area (sqm)
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="Example: 250"
                      className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-basira-gold focus:border-basira-gold transition"
                      {...register('area', {
                        required: 'Area is required',
                        valueAsNumber: true,
                        min: { value: 1, message: 'Area must be positive' },
                      })}
                    />
                    {errors.area && (
                      <p className="text-red-400 text-xs mt-1">
                        {errors.area.message}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-200 mb-2">
                    Full Address
                  </label>
                    <input
                      type="text"
                      placeholder="Street name, building number..."
                      className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-basira-gold focus:border-basira-gold transition"
                      {...register('address', {
                        required: 'Address is required',
                      })}
                    />
                    {errors.address && (
                      <p className="text-red-400 text-xs mt-1">
                        {errors.address.message}
                      </p>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-200 mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      placeholder="City"
                      className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-basira-gold focus:border-basira-gold transition"
                      {...register('city')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-200 mb-2">
                      State / Governorate
                    </label>
                    <input
                      type="text"
                      placeholder="Governorate"
                      className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-basira-gold focus:border-basira-gold transition"
                      {...register('state')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-200 mb-2">
                      Country
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-basira-gold focus:border-basira-gold transition"
                      {...register('country')}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-200 mb-2">
                      Bedrooms
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-basira-gold focus:border-basira-gold transition"
                      {...register('bedrooms')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-200 mb-2">
                      Bathrooms
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-basira-gold focus:border-basira-gold transition"
                      {...register('bathrooms')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-200 mb-2">
                      Furnishing
                    </label>
                    <select
                      className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-white focus:ring-2 focus:ring-basira-gold focus:border-basira-gold transition capitalize"
                      {...register('furnished')}
                    >
                      <option value="unfurnished" className="text-black">
                        Unfurnished
                      </option>
                      <option value="semi-furnished" className="text-black">
                        Semi-Furnished
                      </option>
                      <option value="furnished" className="text-black">
                        Furnished
                      </option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-200 mb-2">
                    Property Images
                  </label>
                  <p className="text-xs text-gray-400 mb-3">
                    Upload up to {MAX_IMAGES} high-quality images. The first photo becomes the
                    hero image on approval.
                  </p>
                  <div className="flex flex-col gap-3">
                    <label className="border border-dashed border-white/20 rounded-2xl px-4 py-6 flex flex-col items-center justify-center text-center text-gray-400 hover:border-basira-gold/60 hover:text-white transition cursor-pointer">
                      <FiUpload className="w-6 h-6 mb-2" />
                      <span className="text-sm font-semibold">Click to upload</span>
                      <span className="text-xs text-gray-500">
                        JPG or PNG, up to 5MB each
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleImageUpload}
                        disabled={isUploadingImages || images.length >= MAX_IMAGES}
                      />
                    </label>
                    {isUploadingImages && (
                      <p className="text-xs text-gray-400">Uploading images...</p>
                    )}
                    {images.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {images.map((image, idx) => (
                          <div
                            key={image.publicId || image.url}
                            className="relative group rounded-2xl overflow-hidden border border-white/10"
                          >
                            <img
                              src={image.url}
                              alt={`Upload ${idx + 1}`}
                              className="w-full h-32 object-cover"
                            />
                            {idx === 0 && (
                              <span className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded-full">
                                Hero
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => removeImage(idx)}
                              className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition"
                            >
                              <FiTrash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <FiUpload className="w-4 h-4" />
                        <span>No images uploaded yet.</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-200 mb-2">
                    Description
                  </label>
                  <textarea
                    rows="4"
                    placeholder="Help buyers understand the highlights of your property (neighborhood perks, finishing quality, payment terms...)"
                    className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-basira-gold focus:border-basira-gold transition resize-none"
                    {...register('description', {
                      required: 'Description is required',
                      minLength: {
                        value: 20,
                        message: 'Minimum 20 characters',
                      },
                    })}
                  />
                  {errors.description && (
                    <p className="text-red-400 text-xs mt-1">
                      {errors.description.message}
                    </p>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submissionMutation.isLoading}
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-gradient-to-r from-basira-gold to-yellow-400 text-black font-semibold uppercase tracking-[0.2em] shadow-lg hover:shadow-basira-gold/40 transition disabled:opacity-70"
                  >
                    {submissionMutation.isLoading ? 'Submitting...' : 'Submit for Review'}
                    <FiArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </PageLayout>
    </>
  );
};

export default SubmitProperty;


