import React, { useState, useRef, useCallback } from 'react';
import { Cloud, X, AlertCircle, CheckCircle, Loader2, Image as ImageIcon } from 'lucide-react';
import { uploadsAPI } from '../../utils/api';

const ImageUpload = ({
  onImageUpload,
  onImageRemove,
  uploadedImages = [],
  maxImages = 10,
  disabled = false,
  className = '',
  enableCompression = true,
  quality = 0.8,
  maxWidth = 1920,
  maxHeight = 1080
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [error, setError] = useState('');
  const [compressionProgress, setCompressionProgress] = useState({});
  const fileInputRef = useRef(null);
  const normalizeUploadPayload = useCallback((data) => {
    if (!data) return null;

    const url = data.secure_url || data.url;
    if (!url) return null;

    const publicId = data.publicId || data.public_id || null;

    const normalized = {
      ...data,
      url,
    };

    if (publicId) {
      normalized.publicId = publicId;
      normalized.public_id = publicId;
    }

    return normalized;
  }, []);

  // Image compression utility
  const compressImage = useCallback(async (file, maxWidth, maxHeight, quality) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          } else {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };

      img.src = URL.createObjectURL(file);
    });
  }, []);

  const handleFileSelect = async (event) => {
    const files = Array.from(event.target.files);

    if (files.length === 0) return;

    // Check if adding these files would exceed the limit
    if (uploadedImages.length + files.length > maxImages) {
      setError(`You can only upload up to ${maxImages} files`);
      return;
    }

    setUploading(true);
    setError('');

    try {
      const results = await Promise.allSettled(
        files.map(async (file) => {
          setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
          setCompressionProgress(prev => ({ ...prev, [file.name]: 0 }));

          if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
            const message = 'Please select only image or video files';
            setError(message);
            throw new Error(message);
          }

          const isVideo = file.type.startsWith('video/');
          const maxSize = isVideo ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
          if (file.size > maxSize) {
            const message = `Each ${isVideo ? 'video' : 'image'} must be smaller than ${isVideo ? '100MB' : '10MB'}`;
            setError(message);
            throw new Error(message);
          }

          let processedFile = file;

          if (enableCompression && file.type.startsWith('image/')) {
            setCompressionProgress(prev => ({ ...prev, [file.name]: 50 }));
            try {
              processedFile = await compressImage(file, maxWidth, maxHeight, quality);
              setCompressionProgress(prev => ({ ...prev, [file.name]: 100 }));
            } catch (compressionError) {
              console.error('Compression failed, using original file:', compressionError);
              setCompressionProgress(prev => ({ ...prev, [file.name]: 0 }));
              processedFile = file;
            }
          } else {
            setCompressionProgress(prev => ({ ...prev, [file.name]: 100 }));
          }

          const formData = new FormData();
          formData.append('image', processedFile);
          formData.append('originalName', file.name);
          formData.append('fileSize', processedFile.size.toString());
          formData.append('folder', 'basira-properties');

          const response = await uploadsAPI.uploadImage(formData, {
            onUploadProgress: (progressEvent) => {
              const total = progressEvent.total || processedFile.size;
              const percent = total ? Math.round((progressEvent.loaded / total) * 100) : 0;
              setUploadProgress(prev => ({ ...prev, [file.name]: percent }));
            },
          });

          setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));

          const payload = response.data?.data || response.data?.image || response.data;
          const normalized = normalizeUploadPayload(payload);

          if (!normalized) {
            const message = 'Upload response missing image data';
            setError(message);
            throw new Error(message);
          }

          onImageUpload(normalized);
          return normalized;
        })
      );

      const failedUploads = results.filter(result => result.status === 'rejected');
      if (failedUploads.length > 0) {
        if (failedUploads.length === files.length) {
          setError('Failed to upload files. Please try again.');
        } else {
          setError(`${failedUploads.length} ${failedUploads.length === 1 ? 'file was' : 'files were'} not uploaded.`);
        }
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError('Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress({});
      setCompressionProgress({});
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = async (publicId) => {
    try {
      const imageObj = uploadedImages.find(img => img.public_id === publicId || img.publicId === publicId);

      const actualPublicId = imageObj?.public_id || imageObj?.publicId || publicId;
      if (!actualPublicId) {
        setError('Invalid image identifier');
        return;
      }

      await uploadsAPI.deleteImage(actualPublicId);
      onImageRemove(actualPublicId);
      setError('');
    } catch (err) {
      console.error('Delete error:', err);
      const message = err?.response?.data?.message || err.message || 'Failed to delete file';
      setError(`Failed to delete file: ${message}`);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (disabled || uploading) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      // Create a synthetic event to reuse the file handling logic
      const syntheticEvent = { target: { files } };
      handleFileSelect(syntheticEvent);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          disabled || uploading
            ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
            : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50 cursor-pointer'
        }`}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={handleFileSelect}
          disabled={disabled || uploading}
          className="hidden"
        />

        <div className="flex flex-col items-center space-y-2">
          {uploading ? (
            <>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-sm text-gray-600">Uploading...</p>
            </>
          ) : (
            <>
              <Cloud className="h-8 w-8 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">
                  Drag and drop images and videos here, or click to select
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Up to {maxImages} files, images max 10MB, videos max 100MB each
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Uploaded Files Grid */}
      {uploadedImages.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {uploadedImages.map((file) => {
            const isVideo = file.url && file.url.includes('.mp4');

            return (
              <div key={file.public_id || file.publicId} className="relative group">
                {isVideo ? (
                  <div className="w-full h-24 bg-gray-200 rounded-lg flex items-center justify-center">
                    <video
                      src={file.url}
                      className="w-full h-full object-cover rounded-lg"
                      muted
                      onMouseEnter={(e) => e.target.play()}
                      onMouseLeave={(e) => e.target.pause()}
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-[#131c2b] bg-opacity-30 rounded-lg">
                      <span className="text-white text-xs font-medium">VIDEO</span>
                    </div>
                  </div>
                ) : (
                  <img
                    src={file.url}
                    alt="Uploaded"
                    className="w-full h-24 object-cover rounded-lg"
                  />
                )}
                <button
                  type="button"
                  onClick={() => handleRemoveImage(file.public_id || file.publicId)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  disabled={disabled}
                  aria-label={`Remove ${isVideo ? 'video' : 'image'} ${file.original_filename || ''}`}
                >
                  <X className="h-3 w-3" />
                </button>
                <div className="absolute bottom-0 left-0 right-0 bg-[#131c2b] bg-opacity-50 text-white text-xs p-1 rounded-b-lg">
                  {isVideo ? 'VIDEO' : (file.width && file.height ? `${file.width} x ${file.height}` : 'IMAGE')}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Progress */}
      {uploadedImages.length > 0 && (
        <div className="text-sm text-gray-600">
          {uploadedImages.length} of {maxImages} files uploaded
        </div>
      )}
    </div>
  );
};

export default ImageUpload;

