const express = require('express');
const router = express.Router();
const prisma = require('../prisma/client');
const { Prisma } = require('../prisma/generated');

const BASE_URL = process.env.SITE_URL || 'https://www.basera-consultancy.com';

// Helper function to format date for XML
const formatDate = (date) => {
  if (!date) return new Date().toISOString();
  return new Date(date).toISOString();
};

// Helper function to generate URL
const generateUrl = (path) => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${BASE_URL}${cleanPath}`;
};

// Helper function to create sitemap entry
const createUrlEntry = (url, lastmod, changefreq = 'monthly', priority = '0.8') => {
  return `  <url>
    <loc>${url}</loc>
    <lastmod>${formatDate(lastmod)}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
};

/**
 * GET /api/sitemap.xml
 * Generate dynamic sitemap.xml
 */
router.get('/sitemap.xml', async (req, res) => {
  try {
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

    // Static pages
    const staticPages = [
      { path: '/', changefreq: 'daily', priority: '1.0' },
      { path: '/properties', changefreq: 'daily', priority: '0.9' },
      { path: '/compounds', changefreq: 'weekly', priority: '0.9' },
      { path: '/developers', changefreq: 'weekly', priority: '0.9' },
      { path: '/about', changefreq: 'monthly', priority: '0.7' },
      { path: '/contact', changefreq: 'monthly', priority: '0.7' },
      { path: '/blog', changefreq: 'weekly', priority: '0.8' },
      { path: '/videos', changefreq: 'weekly', priority: '0.8' },
      { path: '/roi-calculator', changefreq: 'monthly', priority: '0.6' },
      { path: '/careers', changefreq: 'weekly', priority: '0.7' },
      { path: '/legal', changefreq: 'monthly', priority: '0.5' }
    ];

    staticPages.forEach(page => {
      sitemap += createUrlEntry(generateUrl(page.path), new Date(), page.changefreq, page.priority);
    });

    // Properties
    try {
      const properties = await prisma.property.findMany({
        where: {
          approvalStatus: Prisma.PropertyApprovalStatus.APPROVED,
          isActive: true,
          isArchived: { not: true },
        },
        select: { id: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: 10000,
      });

      properties.forEach((property) => {
        sitemap += createUrlEntry(
          generateUrl(`/properties/${property.id}`),
          property.updatedAt,
          'weekly',
          '0.8'
        );
      });
    } catch (error) {
      console.error('Error fetching properties for sitemap:', error);
    }

    // Compounds
    try {
      const compounds = await prisma.compound.findMany({
        select: { id: true, slug: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: 1000,
      });

      compounds.forEach((compound) => {
        const compoundPath = compound.slug ? `/compounds/${compound.slug}` : `/compounds/${compound.id}`;
        sitemap += createUrlEntry(
          generateUrl(compoundPath),
          compound.updatedAt,
          'weekly',
          '0.8'
        );
      });
    } catch (error) {
      console.error('Error fetching compounds for sitemap:', error);
    }

    // Developers
    try {
      const developers = await prisma.developer.findMany({
        select: { id: true, slug: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: 1000,
      });

      developers.forEach((developer) => {
        const path = developer.slug ? `/developers/${developer.slug}` : `/developers/${developer.id}`;
        sitemap += createUrlEntry(
          generateUrl(path),
          developer.updatedAt,
          'monthly',
          '0.7'
        );
      });
    } catch (error) {
      console.error('Error fetching developers for sitemap:', error);
    }

    // Blog posts
    try {
      const blogs = await prisma.blog.findMany({
        where: { published: true },
        select: { id: true, slug: true, updatedAt: true, publishedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: 1000,
      });

      blogs.forEach((blog) => {
        const path = blog.slug ? `/blog/${blog.slug}` : `/blog/${blog.id}`;
        sitemap += createUrlEntry(
          generateUrl(path),
          blog.updatedAt || blog.publishedAt || new Date(),
          'monthly',
          '0.7'
        );
      });
    } catch (error) {
      console.error('Error fetching blogs for sitemap:', error);
    }

    sitemap += `</urlset>`;

    // Set content type to XML
    res.set('Content-Type', 'application/xml');
    res.send(sitemap);
  } catch (error) {
    console.error('Error generating sitemap:', error);
    res.status(500).json({ error: 'Failed to generate sitemap' });
  }
});

module.exports = router;

