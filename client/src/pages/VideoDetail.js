import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useQuery } from 'react-query';
import { videosAPI, videoPlaylistsAPI } from '../utils/api';
import VideoPlayer from '../components/video/VideoPlayer';
import VideoPlaylist from '../components/video/VideoPlaylist';
import VideoCard from '../components/video/VideoCard';
import PageLayout from '../components/layout/PageLayout';
import { FiArrowLeft, FiShare2, FiClock } from '../icons/feather';
import { useTranslation } from 'react-i18next';
import { formatDuration } from '../utils/videoUtils';

const VideoDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [currentVideo, setCurrentVideo] = useState(null);
  const [playlist, setPlaylist] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Fetch video details
  const { data: videoData, isLoading, error } = useQuery(
    ['video', id],
    async () => {
      const response = await videosAPI.getVideo(id);
      return response.data;
    },
    {
      enabled: !!id,
      onSuccess: (data) => {
        setCurrentVideo(data.video);
      }
    }
  );

  const video = videoData?.video || currentVideo;

  // Fetch playlist if video is part of one
  useQuery(
    [`playlist-${video?.associatedType}-${video?.associatedId?._id || video?.associatedId?.id || video?.associatedId}`],
    async () => {
      if (!video?.associatedType || !video?.associatedId) return null;
      
      // Extract ID string if associatedId is an object (after population)
      const associatedIdStr = typeof video.associatedId === 'object' 
        ? (video.associatedId._id || video.associatedId.id || video.associatedId)
        : video.associatedId;
      
      if (!associatedIdStr) return null;
      
      if (video.associatedType === 'compound') {
        const response = await videoPlaylistsAPI.getAutoPlaylistForCompound(associatedIdStr);
        return response.data;
      } else if (video.associatedType === 'launch') {
        const response = await videoPlaylistsAPI.getAutoPlaylistForLaunch(associatedIdStr);
        return response.data;
      }
      return null;
    },
    {
      enabled: !!video?.associatedType && !!(video?.associatedId?._id || video?.associatedId?.id || video?.associatedId),
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      onSuccess: (data) => {
        if (data?.playlist) {
          setPlaylist(data.playlist);
        }
      }
    }
  );

  // Fetch related videos if not part of playlist
  const { data: relatedVideosData } = useQuery(
    [`related-videos-${video?.associatedType}-${video?.associatedId?._id || video?.associatedId?.id || video?.associatedId}`],
    async () => {
      if (!video?.associatedType || !video?.associatedId || playlist) return { videos: [] };
      
      // Extract ID string if associatedId is an object (after population)
      const associatedIdStr = typeof video.associatedId === 'object' 
        ? (video.associatedId._id || video.associatedId.id || video.associatedId)
        : video.associatedId;
      
      if (!associatedIdStr) return { videos: [] };
      
      if (video.associatedType === 'compound') {
        const response = await videosAPI.getVideosByCompound(associatedIdStr);
        return response.data;
      } else if (video.associatedType === 'launch') {
        const response = await videosAPI.getVideosByLaunch(associatedIdStr);
        return response.data;
      } else if (video.associatedType === 'property') {
        const response = await videosAPI.getVideosByProperty(associatedIdStr);
        return response.data;
      }
      return { videos: [] };
    },
    {
      enabled: !!video?.associatedType && !!(video?.associatedId?._id || video?.associatedId?.id || video?.associatedId) && !playlist,
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000
    }
  );

  const playlistVideos = playlist?.videos || [];
  const relatedVideos = relatedVideosData?.videos || [];
  const displayVideos = playlistVideos.length > 0 ? playlistVideos : relatedVideos;
  const currentIndex = displayVideos.findIndex(v => (v._id || v.id) === (video?._id || video?.id));

  const handleVideoChange = (newVideo, index) => {
    navigate(`/videos/${newVideo._id || newVideo.id}`);
    setCurrentVideo(newVideo);
  };

  const handleShare = async () => {
    const url = window.location.href;
    const shareText = video ? t('video.detail.shareText', { 
      title: video.title,
      defaultValue: `Check out this video: ${video.title}`
    }) : '';

    if (navigator.share) {
      try {
        await navigator.share({
          title: video?.title || t('video.detail.title'),
          text: shareText,
          url: url
        });
      } catch (error) {
        // User cancelled or error occurred
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(url);
    }
  };

  const handleBack = () => {
    if (video?.associatedType && video?.associatedId) {
      // Extract ID string if associatedId is an object (after population)
      const associatedIdStr = typeof video.associatedId === 'object' 
        ? (video.associatedId._id || video.associatedId.id || video.associatedId)
        : video.associatedId;
      
      if (associatedIdStr) {
        if (video.associatedType === 'compound') {
          navigate(`/compounds/${associatedIdStr}`);
        } else if (video.associatedType === 'launch') {
          navigate(`/launches/${associatedIdStr}`);
        } else if (video.associatedType === 'property') {
          navigate(`/properties/${associatedIdStr}`);
        } else {
          navigate(-1);
        }
      } else {
        navigate(-1);
      }
    } else {
      navigate(-1);
    }
  };

  // Debug: Log video data
  useEffect(() => {
    if (video) {
      console.log('📹 Video data loaded:', {
        title: video.title,
        videoUrl: video.videoUrl,
        thumbnailUrl: video.thumbnailUrl,
        hasVideoUrl: !!video.videoUrl
      });
    }
  }, [video]);

  if (isLoading) {
    return (
      <PageLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#A88B32]"></div>
        </div>
      </PageLayout>
    );
  }

  if (error || !video) {
    return (
      <PageLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-4">
              {t('video.detail.notFound', { defaultValue: 'Video not found' })}
            </h2>
            <button
              onClick={() => navigate(-1)}
              className="px-6 py-3 bg-[#A88B32] hover:bg-[#C09C3D] text-white rounded-lg transition-colors"
            >
              {t('video.detail.goBack', { defaultValue: 'Go Back' })}
            </button>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (!video.videoUrl) {
    return (
      <PageLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-4">
              Video URL not available
            </h2>
            <p className="text-gray-400 mb-4">This video does not have a valid video URL.</p>
            <button
              onClick={() => navigate(-1)}
              className="px-6 py-3 bg-[#A88B32] hover:bg-[#C09C3D] text-white rounded-lg transition-colors"
            >
              {t('video.detail.goBack', { defaultValue: 'Go Back' })}
            </button>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <Helmet>
        <title>{video.title} - {t('video.detail.metaTitle', { defaultValue: 'Video Orientations' })}</title>
        <meta name="description" content={video.description || video.title} />
        <meta property="og:title" content={video.title} />
        <meta property="og:description" content={video.description || video.title} />
        {video.thumbnailUrl && <meta property="og:image" content={video.thumbnailUrl} />}
      </Helmet>

      <div className="min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back Button */}
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-white hover:text-[#A88B32] transition-colors mb-6"
          >
            <FiArrowLeft className="h-5 w-5" />
            <span>{t('video.detail.back', { defaultValue: 'Back' })}</span>
          </button>

          {/* Video Player Section */}
          {playlist && playlistVideos.length > 1 ? (
            <VideoPlaylist
              playlist={playlist}
              videos={playlistVideos}
              currentVideoId={video._id || video.id}
              onVideoChange={handleVideoChange}
              showSidebar={true}
              className="mb-8"
            />
          ) : (
            <div className="mb-8">
              <VideoPlayer
                videoUrl={video.videoUrl}
                thumbnailUrl={video.thumbnailUrl}
                title={video.title}
                playing={isPlaying}
                onPlayingChange={setIsPlaying}
                onNext={currentIndex < displayVideos.length - 1 ? () => handleVideoChange(displayVideos[currentIndex + 1], currentIndex + 1) : undefined}
                onPrevious={currentIndex > 0 ? () => handleVideoChange(displayVideos[currentIndex - 1], currentIndex - 1) : undefined}
                hasNext={currentIndex < displayVideos.length - 1}
                hasPrevious={currentIndex > 0}
                className="w-full"
              />

              {/* Video Info */}
              <div className="mt-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h1 className="text-3xl font-bold text-white mb-2">{video.title}</h1>
                    {video.description && (
                      <p className="text-gray-400 text-lg">{video.description}</p>
                    )}
                  </div>
                  <button
                    onClick={handleShare}
                    className="p-3 hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0"
                    aria-label={t('video.detail.share', { defaultValue: 'Share' })}
                  >
                    <FiShare2 className="h-6 w-6 text-white" />
                  </button>
                </div>

                {/* Video Metadata */}
                <div className="flex items-center gap-6 text-sm text-gray-400">
                  {video.views !== undefined && video.views > 0 && (
                    <span>
                      {t('video.detail.views', { count: video.views, defaultValue: '{{count}} views' })}
                    </span>
                  )}
                  {video.duration > 0 && (
                    <span className="flex items-center gap-1">
                      <FiClock className="h-4 w-4" />
                      {formatDuration(video.duration)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Related Videos Section */}
          {displayVideos.length > 1 && (
            <div className="mt-12">
              <h2 className="text-2xl font-bold text-white mb-6">
                {playlist 
                  ? t('video.detail.playlistVideos', { defaultValue: 'Playlist Videos' })
                  : t('video.detail.relatedVideos', { defaultValue: 'Related Videos' })
                }
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayVideos.map((relatedVideo, index) => {
                  const isCurrent = (relatedVideo._id || relatedVideo.id) === (video._id || video.id);
                  if (isCurrent) return null;
                  return (
                    <VideoCard
                      key={relatedVideo._id || relatedVideo.id || index}
                      video={relatedVideo}
                      onClick={(v) => handleVideoChange(v, displayVideos.findIndex(vid => (vid._id || vid.id) === (v._id || v.id)))}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
};

export default VideoDetail;

