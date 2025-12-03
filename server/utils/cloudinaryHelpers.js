const { cloudinary } = require('./cloudinary');

/**
 * Resolve image reference to full URL
 * Supports direct HTTP/HTTPS URLs and Cloudinary public_ids
 * @param {string} imageReference - Either a public_id or full URL
 * @returns {Promise<string|null>} - Full URL or null if invalid
 */
async function resolveImageUrl(imageReference) {
  if (!imageReference) {
    return null;
  }

  // If it's already a full URL (HTTP/HTTPS), return as-is
  if (imageReference.startsWith('http://') || imageReference.startsWith('https://')) {
    // Accept any valid URL format - no Cloudinary restriction
    return imageReference;
  }

  // If it's a public_id, try to fetch from Cloudinary API (only if credentials are available)
  if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    try {
      const result = await cloudinary.api.resource(imageReference, {
        resource_type: 'image'
      });
      return result.secure_url;
    } catch (error) {
      // Try video resource type
      try {
        const result = await cloudinary.api.resource(imageReference, {
          resource_type: 'video'
        });
        return result.secure_url;
      } catch (videoError) {
        console.log(`Image/Video not found in Cloudinary: ${imageReference}`);
        return null;
      }
    }
  } else {
    // No Cloudinary credentials - treat as potential URL fragment or return null
    console.log(`Cloudinary not configured, skipping public_id lookup: ${imageReference}`);
    return null;
  }
}

/**
 * Resolve multiple image references
 * @param {Array<string>} imageReferences - Array of public_ids or URLs
 * @returns {Promise<Array<{original: string, resolved: string|null}>>}
 */
async function resolveMultipleImageUrls(imageReferences) {
  if (!Array.isArray(imageReferences)) {
    return [];
  }

  const results = await Promise.all(
    imageReferences.map(async (ref) => {
      const resolved = await resolveImageUrl(ref);
      return {
        original: ref,
        resolved: resolved
      };
    })
  );

  return results;
}

/**
 * Resolve image object with multiple properties
 * Used for Property images array which has url, publicId, caption, etc.
 * @param {Object|string} imageData - Image object or string reference  
 * @returns {Promise<Object|null>}
 */
async function resolveImageObject(imageData) {
  if (!imageData) {
    return null;
  }

  // If it's a string, convert to object
  if (typeof imageData === 'string') {
    const url = await resolveImageUrl(imageData);
    if (!url) {
      return null;
    }
    return {
      url: url,
      publicId: imageData.startsWith('http') ? null : imageData,
      caption: '',
      isHero: false,
      order: 0
    };
  }

  // If it's an object, resolve the URL from url or publicId field
  const imageRef = imageData.url || imageData.publicId;
  if (!imageRef) {
    return null;
  }

  const url = await resolveImageUrl(imageRef);
  if (!url) {
    return null;
  }

  return {
    url: url,
    publicId: imageData.publicId || (imageData.url && !imageData.url.startsWith('http') ? imageData.url : null),
    caption: imageData.caption || '',
    isHero: imageData.isHero || false,
    order: imageData.order || 0
  };
}

module.exports = {
  resolveImageUrl,
  resolveMultipleImageUrls,
  resolveImageObject
};

