import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import VideoPlayer from './VideoPlayer';
import { FiChevronDown, FiChevronUp, FiPlay, FiArrowRight } from '../../icons/feather';
import { videosAPI, videoPlaylistsAPI } from '../../utils/api';
import { useTranslation } from 'react-i18next';

const EmbeddedVideoSection = ({ 
  associatedType, 
  associatedId, 
  compoundName, 
  launchTitle,
  className = '' 
}) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Fetch videos for the associated entity
  const { data: videosData, isLoading: isLoadingVideos } = useQuery(
    [`videos-${associatedType}-${associatedId}`],
    async () => {
      if (associatedType === 'compound') {
        const response = await videosAPI.getVideosByCompound(associatedId);
        return response.data;
      } else if (associatedType === 'launch') {
        const response = await videosAPI.getVideosByLaunch(associatedId);
        return response.data;
      }
      return { videos: [] };
    },
    {
      enabled: !!associatedId,
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000
    }
  );

  // Fetch auto-playlist if multiple videos exist
  const videos = videosData?.videos || [];
  const hasMultipleVideos = videos.length > 1;
  
  const { data: playlistData } = useQuery(
    [`auto-playlist-${associatedType}-${associatedId}`],
    async () => {
      if (!hasMultipleVideos) return null;
      
      if (associatedType === 'compound') {
        const response = await videoPlaylistsAPI.getAutoPlaylistForCompound(associatedId);
        return response.data;
      } else if (associatedType === 'launch') {
        const response = await videoPlaylistsAPI.getAutoPlaylistForLaunch(associatedId);
        return response.data;
      }
      return null;
    },
    {
      enabled: hasMultipleVideos && !!associatedId,
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000
    }
  );

  const playlist = playlistData?.playlist;
  const displayVideos = playlist?.videos || videos;
  const firstVideo = displayVideos[0];

  if (isLoadingVideos) {
    return (
      <div className={`${className}`}>
        <div className="bg-gray-900/50 rounded-lg p-8 animate-pulse">
          <div className="h-64 bg-gray-800 rounded-lg mb-4"></div>
          <div className="h-6 bg-gray-800 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-800 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (videos.length === 0) {
    return null; // Don't show section if no videos
  }

  const entityName = associatedType === 'compound' ? compoundName : launchTitle;

  return (
    <div className={`bg-transparent py-8 ${className}`}>
      <div className="rounded-lg border border-gray-800 bg-gray-900/30 backdrop-blur-sm overflow-hidden">
        {/* Section Header */}
        <div 
          className="flex items-center justify-between p-4 border-b border-gray-800 cursor-pointer hover:bg-gray-800/30 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#A88B32]/20 flex items-center justify-center">
              <FiPlay className="h-5 w-5 text-[#A88B32]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {t('video.embedded.title', { 
                  defaultValue: 'Video Orientations',
                  entityName: entityName || ''
                })}
              </h3>
              <p className="text-sm text-gray-400">
                {videos.length === 1 
                  ? t('video.embedded.singleVideo', { defaultValue: '1 video' })
                  : t('video.embedded.multipleVideos', { 
                      count: videos.length,
                      defaultValue: '{{count}} videos'
                    })
                }
              </p>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="p-2 hover:bg-gray-800 rounded transition-colors"
            aria-label={isExpanded ? t('video.embedded.collapse', { defaultValue: 'Collapse' }) : t('video.embedded.expand', { defaultValue: 'Expand' })}
          >
            {isExpanded ? (
              <FiChevronUp className="h-5 w-5 text-white" />
            ) : (
              <FiChevronDown className="h-5 w-5 text-white" />
            )}
          </button>
        </div>

        {/* Video Content */}
        {isExpanded ? (
          <div className="p-6">
            {/* Full Video Player or Playlist */}
            {hasMultipleVideos && playlist ? (
              <div className="space-y-4">
                <div className="aspect-video rounded-lg overflow-hidden bg-black">
                  <VideoPlayer
                    videoUrl={firstVideo?.videoUrl}
                    thumbnailUrl={firstVideo?.thumbnailUrl}
                    title={firstVideo?.title}
                    playing={isPlaying}
                    onPlayingChange={setIsPlaying}
                    className="w-full h-full"
                  />
                </div>
                <div className="text-center">
                  <Link
                    to={`/videos/playlist/${playlist._id || playlist.id}`}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#A88B32] hover:bg-[#C09C3D] text-white font-semibold rounded-lg transition-colors"
                  >
                    {t('video.embedded.viewAllVideos', { defaultValue: 'View All Videos' })}
                    <FiArrowRight className="h-5 w-5" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {firstVideo && (
                  <div className="aspect-video rounded-lg overflow-hidden bg-black">
                    <VideoPlayer
                      videoUrl={firstVideo.videoUrl}
                      thumbnailUrl={firstVideo.thumbnailUrl}
                      title={firstVideo.title}
                      playing={isPlaying}
                      onPlayingChange={setIsPlaying}
                      className="w-full h-full"
                    />
                  </div>
                )}
                {hasMultipleVideos && (
                  <div className="text-center">
                    <Link
                      to={`/videos/${firstVideo?._id || firstVideo?.id}`}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-[#A88B32] hover:bg-[#C09C3D] text-white font-semibold rounded-lg transition-colors"
                    >
                      {t('video.embedded.viewAllVideos', { defaultValue: 'View All Videos' })}
                      <FiArrowRight className="h-5 w-5" />
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Collapsed View - Show First Video Thumbnail */
          <div 
            className="p-6 cursor-pointer"
            onClick={() => setIsExpanded(true)}
          >
            {firstVideo && (
              <div className="relative aspect-video rounded-lg overflow-hidden bg-black group">
                {firstVideo.thumbnailUrl ? (
                  <img
                    src={firstVideo.thumbnailUrl}
                    alt={firstVideo.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                    <FiPlay className="h-16 w-16 text-gray-600" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-[#A88B32]/80 group-hover:bg-[#A88B32] flex items-center justify-center transition-all duration-300 group-hover:scale-110 shadow-lg">
                    <FiPlay className="h-10 w-10 text-white ml-1" />
                  </div>
                </div>
                <div className="absolute bottom-4 left-4 right-4">
                  <h4 className="text-white font-semibold text-lg mb-1">{firstVideo.title}</h4>
                  {hasMultipleVideos && (
                    <p className="text-white/80 text-sm">
                      {t('video.embedded.clickToExpand', { 
                        count: videos.length,
                        defaultValue: 'Click to view {{count}} videos'
                      })}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmbeddedVideoSection;

