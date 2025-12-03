import React, { useState, useRef, useCallback } from 'react';
import { FiUpload, FiX, FiFileText, FiAlertCircle, FiCheck } from '../../icons/feather';
import { uploadsAPI } from '../../utils/api';

const FileUpload = ({
  onFileUpload,
  onFileRemove,
  uploadedFile = null,
  disabled = false,
  className = '',
  maxSize = 5 * 1024 * 1024, // 5MB default
  accept = 'application/pdf'
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const validateFile = useCallback((file) => {
    setError('');

    // Check file type
    if (file.type !== 'application/pdf') {
      setError('Only PDF files are allowed');
      return false;
    }

    // Check file size
    if (file.size > maxSize) {
      setError(`File size must be less than ${(maxSize / 1024 / 1024).toFixed(0)}MB`);
      return false;
    }

    // Check file extension
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('File must have a .pdf extension');
      return false;
    }

    return true;
  }, [maxSize]);

  const handleFileUpload = useCallback(async (file) => {
    if (!file || !validateFile(file)) {
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setError('');

    try {
      const formData = new FormData();
      formData.append('document', file);

      // Create a progress event handler
      const config = {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(percentCompleted);
        }
      };

      const response = await uploadsAPI.uploadDocument(formData, config);
      
      if (response.data.success && response.data.data) {
        const uploadedData = {
          url: response.data.data.url,
          publicId: response.data.data.publicId || response.data.data.public_id,
          fileName: file.name,
          fileSize: file.size
        };

        if (onFileUpload) {
          onFileUpload(uploadedData);
        }
      } else {
        throw new Error(response.data.message || 'Upload failed');
      }
    } catch (err) {
      console.error('File upload error:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to upload file. Please try again.';
      setError(errorMessage);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [validateFile, onFileUpload]);

  const handleFileSelect = useCallback((event) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFileUpload]);

  const handleRemove = useCallback(() => {
    if (onFileRemove) {
      onFileRemove();
    }
    setError('');
  }, [onFileRemove]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled || uploading) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  }, [disabled, uploading, handleFileUpload]);

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Upload Area */}
      {!uploadedFile && (
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            disabled || uploading
              ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
              : isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50 cursor-pointer'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileSelect}
            disabled={disabled || uploading}
            className="hidden"
          />

          <div className="flex flex-col items-center space-y-2">
            {uploading ? (
              <>
                <div className="relative w-12 h-12">
                  <div className="absolute inset-0 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                </div>
                <p className="text-sm text-gray-600">Uploading... {uploadProgress}%</p>
              </>
            ) : (
              <>
                <FiUpload className="h-8 w-8 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">
                    Drag and drop your CV here, or click to select
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    PDF only, max {formatFileSize(maxSize)}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
          <FiAlertCircle className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Uploaded File Display */}
      {uploadedFile && (
        <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <FiFileText className="h-5 w-5 text-green-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {uploadedFile.fileName || 'CV.pdf'}
              </p>
              {uploadedFile.fileSize && (
                <p className="text-xs text-gray-500">
                  {formatFileSize(uploadedFile.fileSize)}
                </p>
              )}
            </div>
            <FiCheck className="h-5 w-5 text-green-600 flex-shrink-0" />
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={handleRemove}
              className="ml-3 p-1 text-red-600 hover:text-red-700 hover:bg-red-100 rounded transition-colors"
              aria-label="Remove file"
            >
              <FiX className="h-5 w-5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
