/**
 * Video utility functions
 */

/**
 * Format duration in seconds to MM:SS or HH:MM:SS format
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration string
 */
export const formatDuration = (seconds) => {
  if (!seconds || isNaN(seconds)) return '0:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Generate thumbnail URL from video URL (Cloudinary)
 * @param {string} videoUrl - Video URL
 * @param {object} options - Thumbnail options (width, height, offset)
 * @returns {string} Thumbnail URL
 */
export const generateThumbnailUrl = (videoUrl, options = {}) => {
  if (!videoUrl) return null;

  const { width = 640, height = 360, offset = '30p' } = options;

  // If it's a Cloudinary URL, generate thumbnail URL
  if (videoUrl.includes('cloudinary.com')) {
    // Extract public ID from Cloudinary URL
    const publicIdMatch = videoUrl.match(/\/v\d+\/(.+)\.(mp4|webm|mov)/i);
    if (publicIdMatch && publicIdMatch[1]) {
      const publicId = publicIdMatch[1];
      const baseUrl = videoUrl.split('/upload/')[0] + '/upload/';
      return `${baseUrl}w_${width},h_${height},c_fill,q_auto,f_jpg,so_${offset}/${publicId}.jpg`;
    }
  }

  // Fallback: return video URL (some players can generate thumbnails)
  return videoUrl;
};

/**
 * Generate thumbnail URL from video URL (simple version for VideoCard)
 * @param {string} videoUrl - Video URL
 * @returns {string} Thumbnail URL or null
 */
export const generateThumbnailFromUrl = (videoUrl) => {
  if (!videoUrl) return null;
  
  // If Cloudinary URL, generate thumbnail
  if (videoUrl.includes('cloudinary.com')) {
    const publicIdMatch = videoUrl.match(/\/v\d+\/(.+)\.(mp4|webm|mov)/i);
    if (publicIdMatch && publicIdMatch[1]) {
      const publicId = publicIdMatch[1];
      const baseUrl = videoUrl.split('/upload/')[0] + '/upload/';
      return `${baseUrl}w_640,h_360,c_fill,q_auto,f_jpg,so_30p/${publicId}.jpg`;
    }
  }
  
  return null;
};

/**
 * Validate video file
 * @param {File} file - Video file
 * @returns {object} Validation result { valid: boolean, error?: string }
 */
export const validateVideoFile = (file) => {
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  // Check file type
  const validTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-ms-wmv'];
  if (!validTypes.includes(file.type)) {
    return { 
      valid: false, 
      error: 'Invalid file type. Supported formats: MP4, WebM, QuickTime, AVI, WMV' 
    };
  }

  // Check file size (100MB limit)
  const maxSize = 100 * 1024 * 1024; // 100MB
  if (file.size > maxSize) {
    return { 
      valid: false, 
      error: 'File size exceeds 100MB limit' 
    };
  }

  return { valid: true };
};

/**
 * Calculate formatted file size
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size (e.g., "10.5 MB")
 */
export const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = Math.round((bytes / Math.pow(1024, i)) * 100) / 100;
  
  return `${size} ${sizes[i]}`;
};

/**
 * Extract video metadata from Cloudinary response
 * @param {object} cloudinaryResponse - Cloudinary upload response
 * @returns {object} Video metadata
 */
export const extractVideoMetadata = (cloudinaryResponse) => {
  if (!cloudinaryResponse) return null;

  return {
    videoUrl: cloudinaryResponse.secure_url || cloudinaryResponse.url,
    publicId: cloudinaryResponse.public_id || cloudinaryResponse.publicId,
    thumbnailUrl: cloudinaryResponse.eager?.[0]?.secure_url || null,
    duration: cloudinaryResponse.duration || 0,
    width: cloudinaryResponse.width || 0,
    height: cloudinaryResponse.height || 0,
    format: cloudinaryResponse.format || 'mp4',
    fileSize: cloudinaryResponse.bytes || 0
  };
};

