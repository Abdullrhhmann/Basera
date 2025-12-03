const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const prisma = require('../prisma/client');
const { Prisma } = require('../prisma/generated');
const aiService = require('../utils/aiService');
const propertySearch = require('../utils/propertySearch');

const router = express.Router();

const ensureArray = (value) => (Array.isArray(value) ? value : []);

const mergePreferenceObjects = (current = {}, updates = {}) => {
  const result = { ...current };
  Object.entries(updates).forEach(([key, value]) => {
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      typeof result[key] === 'object' &&
      !Array.isArray(result[key])
    ) {
      result[key] = mergePreferenceObjects(result[key], value);
    } else {
      result[key] = value;
    }
  });
  return result;
};

const findOrCreateConversation = async (sessionId, userId = null) => {
  let conversation = await prisma.conversation.findUnique({ where: { sessionId } });
  if (!conversation) {
    const now = new Date();
    conversation = await prisma.conversation.create({
      data: {
        sessionId,
        userId,
        messages: [],
        userPreferences: {},
        recommendedProperties: [],
        recommendedLaunches: [],
        status: 'active',
        isActive: true,
        firstMessageAt: now,
        lastMessageAt: now,
        totalMessages: 0,
      },
    });
  }
  return conversation;
};

const appendMessage = async (conversation, message) => {
  const messages = ensureArray(conversation.messages).slice();
  messages.push({
    ...message,
    timestamp: new Date().toISOString(),
  });

  const now = new Date();
  const data = {
    messages,
    totalMessages: messages.length,
    lastMessageAt: now,
    conversationDuration: conversation.firstMessageAt
      ? Math.floor((now - new Date(conversation.firstMessageAt)) / 1000)
      : 0,
  };

  if (!conversation.firstMessageAt) {
    data.firstMessageAt = now;
  }

  return prisma.conversation.update({
    where: { id: conversation.id },
    data,
  });
};

const updateConversationPreferences = async (conversation, preferences) => {
  const nextPreferences = mergePreferenceObjects(conversation.userPreferences || {}, preferences);
  return prisma.conversation.update({
    where: { id: conversation.id },
    data: { userPreferences: nextPreferences },
  });
};

const appendRecommendations = async (conversation, propertyIds = [], launchIds = []) => {
  const existingProperties = ensureArray(conversation.recommendedProperties);
  const existingLaunches = ensureArray(conversation.recommendedLaunches);
  const now = new Date().toISOString();

  const propertySet = new Set(existingProperties.map((item) => item.propertyId));
  const launchSet = new Set(existingLaunches.map((item) => item.launchId));

  const nextProperties = [
    ...existingProperties,
    ...propertyIds
      .filter((id) => id && !propertySet.has(id))
      .map((propertyId) => ({ propertyId, relevanceScore: 1, recommendedAt: now })),
  ];

  const nextLaunches = [
    ...existingLaunches,
    ...launchIds
      .filter((id) => id && !launchSet.has(id))
      .map((launchId) => ({ launchId, relevanceScore: 1, recommendedAt: now })),
  ];

  return prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      recommendedProperties: nextProperties,
      recommendedLaunches: nextLaunches,
    },
  });
};

const hydrateRecommendations = async (entries = [], type = 'property') => {
  const ids = ensureArray(entries).map((item) => (type === 'property' ? item.propertyId : item.launchId)).filter(Boolean);
  if (!ids.length) {
    return [];
  }

  if (type === 'property') {
    const properties = await prisma.property.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        title: true,
        type: true,
        price: true,
        currency: true,
        location: true,
        images: true,
      },
    });
    // Add _id for frontend compatibility
    const serializedProperties = properties.map(prop => ({ ...prop, _id: prop.id }));
    const map = new Map(serializedProperties.map((property) => [property.id, property]));
    return entries
      .map((item) => ({
        property: map.get(item.propertyId),
        relevanceScore: item.relevanceScore,
        recommendedAt: item.recommendedAt,
      }))
      .filter((item) => item.property);
  }

  const launches = await prisma.launch.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      title: true,
      developer: true,
      startingPrice: true,
      currency: true,
      location: true,
      image: true,
      status: true,
    },
  });
  // Add _id for frontend compatibility
  const serializedLaunches = launches.map(launch => ({ ...launch, _id: launch.id }));
  const map = new Map(serializedLaunches.map((launch) => [launch.id, launch]));
  return entries
    .map((item) => ({
      launch: map.get(item.launchId),
      relevanceScore: item.relevanceScore,
      recommendedAt: item.recommendedAt,
    }))
    .filter((item) => item.launch);
};

const buildConversationFilters = ({ status, leadCaptured }) => {
  const where = {};
  if (status) where.status = status;
  if (leadCaptured !== undefined) {
    where.leadCaptured = leadCaptured === 'true';
  }
  return where;
};

const parsePagination = (page = 1, limit = 20, maxLimit = 100) => {
  const currentPage = Math.max(parseInt(page, 10) || 1, 1);
  const safeLimit = Math.min(parseInt(limit, 10) || 20, maxLimit);
  const skip = (currentPage - 1) * safeLimit;
  return { currentPage, limit: safeLimit, skip };
};

// @route   POST /api/chat/message
// @desc    Send message to AI chat agent with property recommendations
// @access  Public
router.post('/message', [
  body('message').trim().isLength({ min: 1, max: 1000 }).withMessage('Message must be between 1 and 1000 characters'),
  body('sessionId').trim().isLength({ min: 1, max: 100 }).withMessage('Session ID is required'),
  body('userId').optional().isString().isLength({ min: 8 }).withMessage('Invalid user ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { message, sessionId, userId } = req.body;
    
    let conversation = await findOrCreateConversation(sessionId, userId || null);
    conversation = await appendMessage(conversation, { role: 'user', content: message });
    
    // Extract preferences from the message
    const extractedPrefs = aiService.extractPreferencesFromMessage(message);
    
    // Parse budget from message if mentioned
    const budgetInfo = propertySearch.parseBudget(message);
    const preferencePatch = {};
    if (budgetInfo) {
      preferencePatch.budget = mergePreferenceObjects(conversation.userPreferences?.budget, budgetInfo);
    }
    if (Object.keys(extractedPrefs).length > 0) {
      if (extractedPrefs.bedrooms) {
        preferencePatch.bedrooms = { min: extractedPrefs.bedrooms };
      }
      if (extractedPrefs.propertyType) {
        preferencePatch.propertyType = extractedPrefs.propertyType;
      }
      if (extractedPrefs.location) {
        preferencePatch.location = { city: extractedPrefs.location };
      }
    }

    if (Object.keys(preferencePatch).length > 0) {
      conversation = await updateConversationPreferences(conversation, preferencePatch);
    }
    
    // Perform smart property search based on conversation context
    const searchResults = await propertySearch.smartSearch(
      conversation.userPreferences || {},
      message
    );
    
    // Prepare conversation history for AI
    const conversationHistory = ensureArray(conversation.messages).map((msg) => ({
      role: msg.role,
      content: msg.content
    }));
    
    // Get AI response with property context
    const aiResponse = await aiService.getChatCompletion(
      conversationHistory,
      searchResults.properties,
      searchResults.launches
    );
    
    // Save AI response to conversation
    const propertyIds = searchResults.properties.map((p) => p._id).filter(Boolean);
    const launchIds = searchResults.launches.map((l) => l._id).filter(Boolean);
    
    conversation = await appendMessage(conversation, {
      role: 'assistant',
      content: aiResponse.message,
      propertyReferences: propertyIds,
      launchReferences: launchIds,
    });
    
    conversation = await appendRecommendations(conversation, propertyIds, launchIds);
    
    // Prepare response with property and launch details
    const responseProperties = searchResults.properties.map(p => ({
      _id: p._id,
      title: p.title,
      type: p.type,
      price: p.price,
      currency: p.currency,
      location: p.location,
      bedrooms: p.specifications?.bedrooms,
      bathrooms: p.specifications?.bathrooms,
      area: p.specifications?.area,
      images: p.images?.length > 0 ? [p.images[0]] : [],
      status: p.status,
      developerStatus: p.developerStatus
    }));
    
    const responseLaunches = searchResults.launches.map(l => ({
      _id: l._id,
      title: l.title,
      developer: l.developer,
      propertyType: l.propertyType,
      startingPrice: l.startingPrice,
      currency: l.currency,
      location: l.location,
      bedrooms: l.bedrooms,
      bathrooms: l.bathrooms,
      area: l.area,
      image: l.image,
      status: l.status,
      launchDate: l.launchDate
    }));
    
    res.json({
      success: true,
      message: aiResponse.message,
      properties: responseProperties,
      launches: responseLaunches,
      conversationId: conversation.id,
      sessionId: conversation.sessionId,
      preferences: conversation.userPreferences,
      isFallback: aiResponse.fallback || false
    });
    
  } catch (error) {
    console.error('Chat message error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Sorry, I encountered an error. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/chat/history/:sessionId
// @desc    Get conversation history for a session
// @access  Public
router.get('/history/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const conversation = await prisma.conversation.findUnique({ where: { sessionId } });
    
    if (!conversation) {
      return res.json({
        success: true,
        messages: [],
        preferences: {},
        properties: [],
        launches: []
      });
    }
    
    const recommendedProperties = await hydrateRecommendations(conversation.recommendedProperties, 'property');
    const recommendedLaunches = await hydrateRecommendations(conversation.recommendedLaunches, 'launch');

    res.json({
      success: true,
      messages: ensureArray(conversation.messages),
      preferences: conversation.userPreferences || {},
      properties: recommendedProperties,
      launches: recommendedLaunches,
      conversationId: conversation.id
    });
    
  } catch (error) {
    console.error('Get chat history error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error retrieving conversation history' 
    });
  }
});

// @route   POST /api/chat/capture-lead
// @desc    Capture lead information from chat conversation
// @access  Public
router.post('/capture-lead', [
  body('sessionId').trim().isLength({ min: 1 }).withMessage('Session ID is required'),
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('phone').matches(/^[\+]?[1-9][\d]{0,15}$/).withMessage('Please provide a valid phone number'),
  body('message').optional().trim().isLength({ max: 500 }).withMessage('Message cannot exceed 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { sessionId, name, email, phone, message } = req.body;
    
    const conversation = await prisma.conversation.findUnique({ where: { sessionId } });
    
    if (!conversation) {
      return res.status(404).json({ 
        success: false,
        message: 'Conversation not found' 
      });
    }
    
    const preferences = conversation.userPreferences || {};
    const lead = await prisma.lead.create({
      data: {
        name,
        email: email.toLowerCase(),
        phone,
        requiredService: 'buy',
        propertyType: preferences.propertyType || 'apartment',
        purpose: preferences.purpose || 'personal-use',
        source: 'chat-ai',
        status: 'new',
        priority: 'high',
        budget: preferences.budget || {},
        preferredLocation: preferences.location?.city ? [preferences.location.city] : [],
        location: preferences.location?.city || null,
        notes: [
          {
            note: message || `AI Chat Lead - Preferences: ${JSON.stringify(preferences)}`,
            createdAt: new Date().toISOString(),
          },
        ],
      },
    });
    
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        leadCaptured: true,
        leadId: lead.id,
        status: 'completed',
        isActive: false,
      },
    });
    
    res.json({
      success: true,
      message: 'Thank you! Our team will contact you shortly.',
      lead: {
        id: lead.id,
        name: lead.name,
        email: lead.email
      }
    });
    
  } catch (error) {
    console.error('Capture lead error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error capturing lead information' 
    });
  }
});

// @route   POST /api/chat/greeting
// @desc    Get initial AI greeting
// @access  Public
router.post('/greeting', async (req, res) => {
  try {
    const greeting = aiService.getGreeting();
    
    res.json({
      success: true,
      message: greeting
    });
    
  } catch (error) {
    console.error('Get greeting error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Hello! How can I help you find your perfect property today?' 
    });
  }
});

// @route   GET /api/chat/conversations
// @desc    Get all conversations (Admin only)
// @access  Private (Admin)
router.get('/conversations', authMiddleware, adminMiddleware, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(['active', 'completed', 'abandoned']).withMessage('Invalid status'),
  query('leadCaptured').optional().isBoolean().withMessage('leadCaptured must be boolean'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { page = 1, limit = 20 } = req.query;
    const { currentPage, limit: take, skip } = parsePagination(page, limit, 100);
    const where = buildConversationFilters(req.query);

    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        orderBy: { lastMessageAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
          lead: { select: { id: true, name: true, email: true, phone: true, status: true } },
        },
        skip,
        take,
      }),
      prisma.conversation.count({ where }),
    ]);

    const serialized = conversations.map(({ user, lead, ...rest }) => ({
      ...rest,
      userId: user,
      leadId: lead,
    }));
    
    res.json({
      success: true,
      conversations: serialized,
      totalPages: Math.max(1, Math.ceil(total / take)),
      currentPage,
      total
    });
    
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error retrieving conversations' 
    });
  }
});

// @route   GET /api/chat/stats
// @desc    Get chat statistics (Admin only)
// @access  Private (Admin)
router.get('/stats', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [
      totalConversations,
      activeConversations,
      completedConversations,
      leadsFromChat,
      messageAggregate,
    ] = await Promise.all([
      prisma.conversation.count(),
      prisma.conversation.count({ where: { status: 'active' } }),
      prisma.conversation.count({ where: { status: 'completed' } }),
      prisma.conversation.count({ where: { leadCaptured: true } }),
      prisma.conversation.aggregate({
        _sum: { totalMessages: true },
        _avg: { totalMessages: true },
      }),
    ]);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const conversationsByDayRaw = await prisma.$queryRaw`
      SELECT DATE_TRUNC('day', "createdAt") AS day, COUNT(*)::int AS count
      FROM "Conversation"
      WHERE "createdAt" >= ${sevenDaysAgo}
      GROUP BY day
      ORDER BY day ASC;
    `;

    const conversationsByDay = conversationsByDayRaw.map((row) => ({
      _id: row.day.toISOString().split('T')[0],
      count: Number(row.count),
    }));

    const recommendations = await prisma.conversation.findMany({
      where: { recommendedProperties: { not: null } },
      select: { recommendedProperties: true },
    });

    const propertyCountMap = recommendations.reduce((acc, entry) => {
      ensureArray(entry.recommendedProperties).forEach((item) => {
        if (item?.propertyId) {
          acc[item.propertyId] = (acc[item.propertyId] || 0) + 1;
        }
      });
      return acc;
    }, {});

    const topProperties = Object.entries(propertyCountMap)
      .map(([propertyId, count]) => ({ propertyId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const stats = {
      totalConversations,
      activeConversations,
      completedConversations,
      leadsFromChat,
      totalMessages: Number(messageAggregate._sum.totalMessages || 0),
      averageMessagesPerConversation: Math.round(Number(messageAggregate._avg.totalMessages || 0)),
      conversionRate: totalConversations > 0
        ? ((leadsFromChat / totalConversations) * 100).toFixed(2) + '%'
        : '0%',
      conversationsByDay,
      topRecommendedProperties: topProperties.length,
    };

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('Get chat stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching chat statistics',
    });
  }
});

// @route   DELETE /api/chat/conversation/:id
// @desc    Delete a conversation (Admin only)
// @access  Private (Admin)
router.delete('/conversation/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.conversation.delete({
      where: { id },
    });
    
    res.json({
      success: true,
      message: 'Conversation deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete conversation error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
    }
    res.status(500).json({ 
      success: false,
      message: 'Error deleting conversation' 
    });
  }
});

module.exports = router;
