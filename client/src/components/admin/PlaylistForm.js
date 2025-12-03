import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient, useQuery } from 'react-query';
import { videoPlaylistsAPI, videosAPI, compoundsAPI, launchesAPI } from '../../utils/api';
import { showSuccess, showError } from '../../utils/sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/shadcn/select';
import { FiX, FiPlus } from '../../icons/feather';
import { useTranslation } from 'react-i18next';

const PlaylistForm = ({ playlist, onSave, onCancel, isEditing = false }) => {
  const { t } = useTranslation();
  const [selectedVideos, setSelectedVideos] = useState([]);
  const [availableVideos, setAvailableVideos] = useState([]);
  const [playlistType, setPlaylistType] = useState('manual');
  const queryClient = useQueryClient();

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm({
    defaultValues: {
      title: '',
      description: '',
      type: 'manual',
      associatedType: '',
      associatedId: '',
      isActive: true
    }
  });

  // Initialize form with playlist data if editing
  useEffect(() => {
    if (playlist && isEditing) {
      setValue('title', playlist.title || '');
      setValue('description', playlist.description || '');
      setValue('type', playlist.type || 'manual');
      setValue('associatedType', playlist.associatedType || '');
      setValue('associatedId', playlist.associatedId || '');
      setValue('isActive', playlist.isActive !== undefined ? playlist.isActive : true);
      setPlaylistType(playlist.type || 'manual');
      
      if (playlist.videos && playlist.videos.length > 0) {
        const videoIds = playlist.videos.map(v => v._id || v.id || v);
        setSelectedVideos(videoIds);
      }
    }
  }, [playlist, isEditing, setValue]);

  // Fetch available videos
  const { data: videosData } = useQuery(
    ['all-videos-for-playlist'],
    () => videosAPI.getVideos({ limit: 1000, isActive: true }),
    { staleTime: 5 * 60 * 1000 }
  );

  useEffect(() => {
    if (videosData?.videos) {
      setAvailableVideos(videosData.videos);
    }
  }, [videosData]);

  // Fetch compounds/launches for auto playlists
  const { data: compoundsData } = useQuery(
    ['compounds-for-playlist'],
    () => compoundsAPI.getCompounds({ limit: 1000 }),
    { enabled: playlistType === 'auto', staleTime: 10 * 60 * 1000 }
  );

  const { data: launchesData } = useQuery(
    ['launches-for-playlist'],
    () => launchesAPI.get('/launches/admin', { params: { limit: 1000 } }),
    { enabled: playlistType === 'auto', staleTime: 10 * 60 * 1000 }
  );

  const createPlaylistMutation = useMutation(
    (playlistData) => videoPlaylistsAPI.createPlaylist(playlistData),
    {
      onSuccess: () => {
        showSuccess(t('video.admin.playlists.createSuccess', { defaultValue: 'Playlist created successfully' }));
        queryClient.invalidateQueries(['admin-playlists']);
        queryClient.invalidateQueries(['video-playlists']);
        if (onSave) onSave();
      },
      onError: (error) => {
        const message = error.response?.data?.message || t('video.admin.playlists.createError', { defaultValue: 'Failed to create playlist' });
        showError(message);
      }
    }
  );

  const updatePlaylistMutation = useMutation(
    ({ id, playlistData }) => videoPlaylistsAPI.updatePlaylist(id, playlistData),
    {
      onSuccess: () => {
        showSuccess(t('video.admin.playlists.updateSuccess', { defaultValue: 'Playlist updated successfully' }));
        queryClient.invalidateQueries(['admin-playlists']);
        queryClient.invalidateQueries(['video-playlists']);
        if (onSave) onSave();
      },
      onError: (error) => {
        const message = error.response?.data?.message || t('video.admin.playlists.updateError', { defaultValue: 'Failed to update playlist' });
        showError(message);
      }
    }
  );

  const handleAddVideo = (videoId) => {
    if (!selectedVideos.includes(videoId)) {
      const updated = [...selectedVideos, videoId];
      setSelectedVideos(updated);
      setValue('videos', updated);
    }
  };

  const handleRemoveVideo = (videoId) => {
    const updated = selectedVideos.filter(id => id !== videoId);
    setSelectedVideos(updated);
    setValue('videos', updated);
  };

  const onSubmit = async (data) => {
    const playlistData = {
      ...data,
      videos: selectedVideos,
      type: playlistType,
      associatedType: playlistType === 'auto' ? data.associatedType : undefined,
      associatedId: playlistType === 'auto' ? data.associatedId : undefined
    };

    if (isEditing) {
      updatePlaylistMutation.mutate({ id: playlist._id || playlist.id, playlistData });
    } else {
      createPlaylistMutation.mutate(playlistData);
    }
  };

  const isLoading = createPlaylistMutation.isLoading || updatePlaylistMutation.isLoading;
  const unselectedVideos = availableVideos.filter(v => !selectedVideos.includes(v._id || v.id));

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Title */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-white mb-2">
            {t('video.admin.playlists.form.title', { defaultValue: 'Title' })} *
          </label>
          <input
            type="text"
            {...register('title', { required: true })}
            className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={t('video.admin.playlists.form.titlePlaceholder', { defaultValue: 'Enter playlist title' })}
          />
          {errors.title && (
            <p className="mt-1 text-sm text-red-400">{t('video.admin.playlists.form.titleRequired', { defaultValue: 'Title is required' })}</p>
          )}
        </div>

        {/* Description */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-white mb-2">
            {t('video.admin.playlists.form.description', { defaultValue: 'Description' })}
          </label>
          <textarea
            {...register('description')}
            rows={4}
            className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={t('video.admin.playlists.form.descriptionPlaceholder', { defaultValue: 'Enter playlist description' })}
          />
        </div>

        {/* Type */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-white mb-2">
            {t('video.admin.playlists.form.type', { defaultValue: 'Playlist Type' })} *
          </label>
          <Select
            value={playlistType}
            onValueChange={(value) => {
              setPlaylistType(value);
              setValue('type', value);
            }}
          >
            <SelectTrigger className="w-full bg-slate-800/50 border border-slate-700/50 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">{t('video.admin.playlists.filterManual', { defaultValue: 'Manual' })}</SelectItem>
              <SelectItem value="auto">{t('video.admin.playlists.filterAuto', { defaultValue: 'Auto' })}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Auto Playlist Options */}
        {playlistType === 'auto' && (
          <>
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                {t('video.admin.playlists.form.associatedType', { defaultValue: 'Associated Type' })}
              </label>
              <Select
                value={watch('associatedType') || ''}
                onValueChange={(value) => {
                  setValue('associatedType', value);
                  setValue('associatedId', '');
                }}
              >
                <SelectTrigger className="w-full bg-slate-800/50 border border-slate-700/50 text-white">
                  <SelectValue placeholder={t('video.admin.playlists.form.selectType', { defaultValue: 'Select type...' })} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compound">{t('video.admin.videos.filterCompound', { defaultValue: 'Compound' })}</SelectItem>
                  <SelectItem value="launch">{t('video.admin.videos.filterLaunch', { defaultValue: 'Launch' })}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                {t('video.admin.playlists.form.associatedEntity', { defaultValue: 'Associated Entity' })}
              </label>
              <Select
                value={watch('associatedId') || ''}
                onValueChange={(value) => setValue('associatedId', value)}
              >
                <SelectTrigger className="w-full bg-slate-800/50 border border-slate-700/50 text-white">
                  <SelectValue placeholder={t('video.admin.playlists.form.selectEntity', { defaultValue: 'Select...' })} />
                </SelectTrigger>
                <SelectContent>
                  {watch('associatedType') === 'compound' && compoundsData?.data?.compounds?.map((compound) => (
                    <SelectItem key={compound._id} value={compound._id}>{compound.name}</SelectItem>
                  ))}
                  {watch('associatedType') === 'launch' && launchesData?.data?.data?.map((launch) => (
                    <SelectItem key={launch._id} value={launch._id}>{launch.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {/* Active Checkbox */}
        <div className="md:col-span-2">
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

      {/* Video Selection (Manual Playlists Only) */}
      {playlistType === 'manual' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              {t('video.admin.playlists.form.videos', { defaultValue: 'Videos' })}
            </label>
            
            {/* Add Video Dropdown */}
            {unselectedVideos.length > 0 && (
              <Select onValueChange={handleAddVideo}>
                <SelectTrigger className="w-full bg-slate-800/50 border border-slate-700/50 text-white mb-3">
                  <SelectValue placeholder={t('video.admin.playlists.form.addVideo', { defaultValue: 'Add video to playlist...' })} />
                </SelectTrigger>
                <SelectContent>
                  {unselectedVideos.map((video) => (
                    <SelectItem key={video._id || video.id} value={video._id || video.id}>
                      {video.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Selected Videos List */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {selectedVideos.map((videoId) => {
                const video = availableVideos.find(v => (v._id || v.id) === videoId);
                if (!video) return null;
                
                return (
                  <div key={videoId} className="flex items-center justify-between p-3 bg-slate-800/50 border border-slate-700/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {video.thumbnailUrl && (
                        <img
                          src={video.thumbnailUrl}
                          alt={video.title}
                          className="w-16 h-10 object-cover rounded"
                        />
                      )}
                      <div>
                        <p className="text-white font-medium text-sm">{video.title}</p>
                        {video.associatedType && (
                          <p className="text-gray-400 text-xs">{video.associatedType}</p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveVideo(videoId)}
                      className="p-2 hover:bg-slate-700 rounded transition-colors"
                      aria-label={t('video.admin.playlists.form.remove', { defaultValue: 'Remove' })}
                    >
                      <FiX className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                );
              })}
              {selectedVideos.length === 0 && (
                <p className="text-gray-400 text-sm text-center py-4">
                  {t('video.admin.playlists.form.noVideos', { defaultValue: 'No videos added yet' })}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-4 pt-4 border-t border-slate-700/50">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          disabled={isLoading}
        >
          {t('video.admin.playlists.cancel', { defaultValue: 'Cancel' })}
        </button>
        <button
          type="submit"
          className="px-6 py-2 bg-[#A88B32] hover:bg-[#C09C3D] text-white rounded-lg transition-colors disabled:opacity-50"
          disabled={isLoading}
        >
          {isLoading
            ? t('video.admin.playlists.saving', { defaultValue: 'Saving...' })
            : isEditing
            ? t('video.admin.playlists.update', { defaultValue: 'Update Playlist' })
            : t('video.admin.playlists.create', { defaultValue: 'Create Playlist' })}
        </button>
      </div>
    </form>
  );
};

export default PlaylistForm;

