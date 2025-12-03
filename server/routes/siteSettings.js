const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../prisma/client');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

const SOCIAL_MEDIA_DEFAULT = {
  facebook: '',
  instagram: '',
  twitter: '',
  linkedin: '',
  youtube: '',
  tiktok: '',
  whatsapp: '',
  telegram: '',
};

const formatSettings = (settings) => {
  // Ensure socialMedia is properly parsed if it's JSON
  let socialMedia = settings.socialMedia;
  if (typeof socialMedia === 'string') {
    try {
      socialMedia = JSON.parse(socialMedia);
    } catch (e) {
      socialMedia = SOCIAL_MEDIA_DEFAULT;
    }
  }
  
  return {
    phoneNumbers: settings.phoneNumbers || [],
    whatsappNumbers: settings.whatsappNumbers || [],
    whatsappMessage: settings.whatsappMessage || "Hello! I'm interested in your properties. Can you help me?",
    showPhone: Boolean(settings.showPhone),
    showWhatsApp: Boolean(settings.showWhatsApp),
    email: settings.email || '',
    socialMedia: socialMedia || SOCIAL_MEDIA_DEFAULT,
  };
};

const getSiteSettings = async () => {
  let settings = await prisma.siteSettings.findUnique({ where: { id: 'site-settings' } });
  if (!settings) {
    settings = await prisma.siteSettings.create({
      data: {
        id: 'site-settings',
        phoneNumbers: [],
        whatsappNumbers: [],
        whatsappMessage: "Hello! I'm interested in your properties. Can you help me?",
        showPhone: false,
        showWhatsApp: false,
        email: '',
        socialMedia: SOCIAL_MEDIA_DEFAULT,
      },
    });
  }
  return settings;
};

// @route   GET /api/site-settings
// @desc    Get site settings (public)
// @access  Public
router.get('/', async (req, res) => {
  try {
    const settings = await getSiteSettings();
    res.json({ success: true, settings: formatSettings(settings) });
  } catch (error) {
    console.error('Get site settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching site settings',
    });
  }
});

// @route   PUT /api/site-settings
// @desc    Update site settings
// @access  Private (Admin only)
router.put('/', authMiddleware, adminMiddleware, [
  body('phoneNumbers')
    .optional()
    .isArray()
    .withMessage('phoneNumbers must be an array')
    .custom((arr) => arr.length <= 10)
    .withMessage('Cannot have more than 10 phone numbers'),
  body('phoneNumbers.*').optional().trim(),
  body('whatsappNumbers')
    .optional()
    .isArray()
    .withMessage('whatsappNumbers must be an array')
    .custom((arr) => arr.length <= 10)
    .withMessage('Cannot have more than 10 WhatsApp numbers'),
  body('whatsappNumbers.*').optional().trim(),
  body('whatsappMessage')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('WhatsApp message cannot exceed 500 characters'),
  body('showPhone').optional().isBoolean().withMessage('showPhone must be a boolean'),
  body('showWhatsApp').optional().isBoolean().withMessage('showWhatsApp must be a boolean'),
  body('email').optional().trim().isEmail().withMessage('Please provide a valid email address'),
  body('socialMedia').optional().isObject().withMessage('socialMedia must be an object'),
  body('socialMedia.facebook').optional().trim(),
  body('socialMedia.instagram').optional().trim(),
  body('socialMedia.twitter').optional().trim(),
  body('socialMedia.linkedin').optional().trim(),
  body('socialMedia.youtube').optional().trim(),
  body('socialMedia.tiktok').optional().trim(),
  body('socialMedia.whatsapp').optional().trim(),
  body('socialMedia.telegram').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    const { phoneNumbers, whatsappNumbers, whatsappMessage, showPhone, showWhatsApp, email, socialMedia } = req.body;

    // Build update object with only provided fields
    const updateData = {};
    if (phoneNumbers !== undefined) {
      // Filter out empty strings
      updateData.phoneNumbers = phoneNumbers.filter(num => num && num.trim());
    }
    if (whatsappNumbers !== undefined) {
      // Filter out empty strings
      updateData.whatsappNumbers = whatsappNumbers.filter(num => num && num.trim());
    }
    if (whatsappMessage !== undefined) {
      updateData.whatsappMessage = whatsappMessage || "Hello! I'm interested in your properties. Can you help me?";
    }
    if (showPhone !== undefined) updateData.showPhone = Boolean(showPhone);
    if (showWhatsApp !== undefined) updateData.showWhatsApp = Boolean(showWhatsApp);
    if (email !== undefined) updateData.email = email || '';
    if (socialMedia !== undefined) {
      // Merge with defaults to ensure all fields exist
      updateData.socialMedia = { ...SOCIAL_MEDIA_DEFAULT, ...socialMedia };
    }

    const settings = await prisma.siteSettings.upsert({
      where: { id: 'site-settings' },
      update: updateData,
      create: {
        id: 'site-settings',
        phoneNumbers: updateData.phoneNumbers || [],
        whatsappNumbers: updateData.whatsappNumbers || [],
        whatsappMessage: updateData.whatsappMessage || "Hello! I'm interested in your properties. Can you help me?",
        showPhone: updateData.showPhone || false,
        showWhatsApp: updateData.showWhatsApp || false,
        email: updateData.email || '',
        socialMedia: updateData.socialMedia || SOCIAL_MEDIA_DEFAULT,
      },
    });
    
    console.log('Site settings updated:', JSON.stringify(settings, null, 2));

    res.json({
      success: true,
      message: 'Site settings updated successfully',
      settings: formatSettings(settings),
    });
  } catch (error) {
    console.error('Update site settings error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while updating site settings' 
    });
  }
});

module.exports = router;

