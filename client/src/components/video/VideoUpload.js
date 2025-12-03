import React, { useState, useRef, useEffect } from 'react';
import { FiX, FiVideo, FiCheckCircle, FiAlertCircle, FiLoader } from '../../icons/feather';
import { videosAPI } from '../../utils/api';
import { showSuccess, showError } from '../../utils/sonner';
import { validateVideoFile, formatFileSize, extractVideoMetadata } from '../../utils/videoUtils';

const VideoUpload = ({
  onVideoUpload,
  onVideoRemove,
  uploadedVideo = null,
  disabled = false,
  className = '',
  maxSize = 100 * 1024 * 1024 // 100MB default
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);
  const fileInputRef = useRef(null);
  const dragCounter = useRef(0);

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const processFile = async (file) => {
    // Validate file
    const validation = validateVideoFile(file);
    if (!validation.valid) {
      setError(validation.error);
      showError(validation.error);
      return;
    }

    // Check file size
    if (file.size > maxSize) {
      const errorMsg = `File size exceeds maximum allowed size of ${formatFileSize(maxSize)}`;
      setError(errorMsg);
      showError(errorMsg);
      return;
    }

    setError('');
    setUploading(true);
    setUploadProgress(0);

    try {
      // Create form data
      const formData = new FormData();
      formData.append('video', file);
      formData.append('folder', 'basira-videos');

      // Upload video
      const response = await videosAPI.uploadVideo(formData, (progress) => {
        setUploadProgress(progress);
      });

      if (response.data?.success && response.data?.data) {
        const videoData = extractVideoMetadata(response.data.data);
        
        // Create video object
        const video = {
          videoUrl: videoData.videoUrl,
          thumbnailUrl: videoData.thumbnailUrl || null,
          publicId: videoData.publicId,
          duration: videoData.duration || 0,
          fileSize: videoData.fileSize || file.size,
          format: videoData.format || 'mp4',
          width: videoData.width || 0,
          height: videoData.height || 0
        };

        setPreview(video);
        if (onVideoUpload) {
          onVideoUpload(video);
        }
        
        showSuccess('Video uploaded successfully!');
      } else {
        throw new Error('Upload failed: Invalid response');
      }
    } catch (err) {
      console.error('Video upload error:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to upload video';
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      e.currentTarget.classList.add('border-[#A88B32]', 'bg-[#A88B32]/10');
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      e.currentTarget.classList.remove('border-[#A88B32]', 'bg-[#A88B32]/10');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    e.currentTarget.classList.remove('border-[#A88B32]', 'bg-[#A88B32]/10');

    const files = Array.from(e.dataTransfer.files);
    const videoFile = files.find(file => file.type.startsWith('video/'));
    
    if (videoFile) {
      await processFile(videoFile);
    } else {
      setError('Please drop a video file');
      showError('Please drop a video file');
    }
  };

  const handleRemove = () => {
    setPreview(null);
    setError('');
    if (onVideoRemove) {
      onVideoRemove();
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    if (!disabled && !uploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Initialize preview from uploadedVideo prop
  useEffect(() => {
    if (uploadedVideo && !preview) {
      setPreview(uploadedVideo);
    }
  }, [uploadedVideo, preview]);

  const displayVideo = preview || uploadedVideo;

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime,video/x-msvideo,video/x-ms-wmv"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || uploading}
      />

      {!displayVideo ? (
        <div
          onClick={handleClick}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            relative border-2 border-dashed border-gray-600 rounded-lg p-8
            transition-all duration-300 cursor-pointer
            ${disabled || uploading ? 'opacity-50 cursor-not-allowed' : 'hover:border-[#A88B32] hover:bg-gray-800/50'}
            ${error ? 'border-red-500' : ''}
          `}
        >
          {uploading ? (
            <div className="text-center">
              <FiLoader className="h-12 w-12 text-[#A88B32] animate-spin mx-auto mb-4" />
              <p className="text-white font-medium mb-2">Uploading video...</p>
              <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                <div
                  className="bg-[#A88B32] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-gray-400 text-sm">{uploadProgress}%</p>
            </div>
          ) : (
            <div className="text-center">
              <FiVideo className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-white font-medium mb-2">
                Click to upload or drag and drop
              </p>
              <p className="text-gray-400 text-sm mb-1">
                MP4, WebM, QuickTime, AVI, WMV
              </p>
              <p className="text-gray-500 text-xs">
                Max size: {formatFileSize(maxSize)}
              </p>
              {error && (
                <div className="mt-4 flex items-center justify-center gap-2 text-red-400">
                  <FiAlertCircle className="h-4 w-4" />
                  <span className="text-sm">{error}</span>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="relative border border-gray-700 rounded-lg overflow-hidden bg-gray-900">
          {displayVideo.thumbnailUrl ? (
            <div className="relative aspect-video">
              <img
                src={displayVideo.thumbnailUrl}
                alt="Video thumbnail"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <FiVideo className="h-12 w-12 text-white" />
              </div>
              <div className="absolute top-2 right-2">
                <button
                  onClick={handleRemove}
                  disabled={disabled || uploading}
                  className="p-2 bg-red-600 hover:bg-red-700 rounded-full transition-colors disabled:opacity-50"
                  aria-label="Remove video"
                >
                  <FiX className="h-4 w-4 text-white" />
                </button>
              </div>
            </div>
          ) : (
            <div className="aspect-video bg-gray-800 flex items-center justify-center">
              <FiVideo className="h-16 w-16 text-gray-600" />
            </div>
          )}
          <div className="p-4 bg-gray-900">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <FiCheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-white text-sm font-medium">Video uploaded</span>
              </div>
              {!disabled && (
                <button
                  onClick={handleRemove}
                  className="text-red-400 hover:text-red-300 transition-colors"
                  aria-label="Remove video"
                >
                  <FiX className="h-5 w-5" />
                </button>
              )}
            </div>
            {displayVideo.duration > 0 && (
              <p className="text-gray-400 text-xs">
                Duration: {Math.floor(displayVideo.duration / 60)}:{(displayVideo.duration % 60).toString().padStart(2, '0')}
              </p>
            )}
            {displayVideo.fileSize > 0 && (
              <p className="text-gray-400 text-xs">
                Size: {formatFileSize(displayVideo.fileSize)}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoUpload;

