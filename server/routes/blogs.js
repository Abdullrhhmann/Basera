const express = require('express');
const router = express.Router();
const prisma = require('../prisma/client');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const baseBlogSelect = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  content: true,
  author: true,
  category: true,
  tags: true,
  featuredImage: true,
  images: true,
  published: true,
  featured: true,
  views: true,
  likes: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  createdBy: { select: { id: true, name: true } },
  updatedBy: { select: { id: true, name: true } },
  relatedPropertyIds: true,
  relatedDeveloperIds: true,
};

const listBlogSelect = {
  ...baseBlogSelect,
  content: false,
};

const hydrateBlogRelations = async (blog) => {
  if (!blog) return null;
  const [relatedProperties, relatedDevelopers] = await Promise.all([
    blog.relatedPropertyIds?.length
      ? prisma.property.findMany({
          where: { id: { in: blog.relatedPropertyIds } },
          select: {
            id: true,
            title: true,
            price: true,
            images: true,
            location: true,
            developer: { select: { id: true, name: true, logo: true, slug: true } },
          },
        })
      : [],
    blog.relatedDeveloperIds?.length
      ? prisma.developer.findMany({
          where: { id: { in: blog.relatedDeveloperIds } },
          select: { id: true, name: true, logo: true, description: true },
        })
      : [],
  ]);

  // Serialize properties to add _id for frontend compatibility
  const serializedProperties = relatedProperties.map(prop => ({
    ...prop,
    _id: prop.id,
  }));

  return {
    ...blog,
    relatedProperties: serializedProperties,
    relatedDevelopers,
  };
};

// @route   GET /api/blogs
// @desc    Get all published blogs (public)
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 9, 
      category, 
      tag, 
      featured, 
      search 
    } = req.query;

    // Build query
    const where = { published: true };

    if (category) where.category = category;
    if (tag) where.tags = { has: tag };
    if (featured === 'true') where.featured = true;

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { excerpt: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }

    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const skip = (pageNumber - 1) * limitNumber;

    const [blogsRaw, count] = await Promise.all([
      prisma.blog.findMany({
        where,
        select: listBlogSelect,
        orderBy: { publishedAt: 'desc' },
        skip,
        take: limitNumber,
      }),
      prisma.blog.count({ where }),
    ]);

    const blogs = await Promise.all(blogsRaw.map((blog) => hydrateBlogRelations(blog)));

    res.json({
      success: true,
      data: blogs,
      pagination: {
        currentPage: pageNumber,
        totalPages: Math.ceil(count / limitNumber),
        totalItems: count,
        itemsPerPage: limitNumber
      }
    });
  } catch (error) {
    console.error('Error fetching blogs:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching blogs',
      error: error.message
    });
  }
});

// @route   GET /api/blogs/featured
// @desc    Get featured blogs
// @access  Public
router.get('/featured', async (req, res) => {
  try {
    const blogsRaw = await prisma.blog.findMany({
      where: { published: true, featured: true },
      select: listBlogSelect,
      orderBy: { publishedAt: 'desc' },
      take: 3,
    });
    const blogs = await Promise.all(blogsRaw.map((blog) => hydrateBlogRelations(blog)));

    res.json({
      success: true,
      data: blogs
    });
  } catch (error) {
    console.error('Error fetching featured blogs:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching featured blogs',
      error: error.message
    });
  }
});

// @route   GET /api/blogs/categories
// @desc    Get all blog categories with counts
// @access  Public
router.get('/categories', async (req, res) => {
  try {
    const categories = await prisma.blog.groupBy({
      by: ['category'],
      where: { published: true },
      _count: { _all: true },
      orderBy: { _count: { _all: 'desc' } },
    });

    res.json({
      success: true,
      data: categories.map((item) => ({ _id: item.category, count: item._count._all }))
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching categories',
      error: error.message
    });
  }
});

// @route   GET /api/blogs/:slug
// @desc    Get single blog by slug
// @access  Public
router.get('/:slug', async (req, res) => {
  try {
    const blogRecord = await prisma.blog.findFirst({
      where: { slug: req.params.slug, published: true },
      select: baseBlogSelect,
    });

    if (!blogRecord) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      });
    }

    const updated = await prisma.blog.update({
      where: { id: blogRecord.id },
      data: { views: (blogRecord.views || 0) + 1 },
      select: baseBlogSelect,
    });

    const blog = await hydrateBlogRelations(updated);

    res.json({
      success: true,
      data: blog
    });
  } catch (error) {
    console.error('Error fetching blog:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching blog',
      error: error.message
    });
  }
});

// @route   POST /api/blogs/:id/like
// @desc    Like a blog post
// @access  Public
router.post('/:id/like', async (req, res) => {
  try {
    const blog = await prisma.blog.findUnique({ where: { id: req.params.id } });

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      });
    }

    const updated = await prisma.blog.update({
      where: { id: req.params.id },
      data: { likes: (blog.likes || 0) + 1 },
      select: { likes: true },
    });

    res.json({
      success: true,
      data: { likes: updated.likes }
    });
  } catch (error) {
    console.error('Error liking blog:', error);
    res.status(500).json({
      success: false,
      message: 'Error liking blog',
      error: error.message
    });
  }
});

// ============================================================
// ADMIN ROUTES - Require authentication and admin role
// ============================================================

// @route   GET /api/blogs/admin/all
// @desc    Get all blogs including unpublished (admin)
// @access  Private/Admin
router.get('/admin/all', authMiddleware, roleMiddleware(['admin', 'super_admin', 'content_manager']), async (req, res) => {
  try {
    const { page = 1, limit = 10, published, category } = req.query;

    const where = {};
    if (published !== undefined) where.published = published === 'true';
    if (category) where.category = category;

    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const skip = (pageNumber - 1) * limitNumber;

    const [blogs, count] = await Promise.all([
      prisma.blog.findMany({
        where,
        select: baseBlogSelect,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNumber,
      }),
      prisma.blog.count({ where }),
    ]);

    res.json({
      success: true,
      data: blogs,
      pagination: {
        currentPage: pageNumber,
        totalPages: Math.ceil(count / limitNumber),
        totalItems: count,
        itemsPerPage: limitNumber
      }
    });
  } catch (error) {
    console.error('Error fetching all blogs:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching blogs',
      error: error.message
    });
  }
});

// @route   POST /api/blogs
// @desc    Create a new blog
// @access  Private/Admin
router.post('/', authMiddleware, roleMiddleware(['admin', 'super_admin', 'content_manager']), async (req, res) => {
  try {
    const blog = await prisma.blog.create({
      data: {
        ...req.body,
        createdById: req.user.id,
      },
    });

    res.status(201).json({
      success: true,
      data: blog
    });
  } catch (error) {
    console.error('Error creating blog:', error);
    res.status(400).json({
      success: false,
      message: 'Error creating blog',
      error: error.message
    });
  }
});

// @route   PUT /api/blogs/:id
// @desc    Update a blog
// @access  Private/Admin
router.put('/:id', authMiddleware, roleMiddleware(['admin', 'super_admin', 'content_manager']), async (req, res) => {
  try {
    const blog = await prisma.blog.update({
      where: { id: req.params.id },
      data: {
        ...req.body,
        updatedById: req.user.id,
      },
    });

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      });
    }

    res.json({
      success: true,
      data: blog
    });
  } catch (error) {
    console.error('Error updating blog:', error);
    res.status(400).json({
      success: false,
      message: 'Error updating blog',
      error: error.message
    });
  }
});

// @route   DELETE /api/blogs/:id
// @desc    Delete a blog
// @access  Private/Admin
router.delete('/:id', authMiddleware, roleMiddleware(['admin', 'super_admin', 'content_manager']), async (req, res) => {
  try {
    const blog = await prisma.blog.delete({
      where: { id: req.params.id },
    });

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      });
    }

    res.json({
      success: true,
      message: 'Blog deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting blog:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting blog',
      error: error.message
    });
  }
});

module.exports = router;

