import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FiPlay, FiPause, FiVolume2, FiVolumeX, FiMaximize2, FiSkipForward, FiSkipBack } from '../../icons/feather';
import { useTranslation } from 'react-i18next';

const VideoPlayer = ({ 
  videoUrl, 
  thumbnailUrl,
  title,
  onEnded,
  onNext,
  onPrevious,
  hasNext = false,
  hasPrevious = false,
  playing = false,
  onPlayingChange,
  className = ''
}) => {
  const { t } = useTranslation();
  const nativeVideoRef = useRef(null);
  const containerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(playing);
  const [played, setPlayed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef(null);

  useEffect(() => {
    setIsPlaying(playing);
    if (nativeVideoRef.current) {
      if (playing) {
        nativeVideoRef.current.play().catch(err => {
          console.error('Error playing video:', err);
        });
      } else {
        nativeVideoRef.current.pause();
      }
    }
  }, [playing]);
  
  // Sync volume with video element
  useEffect(() => {
    if (nativeVideoRef.current) {
      nativeVideoRef.current.volume = isMuted ? 0 : volume;
      nativeVideoRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  const handlePlayPause = useCallback(() => {
    const newPlaying = !isPlaying;
    
    // Handle native video element
    if (nativeVideoRef.current) {
      if (newPlaying) {
        nativeVideoRef.current.play().catch(err => {
          console.error('Error playing video:', err);
        });
      } else {
        nativeVideoRef.current.pause();
      }
    }
    
    setIsPlaying(newPlaying);
    if (onPlayingChange) onPlayingChange(newPlaying);
  }, [isPlaying, onPlayingChange]);

  const handleSeek = useCallback((seconds) => {
    if (nativeVideoRef.current) {
      const currentTime = nativeVideoRef.current.currentTime || 0;
      const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
      nativeVideoRef.current.currentTime = newTime;
    }
  }, [duration]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newMuted = !prev;
      if (nativeVideoRef.current) {
        nativeVideoRef.current.muted = newMuted;
      }
      return newMuted;
    });
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      } else if (containerRef.current.webkitRequestFullscreen) {
        containerRef.current.webkitRequestFullscreen();
      } else if (containerRef.current.msRequestFullscreen) {
        containerRef.current.msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
    setIsFullscreen(prev => !prev);
  }, [isFullscreen]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          handlePlayPause();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handleSeek(-10);
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleSeek(10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume(Math.min(1, volume + 0.1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume(Math.max(0, volume - 0.1));
          break;
        case 'm':
        case 'M':
          toggleMute();
          break;
        case 'f':
        case 'F':
          toggleFullscreen();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [volume, isMuted, isPlaying, handlePlayPause, handleSeek, toggleFullscreen, toggleMute]);

  // Auto-hide controls
  useEffect(() => {
    if (isPlaying) {
      clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    } else {
      setShowControls(true);
      clearTimeout(controlsTimeoutRef.current);
    }

    return () => clearTimeout(controlsTimeoutRef.current);
  }, [isPlaying, showControls]);

  const handleSeekTo = useCallback((e) => {
    if (!nativeVideoRef.current || !duration) return;
    const rect = nativeVideoRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = percentage * duration;
    nativeVideoRef.current.currentTime = newTime;
  }, [duration]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEnded = () => {
    setIsPlaying(false);
    if (onEnded) onEnded();
  };

  const handleMouseMove = () => {
    setShowControls(true);
    clearTimeout(controlsTimeoutRef.current);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full bg-black rounded-lg overflow-hidden group ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        if (isPlaying) {
          setShowControls(false);
        }
      }}
    >
      {/* Video Player */}
      <div className="relative w-full aspect-video bg-black">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#A88B32]"></div>
          </div>
        )}
        
        {videoUrl ? (
          <video
            ref={nativeVideoRef}
            src={videoUrl}
            className="w-full h-full"
            controls={false}
            preload="metadata"
            playsInline
            muted={isMuted}
            volume={volume}
            onLoadedMetadata={() => {
              console.log('✅ Native video loaded');
              setIsLoading(false);
              if (nativeVideoRef.current) {
                setDuration(nativeVideoRef.current.duration || 0);
                nativeVideoRef.current.volume = volume;
              }
            }}
            onError={(e) => {
              console.error('❌ Native video error:', e);
              console.error('Video URL:', videoUrl);
              console.error('Video element error:', nativeVideoRef.current?.error);
              setIsLoading(false);
            }}
            onTimeUpdate={() => {
              if (nativeVideoRef.current) {
                const currentTime = nativeVideoRef.current.currentTime || 0;
                const videoDuration = nativeVideoRef.current.duration || 0;
                setPlayed(videoDuration > 0 ? currentTime / videoDuration : 0);
              }
            }}
            onPlay={() => {
              console.log('▶️ Video playing');
              setIsPlaying(true);
              setIsLoading(false);
            }}
            onPause={() => {
              console.log('⏸️ Video paused');
              setIsPlaying(false);
            }}
            onEnded={handleEnded}
            onWaiting={() => {
              setIsLoading(true);
            }}
            onCanPlay={() => {
              console.log('✅ Video can play');
              setIsLoading(false);
            }}
            onLoadStart={() => {
              console.log('📥 Video load started');
              setIsLoading(true);
            }}
            poster={thumbnailUrl}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
            <p className="text-white">Video URL not available</p>
          </div>
        )}

        {/* Click to play/pause overlay */}
        {!isLoading && (
          <div
            className="absolute inset-0 cursor-pointer z-20"
            onClick={handlePlayPause}
            onDoubleClick={toggleFullscreen}
          >
            {!isPlaying && !showControls && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors">
                  <FiPlay className="h-10 w-10 text-white ml-1" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Custom Controls */}
        {showControls && !isLoading && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-4 z-30 transition-opacity">
            {/* Progress Bar */}
            <div
              className="relative h-1 bg-white/20 rounded-full mb-4 cursor-pointer"
              onClick={handleSeekTo}
            >
              <div
                className="absolute top-0 left-0 h-full bg-[#A88B32] rounded-full transition-all"
                style={{ width: `${played * 100}%` }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-[#A88B32] rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ left: `${played * 100}%`, marginLeft: '-8px' }}
              />
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {/* Previous Button */}
                {hasPrevious && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onPrevious) onPrevious();
                    }}
                    className="p-2 hover:bg-white/10 rounded transition-colors"
                    aria-label={t('video.player.previous', { defaultValue: 'Previous video' })}
                  >
                    <FiSkipBack className="h-5 w-5 text-white" />
                  </button>
                )}

                {/* Play/Pause Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlayPause();
                  }}
                  className="p-2 hover:bg-white/10 rounded transition-colors"
                  aria-label={isPlaying ? t('video.player.pause', { defaultValue: 'Pause' }) : t('video.player.play', { defaultValue: 'Play' })}
                >
                  {isPlaying ? (
                    <FiPause className="h-6 w-6 text-white" />
                  ) : (
                    <FiPlay className="h-6 w-6 text-white" />
                  )}
                </button>

                {/* Next Button */}
                {hasNext && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onNext) onNext();
                    }}
                    className="p-2 hover:bg-white/10 rounded transition-colors"
                    aria-label={t('video.player.next', { defaultValue: 'Next video' })}
                  >
                    <FiSkipForward className="h-5 w-5 text-white" />
                  </button>
                )}

                {/* Volume Control */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleMute();
                    }}
                    className="p-2 hover:bg-white/10 rounded transition-colors"
                    aria-label={isMuted ? t('video.player.unmute', { defaultValue: 'Unmute' }) : t('video.player.mute', { defaultValue: 'Mute' })}
                  >
                    {isMuted || volume === 0 ? (
                      <FiVolumeX className="h-5 w-5 text-white" />
                    ) : (
                      <FiVolume2 className="h-5 w-5 text-white" />
                    )}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => {
                      const newVolume = parseFloat(e.target.value);
                      setVolume(newVolume);
                      setIsMuted(newVolume === 0);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-20 h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-[#A88B32]"
                  />
                </div>

                {/* Time Display */}
                <div className="text-white text-sm font-mono">
                  {formatTime(played * duration)} / {formatTime(duration)}
                </div>
              </div>

              {/* Fullscreen Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFullscreen();
                }}
                className="p-2 hover:bg-white/10 rounded transition-colors"
                aria-label={t('video.player.fullscreen', { defaultValue: 'Fullscreen' })}
              >
                <FiMaximize2 className="h-5 w-5 text-white" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Video Title */}
      {title && (
        <div className="absolute top-4 left-4 right-4 z-40">
          <h3 className="text-white text-lg font-bold drop-shadow-lg">{title}</h3>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;

