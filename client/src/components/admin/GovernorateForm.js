import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from 'react-query';
import { governoratesAPI } from '../../utils/api';
import { showSuccess, showError } from '../../utils/sonner';

const GovernorateForm = ({ governorate, onSave, onCancel, isEditing = false }) => {
  const queryClient = useQueryClient();

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm({
    defaultValues: {
      name: '',
      annualAppreciationRate: 0,
      description: ''
    }
  });

  // Initialize form with governorate data if editing
  useEffect(() => {
    if (governorate && isEditing) {
      reset();
      if (governorate.name) setValue('name', governorate.name);
      if (governorate.annualAppreciationRate !== undefined) setValue('annualAppreciationRate', governorate.annualAppreciationRate);
      if (governorate.description) setValue('description', governorate.description);
    }
  }, [governorate, isEditing, setValue, reset]);

  // Mutations
  const createGovernorateMutation = useMutation(
    (governorateData) => governoratesAPI.createGovernorate(governorateData),
    {
      onSuccess: () => {
        showSuccess('Governorate created successfully');
        queryClient.invalidateQueries('admin-governorates');
        queryClient.invalidateQueries('governorates');
        onSave();
      },
      onError: (error) => {
        const message = error.response?.data?.message || 'Failed to create governorate';
        showError(message);
      }
    }
  );

  const updateGovernorateMutation = useMutation(
    ({ id, governorateData }) => governoratesAPI.updateGovernorate(id, governorateData),
    {
      onSuccess: () => {
        showSuccess('Governorate updated successfully');
        queryClient.invalidateQueries('admin-governorates');
        queryClient.invalidateQueries('governorates');
        onSave();
      },
      onError: (error) => {
        const message = error.response?.data?.message || 'Failed to update governorate';
        showError(message);
      }
    }
  );

  const onSubmit = async (data) => {
    try {
      const governorateData = {
        name: data.name,
        annualAppreciationRate: parseFloat(data.annualAppreciationRate),
        description: data.description || ''
      };

      if (isEditing) {
        await updateGovernorateMutation.mutateAsync({ id: governorate._id, governorateData });
      } else {
        await createGovernorateMutation.mutateAsync(governorateData);
      }
    } catch (error) {
      console.error('Governorate form submission error:', error);
    }
  };

  const isSubmitting = createGovernorateMutation.isLoading || updateGovernorateMutation.isLoading;

  return (
    <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-xl shadow-xl p-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Governorate Name */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Governorate Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            {...register('name', {
              required: 'Governorate name is required',
              maxLength: {
                value: 100,
                message: 'Governorate name cannot exceed 100 characters'
              }
            })}
            className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400"
            placeholder="e.g., Cairo, Giza, Alexandria"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-400">{errors.name.message}</p>
          )}
        </div>

        {/* Annual Appreciation Rate */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Annual Appreciation Rate (%) <span className="text-red-400">*</span>
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="100"
            {...register('annualAppreciationRate', {
              required: 'Appreciation rate is required',
              min: {
                value: 0,
                message: 'Appreciation rate cannot be negative'
              },
              max: {
                value: 100,
                message: 'Appreciation rate cannot exceed 100%'
              }
            })}
            className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400"
            placeholder="e.g., 7.5"
          />
          {errors.annualAppreciationRate && (
            <p className="mt-1 text-sm text-red-400">{errors.annualAppreciationRate.message}</p>
          )}
          <p className="mt-1 text-xs text-slate-400">
            Expected annual property value appreciation in this governorate
          </p>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Description
          </label>
          <textarea
            {...register('description', {
              maxLength: {
                value: 500,
                message: 'Description cannot exceed 500 characters'
              }
            })}
            rows={4}
            className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400"
            placeholder="Brief description of the governorate..."
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-400">{errors.description.message}</p>
          )}
          <p className="mt-1 text-xs text-slate-400">
            {watch('description')?.length || 0} / 500 characters
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-4 pt-4 border-t border-slate-700/50">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                {isEditing ? 'Updating...' : 'Creating...'}
              </span>
            ) : (
              isEditing ? 'Update Governorate' : 'Create Governorate'
            )}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-6 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default GovernorateForm;

