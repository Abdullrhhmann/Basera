import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { areasAPI, governoratesAPI, citiesAPI } from '../../utils/api';
import { showSuccess, showError } from '../../utils/sonner';
import { Select, SelectContent, SelectItem, SelectTrigger } from '../ui/shadcn/select';

const AreaForm = ({ area, onSave, onCancel, isEditing = false }) => {
  const queryClient = useQueryClient();
  const [selectedGovernorate, setSelectedGovernorate] = useState('');

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset, control } = useForm({
    defaultValues: {
      name: '',
      governorate: '',
      city: '',
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

  // Fetch cities for selected governorate
  const { data: citiesData } = useQuery(
    ['cities-by-governorate', selectedGovernorate],
    () => selectedGovernorate ? citiesAPI.getCitiesByGovernorate(selectedGovernorate).then(res => res.data) : Promise.resolve({ cities: [] }),
    {
      enabled: !!selectedGovernorate,
      staleTime: 5 * 60 * 1000
    }
  );

  // Initialize form with area data if editing
  useEffect(() => {
    if (area && isEditing) {
      reset();
      if (area.name) setValue('name', area.name);
      if (area.city?._id) {
        setValue('city', area.city._id);
        if (area.city.governorate) {
          setValue('governorate', area.city.governorate);
          setSelectedGovernorate(area.city.governorate);
        }
      }
      if (area.annualAppreciationRate !== undefined) setValue('annualAppreciationRate', area.annualAppreciationRate);
      if (area.description) setValue('description', area.description);
    }
  }, [area, isEditing, setValue, reset]);

  // Handle governorate change
  const handleGovernorateChange = (e) => {
    const govId = e.target.value;
    setSelectedGovernorate(govId);
    setValue('governorate', govId);
    setValue('city', ''); // Reset city when governorate changes
  };

  // Mutations
  const createAreaMutation = useMutation(
    (areaData) => areasAPI.createArea(areaData),
    {
      onSuccess: () => {
        showSuccess('Area created successfully');
        queryClient.invalidateQueries('admin-areas');
        queryClient.invalidateQueries('areas');
        onSave();
      },
      onError: (error) => {
        const message = error.response?.data?.message || 'Failed to create area';
        showError(message);
      }
    }
  );

  const updateAreaMutation = useMutation(
    ({ id, areaData }) => areasAPI.updateArea(id, areaData),
    {
      onSuccess: () => {
        showSuccess('Area updated successfully');
        queryClient.invalidateQueries('admin-areas');
        queryClient.invalidateQueries('areas');
        onSave();
      },
      onError: (error) => {
        const message = error.response?.data?.message || 'Failed to update area';
        showError(message);
      }
    }
  );

  const onSubmit = async (data) => {
    try {
      const areaData = {
        name: data.name,
        city: data.city,
        annualAppreciationRate: parseFloat(data.annualAppreciationRate),
        description: data.description || ''
      };

      if (isEditing) {
        await updateAreaMutation.mutateAsync({ id: area._id, areaData });
      } else {
        await createAreaMutation.mutateAsync(areaData);
      }
    } catch (error) {
      console.error('Area form submission error:', error);
    }
  };

  const isSubmitting = createAreaMutation.isLoading || updateAreaMutation.isLoading;
  const governorates = governoratesData?.governorates || [];
  const cities = citiesData?.cities || [];

  return (
    <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-xl shadow-xl p-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Governorate Selection */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Governorate <span className="text-red-400">*</span>
          </label>
          <Controller
            name="governorate"
            control={control}
            rules={{ required: 'Governorate is required' }}
            render={({ field }) => (
              <Select
                value={field.value || 'none'}
                onValueChange={(value) => {
                  const actualValue = value === 'none' ? '' : value;
                  field.onChange(actualValue);
                  handleGovernorateChange({ target: { value: actualValue } });
                }}
              >
                <SelectTrigger className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:ring-2 focus:ring-blue-500 h-auto">
                  <span>
                    {field.value 
                      ? governorates.find(g => g._id === field.value)?.name 
                      : 'Select Governorate'}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select Governorate</SelectItem>
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
        </div>

        {/* City Selection */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            City <span className="text-red-400">*</span>
          </label>
          <Controller
            name="city"
            control={control}
            rules={{ required: 'City is required' }}
            render={({ field }) => (
              <Select
                value={field.value || 'none'}
                onValueChange={(value) => {
                  const actualValue = value === 'none' ? '' : value;
                  field.onChange(actualValue);
                }}
                disabled={!selectedGovernorate}
              >
                <SelectTrigger className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:ring-2 focus:ring-blue-500 h-auto disabled:opacity-50" disabled={!selectedGovernorate}>
                  <span>
                    {field.value 
                      ? cities.find(c => c._id === field.value)?.name 
                      : 'Select City'}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select City</SelectItem>
                  {cities.map((city) => (
                    <SelectItem key={city._id} value={city._id}>
                      {city.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.city && (
            <p className="mt-1 text-sm text-red-400">{errors.city.message}</p>
          )}
          {!selectedGovernorate && (
            <p className="mt-1 text-xs text-slate-400">Please select a governorate first</p>
          )}
        </div>

        {/* Area Name */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Area Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            {...register('name', {
              required: 'Area name is required',
              maxLength: {
                value: 100,
                message: 'Area name cannot exceed 100 characters'
              }
            })}
            className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400"
            placeholder="e.g., Fifth Settlement, Maadi Sarayat"
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
            placeholder="e.g., 9.5"
          />
          {errors.annualAppreciationRate && (
            <p className="mt-1 text-sm text-red-400">{errors.annualAppreciationRate.message}</p>
          )}
          <p className="mt-1 text-xs text-slate-400">
            Expected annual property value appreciation in this area
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
            placeholder="Brief description of the area..."
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
              isEditing ? 'Update Area' : 'Create Area'
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

export default AreaForm;

