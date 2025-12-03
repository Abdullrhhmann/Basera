const express = require('express');
const { body, validationResult, query } = require('express-validator');
const prisma = require('../prisma/client');
const { Prisma } = require('../prisma/generated');
const { authMiddleware, adminMiddleware, optionalAuth } = require('../middleware/auth');

const router = express.Router();

const parsePagination = (page = 1, limit = 50, maxLimit = 100) => {
  const currentPage = Math.max(parseInt(page, 10) || 1, 1);
  const safeLimit = Math.min(parseInt(limit, 10) || 50, maxLimit);
  const skip = (currentPage - 1) * safeLimit;
  return { currentPage, limit: safeLimit, skip };
};

const playlistInclude = {
  createdBy: { select: { id: true, name: true, email: true } },
  updatedBy: { select: { id: true, name: true, email: true } },
  videos: {
    orderBy: { order: 'asc' },
    include: {
      video: true,
    },
  },
};

const serializePlaylist = (record) => {
  if (!record) return null;
  const { videos, ...rest } = record;
  return {
    ...rest,
    videos: (videos || []).map((item) => ({
      ...(item.video || {}),
      order: item.order ?? 0,
    })),
  };
};

const associatedLookups = {
  compound: (id) => prisma.compound.findUnique({ where: { id } }),
  launch: (id) => prisma.launch.findUnique({ where: { id } }),
};

const verifyAssociation = async (type, id) => {
  if (!type || !id) return false;
  const resolver = associatedLookups[type];
  if (!resolver) return false;
  const entity = await resolver(id);
  return Boolean(entity);
};

const ensureVideosExist = async (videoIds = []) => {
  const uniqueIds = [...new Set(videoIds.filter(Boolean))];
  if (!uniqueIds.length) return [];
  const found = await prisma.video.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true },
  });
  if (found.length !== uniqueIds.length) {
    throw new Error('One or more video IDs are invalid');
  }
  return uniqueIds;
};

const replacePlaylistVideos = async (playlistId, videoIds = []) => {
  await prisma.videoPlaylistVideo.deleteMany({ where: { playlistId } });
  if (!videoIds.length) return;
  await prisma.videoPlaylistVideo.createMany({
    data: videoIds.map((videoId, index) => ({
      playlistId,
      videoId,
      order: index,
    })),
  });
};

const addVideosToPlaylist = async (playlistId, videoIds = []) => {
  if (!videoIds.length) {
    throw new Error('No videos to add');
  }

  const existingEntries = await prisma.videoPlaylistVideo.findMany({
    where: { playlistId, videoId: { in: videoIds } },
    select: { videoId: true },
  });
  const existingIds = new Set(existingEntries.map((entry) => entry.videoId));
  const newIds = videoIds.filter((id) => !existingIds.has(id));

  if (!newIds.length) {
    throw new Error('All videos are already in the playlist');
  }

  const currentMaxOrder =
    (await prisma.videoPlaylistVideo.aggregate({
      where: { playlistId },
      _max: { order: true },
    }))._max.order ?? -1;

  await prisma.videoPlaylistVideo.createMany({
    data: newIds.map((videoId, index) => ({
      playlistId,
      videoId,
      order: currentMaxOrder + 1 + index,
    })),
  });
};

const buildPlaylistWhere = (params, user) => {
  const { search, type, associatedType, associatedId, isActive } = params;
  const where = {};

  if (search) {
    const term = search.trim();
    if (term) {
      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
      ];
    }
  }

  if (type) where.type = type;
  if (associatedType) where.associatedType = associatedType;
  if (associatedId) where.associatedId = associatedId;

  if (isActive !== undefined) {
    where.isActive = isActive === 'true' || isActive === true;
  } else if (!user || user.role !== 'admin') {
    where.isActive = true;
  }

  return where;
};

// @route   POST /api/video-playlists
// @desc    Create new playlist (admin only)
// @access  Private (Admin only)
router.post('/', authMiddleware, adminMiddleware, [
  body('title').trim().notEmpty().withMessage('Playlist title is required').isLength({ max: 200 }).withMessage('Title cannot exceed 200 characters'),
  body('description').optional().isLength({ max: 2000 }).withMessage('Description cannot exceed 2000 characters'),
  body('type').isIn(['auto', 'manual']).withMessage('Type must be either auto or manual'),
  body('associatedType').optional().isIn(['compound', 'launch']).withMessage('Invalid associated type'),
  body('associatedId').optional().isString().isLength({ min: 8 }).withMessage('Invalid associated ID'),
  body('videos').optional().isArray().withMessage('Videos must be an array'),
  body('videos.*').optional().isString().isLength({ min: 8 }).withMessage('Invalid video ID'),
  body('thumbnailUrl').optional().trim(),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      title,
      description,
      type,
      associatedType,
      associatedId,
      videos,
      thumbnailUrl,
      isActive
    } = req.body;

    if (type === 'auto' && associatedType && associatedId) {
      const isValidAssociation = await verifyAssociation(associatedType, associatedId);
      if (!isValidAssociation) {
        return res.status(404).json({ message: `${associatedType} not found` });
      }
    }

    const videoIds = videos?.length ? await ensureVideosExist(videos) : [];

    const playlist = await prisma.videoPlaylist.create({
      data: {
        title,
        description,
        type,
        associatedType: type === 'auto' ? associatedType : null,
        associatedId: type === 'auto' ? associatedId : null,
        thumbnailUrl,
        isActive: isActive !== undefined ? isActive : true,
        createdById: req.user.id,
        updatedById: req.user.id,
      },
      include: playlistInclude,
    });

    if (videoIds.length) {
      await replacePlaylistVideos(playlist.id, videoIds);
    }

    const hydrated = await prisma.videoPlaylist.findUnique({
      where: { id: playlist.id },
      include: playlistInclude,
    });

    res.status(201).json({
      message: 'Playlist created successfully',
      playlist: serializePlaylist(hydrated),
    });
  } catch (error) {
    console.error('Create playlist error:', error);
    res.status(500).json({ message: 'Server error while creating playlist' });
  }
});

// @route   GET /api/video-playlists
// @desc    Get all playlists with filters
// @access  Public
router.get('/', optionalAuth, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().isString(),
  query('type').optional().isIn(['auto', 'manual']).withMessage('Invalid type'),
  query('associatedType').optional().isIn(['compound', 'launch']).withMessage('Invalid associated type'),
  query('associatedId').optional().isString().isLength({ min: 8 }).withMessage('Invalid associated ID'),
  query('isActive').optional().isBoolean().withMessage('isActive must be a boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { page = 1, limit = 50 } = req.query;
    const { currentPage, limit: take, skip } = parsePagination(page, limit, 100);
    const where = buildPlaylistWhere(req.query, req.user);

    const [records, total] = await Promise.all([
      prisma.videoPlaylist.findMany({
        where,
        include: playlistInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.videoPlaylist.count({ where }),
    ]);

    res.json({
      playlists: records.map(serializePlaylist),
      pagination: {
        currentPage,
        totalPages: Math.max(1, Math.ceil(total / take)),
        totalPlaylists: total,
        hasNext: skip + take < total,
        hasPrev: currentPage > 1
      }
    });
  } catch (error) {
    console.error('Get playlists error:', error);
    res.status(500).json({ message: 'Server error while fetching playlists' });
  }
});

// @route   GET /api/video-playlists/:id
// @desc    Get single playlist by ID with videos
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const playlist = await prisma.videoPlaylist.findUnique({
      where: { id: req.params.id },
      include: playlistInclude,
    });

    if (!playlist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }

    res.json({ playlist: serializePlaylist(playlist) });
  } catch (error) {
    console.error('Get playlist error:', error);
    res.status(500).json({ message: 'Server error while fetching playlist' });
  }
});

// @route   PUT /api/video-playlists/:id
// @desc    Update playlist (admin only)
// @access  Private (Admin only)
router.put('/:id', authMiddleware, adminMiddleware, [
  body('title').optional().trim().notEmpty().withMessage('Playlist title cannot be empty').isLength({ max: 200 }).withMessage('Title cannot exceed 200 characters'),
  body('description').optional().isLength({ max: 2000 }).withMessage('Description cannot exceed 2000 characters'),
  body('type').optional().isIn(['auto', 'manual']).withMessage('Type must be either auto or manual'),
  body('associatedType').optional().isIn(['compound', 'launch']).withMessage('Invalid associated type'),
  body('associatedId').optional().isString().isLength({ min: 8 }).withMessage('Invalid associated ID'),
  body('videos').optional().isArray().withMessage('Videos must be an array'),
  body('videos.*').optional().isString().isLength({ min: 8 }).withMessage('Invalid video ID'),
  body('thumbnailUrl').optional().trim(),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const existing = await prisma.videoPlaylist.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      return res.status(404).json({ message: 'Playlist not found' });
    }

    const nextType = req.body.type || existing.type;
    const nextAssociatedType = req.body.associatedType ?? existing.associatedType;
    const nextAssociatedId = req.body.associatedId ?? existing.associatedId;

    if (nextType === 'auto' && nextAssociatedType && nextAssociatedId) {
      const associationExists = await verifyAssociation(nextAssociatedType, nextAssociatedId);
      if (!associationExists) {
        return res.status(404).json({ message: `${nextAssociatedType} not found` });
      }
    }

    const updateData = {
      ...(req.body.title !== undefined && { title: req.body.title }),
      ...(req.body.description !== undefined && { description: req.body.description }),
      ...(req.body.type !== undefined && { type: req.body.type }),
      ...(req.body.thumbnailUrl !== undefined && { thumbnailUrl: req.body.thumbnailUrl }),
      ...(req.body.isActive !== undefined && { isActive: req.body.isActive }),
      updatedById: req.user.id,
    };

    if (nextType === 'auto') {
      updateData.associatedType = nextAssociatedType;
      updateData.associatedId = nextAssociatedId;
    } else if (req.body.associatedType !== undefined || req.body.associatedId !== undefined) {
      updateData.associatedType = req.body.associatedType || null;
      updateData.associatedId = req.body.associatedId || null;
    }

    if (req.body.videos !== undefined) {
      const videoIds = await ensureVideosExist(req.body.videos);
      await replacePlaylistVideos(existing.id, videoIds);
    }

    const updatedPlaylist = await prisma.videoPlaylist.update({
      where: { id: existing.id },
      data: updateData,
      include: playlistInclude,
    });

    res.json({
      message: 'Playlist updated successfully',
      playlist: serializePlaylist(updatedPlaylist)
    });
  } catch (error) {
    console.error('Update playlist error:', error);
    res.status(500).json({ message: 'Server error while updating playlist' });
  }
});

// @route   DELETE /api/video-playlists/:id
// @desc    Delete playlist (admin only)
// @access  Private (Admin only)
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const playlist = await prisma.videoPlaylist.findUnique({ where: { id: req.params.id } });
    if (!playlist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }

    if (playlist.type === 'auto') {
      return res.status(400).json({ message: 'Cannot delete auto-generated playlists. They are managed automatically.' });
    }

    await prisma.videoPlaylist.delete({ where: { id: playlist.id } });

    res.json({ message: 'Playlist deleted successfully' });
  } catch (error) {
    console.error('Delete playlist error:', error);
    res.status(500).json({ message: 'Server error while deleting playlist' });
  }
});

// @route   POST /api/video-playlists/:id/videos
// @desc    Add videos to playlist (admin only)
// @access  Private (Admin only)
router.post('/:id/videos', authMiddleware, adminMiddleware, [
  body('videoIds').isArray().withMessage('videoIds must be an array'),
  body('videoIds.*').isString().isLength({ min: 8 }).withMessage('Invalid video ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const playlist = await prisma.videoPlaylist.findUnique({
      where: { id: req.params.id },
    });
    if (!playlist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }

    const { videoIds } = req.body;
    const uniqueIds = await ensureVideosExist(videoIds);

    try {
      await addVideosToPlaylist(playlist.id, uniqueIds);
    } catch (videoErr) {
      return res.status(400).json({ message: videoErr.message });
    }

    await prisma.videoPlaylist.update({
      where: { id: playlist.id },
      data: { updatedById: req.user.id },
    });

    const updated = await prisma.videoPlaylist.findUnique({
      where: { id: playlist.id },
      include: playlistInclude,
    });

    res.json({
      message: `Added ${uniqueIds.length} video(s) to playlist`,
      playlist: serializePlaylist(updated)
    });
  } catch (error) {
    console.error('Add videos to playlist error:', error);
    res.status(500).json({ message: 'Server error while adding videos to playlist' });
  }
});

// @route   DELETE /api/video-playlists/:id/videos/:videoId
// @desc    Remove video from playlist (admin only)
// @access  Private (Admin only)
router.delete('/:id/videos/:videoId', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const playlist = await prisma.videoPlaylist.findUnique({
      where: { id: req.params.id },
      select: { id: true },
    });
    if (!playlist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }

    const deleted = await prisma.videoPlaylistVideo.deleteMany({
      where: {
        playlistId: playlist.id,
        videoId: req.params.videoId,
      },
    });

    if (!deleted.count) {
      return res.status(404).json({ message: 'Video not found in playlist' });
    }

    await prisma.videoPlaylist.update({
      where: { id: playlist.id },
      data: { updatedById: req.user.id },
    });

    const updated = await prisma.videoPlaylist.findUnique({
      where: { id: playlist.id },
      include: playlistInclude,
    });

    res.json({
      message: 'Video removed from playlist',
      playlist: serializePlaylist(updated)
    });
  } catch (error) {
    console.error('Remove video from playlist error:', error);
    res.status(500).json({ message: 'Server error while removing video from playlist' });
  }
});

// @route   GET /api/video-playlists/auto/compound/:compoundId
// @desc    Auto-generate or get playlist for compound
// @access  Public
router.get('/auto/compound/:compoundId', async (req, res) => {
  try {
    const compoundId = req.params.compoundId;

    const compound = await prisma.compound.findUnique({ where: { id: compoundId } });
    if (!compound) {
      return res.status(404).json({ message: 'Compound not found' });
    }

    const videos = await prisma.video.findMany({
      where: {
        associatedType: 'compound',
        associatedId: compoundId,
        isActive: true,
      },
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    });

    if (videos.length === 0) {
      return res.json({
        playlist: {
          type: 'auto',
          associatedType: 'compound',
          associatedId: compoundId,
          title: `${compound.name} Videos`,
          videos: [],
          videoCount: 0,
          isAutoGenerated: true
        }
      });
    }

    const videoIds = videos.map((video) => video.id);

    let playlist = await prisma.videoPlaylist.findFirst({
      where: {
        type: 'auto',
        associatedType: 'compound',
        associatedId: compoundId,
      },
      include: playlistInclude,
    });

    if (playlist) {
      const existingVideoIds = new Set((playlist.videos || []).map((entry) => entry.videoId));
      const hasDifference =
        existingVideoIds.size !== videoIds.length ||
        videoIds.some((id) => !existingVideoIds.has(id));

      if (hasDifference) {
        await replacePlaylistVideos(playlist.id, videoIds);
        playlist = await prisma.videoPlaylist.findUnique({
          where: { id: playlist.id },
          include: playlistInclude,
        });
      }
    } else {
      const created = await prisma.videoPlaylist.create({
        data: {
          title: `${compound.name} Videos`,
          description: `Auto-generated playlist for ${compound.name}`,
          type: 'auto',
          associatedType: 'compound',
          associatedId: compoundId,
          thumbnailUrl: videos[0]?.thumbnailUrl || null,
          isActive: true,
          createdById: req.user?.id || null,
          updatedById: req.user?.id || null,
        },
      });

      await replacePlaylistVideos(created.id, videoIds);
      playlist = await prisma.videoPlaylist.findUnique({
        where: { id: created.id },
        include: playlistInclude,
      });
    }

    res.json({ playlist: serializePlaylist(playlist) });
  } catch (error) {
    console.error('Get auto playlist for compound error:', error);
    res.status(500).json({ message: 'Server error while fetching auto playlist' });
  }
});

// @route   GET /api/video-playlists/auto/launch/:launchId
// @desc    Auto-generate or get playlist for launch
// @access  Public
router.get('/auto/launch/:launchId', async (req, res) => {
  try {
    const launchId = req.params.launchId;

    const launch = await prisma.launch.findUnique({ where: { id: launchId } });
    if (!launch) {
      return res.status(404).json({ message: 'Launch not found' });
    }

    const videos = await prisma.video.findMany({
      where: {
        associatedType: 'launch',
        associatedId: launchId,
        isActive: true,
      },
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    });

    if (videos.length === 0) {
      return res.json({
        playlist: {
          type: 'auto',
          associatedType: 'launch',
          associatedId: launchId,
          title: `${launch.title} Videos`,
          videos: [],
          videoCount: 0,
          isAutoGenerated: true
        }
      });
    }

    const videoIds = videos.map((video) => video.id);

    let playlist = await prisma.videoPlaylist.findFirst({
      where: {
        type: 'auto',
        associatedType: 'launch',
        associatedId: launchId,
      },
      include: playlistInclude,
    });

    if (playlist) {
      const existingVideoIds = new Set((playlist.videos || []).map((entry) => entry.videoId));
      const hasDifference =
        existingVideoIds.size !== videoIds.length ||
        videoIds.some((id) => !existingVideoIds.has(id));

      if (hasDifference) {
        await replacePlaylistVideos(playlist.id, videoIds);
        playlist = await prisma.videoPlaylist.findUnique({
          where: { id: playlist.id },
          include: playlistInclude,
        });
      }
    } else {
      const created = await prisma.videoPlaylist.create({
        data: {
          title: `${launch.title} Videos`,
          description: `Auto-generated playlist for ${launch.title}`,
          type: 'auto',
          associatedType: 'launch',
          associatedId: launchId,
          thumbnailUrl: videos[0]?.thumbnailUrl || null,
          isActive: true,
          createdById: req.user?.id || null,
          updatedById: req.user?.id || null,
        },
      });

      await replacePlaylistVideos(created.id, videoIds);
      playlist = await prisma.videoPlaylist.findUnique({
        where: { id: created.id },
        include: playlistInclude,
      });
    }

    res.json({ playlist: serializePlaylist(playlist) });
  } catch (error) {
    console.error('Get auto playlist for launch error:', error);
    res.status(500).json({ message: 'Server error while fetching auto playlist' });
  }
});

module.exports = router;

