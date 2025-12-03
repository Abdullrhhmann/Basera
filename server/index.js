const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const path = require('path');
const fs = require('fs');
const prisma = require('./prisma/client');

// Ensure environment variables load regardless of where the server is started from
const serverEnvPath = path.join(__dirname, '.env');
const rootEnvPath = path.join(__dirname, '..', '.env');
const envFilePath = fs.existsSync(serverEnvPath) ? serverEnvPath : rootEnvPath;
require('dotenv').config({ path: envFilePath });

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is required!');
  console.error('Please set DATABASE_URL in server/.env or the deployment environment.');
  process.exit(1);
}

const authRoutes = require('./routes/auth');
const propertyRoutes = require('./routes/properties');
const developerRoutes = require('./routes/developers');
const cityRoutes = require('./routes/cities');
const governorateRoutes = require('./routes/governorates');
const areaRoutes = require('./routes/areas');
const userRoutes = require('./routes/users');
const inquiryRoutes = require('./routes/inquiries');
const chatRoutes = require('./routes/chat');
const dashboardRoutes = require('./routes/dashboard');
const searchRoutes = require('./routes/search');
const uploadRoutes = require('./routes/uploads');
const launchRoutes = require('./routes/launches');
const bulkUploadRoutes = require('./routes/bulkUploads');
const blogRoutes = require('./routes/blogs');
const siteSettingsRoutes = require('./routes/siteSettings');
const compoundRoutes = require('./routes/compounds');
const jobRoutes = require('./routes/jobs');
const jobApplicationRoutes = require('./routes/jobApplications');
const newsletterRoutes = require('./routes/newsletter');
const videoRoutes = require('./routes/videos');
const videoPlaylistRoutes = require('./routes/videoPlaylists');
const sitemapRoutes = require('./routes/sitemap');
const { authMiddleware, adminMiddleware } = require('./middleware/auth');

const app = express();
app.disable('x-powered-by');

// Trust proxy
app.set('trust proxy', 1);

// Security middleware with relaxed CSP for mobile compatibility
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// Compression middleware for better performance
app.use(compression());

// CORS configuration - Secure for production, flexible for development
const allowedOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : [
      'https://basira-frontend.vercel.app',
      'http://localhost:3000',
      'http://localhost:3001',
      process.env.CLIENT_URL
    ].filter(Boolean);

// Enhanced CORS middleware with strict origin checking in production
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const isProduction = process.env.NODE_ENV === 'production';
  
  // In production, only allow whitelisted origins
  if (isProduction) {
    if (origin && allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
    }
  } else {
    // In development, allow all origins for easier testing
    res.header('Access-Control-Allow-Origin', origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Max-Age', '86400'); // 24 hours
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});
 
app.use(cors({
  origin: function (origin, callback) {
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Allow requests with no origin (mobile apps, curl, Postman, etc.) only in development
    if (!origin) {
      return callback(null, !isProduction);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      if (isProduction) {
        console.warn('CORS blocked origin:', origin);
        callback(new Error('Not allowed by CORS'));
      } else {
        console.log('CORS allowing origin (dev mode):', origin);
        callback(null, true);
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

const isLocalIp = (ipAddress = '') => {
  const normalized = ipAddress.replace('::ffff:', '');
  return normalized === '127.0.0.1' || normalized === '::1';
};

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: Number(process.env.RATE_LIMIT_MAX || 500), // increase headroom for authenticated dashboards
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true,
  skip: (req) => {
    // Disable limiting entirely for non-production environments to ease local development
    if (process.env.NODE_ENV !== 'production') {
      return true;
    }

    // Skip rate limiting for localhost or loopback addresses
    if (isLocalIp(req.ip || req.connection?.remoteAddress)) {
      return true;
    }

    // Allow authenticated admin/API traffic more breathing room
    if (req.headers.authorization?.startsWith('Bearer ')) {
      return true;
    }

    return false;
  },
  message: {
    message: 'Too many requests from this client. Please slow down and retry shortly.',
  },
});
app.use(limiter);

// Body parsing middleware - order matters!
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Production logging middleware
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    const startTime = Date.now();
    
    // Log request
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - IP: ${req.ip}`);
    
    // Capture response
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const logLevel = res.statusCode >= 400 ? 'ERROR' : 'INFO';
      console.log(
        `[${new Date().toISOString()}] [${logLevel}] ${req.method} ${req.url} - ` +
        `Status: ${res.statusCode} - Duration: ${duration}ms - IP: ${req.ip}`
      );
    });
    
    next();
  });
}

// Set longer timeout for bulk upload routes
app.use('/api/bulk-uploads', (req, res, next) => {
  // Set timeout to 10 minutes for bulk uploads
  req.setTimeout(10 * 60 * 1000); // 10 minutes
  res.setTimeout(10 * 60 * 1000); // 10 minutes
  next();
});

// Middleware for handling multipart/form-Data (file uploads)
// This should come after the basic body parsers but before routes
app.use('/api/uploads', (req, res, next) => {
  // Skip for non-multipart requests
  if (!req.headers['content-type'] || !req.headers['content-type'].includes('multipart/form-data')) {
    return next();
  }

  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/developers', developerRoutes);
app.use('/api/compounds', compoundRoutes);
app.use('/api/governorates', governorateRoutes);
app.use('/api/cities', cityRoutes);
app.use('/api/areas', areaRoutes);
app.use('/api/users', userRoutes);
app.use('/api/inquiries', inquiryRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/launches', launchRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/site-settings', siteSettingsRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/job-applications', jobApplicationRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/video-playlists', videoPlaylistRoutes);
app.use('/api/bulk-uploads', authMiddleware, adminMiddleware, bulkUploadRoutes);
app.use('/api', sitemapRoutes); // Sitemap route

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5001;
let server;

const startServer = async () => {
  try {
    console.log('Checking PostgreSQL connectivity...');
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    console.log('Connected to PostgreSQL successfully');

    server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to connect to PostgreSQL:', error);
    process.exit(1);
  }
};

const gracefulShutdown = async (signal) => {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  try {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    }
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

startServer();
['SIGINT', 'SIGTERM', 'SIGUSR2'].forEach((signal) => {
  process.on(signal, () => gracefulShutdown(signal));
});

module.exports = app;
