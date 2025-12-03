import React from 'react';
import { Link } from 'react-router-dom';
import { FiPlay, FiClock } from '../../icons/feather';
import { formatDuration, generateThumbnailFromUrl } from '../../utils/videoUtils';
import { useTranslation } from 'react-i18next';

const VideoCard = ({ 
  video, 
  onClick,
  className = '',
  showDuration = true,
  showThumbnail = true
}) => {
  const { t } = useTranslation();
  const handleClick = (e) => {
    if (onClick) {
      e.preventDefault();
      onClick(video);
    }
  };

  const thumbnailUrl = video.thumbnailUrl || generateThumbnailFromUrl(video.url || video.videoUrl);
  const duration = video.duration ? formatDuration(video.duration) : null;

  return (
    <Link
      to={`/videos/${video._id || video.id}`}
      onClick={handleClick}
      className={`group relative block ${className}`}
    >
      <div className="relative overflow-hidden rounded-lg bg-gray-900 border-2 border-gray-800 hover:border-[#A88B32]/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#A88B32]/20">
        {/* Thumbnail */}
        {showThumbnail && (
          <div className="relative aspect-video bg-gray-800 overflow-hidden">
            {thumbnailUrl ? (
              <img
                src={thumbnailUrl}
                alt={video.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                <FiPlay className="h-16 w-16 text-gray-600" />
              </div>
            )}

            {/* Play Overlay */}
            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-[#A88B32]/80 group-hover:bg-[#A88B32] flex items-center justify-center transition-all duration-300 group-hover:scale-110 shadow-lg">
                <FiPlay className="h-8 w-8 text-white ml-1" />
              </div>
            </div>

            {/* Duration Badge */}
            {showDuration && duration && (
              <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/80 backdrop-blur-sm rounded flex items-center gap-1">
                <FiClock className="h-3 w-3 text-white" />
                <span className="text-xs text-white font-mono">{duration}</span>
              </div>
            )}
          </div>
        )}

        {/* Video Info */}
        <div className="p-4">
          <h3 className="text-white font-semibold text-lg mb-2 line-clamp-2 group-hover:text-[#A88B32] transition-colors">
            {video.title}
          </h3>
          {video.description && (
            <p className="text-gray-400 text-sm line-clamp-2 mb-2">
              {video.description}
            </p>
          )}
          {video.views !== undefined && video.views > 0 && (
            <div className="text-gray-500 text-xs mt-2">
              {t('video.card.views', { count: video.views, defaultValue: '{{count}} views' })}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

export default VideoCard;

