import React, { useState, useEffect } from 'react';
import VideoPlayer from './VideoPlayer';
import { FiPlay, FiClock, FiChevronRight } from '../../icons/feather';
import { formatDuration } from '../../utils/videoUtils';
import { useTranslation } from 'react-i18next';

const VideoPlaylist = ({ 
  playlist, 
  videos = [],
  currentVideoId,
  onVideoChange,
  showSidebar = true,
  className = ''
}) => {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Find current video index
  useEffect(() => {
    if (currentVideoId && videos.length > 0) {
      const index = videos.findIndex(v => v._id === currentVideoId || v.id === currentVideoId);
      if (index !== -1) {
        setCurrentIndex(index);
      }
    }
  }, [currentVideoId, videos]);

  const currentVideo = videos[currentIndex] || videos[0];
  const hasNext = currentIndex < videos.length - 1;
  const hasPrevious = currentIndex > 0;

  const handleNext = () => {
    if (hasNext && currentIndex < videos.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      if (onVideoChange) {
        onVideoChange(videos[nextIndex], nextIndex);
      }
    }
  };

  const handlePrevious = () => {
    if (hasPrevious && currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      if (onVideoChange) {
        onVideoChange(videos[prevIndex], prevIndex);
      }
    }
  };

  const handleVideoSelect = (video, index) => {
    setCurrentIndex(index);
    if (onVideoChange) {
      onVideoChange(video, index);
    }
  };

  const handleEnded = () => {
    // Auto-play next video if available
    if (hasNext) {
      handleNext();
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }
  };

  // Calculate total duration
  const totalDuration = videos.reduce((total, video) => total + (video.duration || 0), 0);

  if (!currentVideo) {
    return (
      <div className={`text-center p-8 ${className}`}>
        <p className="text-gray-400">{t('video.playlist.noVideos', { defaultValue: 'No videos in playlist' })}</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col lg:flex-row gap-6 ${className}`}>
      {/* Main Video Player */}
      <div className={`${showSidebar ? 'lg:w-2/3' : 'w-full'}`}>
        <VideoPlayer
          videoUrl={currentVideo.videoUrl}
          thumbnailUrl={currentVideo.thumbnailUrl}
          title={currentVideo.title}
          playing={isPlaying}
          onPlayingChange={setIsPlaying}
          onNext={handleNext}
          onPrevious={handlePrevious}
          hasNext={hasNext}
          hasPrevious={hasPrevious}
          onEnded={handleEnded}
          className="w-full"
        />

        {/* Video Info */}
        <div className="mt-4 space-y-2">
          <h2 className="text-2xl font-bold text-white">{currentVideo.title}</h2>
          {currentVideo.description && (
            <p className="text-gray-400">{currentVideo.description}</p>
          )}
          <div className="flex items-center gap-4 text-sm text-gray-500">
            {currentVideo.views !== undefined && (
              <span>
                {t('video.playlist.views', { count: currentVideo.views, defaultValue: '{{count}} views' })}
              </span>
            )}
            {playlist && (
              <span>
                {t('video.playlist.videoOf', { 
                  current: currentIndex + 1, 
                  total: videos.length,
                  defaultValue: 'Video {{current}} of {{total}}'
                })}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Playlist Sidebar */}
      {showSidebar && videos.length > 1 && (
        <div className="lg:w-1/3">
          <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-lg p-4">
            {/* Playlist Header */}
            {playlist && (
              <div className="mb-4 pb-4 border-b border-gray-800">
                <h3 className="text-lg font-bold text-white mb-1">{playlist.title}</h3>
                {playlist.description && (
                  <p className="text-sm text-gray-400 mb-2">{playlist.description}</p>
                )}
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <FiPlay className="h-3 w-3" />
                    {videos.length} {t('video.playlist.videos', { defaultValue: 'videos' })}
                  </span>
                  {totalDuration > 0 && (
                    <span className="flex items-center gap-1">
                      <FiClock className="h-3 w-3" />
                      {formatDuration(totalDuration)}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Playlist Videos */}
            <div className="space-y-2 max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-[#A88B32]/50 scrollbar-track-transparent">
              {videos.map((video, index) => {
                const isActive = index === currentIndex;
                const thumbnailUrl = video.thumbnailUrl || generateThumbnailFromUrl(video.videoUrl);
                const duration = video.duration ? formatDuration(video.duration) : null;

                return (
                  <button
                    key={video._id || video.id || index}
                    onClick={() => handleVideoSelect(video, index)}
                    className={`w-full text-left rounded-lg overflow-hidden border-2 transition-all duration-300 ${
                      isActive
                        ? 'border-[#A88B32] bg-[#A88B32]/10'
                        : 'border-gray-800 bg-gray-800/50 hover:border-gray-700'
                    }`}
                  >
                    <div className="flex gap-3 p-2">
                      {/* Thumbnail */}
                      <div className="relative w-24 h-16 flex-shrink-0 rounded overflow-hidden bg-gray-800">
                        {thumbnailUrl ? (
                          <img
                            src={thumbnailUrl}
                            alt={video.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FiPlay className="h-6 w-6 text-gray-600" />
                          </div>
                        )}
                        
                        {/* Play Icon Overlay */}
                        {isActive && (
                          <div className="absolute inset-0 bg-[#A88B32]/50 flex items-center justify-center">
                            <FiPlay className="h-5 w-5 text-white ml-0.5" />
                          </div>
                        )}

                        {/* Duration Badge */}
                        {duration && (
                          <div className="absolute bottom-1 right-1 px-1 py-0.5 bg-black/80 rounded text-xs text-white">
                            {duration}
                          </div>
                        )}
                      </div>

                      {/* Video Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className={`text-sm font-semibold mb-1 truncate ${
                          isActive ? 'text-[#A88B32]' : 'text-white'
                        }`}>
                          {video.title}
                        </h4>
                        {video.description && (
                          <p className="text-xs text-gray-400 line-clamp-2">
                            {video.description}
                          </p>
                        )}
                      </div>

                      {/* Active Indicator */}
                      {isActive && (
                        <div className="flex-shrink-0 flex items-center">
                          <FiChevronRight className="h-5 w-5 text-[#A88B32]" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to generate thumbnail URL from video URL
const generateThumbnailFromUrl = (videoUrl) => {
  if (!videoUrl) return null;
  
  // If Cloudinary URL, generate thumbnail
  if (videoUrl.includes('cloudinary.com')) {
    const publicIdMatch = videoUrl.match(/\/v\d+\/(.+)\.(mp4|webm|mov)/i);
    if (publicIdMatch && publicIdMatch[1]) {
      const publicId = publicIdMatch[1];
      const baseUrl = videoUrl.split('/upload/')[0] + '/upload/';
      return `${baseUrl}w_320,h_180,c_fill,q_auto,f_jpg,so_30p/${publicId}.jpg`;
    }
  }
  
  return null;
};

export default VideoPlaylist;

