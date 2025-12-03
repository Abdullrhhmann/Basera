const express = require('express');
const router = express.Router();
const {
  upload,
  uploadDocument,
  uploadDocumentToCloudinary,
  uploadToCloudinary,
  uploadMultipleToCloudinary,
  deleteMultipleFromCloudinary,
  getOptimizedImageInfo
} = require('../utils/cloudinary');
const { authMiddleware } = require('../middleware/auth');
const cloudinary = require('cloudinary').v2;

// Test endpoint to verify uploads route is working
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Uploads route is working!',
    timestamp: new Date().toISOString(),
    cloudinaryConfigured: !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)
  });
});

// Upload single image with optimizations
router.post('/image', authMiddleware, upload.single('image'), async (req, res) => {
  // Check if multer processed the file
  if (!req.file) {
    console.error('MULTER ERROR: No file received by multer middleware');
    console.error('Request body:', req.body);
    console.error('Request headers:', req.headers);
    return res.status(400).json({
      success: false,
      message: 'No file received by server. Please check file size and format.',
      debug: {
        contentType: req.headers['content-type'],
        hasBody: !!req.body,
        bodyKeys: Object.keys(req.body || {}),
        multerError: req.fileError
      }
    });
  }
  try {
    if (!req.file) {
      console.error('No file received in request');
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    // Determine upload options based on file type and request parameters
    const isVideo = req.file.mimetype.startsWith('video/');
    const uploadOptions = {
      folder: req.body.folder || 'basira-properties',
      quality: req.body.quality || 'auto',
      format: req.body.format || 'auto',
      createDerived: req.body.createDerived !== 'false', // Default to true
      maxWidth: parseInt(req.body.maxWidth) || 1920,
      maxHeight: parseInt(req.body.maxHeight) || 1080
    };

    // Upload to Cloudinary with optimizations
    const result = await uploadToCloudinary(req.file, uploadOptions);

    // Get optimized image URLs if it's an image
    let optimizedUrls = {};
    if (!isVideo && result.public_id) {
      optimizedUrls = getOptimizedImageInfo(result.public_id);
    }

    const responseData = {
      public_id: result.public_id,
      publicId: result.public_id,
      url: result.secure_url,
      width: result.width || 0,
      height: result.height || 0,
      format: result.format,
      bytes: result.bytes,
      originalSize: req.file.size,
      compressedSize: result.bytes,
      compressionRatio: req.file.size > 0 ? (1 - result.bytes / req.file.size) * 100 : 0,
      optimizedUrls: optimizedUrls,
      // Include eager transformations if available
      derived: result.eager || []
    };

    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully with optimizations',
      data: responseData
    });
  } catch (error) {
    console.error('Upload error:', error);

    // Provide more specific error messages
    let errorMessage = 'Failed to upload image';
    if (error.message.includes('File size too large')) {
      errorMessage = 'File size exceeds the maximum allowed limit';
    } else if (error.message.includes('Invalid file type')) {
      errorMessage = 'Invalid file type. Only images and videos are allowed';
    } else if (error.message.includes('Network')) {
      errorMessage = 'Network error. Please check your connection and try again';
    }

    res.status(500).json({
      success: false,
      message: errorMessage,
      error: error.message,
      code: error.code || 'UPLOAD_ERROR'
    });
  }
});

// Upload video with metadata extraction and thumbnail generation
router.post('/video', authMiddleware, upload.single('video'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No video file provided'
    });
  }

  try {
    // Validate it's a video file
    if (!req.file.mimetype.startsWith('video/')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file type. Only video files are allowed'
      });
    }

    const uploadOptions = {
      folder: req.body.folder || 'basira-videos',
      resource_type: 'video',
      quality: 'auto',
      format: 'mp4', // Ensure MP4 format for better compatibility
      eager: [
        // Generate thumbnail from video frame at 30% of duration
        {
          width: 640,
          height: 360,
          crop: 'fill',
          quality: 'auto',
          format: 'jpg',
          start_offset: '30p' // 30% of video duration
        }
      ],
      eager_async: true,
      // Video optimization for streaming
      transformation: [
        { 
          quality: 'auto',
          format: 'mp4',
          video_codec: 'h264', // H.264 codec for better compatibility
          audio_codec: 'aac'
        }
      ],
      // Enable streaming delivery
      streaming_profile: 'sd' // Standard definition streaming profile
    };

    // Upload to Cloudinary
    const result = await uploadToCloudinary(req.file, uploadOptions);

    // Extract video metadata
    let duration = 0;
    let width = 0;
    let height = 0;
    let format = 'mp4';
    let fileSize = result.bytes || req.file.size;
    let thumbnailUrl = null;

    // Get video metadata from Cloudinary
    try {
      const videoInfo = await cloudinary.api.resource(result.public_id, {
        resource_type: 'video',
        image_metadata: true,
        video_metadata: true
      });

      duration = videoInfo.duration || 0;
      width = videoInfo.width || 0;
      height = videoInfo.height || 0;
      format = videoInfo.format || 'mp4';
      fileSize = videoInfo.bytes || fileSize;

      // Get thumbnail URL (from eager transformations)
      if (result.eager && result.eager.length > 0) {
        thumbnailUrl = result.eager[0].secure_url;
      } else {
        // Generate thumbnail URL manually
        thumbnailUrl = cloudinary.url(result.public_id, {
          resource_type: 'video',
          transformation: [
            { width: 640, height: 360, crop: 'fill', quality: 'auto', format: 'jpg', start_offset: '30p' }
          ],
          secure: true
        });
      }
    } catch (metadataError) {
      console.error('Error fetching video metadata:', metadataError);
      // Continue without metadata if fetch fails
      if (result.eager && result.eager.length > 0) {
        thumbnailUrl = result.eager[0].secure_url;
      }
    }

    const responseData = {
      public_id: result.public_id,
      publicId: result.public_id,
      videoUrl: result.secure_url,
      url: result.secure_url,
      thumbnailUrl: thumbnailUrl,
      duration: Math.round(duration),
      width: width,
      height: height,
      format: format,
      fileSize: fileSize,
      bytes: fileSize,
      originalSize: req.file.size,
      compressionRatio: req.file.size > 0 ? (1 - fileSize / req.file.size) * 100 : 0
    };

    res.status(200).json({
      success: true,
      message: 'Video uploaded successfully with metadata extraction',
      data: responseData
    });
  } catch (error) {
    console.error('Video upload error:', error);

    let errorMessage = 'Failed to upload video';
    if (error.message.includes('File size too large')) {
      errorMessage = 'Video file size exceeds the maximum allowed limit (100MB)';
    } else if (error.message.includes('Invalid file type')) {
      errorMessage = 'Invalid file type. Only video files are allowed';
    } else if (error.message.includes('Network')) {
      errorMessage = 'Network error. Please check your connection and try again';
    }

    res.status(500).json({
      success: false,
      message: errorMessage,
      error: error.message,
      code: error.code || 'VIDEO_UPLOAD_ERROR'
    });
  }
});

// Upload multiple images
router.post('/images', authMiddleware, upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No image files provided'
      });
    }

    // Upload all images to Cloudinary
    const uploadPromises = req.files.map(file => uploadToCloudinary(file, 'basira-properties'));
    const results = await Promise.all(uploadPromises);

    const uploadedImages = results.map(result => ({
      public_id: result.public_id,
      publicId: result.public_id,
      url: result.secure_url,
      width: result.width || 0,
      height: result.height || 0,
      format: result.format,
      bytes: result.bytes,
    }));

    res.status(200).json({
      success: true,
      message: 'Images uploaded successfully',
      data: uploadedImages
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload images',
      error: error.message
    });
  }
});

// Delete image from Cloudinary
router.delete('/image/:public_id', authMiddleware, async (req, res) => {
  try {
    const { public_id } = req.params;

    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(public_id, (error, result) => {
        if (error) {
          console.error('Cloudinary delete error:', error);
          reject(error);
        } else {
          resolve(result);
        }
      });
    });

    if (result.result === 'ok') {
      res.status(200).json({
        success: true,
        message: 'Image deleted successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to delete image'
      });
    }
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete image',
      error: error.message
    });
  }
});

// Batch upload multiple images with advanced options
router.post('/batch', authMiddleware, upload.array('images', 20), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No image files provided'
      });
    }

    // Get batch upload options from request
    const batchOptions = {
      folder: req.body.folder || 'basira-properties',
      quality: req.body.quality || 'auto',
      format: req.body.format || 'auto',
      createDerived: req.body.createDerived !== 'false',
      maxWidth: parseInt(req.body.maxWidth) || 1920,
      maxHeight: parseInt(req.body.maxHeight) || 1080
    };

    // Use the batch upload function
    const batchResult = await uploadMultipleToCloudinary(req.files, batchOptions.folder);

    if (batchResult.successCount === 0) {
      return res.status(500).json({
        success: false,
        message: 'All uploads failed',
        data: batchResult
      });
    }

    // Format successful uploads with optimization data
    const uploadedImages = batchResult.successful.map(result => ({
      public_id: result.public_id,
      url: result.secure_url,
      width: result.width || 0,
      height: result.height || 0,
      format: result.format,
      bytes: result.bytes,
      derived: result.eager || []
    }));

    res.status(200).json({
      success: true,
      message: `Successfully uploaded ${batchResult.successCount} of ${batchResult.total} images`,
      data: {
        uploadedImages,
        summary: {
          total: batchResult.total,
          successful: batchResult.successCount,
          failed: batchResult.failureCount
        },
        ...(batchResult.failed.length > 0 && {
          errors: batchResult.failed.map(f => f.message || f.toString())
        })
      }
    });
  } catch (error) {
    console.error('Batch upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload images',
      error: error.message
    });
  }
});

// Get optimized image URLs for different use cases
router.get('/optimize/:public_id', authMiddleware, async (req, res) => {
  try {
    const { public_id } = req.params;
    const {
      width = 800,
      height = 600,
      quality = 'auto',
      format = 'auto',
      crop = 'fill'
    } = req.query;

    const optimizedUrls = getOptimizedImageInfo(public_id);

    // Generate custom size if specified
    if (width && height) {
      const { generateImageTransforms } = require('../utils/cloudinary');
      optimizedUrls.custom = generateImageTransforms(public_id, {
        width: parseInt(width),
        height: parseInt(height),
        quality,
        format,
        crop
      });
    }

    res.status(200).json({
      success: true,
      message: 'Optimized URLs generated successfully',
      data: {
        public_id,
        optimizedUrls,
        requestedSize: width && height ? { width, height, quality, format, crop } : null
      }
    });
  } catch (error) {
    console.error('Optimization error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate optimized URLs',
      error: error.message
    });
  }
});

// Batch delete multiple images
router.delete('/batch', authMiddleware, async (req, res) => {
  try {
    const { public_ids } = req.body;

    if (!public_ids || !Array.isArray(public_ids) || public_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No public IDs provided for deletion'
      });
    }

    const deleteResult = await deleteMultipleFromCloudinary(public_ids);

    res.status(200).json({
      success: true,
      message: `Successfully deleted ${deleteResult.successCount} of ${deleteResult.total} images`,
      data: {
        summary: {
          total: deleteResult.total,
          successful: deleteResult.successCount,
          failed: deleteResult.failureCount
        },
        ...(deleteResult.failed.length > 0 && {
          errors: deleteResult.failed.map(f => f.message || f.toString())
        })
      }
    });
  } catch (error) {
    console.error('Batch delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete images',
      error: error.message
    });
  }
});

// Get upload statistics and optimization info
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    // This would typically query your database for upload statistics
    // For now, we'll return basic Cloudinary configuration info
    const stats = {
      cloudinaryConfigured: !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET),
      features: {
        autoFormat: true,
        autoQuality: true,
        responsiveImages: true,
        webpSupport: true,
        batchUpload: true,
        batchDelete: true,
        imageCompression: true
      },
      limits: {
        maxFileSize: '100MB for videos, 10MB for images before compression',
        maxFilesPerBatch: 20,
        supportedFormats: 'Images (JPEG, PNG, WebP, AVIF) and Videos (MP4, WebM)'
      }
    };

    res.status(200).json({
      success: true,
      message: 'Upload statistics retrieved successfully',
      data: stats
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve upload statistics',
      error: error.message
    });
  }
});

// Upload PDF document (for CVs)
// @route   POST /api/uploads/document
// @desc    Upload PDF document (public - no auth required for job applications)
// @access  Public
router.post('/document', uploadDocument.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No PDF file provided'
      });
    }

    // Verify it's a PDF
    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({
        success: false,
        message: 'Only PDF files are allowed'
      });
    }

    // Upload to Cloudinary
    const result = await uploadDocumentToCloudinary(req.file, 'basira-cvs');

    res.status(200).json({
      success: true,
      message: 'Document uploaded successfully',
      data: {
        public_id: result.public_id,
        publicId: result.public_id,
        url: result.secure_url,
        format: result.format,
        bytes: result.bytes,
        originalSize: req.file.size
      }
    });
  } catch (error) {
    console.error('Document upload error:', error);

    let errorMessage = 'Failed to upload document';
    if (error.message.includes('File size too large')) {
      errorMessage = 'File size exceeds the maximum allowed limit (5MB)';
    } else if (error.message.includes('Invalid file type')) {
      errorMessage = 'Invalid file type. Only PDF files are allowed';
    } else if (error.message.includes('Network')) {
      errorMessage = 'Network error. Please check your connection and try again';
    }

    res.status(500).json({
      success: false,
      message: errorMessage,
      error: error.message,
      code: error.code || 'UPLOAD_ERROR'
    });
  }
});

// Upload PDF brochure (admin only)
// @route   POST /api/uploads/brochure
// @desc    Upload PDF brochure (admin only)
// @access  Private (Admin)
router.post('/brochure', authMiddleware, uploadDocument.single('brochure'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No PDF file provided'
      });
    }

    // Verify it's a PDF
    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({
        success: false,
        message: 'Only PDF files are allowed'
      });
    }

    // Upload to Cloudinary in brochures folder
    const result = await uploadDocumentToCloudinary(req.file, 'basira-brochures');

    res.status(200).json({
      success: true,
      message: 'Brochure uploaded successfully',
      data: {
        public_id: result.public_id,
        publicId: result.public_id,
        url: result.secure_url,
        format: result.format,
        bytes: result.bytes,
        originalSize: req.file.size
      }
    });
  } catch (error) {
    console.error('Brochure upload error:', error);

    let errorMessage = 'Failed to upload brochure';
    if (error.message.includes('File size too large')) {
      errorMessage = 'File size exceeds the maximum allowed limit (5MB)';
    } else if (error.message.includes('Invalid file type')) {
      errorMessage = 'Invalid file type. Only PDF files are allowed';
    } else if (error.message.includes('Network')) {
      errorMessage = 'Network error. Please check your connection and try again';
    }

    res.status(500).json({
      success: false,
      message: errorMessage,
      error: error.message,
      code: error.code || 'UPLOAD_ERROR'
    });
  }
});

module.exports = router;
