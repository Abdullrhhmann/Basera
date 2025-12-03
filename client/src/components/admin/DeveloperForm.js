import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { FiUpload, FiX } from '../../icons/feather';
import { useMutation, useQueryClient } from 'react-query';
import { developersAPI, uploadsAPI } from '../../utils/api';
import { showSuccess, showError } from '../../utils/sonner';

const DeveloperForm = ({ developer, onSave, onCancel, isEditing = false }) => {
  const [logo, setLogo] = useState(null);
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const { register, handleSubmit, formState: { errors }, setValue, reset } = useForm({
    defaultValues: {
      name: '',
      logo: '',
      description: ''
    }
  });

  // Initialize form with developer data if editing
  useEffect(() => {
    if (developer && isEditing) {
      reset();
      if (developer.name) setValue('name', developer.name);
      if (developer.logo) {
        setValue('logo', developer.logo);
        setLogo(developer.logo);
      }
      if (developer.description) setValue('description', developer.description);
    }
  }, [developer, isEditing, setValue, reset]);

  // Mutations
  const createDeveloperMutation = useMutation(
    (developerData) => developersAPI.createDeveloper(developerData),
    {
      onSuccess: () => {
        showSuccess('Developer created successfully');
        queryClient.invalidateQueries('admin-developers');
        queryClient.invalidateQueries('developers');
        onSave();
      },
      onError: (error) => {
        const message = error.response?.data?.message || 'Failed to create developer';
        showError(message);
      }
    }
  );

  const updateDeveloperMutation = useMutation(
    ({ id, developerData }) => developersAPI.updateDeveloper(id, developerData),
    {
      onSuccess: () => {
        showSuccess('Developer updated successfully');
        queryClient.invalidateQueries('admin-developers');
        queryClient.invalidateQueries('developers');
        onSave();
      },
      onError: (error) => {
        const message = error.response?.data?.message || 'Failed to update developer';
        showError(message);
      }
    }
  );

  const handleLogoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('folder', 'basira-developers');

      const response = await uploadsAPI.uploadImage(formData);
      const uploadedUrl = response.data?.data?.secure_url || response.data?.data?.url || response.data?.image?.url;

      if (uploadedUrl) {
        setLogo(uploadedUrl);
        setValue('logo', uploadedUrl);
        showSuccess('Logo uploaded successfully');
      } else {
        throw new Error('Upload response missing URL');
      }
    } catch (error) {
      console.error('Logo upload error:', error);
      showError('Failed to upload logo');
    } finally {
      setUploading(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const removeLogo = () => {
    setLogo(null);
    setValue('logo', '');
  };

  const onSubmit = (data) => {
    const developerData = {
      name: data.name.trim(),
      logo: data.logo || '',
      description: data.description?.trim() || ''
    };

    if (isEditing) {
      updateDeveloperMutation.mutate({ id: developer._id, developerData });
    } else {
      createDeveloperMutation.mutate(developerData);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic Information */}
      <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl shadow-xl border border-slate-700/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Developer Information</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Developer Name *</label>
            <input
              {...register('name', { 
                required: 'Developer name is required',
                maxLength: { value: 100, message: 'Name cannot exceed 100 characters' }
              })}
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400"
              placeholder="Enter developer name"
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
            <textarea
              {...register('description', {
                maxLength: { value: 1000, message: 'Description cannot exceed 1000 characters' }
              })}
              rows={4}
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400"
              placeholder="Enter developer description (optional)"
            />
            {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>}
          </div>
        </div>
      </div>

      {/* Logo Upload */}
      <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl shadow-xl border border-slate-700/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Developer Logo</h3>
        
        {logo ? (
          <div className="space-y-4">
            <div className="relative inline-block">
              <img
                src={logo}
                alt="Developer logo"
                className="w-32 h-32 object-contain bg-white rounded-lg p-2"
              />
              <button
                type="button"
                onClick={removeLogo}
                className="absolute -top-2 -right-2 p-1 rounded-full bg-red-600 hover:bg-red-700 text-white"
                title="Remove Logo"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center w-full">
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-600 border-dashed rounded-lg cursor-pointer bg-slate-800/50 hover:bg-slate-700/50">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <FiUpload className="w-8 h-8 mb-2 text-slate-400" />
                <p className="mb-2 text-sm text-slate-400">
                  <span className="font-semibold">Click to upload</span> developer logo
                </p>
                <p className="text-xs text-slate-400">PNG, JPG, SVG (recommended: 200x200px)</p>
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>
        )}
        {uploading && <p className="text-sm text-blue-400 mt-2">Uploading logo...</p>}
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
          disabled={createDeveloperMutation.isLoading || updateDeveloperMutation.isLoading}
          className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {(createDeveloperMutation.isLoading || updateDeveloperMutation.isLoading)
            ? (isEditing ? 'Updating...' : 'Creating...')
            : (isEditing ? 'Update Developer' : 'Create Developer')
          }
        </button>
      </div>
    </form>
  );
};

export default DeveloperForm;

