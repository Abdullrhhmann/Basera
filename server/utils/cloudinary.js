const cloudinary = require('cloudinary').v2;
const multer = require('multer');

// Configure Cloudinary
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.error('ERROR: Missing Cloudinary environment variables!');
  console.error('Required variables: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET');
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure multer for memory storage (we'll upload to Cloudinary manually)
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit for videos
    files: 20 // Maximum number of files per request
  },
  fileFilter: (req, file, cb) => {
    // Allow images and videos
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      console.error('File filter - REJECTED - Invalid file type:', file.mimetype);
      cb(new Error(`Invalid file type: ${file.mimetype}. Only image and video files are allowed!`), false);
    }
  },
});

// Separate multer config for PDF documents (CVs)
const uploadDocument = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for PDFs
    files: 1 // Single file only
  },
  fileFilter: (req, file, cb) => {
    // Allow PDF files only
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      console.error('File filter - REJECTED - Invalid file type:', file.mimetype);
      cb(new Error(`Invalid file type: ${file.mimetype}. Only PDF files are allowed!`), false);
    }
  },
});

// Helper function to upload PDF/document to Cloudinary
const uploadDocumentToCloudinary = (file, folderOrOptions = 'basira-cvs') => {
  // Handle both old signature (folder string) and new signature (options object)
  const options = typeof folderOrOptions === 'string' 
    ? { folder: folderOrOptions }
    : folderOrOptions;
  
  const {
    folder = 'basira-cvs',
    resource_type = 'raw' // Use 'raw' for PDFs to preserve file integrity
  } = options;

  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder,
      resource_type,
      allowed_formats: ['pdf'],
      use_filename: true,
      unique_filename: true
    };

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          console.error('=== CLOUDINARY PDF UPLOAD FAILED ===');
          console.error('Error details:', {
            message: error.message,
            http_code: error.http_code,
            error_code: error.code,
            file_size: file.size,
            file_type: file.mimetype
          });
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    uploadStream.end(file.buffer);
  });
};


// Helper function to upload to Cloudinary with advanced optimizations
const uploadToCloudinary = (file, options = {}) => {
  return new Promise((resolve, reject) => {
    const {
      folder = 'basira-properties',
      generateSprites = false,
      quality = 'auto',
      format,
      createDerived = true,
      maxWidth = 1920,
      maxHeight = 1080
    } = options;

    // Determine upload parameters based on file type
    const isVideo = file.mimetype.startsWith('video/');
    const isImage = file.mimetype.startsWith('image/');

    const uploadOptions = {
      folder,
      resource_type: isVideo ? 'video' : 'image',
    };

    if (quality) {
      uploadOptions.quality = quality;
    }

    if (format && format !== 'auto') {
      uploadOptions.format = format;
    }

    // Advanced image transformations
    if (isImage) {
      uploadOptions.transformation = [
        {
          width: maxWidth,
          height: maxHeight,
          crop: 'limit',
          quality: 'auto',
          fetch_format: 'auto',
        },
      ];

      // Create derived images for different use cases
      if (createDerived) {
        uploadOptions.eager = [
          // Thumbnail (300x200)
          { width: 300, height: 200, crop: 'fill', quality: 'auto', format: 'webp' },
          // Medium (800x600)
          { width: 800, height: 600, crop: 'fit', quality: 'auto', format: 'webp' },
          // Large (1200x900)
          { width: 1200, height: 900, crop: 'limit', quality: 'auto', format: 'webp' },
          // Hero (1920x1080)
          { width: 1920, height: 1080, crop: 'fill', quality: 'auto', format: 'webp' }
        ];
      }
    }

    // Video-specific optimizations
    if (isVideo) {
      uploadOptions.transformation = [
        { quality: 'auto' }
      ];

      if (createDerived) {
        uploadOptions.eager = [
          // Video thumbnail
          { width: 300, height: 200, crop: 'fill', quality: 'auto', format: 'webp' },
          // Video preview (low quality)
          { quality: '30', format: 'webm' }
        ];
      }
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          console.error('=== CLOUDINARY UPLOAD FAILED ===');
          console.error('Error details:', {
            message: error.message,
            http_code: error.http_code,
            error_code: error.code,
            file_size: file.size,
            file_type: file.mimetype
          });
          reject(error);
        } else {
          resolve(result);
        }
      }
    );
    uploadStream.end(file.buffer);
  });
};

// Generate optimized image URLs for different use cases
const generateImageTransforms = (publicId, options = {}) => {
  const {
    width = 800,
    height = 600,
    quality = 'auto',
    format = 'auto',
    crop = 'fill',
    effects = []
  } = options;

  const transformations = [
    { width, height, crop, quality, format }
  ];

  // Add effects if specified
  if (effects.length > 0) {
    transformations.push(...effects);
  }

  return cloudinary.url(publicId, {
    transformation: transformations,
    secure: true
  });
};

// Batch upload multiple files with progress tracking
const uploadMultipleToCloudinary = async (files, folder = 'basira-properties') => {
  const uploadPromises = files.map((file, index) => {
    return new Promise((resolve, reject) => {
      uploadToCloudinary(file, { folder })
        .then(result => {
          resolve(result);
        })
        .catch(error => {
          console.error(`Failed to upload file ${index + 1}:`, error);
          reject(error);
        });
    });
  });

  try {
   const results = await Promise.allSettled(uploadPromises);
   const successful = results.filter(r => r.status === 'fulfilled').map(r => r.value);
   const failed = results.filter(r => r.status === 'rejected').map(r => r.reason);

    return {
      successful,
      failed,
      total: files.length,
      successCount: successful.length,
      failureCount: failed.length
    };
  } catch (error) {
    console.error('Batch upload error:', error);
    throw error;
  }
};

// Delete multiple images at once
const deleteMultipleFromCloudinary = async (publicIds) => {
  try {
    const deletePromises = publicIds.map(publicId => {
      return new Promise((resolve, reject) => {
        cloudinary.uploader.destroy(publicId, (error, result) => {
          if (error) {
            console.error(`Failed to delete ${publicId}:`, error);
            reject(error);
          } else {
            resolve(result);
          }
        });
      });
    });

    const results = await Promise.allSettled(deletePromises);
    const successful = results.filter(r => r.status === 'fulfilled').map(r => r.value);
    const failed = results.filter(r => r.status === 'rejected').map(r => r.reason);

    return {
      successful,
      failed,
      total: publicIds.length,
      successCount: successful.length,
      failureCount: failed.length
    };
  } catch (error) {
    console.error('Batch delete error:', error);
    throw error;
  }
};

// Get optimized image info
const getOptimizedImageInfo = (publicId) => {
  return {
    original: cloudinary.url(publicId, { secure: true }),
    thumbnail: generateImageTransforms(publicId, { width: 300, height: 200 }),
    medium: generateImageTransforms(publicId, { width: 800, height: 600 }),
    large: generateImageTransforms(publicId, { width: 1200, height: 900 }),
    hero: generateImageTransforms(publicId, { width: 1920, height: 1080 }),
    // WebP versions for modern browsers
    webp: {
      thumbnail: generateImageTransforms(publicId, { width: 300, height: 200, format: 'webp' }),
      medium: generateImageTransforms(publicId, { width: 800, height: 600, format: 'webp' }),
      large: generateImageTransforms(publicId, { width: 1200, height: 900, format: 'webp' }),
      hero: generateImageTransforms(publicId, { width: 1920, height: 1080, format: 'webp' })
    }
  };
};

module.exports = {
  cloudinary,
  upload,
  uploadDocument,
  uploadDocumentToCloudinary,
  uploadToCloudinary,
  generateImageTransforms,
  uploadMultipleToCloudinary,
  deleteMultipleFromCloudinary,
  getOptimizedImageInfo,
};
