import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { citiesAPI, governoratesAPI } from '../../utils/api';
import { showSuccess, showError } from '../../utils/sonner';
import { Select, SelectContent, SelectItem, SelectTrigger } from '../ui/shadcn/select';

const CityForm = ({ city, onSave, onCancel, isEditing = false }) => {
  const queryClient = useQueryClient();

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset, control } = useForm({
    defaultValues: {
      name: '',
      governorate: '',
      annualAppreciationRate: 0,
      description: ''
    }
  });

  // Fetch governorates
  const { data: governoratesData } = useQuery(
    'governorates',
    () => governoratesAPI.getGovernorates({ limit: 100 }).then(res => res.data),
    {
      staleTime: 5 * 60 * 1000
    }
  );

  // Initialize form with city data if editing
  useEffect(() => {
    if (city && isEditing) {
      reset();
      if (city.name) setValue('name', city.name);
      if (city.governorate?._id) setValue('governorate', city.governorate._id);
      if (city.governorate && typeof city.governorate === 'string') setValue('governorate', city.governorate);
      if (city.annualAppreciationRate !== undefined) setValue('annualAppreciationRate', city.annualAppreciationRate);
      if (city.description) setValue('description', city.description);
    }
  }, [city, isEditing, setValue, reset]);

  // Mutations
  const createCityMutation = useMutation(
    (cityData) => citiesAPI.createCity(cityData),
    {
      onSuccess: () => {
        showSuccess('City created successfully');
        queryClient.invalidateQueries('admin-cities');
        queryClient.invalidateQueries('cities');
        onSave();
      },
      onError: (error) => {
        const message = error.response?.data?.message || 'Failed to create city';
        showError(message);
      }
    }
  );

  const updateCityMutation = useMutation(
    ({ id, cityData }) => citiesAPI.updateCity(id, cityData),
    {
      onSuccess: () => {
        showSuccess('City updated successfully');
        queryClient.invalidateQueries('admin-cities');
        queryClient.invalidateQueries('cities');
        onSave();
      },
      onError: (error) => {
        const message = error.response?.data?.message || 'Failed to update city';
        showError(message);
      }
    }
  );

  const onSubmit = async (data) => {
    try {
      const cityData = {
        name: data.name,
        governorate: data.governorate || undefined,
        annualAppreciationRate: parseFloat(data.annualAppreciationRate),
        description: data.description || ''
      };

      if (isEditing) {
        await updateCityMutation.mutateAsync({ id: city._id, cityData });
      } else {
        await createCityMutation.mutateAsync(cityData);
      }
    } catch (error) {
      console.error('City form submission error:', error);
    }
  };

  const isSubmitting = createCityMutation.isLoading || updateCityMutation.isLoading;
  const governorates = governoratesData?.governorates || [];

  return (
    <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-xl shadow-xl p-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Governorate Selection */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Governorate
          </label>
          <Controller
            name="governorate"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value || 'none'}
                onValueChange={(value) => {
                  const actualValue = value === 'none' ? '' : value;
                  field.onChange(actualValue);
                }}
              >
                <SelectTrigger className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:ring-2 focus:ring-blue-500 h-auto">
                  <span>
                    {field.value 
                      ? governorates.find(g => g._id === field.value)?.name 
                      : 'Select Governorate (Optional)'}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select Governorate (Optional)</SelectItem>
                  {governorates.map((gov) => (
                    <SelectItem key={gov._id} value={gov._id}>
                      {gov.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.governorate && (
            <p className="mt-1 text-sm text-red-400">{errors.governorate.message}</p>
          )}
          <p className="mt-1 text-xs text-slate-400">
            Link this city to a governorate for hierarchical organization
          </p>
        </div>

        {/* City Name */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            City Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            {...register('name', {
              required: 'City name is required',
              maxLength: {
                value: 100,
                message: 'City name cannot exceed 100 characters'
              }
            })}
            className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400"
            placeholder="e.g., New Cairo, Sheikh Zayed"
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
            placeholder="e.g., 8.5"
          />
          {errors.annualAppreciationRate && (
            <p className="mt-1 text-sm text-red-400">{errors.annualAppreciationRate.message}</p>
          )}
          <p className="mt-1 text-xs text-slate-400">
            Expected annual property value appreciation in this city
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
            placeholder="Brief description of the city..."
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
              isEditing ? 'Update City' : 'Create City'
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

export default CityForm;

