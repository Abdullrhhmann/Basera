import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient, useQuery } from 'react-query';
import { videosAPI, compoundsAPI, launchesAPI, propertiesAPI } from '../../utils/api';
import { showSuccess, showError } from '../../utils/sonner';
import VideoUpload from '../video/VideoUpload';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/shadcn/select';
import { useTranslation } from 'react-i18next';

const VideoForm = ({ video, onSave, onCancel, isEditing = false }) => {
  const { t } = useTranslation();
  const [uploadedVideo, setUploadedVideo] = useState(null);
  const [associatedId, setAssociatedId] = useState('');
  const [associatedType, setAssociatedType] = useState('property');
  const queryClient = useQueryClient();

  const { register, handleSubmit, formState: { errors }, setValue } = useForm({
    defaultValues: {
      title: '',
      description: '',
      associatedType: 'property',
      associatedId: '',
      order: 0,
      isFeatured: false,
      isActive: true
    }
  });

  // Initialize form with video data if editing
  useEffect(() => {
    if (video && isEditing) {
      setValue('title', video.title || '');
      setValue('description', video.description || '');
      setValue('associatedType', video.associatedType || 'property');
      setValue('associatedId', video.associatedId || '');
      setValue('order', video.order || 0);
      setValue('isFeatured', video.isFeatured || false);
      setValue('isActive', video.isActive !== undefined ? video.isActive : true);
      setAssociatedType(video.associatedType || 'property');
      setAssociatedId(video.associatedId || '');
      
      if (video.videoUrl) {
        setUploadedVideo({
          videoUrl: video.videoUrl,
          thumbnailUrl: video.thumbnailUrl,
          publicId: video.publicId,
          duration: video.duration || 0,
          fileSize: video.fileSize || 0,
          format: video.format || 'mp4'
        });
      }
    }
  }, [video, isEditing, setValue]);

  // Fetch compounds, launches, or properties based on associated type
  const { data: compoundsData } = useQuery(
    ['compounds-for-video-form'],
    () => compoundsAPI.getCompounds({ limit: 1000 }),
    { enabled: associatedType === 'compound', staleTime: 10 * 60 * 1000 }
  );

  const { data: launchesData } = useQuery(
    ['launches-for-video-form'],
    () => launchesAPI.get('/launches/admin', { params: { limit: 1000 } }),
    { enabled: associatedType === 'launch', staleTime: 10 * 60 * 1000 }
  );

  const { data: propertiesData } = useQuery(
    ['properties-for-video-form'],
    () => propertiesAPI.getProperties({ limit: 1000 }),
    { enabled: associatedType === 'property', staleTime: 10 * 60 * 1000 }
  );

  const createVideoMutation = useMutation(
    (videoData) => videosAPI.createVideo(videoData),
    {
      onSuccess: () => {
        showSuccess(t('video.admin.videos.createSuccess', { defaultValue: 'Video created successfully' }));
        queryClient.invalidateQueries(['admin-videos']);
        queryClient.invalidateQueries(['videos']);
        if (onSave) onSave();
      },
      onError: (error) => {
        const message = error.response?.data?.message || t('video.admin.videos.createError', { defaultValue: 'Failed to create video' });
        showError(message);
      }
    }
  );

  const updateVideoMutation = useMutation(
    ({ id, videoData }) => videosAPI.updateVideo(id, videoData),
    {
      onSuccess: () => {
        showSuccess(t('video.admin.videos.updateSuccess', { defaultValue: 'Video updated successfully' }));
        queryClient.invalidateQueries(['admin-videos']);
        queryClient.invalidateQueries(['videos']);
        if (onSave) onSave();
      },
      onError: (error) => {
        const message = error.response?.data?.message || t('video.admin.videos.updateError', { defaultValue: 'Failed to update video' });
        showError(message);
      }
    }
  );

  const handleVideoUpload = (videoData) => {
    setUploadedVideo(videoData);
    setValue('videoUrl', videoData.videoUrl);
    setValue('thumbnailUrl', videoData.thumbnailUrl || '');
    setValue('publicId', videoData.publicId || '');
    setValue('duration', videoData.duration || 0);
    setValue('fileSize', videoData.fileSize || 0);
    setValue('format', videoData.format || 'mp4');
  };

  const handleVideoRemove = () => {
    setUploadedVideo(null);
    setValue('videoUrl', '');
    setValue('thumbnailUrl', '');
    setValue('publicId', '');
  };

  const onSubmit = async (data) => {
    if (!uploadedVideo && !isEditing) {
      showError(t('video.admin.videos.videoRequired', { defaultValue: 'Please upload a video' }));
      return;
    }

    const videoData = {
      ...data,
      videoUrl: uploadedVideo?.videoUrl || video?.videoUrl,
      thumbnailUrl: uploadedVideo?.thumbnailUrl || video?.thumbnailUrl,
      publicId: uploadedVideo?.publicId || video?.publicId,
      duration: uploadedVideo?.duration || video?.duration || 0,
      fileSize: uploadedVideo?.fileSize || video?.fileSize || 0,
      format: uploadedVideo?.format || video?.format || 'mp4',
      associatedType: data.associatedType,
      associatedId: data.associatedId
    };

    if (isEditing) {
      updateVideoMutation.mutate({ id: video._id || video.id, videoData });
    } else {
      createVideoMutation.mutate(videoData);
    }
  };

  const isLoading = createVideoMutation.isLoading || updateVideoMutation.isLoading;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Title */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-white mb-2">
            {t('video.admin.videos.form.title', { defaultValue: 'Title' })} *
          </label>
          <input
            type="text"
            {...register('title', { required: true })}
            className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={t('video.admin.videos.form.titlePlaceholder', { defaultValue: 'Enter video title' })}
          />
          {errors.title && (
            <p className="mt-1 text-sm text-red-400">{t('video.admin.videos.form.titleRequired', { defaultValue: 'Title is required' })}</p>
          )}
        </div>

        {/* Description */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-white mb-2">
            {t('video.admin.videos.form.description', { defaultValue: 'Description' })}
          </label>
          <textarea
            {...register('description')}
            rows={4}
            className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={t('video.admin.videos.form.descriptionPlaceholder', { defaultValue: 'Enter video description' })}
          />
        </div>

        {/* Associated Type */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            {t('video.admin.videos.form.associatedType', { defaultValue: 'Associated Type' })} *
          </label>
          <Select
            value={associatedType}
            onValueChange={(value) => {
              setAssociatedType(value);
              setValue('associatedType', value);
              setAssociatedId('');
              setValue('associatedId', '');
            }}
          >
            <SelectTrigger className="w-full bg-slate-800/50 border border-slate-700/50 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="property">{t('video.admin.videos.filterProperty', { defaultValue: 'Property' })}</SelectItem>
              <SelectItem value="compound">{t('video.admin.videos.filterCompound', { defaultValue: 'Compound' })}</SelectItem>
              <SelectItem value="launch">{t('video.admin.videos.filterLaunch', { defaultValue: 'Launch' })}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Associated Entity */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            {t('video.admin.videos.form.associatedEntity', { defaultValue: 'Associated Entity' })} *
          </label>
          <Select
            value={associatedId}
            onValueChange={(value) => {
              setAssociatedId(value);
              setValue('associatedId', value);
            }}
          >
            <SelectTrigger className="w-full bg-slate-800/50 border border-slate-700/50 text-white">
              <SelectValue placeholder={t('video.admin.videos.form.selectEntity', { defaultValue: 'Select...' })} />
            </SelectTrigger>
            <SelectContent>
              {associatedType === 'compound' && compoundsData?.data?.compounds?.map((compound) => (
                <SelectItem key={compound._id} value={compound._id}>{compound.name}</SelectItem>
              ))}
              {associatedType === 'launch' && launchesData?.data?.data?.map((launch) => (
                <SelectItem key={launch._id} value={launch._id}>{launch.title}</SelectItem>
              ))}
              {associatedType === 'property' && propertiesData?.properties?.map((property) => (
                <SelectItem key={property._id} value={property._id}>{property.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.associatedId && (
            <p className="mt-1 text-sm text-red-400">{t('video.admin.videos.form.entityRequired', { defaultValue: 'Please select an entity' })}</p>
          )}
        </div>

        {/* Order */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            {t('video.admin.videos.form.order', { defaultValue: 'Order' })}
          </label>
          <input
            type="number"
            {...register('order', { valueAsNumber: true })}
            min="0"
            className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Checkboxes */}
        <div className="md:col-span-2 space-y-3">
          <label className="flex items-center gap-2 text-white">
            <input
              type="checkbox"
              {...register('isFeatured')}
              className="w-4 h-4 rounded border-slate-700 bg-slate-800"
            />
            <span>{t('video.admin.videos.form.featured', { defaultValue: 'Featured' })}</span>
          </label>
          <label className="flex items-center gap-2 text-white">
            <input
              type="checkbox"
              {...register('isActive')}
              defaultChecked
              className="w-4 h-4 rounded border-slate-700 bg-slate-800"
            />
            <span>{t('video.admin.videos.form.active', { defaultValue: 'Active' })}</span>
          </label>
        </div>
      </div>

      {/* Video Upload */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          {t('video.admin.videos.form.video', { defaultValue: 'Video' })} {!isEditing && '*'}
        </label>
        <VideoUpload
          onVideoUpload={handleVideoUpload}
          onVideoRemove={handleVideoRemove}
          uploadedVideo={uploadedVideo}
          disabled={isLoading}
        />
        {!uploadedVideo && !isEditing && (
          <p className="mt-1 text-sm text-red-400">{t('video.admin.videos.videoRequired', { defaultValue: 'Please upload a video' })}</p>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-4 pt-4 border-t border-slate-700/50">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          disabled={isLoading}
        >
          {t('video.admin.videos.cancel', { defaultValue: 'Cancel' })}
        </button>
        <button
          type="submit"
          className="px-6 py-2 bg-[#A88B32] hover:bg-[#C09C3D] text-white rounded-lg transition-colors disabled:opacity-50"
          disabled={isLoading}
        >
          {isLoading
            ? t('video.admin.videos.saving', { defaultValue: 'Saving...' })
            : isEditing
            ? t('video.admin.videos.update', { defaultValue: 'Update Video' })
            : t('video.admin.videos.create', { defaultValue: 'Create Video' })}
        </button>
      </div>
    </form>
  );
};

export default VideoForm;

