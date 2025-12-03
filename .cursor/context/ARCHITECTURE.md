# Basira Real Estate - Complete Architecture Documentation

## Table of Contents

1. [Project Overview](#project-overview)
2. [Backend Architecture](#backend-architecture)
3. [Frontend Architecture](#frontend-architecture)
4. [Data Models & Persistence](#data-models--persistence)
5. [API Surface & Business Flows](#api-surface--business-flows)
6. [Integration & Data Flow](#integration--data-flow)
7. [Deployment & Operations](#deployment--operations)
8. [Key Features & Business Logic](#key-features--business-logic)

---

## Project Overview

**Basira Real Estate** is a full-stack real estate platform built for the Egyptian market, enabling property listings, compound management, developer showcases, and AI-powered customer interactions. The system supports both public-facing property discovery and comprehensive admin management tools.

### Technology Stack

- **Backend**: Node.js, Express.js, MongoDB (Mongoose)
- **Frontend**: React 18, React Router v6, React Query
- **Authentication**: JWT (JSON Web Tokens), bcryptjs
- **Media Management**: Cloudinary
- **AI Integration**: OpenRouter API (Claude 3.5 Sonnet)
- **File Processing**: ExcelJS (backend), xlsx (frontend) for Excel file support
- **Styling**: Tailwind CSS, Custom CSS modules
- **Animation**: GSAP, Framer Motion, Lenis (smooth scrolling)
- **Internationalization**: i18next (English/Arabic)
- **Deployment**: Vercel (frontend & backend)

### Project Structure

```
basira-real-estate/
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Route pages
│   │   ├── context/        # React Context providers
│   │   ├── hooks/           # Custom React hooks
│   │   ├── utils/          # Utility functions & API client
│   │   ├── i18n/           # Internationalization config
│   │   └── styles/         # CSS modules
│   └── public/             # Static assets
├── server/                 # Node.js backend application
│   ├── models/             # Mongoose schemas
│   ├── routes/             # Express route handlers
│   ├── middleware/         # Custom middleware
│   ├── utils/              # Backend utilities
│   └── scripts/            # Database seeding & migration scripts
└── docs/                   # Documentation
```

---

## Backend Architecture

### Entry Point: `server/index.js`

The backend server is initialized in `server/index.js`, which sets up Express, middleware, MongoDB connection, and route registration.

#### Key Initialization Steps:

1. **Environment Configuration**
   - Loads `.env` from either `server/.env` or root `.env`
   - Disables Mongoose auto-indexing in production for performance

2. **Express App Setup**
   - Security: Helmet (with relaxed CSP for mobile compatibility)
   - Compression: Gzip compression for responses
   - CORS: Configured for production (Vercel) and development (localhost:3000)
   - Body Parsing: JSON (50MB limit) and URL-encoded (50MB limit)
   - Rate Limiting: 500 requests per 15 minutes (configurable, disabled in dev)

3. **MongoDB Connection**
   - Connection string from `MONGO_URI` environment variable
   - Connection pooling: 5-50 connections
   - Event handlers for connection lifecycle (connected, error, disconnected, reconnected)
   - Graceful shutdown on SIGINT

4. **Route Registration**
   All routes are prefixed with `/api`:
   - `/api/auth` - Authentication endpoints
   - `/api/properties` - Property CRUD operations
   - `/api/compounds` - Compound management
   - `/api/developers` - Developer profiles
   - `/api/governorates`, `/api/cities`, `/api/areas` - Location hierarchy
   - `/api/users` - User management
   - `/api/inquiries` - Property inquiries
   - `/api/chat` - AI chat conversations
   - `/api/dashboard` - Admin dashboard statistics
   - `/api/search` - Advanced property search
   - `/api/uploads` - File upload handling
   - `/api/launches` - New property launches
   - `/api/blogs` - Blog posts
   - `/api/site-settings` - Site configuration
   - `/api/bulk-uploads` - Bulk property import (admin only)

5. **Error Handling**
   - Global error middleware catches unhandled errors
   - 404 handler for undefined routes
   - Health check endpoint at `/api/health`

### Middleware: `server/middleware/auth.js`

The authentication middleware provides several protection layers:

#### `authMiddleware`
- Validates JWT token from `Authorization: Bearer <token>` header
- Verifies token signature using `JWT_SECRET`
- Loads user from database and attaches to `req.user`
- Checks if user account is active
- Returns 401 if token is missing or invalid

#### `adminMiddleware`
- Requires `authMiddleware` to run first
- Checks if user has admin-level role (admin, sales_manager, sales_team_leader, sales_agent)
- Returns 403 if user lacks admin privileges

#### `roleMiddleware(allowedRoles)`
- Factory function that creates middleware for specific role(s)
- Validates user role against allowed roles array
- Returns 403 if role doesn't match

#### `hierarchyMiddleware(minHierarchy)`
- Factory function for hierarchy-based access control
- Lower hierarchy number = higher authority (1 = admin, 5 = regular user)
- Users can only access resources requiring their hierarchy level or lower

#### `permissionMiddleware(requiredPermissions, requireAll)`
- Factory function for granular permission checking
- Can require all permissions (`requireAll: true`) or any permission (`requireAll: false`)
- Uses permission system from `server/utils/permissions.js`

#### `optionalAuth`
- Non-blocking authentication middleware
- Attempts to load user if token exists, but doesn't fail if token is invalid
- Useful for public endpoints that provide enhanced features for authenticated users

### Utilities: `server/utils/`

#### `permissions.js` - Role-Based Access Control

Defines a comprehensive permission system:

**Roles** (hierarchy 1-5):
- `admin` (hierarchy 1) - Full system access
- `sales_manager` (hierarchy 2) - Property & launch management
- `sales_team_leader` (hierarchy 3) - Property approval & management
- `sales_agent` (hierarchy 4) - Limited property creation (requires approval)
- `user` (hierarchy 5) - Public access only

**Permissions**:
- User management: `manage_users`, `view_users`, `create_users`, `edit_users`, `delete_users`
- Property management: `manage_properties`, `view_properties`, `create_properties`, `edit_properties`, `delete_properties`, `approve_properties`
- Launch management: `manage_launches`, `view_launches`, `create_launches`, `edit_launches`, `delete_launches`
- Developer management: `manage_developers`, `view_developers`, `create_developers`, `edit_developers`, `delete_developers`
- Inquiry management: `manage_inquiries`, `view_inquiries`
- Dashboard access: `access_dashboard`, `view_all_stats`, `view_own_stats`
- Bulk operations: `bulk_upload`, `bulk_delete`

**Helper Functions**:
- `hasPermission(user, permission)` - Check single permission
- `hasAllPermissions(user, permissions)` - Check all permissions
- `hasAnyPermission(user, permissions)` - Check any permission
- `getUserHierarchy(user)` - Get user's hierarchy level
- `hasHierarchyLevel(user, requiredHierarchy)` - Check hierarchy access
- `canManageUser(manager, target)` - Check if user can manage another user
- `isAdminRole(user)` - Check if user has admin-level role

#### `cloudinary.js` - Media Management

Handles all image and video uploads to Cloudinary:

**Key Functions**:
- `uploadToCloudinary(file, options)` - Upload single file with transformations
  - Supports images and videos
  - Auto-generates multiple sizes (thumbnail, medium, large, hero)
  - WebP format optimization
  - Quality auto-optimization
- `uploadMultipleToCloudinary(files, folder)` - Batch upload with progress tracking
- `deleteMultipleFromCloudinary(publicIds)` - Batch deletion
- `generateImageTransforms(publicId, options)` - Generate optimized URLs
- `getOptimizedImageInfo(publicId)` - Get all size variants

**Multer Configuration**:
- Memory storage (files processed in-memory before Cloudinary upload)
- 100MB file size limit
- 20 files per request maximum
- Image and video MIME types only

#### `aiService.js` - AI Chat Integration

Integrates with OpenRouter API for AI-powered property recommendations:

**System Prompt**:
- Configured as "Basira", a real estate assistant for Egypt
- Understands property requirements, budgets, locations, features
- Provides property recommendations and investment insights

**Key Functions**:
- `getChatCompletion(messages, properties, launches)` - Main AI API call
  - Formats property/launch data for AI context
  - Handles errors gracefully with fallback responses
  - 30-second timeout
- `formatPropertyForAI(property)` - Formats property data for AI
- `formatLaunchForAI(launch)` - Formats launch data for AI
- `buildPropertyContext(properties, launches)` - Builds context string for AI
- `extractPreferencesFromMessage(message)` - Extracts user preferences from text
- `getGreeting()` - Returns random conversational greeting

**Configuration**:
- Model: `anthropic/claude-3.5-sonnet` (configurable via `OPENROUTER_MODEL`)
- API Key: `OPENROUTER_API_KEY` environment variable
- Max tokens: 1500
- Temperature: 0.7 (balanced creativity)

#### `propertySearch.js` - Advanced Search Logic

Provides intelligent property and launch search capabilities:

**Key Functions**:
- `buildSearchCriteria(userPreferences, messageText)` - Builds MongoDB query from preferences
  - Filters by budget, location, property type, bedrooms, bathrooms, area
  - Handles features and amenities
  - Only returns active, approved properties
- `searchProperties(userPreferences, messageText, limit)` - Search properties
- `searchLaunches(userPreferences, messageText, limit)` - Search launches
- `smartSearch(userPreferences, messageText)` - Combined search with intelligence
  - Detects launch-specific queries
  - Detects investment queries
  - Only shows properties when explicitly requested
- `getFeaturedProperties(limit)` - Get featured properties
- `getRecentLaunches(limit)` - Get recent launches
- `parseBudget(text)` - Extract budget from natural language
- `extractNumber(text)` - Extract numerical values (handles "5 million EGP")

**Search Intelligence**:
- `isPropertyRequest(messageText)` - Detects if message is requesting properties
  - Filters out gibberish
  - Recognizes property-related keywords
  - Handles greetings and questions appropriately

#### `bulkValidation.js` - Bulk Upload Validation

Handles validation and entity reference resolution for bulk uploads:

**Key Functions**:
- `validateUsers(records)` - Validates user records
- `validateProperties(records, resolvedReferences)` - Validates property records
- `validateDevelopers(records)` - Validates developer records
- `validateCities(records)` - Validates city records
- `validateAreas(records)` - Validates area records
- `validateLeads(records)` - Validates lead records
- `validateLaunches(records)` - Validates launch records
- `resolveEntityReferences(record, entityType)` - Resolves string references to ObjectIds
  - Resolves developer names to ObjectIds
  - Resolves location names to ObjectIds (governorate, city, area)
  - Creates missing entities if they don't exist

#### `cloudinaryHelpers.js` - Cloudinary Utility Functions

Helper functions for Cloudinary operations:

**Key Functions**:
- `resolveImageUrl(image)` - Resolves image URL from various formats
- `resolveImageObject(image)` - Resolves full image object with publicId
- Used throughout the application for consistent image handling

### Frontend Utilities: `client/src/utils/`

#### `excelToJson.js` - Excel File Parser

Converts Excel files to JSON format for bulk upload:

**Key Functions**:
- `parseExcelFile(file, entityType)` - Main parsing function
  - Reads Excel file using `xlsx` library
  - Extracts data from first sheet
  - Converts rows to JSON format
  - Handles different entity types (properties, users, etc.)
- `convertRowToObject(row, entityType)` - Converts Excel row to nested object
  - Handles flattened column names (e.g., `location.city`)
  - Parses comma-separated arrays
  - Handles JSON strings for complex objects
  - Automatic type conversion
- `isExcelFile(filename)` - Checks if file is Excel format
- `getFileExtension(filename)` - Gets file extension

**Column Mapping**:
- Nested fields flattened: `location.city`, `location.coordinates.latitude`, `specifications.bedrooms`
- Arrays as comma-separated: `features: "pool,garden,balcony"`
- Complex objects as JSON: `images: '[{"url":"...","caption":"..."}]'`

---

## Frontend Architecture

### Entry Point: `client/src/App.js`

The React application is bootstrapped in `App.js`, which sets up routing, global providers, and lazy loading.

#### Key Setup:

1. **Global Providers**:
   - `HelmetProvider` - SEO and meta tag management
   - `QueryClientProvider` - React Query for data fetching/caching
   - `AuthProvider` - Authentication state management
   - `ChatProvider` - AI chat state management
   - `Router` - React Router v6 with future flags

2. **Route Structure**:
   - **Public Routes**: Home, Properties, PropertyDetail, Developers, DeveloperDetail, Launches, LaunchDetail, Compounds, Blog, BlogDetail, About, Contact, ROICalculator, LeadForm
   - **Auth Routes**: Login, Register
   - **User Routes**: Profile (protected), SubmitProperty (protected), MySubmissions (protected)
   - **Admin Routes**: Dashboard, AdminProperties, PendingProperties, ViewProperty, AdminDevelopers, AdminCompounds, AdminCities, AdminGovernorates, AdminAreas, AdminInquiries, AdminLeads, AdminUsers, AdminLaunches, AdminBlogs, Settings (all protected with `requiredRole="admin"`)

3. **Lazy Loading**:
   - Frequently used pages (Home, Properties, About, Contact, Blog) are imported directly
   - Less frequently used pages are lazy-loaded for better initial load performance
   - Admin pages are all lazy-loaded

4. **Global Components**:
   - `ScrollToTop` - Scrolls to top on route change
   - `ConditionalChatWidget` - Shows chat widget only on public pages
   - `ConditionalContactButtons` - Shows contact buttons only on public pages
   - `SonnerToaster` - Toast notification system

5. **Global Styles**:
   - Viewport meta tag with zoom prevention
   - Touch action manipulation for better mobile UX
   - Text size adjustment for mobile inputs

### State Management

#### `client/src/context/AuthContext.js`

Manages authentication state globally:

**State Structure**:
```javascript
{
  user: UserObject | null,
  token: string | null,
  isAuthenticated: boolean,
  isLoading: boolean,
  isAdmin: boolean,
  userRole: string | null,
  userHierarchy: number,
  permissions: object
}
```

**Actions**:
- `LOGIN_SUCCESS` - Sets user and token, updates localStorage
- `LOGOUT` - Clears user and token, removes from localStorage
- `SET_LOADING` - Sets loading state
- `UPDATE_USER` - Updates user object

**Methods**:
- `login(credentials)` - Authenticates user via API
- `logout()` - Clears authentication
- `register(userData)` - Registers new user
- `updateProfile(profileData)` - Updates user profile
- `checkAuth()` - Validates stored token on app start

**Persistence**:
- Token and user stored in `localStorage`
- Automatically checks token validity on app initialization
- Redirects to login if token is invalid

#### `client/src/context/ChatContext.js`

Manages AI chat conversation state:

**State Structure**:
- `conversations` - Array of conversation objects
- `activeConversation` - Current conversation ID
- `messages` - Messages for active conversation
- `isLoading` - AI response loading state

**Methods**:
- `createConversation()` - Creates new conversation
- `sendMessage(message)` - Sends message to AI
- `loadConversations()` - Loads user's conversations
- `loadMessages(conversationId)` - Loads messages for conversation

### Data Fetching: `client/src/utils/api.js`

Centralized API client using Axios with advanced features:

#### Axios Instance Configuration

**Base Configuration**:
- Base URL: `process.env.REACT_APP_API_URL` or `http://localhost:5001/api`
- Timeout: 30 seconds (increased for file uploads)
- Automatic token injection from localStorage

**Request Queueing**:
- Maximum 10 concurrent requests
- Queue delay: 50ms between requests
- Skips queueing for authentication requests
- Prevents API overload

**Response Interceptors**:
- **401 Unauthorized**: Clears token, redirects to login
- **403 Forbidden**: Passes through (handled by UI)
- **429 Too Many Requests**: Automatic retry with exponential backoff (max 3 retries)
- Request finalization for queue management

**API Endpoints Organized by Domain**:

1. **authAPI**: Login, register, getMe, updateProfile, changePassword
2. **propertiesAPI**: CRUD operations, inquiries, stats, approval workflow
3. **compoundsAPI**: Compound CRUD operations
4. **developersAPI**: Developer CRUD operations
5. **launchesAPI**: Launch CRUD operations
6. **usersAPI**: User management (admin)
7. **inquiriesAPI**: Inquiry management
8. **chatAPI**: Conversation and message management
9. **dashboardAPI**: Statistics and analytics
10. **searchAPI**: Advanced search
11. **uploadsAPI**: File upload to Cloudinary
12. **blogsAPI**: Blog CRUD operations
13. **siteSettingsAPI**: Site configuration
14. **locationAPI**: Governorates, cities, areas hierarchy
15. **bulkUploadsAPI**: Bulk property import

### Routing: React Router v6

**Route Protection**:
- `ProtectedRoute` component wraps admin routes
- Checks authentication and role requirements
- Redirects to login if not authenticated
- Shows 403 if role insufficient

**Route Structure**:
```
/                           → Home (public)
/properties                 → Property listings (public)
/properties/:id             → Property detail (public)
/developers                 → Developer listings (public)
/developers/:slug           → Developer detail (public)
/launches                   → Launch listings (public)
/launches/:id               → Launch detail (public)
/compounds                  → Compound listings (public)
/blog                       → Blog listings (public)
/blog/:slug                 → Blog detail (public)
/about                      → About page (public)
/contact                    → Contact page (public)
/roi-calculator             → ROI Calculator (public)
/lead-form                  → Lead capture form page (public)
/login                      → User login (public)
/register                   → User registration (public)
/admin/login                → Admin login (public)
/admin                      → Admin dashboard (protected: admin)
/admin/properties           → Property management (protected: admin)
/admin/properties/new       → Add property (protected: admin)
/admin/properties/:id       → View property details (protected: admin)
/admin/properties/:id/edit  → Edit property (protected: admin)
/admin/pending-properties   → Review pending properties (protected: admin)
... (all /admin/* routes require admin role)
/profile                    → User profile (protected: authenticated)
/submit-property            → Submit property for review (protected: authenticated)
/my-submissions             → View submitted properties (protected: authenticated)
```

### Internationalization: `client/src/i18n/`

**Configuration**: `client/src/i18n/config.js`
- Detects browser language
- Falls back to English
- Supports English (`en`) and Arabic (`ar`)
- RTL support for Arabic

**Translation Files**:
- `client/src/i18n/locales/en.json` - English translations
- `client/src/i18n/locales/ar.json` - Arabic translations

**Usage**:
```javascript
import { useTranslation } from 'react-i18next';
const { t, i18n } = useTranslation();
const text = t('navigation.home'); // Gets translated text
i18n.changeLanguage('ar'); // Switch to Arabic
```

**Key Translation Namespaces**:
- `navigation` - Navigation menu items
- `home` - Home page content
- `properties` - Property-related text
- `compounds` - Compound-related text
- `developers` - Developer-related text
- `launches` - Launch-related text
- `common` - Common UI elements
- `admin` - Admin panel text

### Component Architecture

#### Component Categories:

1. **Layout Components** (`client/src/components/layout/`):
   - `WebsiteNavbar` - Main website navigation
   - `AdminNavbar` - Admin panel navigation
   - `PageLayout` - Simple page wrapper
   - `MobileSideNav` - Mobile navigation drawer
   - `MobileHeader` - Mobile header
   - `Footer` - Site footer

2. **Admin Components** (`client/src/components/admin/`):
   - `AdminLayout` - Admin page wrapper with sidebar and navigation
   - `PropertyForm` - Property creation/editing form
   - `CompoundForm` - Compound creation/editing form
   - `DeveloperForm` - Developer creation/editing form
   - `LaunchForm` - Launch creation/editing form
   - `DataTable` - Reusable data table with sorting/filtering
   - `BulkUploadModal` - Bulk property import interface (supports JSON and Excel)
   - `ExportPanel` - Data export functionality
   - `SearchAnalyticsPanel` - Search analytics visualization
   - `InquiryForm` - Inquiry management form
   - `UserForm` - User creation/editing form
   - Location forms: `GovernorateForm`, `CityForm`, `AreaForm`

2b. **Admin Pages** (`client/src/pages/admin/`):
   - `PendingProperties` - Review and approve pending property submissions (dark theme)
   - `ViewProperty` - Detailed property view for admin review with approve/reject actions
   - Other admin management pages (properties, developers, compounds, users, etc.)

3. **User Pages** (`client/src/pages/user/`):
   - `SubmitProperty` - Property submission form for regular users
   - `MySubmissions` - View submitted properties and approval status
   - `Profile` - User profile management

4. **Public Pages** (`client/src/pages/`):
   - `LeadForm` - Standalone lead capture form page

3. **Common Components** (`client/src/components/common/`):
   - `PropertyCard3D` - 3D property card with hover effects
   - `CompoundCard` - Compound display card
   - `ChatWidget` - AI chat interface
   - `ContactButtons` - Floating contact buttons (phone, WhatsApp)
   - `ImageUpload` - Cloudinary image upload component
   - `ScrollToTop` - Scroll to top button
   - `ProtectedRoute` - Route protection wrapper

4. **Lead Components** (`client/src/components/lead/`):
   - `LeadCaptureForm` - Reusable lead generation form component
     - Supports customizable badge, title, and subtitle text
     - Handles form validation using react-hook-form
     - Integrates with inquiries API for lead submission
     - Optional fade animation support
     - Configurable source tracking for analytics

5. **UI Components** (`client/src/components/ui/`):
   - Shadcn UI components (Select, Dropdown, etc.)
   - Aceternity UI components (ExpandableCard, etc.)
   - Marquee components for scrolling logos/partners
   - Custom UI primitives

6. **Section Components** (`client/src/components/sections/`):
   - `LaunchesSection` - Launches display section
   - `ROICalculatorSection` - ROI calculator interface
   - Other reusable page sections

### Styling Architecture

#### Tailwind CSS Configuration

**File**: `client/tailwind.config.js`
- Custom color palette (Basira brand colors)
- Custom spacing and typography
- Plugin integrations (forms, typography)

#### Custom CSS Modules

1. **`client/src/styles/Home.css`**:
   - Home page specific styles
   - Hero section animations
   - Menu overlay styles
   - Mobile optimizations
   - Touch action configurations

2. **`client/src/index.css`**:
   - Global base styles
   - CSS variables for theming
   - Dark mode support
   - Utility classes

#### Animation Libraries

1. **GSAP (GreenSock)**:
   - Scroll-triggered animations
   - Menu animations
   - Text reveal animations
   - Used in Home page and admin panels

2. **Framer Motion**:
   - Component transitions
   - Page transitions
   - Used in expandable cards and modals

3. **Lenis**:
   - Smooth scrolling
   - Integrated with GSAP ScrollTrigger
   - Used on Home page for premium scroll experience

---

## Data Models & Persistence

### MongoDB Database

**Connection**: MongoDB Atlas (cloud-hosted)
**ODM**: Mongoose v8
**Connection Pooling**: 5-50 connections

### Core Models

#### Property Model (`server/models/Property.js`)

**Schema Structure**:
```javascript
{
  title: String (required, max 100 chars),
  description: String (required, max 2000 chars),
  type: Enum ['villa', 'twin-villa', 'duplex', 'apartment', 'land', 'commercial'],
  status: Enum ['for-sale', 'for-rent', 'sold', 'rented'],
  developerStatus: Enum ['off-plan', 'on-plan', 'secondary', 'rental'],
  developer: ObjectId (ref: 'Developer'),
  compound: ObjectId (ref: 'Compound'),
  isCompound: Boolean (default: false),
  price: Number (required, min: 0),
  currency: Enum ['EGP', 'AED', 'USD', 'EUR'] (default: 'EGP'),
  location: {
    address: String (required),
    city: String (conditional),
    state: String (conditional),
    country: String (default: 'Egypt'),
    coordinates: { latitude: Number, longitude: Number }
  },
  // New hierarchical location structure
  governorate_ref: ObjectId (ref: 'Governorate'),
  city_ref: ObjectId (ref: 'City'),
  area_ref: ObjectId (ref: 'Area'),
  useNewLocationStructure: Boolean (default: false),
  specifications: {
    bedrooms: Number (min: 0),
    bathrooms: Number (min: 0),
    area: Number (required, min: 0),
    areaUnit: Enum ['sqm'] (default: 'sqm'),
    floors: Number (min: 1),
    parking: Number (min: 0),
    furnished: Enum ['furnished', 'semi-furnished', 'unfurnished']
  },
  features: [String],
  images: [{
    url: String (required),
    publicId: String,
    caption: String,
    isHero: Boolean (default: false),
    order: Number
  }],
  amenities: [String],
  investment: {
    expectedROI: Number,
    rentalYield: Number,
    appreciationRate: Number
  },
  isFeatured: Boolean (default: false),
  isActive: Boolean (default: true),
  isArchived: Boolean (default: false),
  approvalStatus: Enum ['pending', 'approved', 'rejected'] (default: 'pending'),
  rejectionReason: String (stored when property is rejected),
  submittedBy: ObjectId (ref: 'User', tracks who submitted the property),
  approvedBy: ObjectId (ref: 'User', tracks who approved),
  approvalDate: Date,
  views: Number (default: 0),
  createdBy: ObjectId (ref: 'User'),
  updatedBy: ObjectId (ref: 'User'),
  timestamps: { createdAt, updatedAt }
}
```

**Indexes**:
- Text index on `title` and `description`
- Index on `type`, `status`, `isActive`, `approvalStatus`
- Index on `developer`, `compound`
- Index on location fields

**Virtuals**:
- `formattedPrice` - Human-readable price format
- `locationString` - Full location string

**Methods**:
- `approve()` - Approve property
- `reject()` - Reject property
- `archive()` - Archive property
- `restore()` - Restore archived property

#### Compound Model (`server/models/Compound.js`)

**Schema Structure**:
```javascript
{
  name: String (required, max 120 chars, unique),
  slug: String (unique, auto-generated from name),
  description: String (max 5001 chars),
  developer: ObjectId (ref: 'Developer'),
  governorate_ref: ObjectId (ref: 'Governorate'),
  city_ref: ObjectId (ref: 'City'),
  area_ref: ObjectId (ref: 'Area'),
  address: String (max 300 chars),
  location: {
    coordinates: { latitude: Number, longitude: Number },
    mapUrl: String
  },
  heroImage: {
    url: String,
    publicId: String,
    caption: String (max 150 chars)
  },
  gallery: [{
    url: String (required),
    publicId: String,
    caption: String (max 200 chars),
    order: Number (default: 0),
    isHero: Boolean (default: false)
  }],
  amenities: [String],
  status: Enum ['planning', 'launching', 'active', 'delivered', 'on-hold'] (default: 'planning'),
  launchDate: Date,
  handoverDate: Date,
  isFeatured: Boolean (default: false),
  metadata: {
    brochureUrl: String,
    videoUrl: String,
    tags: [String]
  },
  seo: {
    title: String (max 120 chars),
    description: String (max 160 chars),
    keywords: [String]
  },
  createdBy: ObjectId (ref: 'User'),
  updatedBy: ObjectId (ref: 'User'),
  timestamps: { createdAt, updatedAt }
}
```

**Pre-save Middleware**:
- Auto-generates slug from name (lowercase, hyphenated)

**Virtuals**:
- `propertiesCount` - Count of properties linked to compound

**Indexes**:
- Text index on `name` and `description`
- Index on `developer`, `status`, `isFeatured`

#### User Model (`server/models/User.js`)

**Schema Structure**:
```javascript
{
  name: String (required, max 50 chars),
  email: String (required, unique, lowercase),
  phone: String (required, validated format),
  password: String (required, min 6 chars, hashed with bcrypt),
  role: Enum ['user', 'admin', 'sales_manager', 'sales_team_leader', 'sales_agent'] (default: 'user'),
  hierarchy: Number (min: 1, max: 5, default: 5),
  createdBy: ObjectId (ref: 'User'),
  permissions: {
    canManageUsers: Boolean,
    canManageProperties: Boolean,
    canApproveProperties: Boolean,
    canManageLaunches: Boolean,
    canManageDevelopers: Boolean,
    canManageInquiries: Boolean,
    canManageLeads: Boolean,
    canAccessDashboard: Boolean,
    canBulkUpload: Boolean
  },
  isActive: Boolean (default: true),
  profileImage: String,
  preferences: {
    propertyTypes: [String],
    locations: [String],
    priceRange: { min: Number, max: Number }
  },
  lastLogin: Date,
  isEmailVerified: Boolean (default: false),
  bio: String (max 500 chars),
  location: String (max 100 chars),
  activityStats: {
    propertiesViewed: Number (default: 0),
    inquiriesSent: Number (default: 0),
    profileViews: Number (default: 0)
  },
  viewedProperties: [{
    property: ObjectId (ref: 'Property'),
    viewedAt: Date,
    viewCount: Number
  }],
  timestamps: { createdAt, updatedAt }
}
```

**Pre-save Middleware**:
- Hashes password with bcrypt before saving
- Sets hierarchy based on role

**Methods**:
- `comparePassword(candidatePassword)` - Compare password with hash
- `generateAuthToken()` - Generate JWT token

**Indexes**:
- Unique index on `email`
- Index on `role`, `isActive`

#### Developer Model (`server/models/Developer.js`)

**Schema Structure**:
```javascript
{
  name: String (required, unique),
  slug: String (unique, auto-generated),
  description: String,
  logo: { url: String, publicId: String },
  website: String,
  email: String,
  phone: String,
  location: {
    address: String,
    city: String,
    state: String,
    country: String (default: 'Egypt')
  },
  socialMedia: {
    facebook: String,
    instagram: String,
    linkedin: String,
    twitter: String
  },
  isFeatured: Boolean (default: false),
  isActive: Boolean (default: true),
  timestamps: { createdAt, updatedAt }
}
```

#### Launch Model (`server/models/Launch.js`)

**Schema Structure**:
```javascript
{
  title: String (required),
  developer: String (required),
  description: String,
  propertyType: String,
  status: Enum ['Available', 'Coming Soon', 'Pre-Launch', 'Sold Out'],
  startingPrice: Number,
  currency: Enum ['EGP', 'AED', 'USD', 'EUR'],
  location: String,
  bedrooms: Number,
  bathrooms: Number,
  area: Number,
  areaUnit: String,
  features: [String],
  amenities: [String],
  images: [{ url: String, publicId: String, caption: String }],
  launchDate: Date,
  completionDate: Date,
  paymentPlans: [{
    name: String,
    description: String,
    downPayment: Number,
    installments: Number
  }],
  isFeatured: Boolean (default: false),
  isActive: Boolean (default: true),
  timestamps: { createdAt, updatedAt }
}
```

#### Location Hierarchy Models

**Governorate Model** (`server/models/Governorate.js`):
- `name`: String (required, unique)
- `slug`: String (unique, auto-generated)
- `isActive`: Boolean (default: true)

**City Model** (`server/models/City.js`):
- `name`: String (required)
- `slug`: String (unique, auto-generated)
- `governorate_ref`: ObjectId (ref: 'Governorate', required)
- `isActive`: Boolean (default: true)

**Area Model** (`server/models/Area.js`):
- `name`: String (required)
- `slug`: String (unique, auto-generated)
- `city_ref`: ObjectId (ref: 'City', required)
- `governorate_ref`: ObjectId (ref: 'Governorate', required)
- `isActive`: Boolean (default: true)

**Relationships**:
- Area → City → Governorate (hierarchical)
- Properties can reference any level of this hierarchy

#### Other Models

- **Inquiry Model**: Property inquiries from users
- **Lead Model**: Lead generation forms data
- **Blog Model**: Blog posts with SEO fields
- **Conversation Model**: AI chat conversations
- **Search Model**: Search analytics tracking
- **SiteSettings Model**: Site-wide configuration

---

## API Surface & Business Flows

### Authentication Flow (`/api/auth`)

**POST `/api/auth/register`**
- Validates user data (name, email, phone, password)
- Checks email uniqueness
- Hashes password with bcrypt
- Creates user with role 'user'
- Returns user object (password excluded)

**POST `/api/auth/login`**
- Validates email and password
- Finds user by email
- Compares password with hash
- Checks if account is active
- Generates JWT token (expires in 7 days)
- Updates `lastLogin` timestamp
- Returns token and user object

**GET `/api/auth/me`**
- Requires `authMiddleware`
- Returns current user object
- Used for token validation

**PUT `/api/auth/profile`**
- Requires `authMiddleware`
- Updates user profile (name, phone, bio, location, preferences)
- Returns updated user

**POST `/api/auth/change-password`**
- Requires `authMiddleware`
- Validates current password
- Hashes new password
- Updates password

### Property Management Flow (`/api/properties`)

**GET `/api/properties`**
- Public endpoint (optional auth for enhanced features)
- Query parameters:
  - `page`, `limit` - Pagination
  - `search` - Text search (title, description)
  - `type` - Property type filter
  - `status` - Status filter (for-sale, for-rent)
  - `developerStatus` - Developer status filter
  - `city`, `state` - Location filters
  - `minPrice`, `maxPrice` - Price range
  - `bedrooms`, `bathrooms` - Specification filters
  - `features`, `amenities` - Array filters
  - `featured` - Featured filter
  - `sortBy`, `sortOrder` - Sorting
- Returns paginated properties
- Only returns active, approved properties for public
- Includes developer and compound population
- Caches results for 5 minutes

**GET `/api/properties/:id`**
- Public endpoint (optional auth)
- Returns single property with full details
- Tracks property view (increments `views` counter)
- Tracks user activity if authenticated
- Caches result for 2 minutes

**POST `/api/properties`**
- Requires `authMiddleware`
- Uses `allowPropertyCreation` middleware to permit both admin and regular user submissions
- Regular users (role: 'user') can create properties which are automatically marked as 'pending'
- Admin users with proper permissions can create properties that are auto-approved
- Validates property data
- Handles image uploads to Cloudinary
- Sets `approvalStatus: 'pending'` for user submissions, 'approved' for admin submissions
- Sets `createdBy` to current user
- Sets `submittedBy` field for tracking submission source
- Returns created property

**PUT `/api/properties/:id`**
- Requires `authMiddleware`
- Permission check: User can edit own properties, admins can edit all
- Validates property data
- Handles image updates (uploads new, deletes old from Cloudinary)
- Updates property
- Clears property caches
- Returns updated property

**DELETE `/api/properties/:id`**
- Requires `authMiddleware` + `adminMiddleware`
- Deletes property
- Deletes all images from Cloudinary
- Clears caches
- Returns success message

**POST `/api/properties/:id/inquiry`**
- Public endpoint
- Creates inquiry for property
- Sends notification (if configured)
- Returns inquiry object

**Property Approval Workflow**:

**GET `/api/properties/pending`**
- Requires `authMiddleware` + permission check
- Returns properties with `approvalStatus: 'pending'`
- Filtered by user permissions (sales agents see own, admins see all)
- Includes pagination support

**GET `/api/properties/my-submissions`**
- Requires `authMiddleware`
- Returns properties submitted by the authenticated user
- Shows approval status (pending, approved, rejected) and rejection reason if rejected
- Includes pagination support
- Populates location references (governorate, city, area)

**PUT `/api/properties/:id/approve`**
- Requires `authMiddleware` + `approve_properties` permission
- Sets `approvalStatus: 'approved'`
- Sets `isActive: true`
- Clears caches
- Returns approved property

**PUT `/api/properties/:id/reject`**
- Requires `authMiddleware` + `approve_properties` permission
- Accepts optional `reason` parameter for rejection reason
- Sets `approvalStatus: 'rejected'`
- Sets `isActive: false`
- Stores `rejectionReason` in property document
- **Automatic Image Cleanup**: If property was submitted by a regular user (role: 'user'), automatically deletes all associated images from Cloudinary to prevent storage waste
- Optionally sends notification to creator
- Clears caches

### Compound Management Flow (`/api/compounds`)

**GET `/api/compounds`**
- Public endpoint
- Query parameters: `page`, `limit`, `search`, `developer`, `status`, `featured`, `sortBy`, `sortOrder`
- Returns paginated compounds
- Populates developer and location references
- Includes virtual `propertiesCount`

**GET `/api/compounds/:slugOrId`**
- Public endpoint
- Returns single compound by slug or ID
- Populates all related data

**POST `/api/compounds`**
- Requires `authMiddleware` + `adminMiddleware`
- Validates compound data
- Handles hero image and gallery uploads
- Auto-generates slug
- Returns created compound

**PUT `/api/compounds/:id`**
- Requires `authMiddleware` + `adminMiddleware`
- Validates and updates compound
- Handles image updates
- Returns updated compound

**DELETE `/api/compounds/:id`**
- Requires `authMiddleware` + `adminMiddleware`
- Deletes compound
- Deletes images from Cloudinary
- Returns success message

### Developer Management Flow (`/api/developers`)

Similar structure to compounds:
- GET (list, detail)
- POST (create - admin only)
- PUT (update - admin only)
- DELETE (delete - admin only)

### Launch Management Flow (`/api/launches`)

Similar structure:
- GET (list, detail)
- POST (create - admin only)
- PUT (update - admin only)
- DELETE (delete - admin only)

### Location Hierarchy Flow

**Governorates** (`/api/governorates`):
- GET (list, detail)
- POST (create - admin only)
- PUT (update - admin only)
- DELETE (delete - admin only)

**Cities** (`/api/cities`):
- GET (list by governorate, detail)
- POST (create - admin only)
- PUT (update - admin only)
- DELETE (delete - admin only)

**Areas** (`/api/areas`):
- GET (list by city, detail)
- POST (create - admin only)
- PUT (update - admin only)
- DELETE (delete - admin only)

### AI Chat Flow (`/api/chat`)

**POST `/api/chat/conversations`**
- Requires `authMiddleware`
- Creates new conversation
- Returns conversation object

**GET `/api/chat/conversations`**
- Requires `authMiddleware`
- Returns user's conversations

**GET `/api/chat/conversations/:id/messages`**
- Requires `authMiddleware`
- Returns messages for conversation

**POST `/api/chat/conversations/:id/messages`**
- Requires `authMiddleware`
- Sends message to AI
- Process:
  1. Saves user message to database
  2. Extracts user preferences from message
  3. Searches properties/launches based on preferences
  4. Calls OpenRouter API with property context
  5. Saves AI response to database
  6. Returns AI response and matched properties
- Handles errors gracefully with fallback response

### Search Flow (`/api/search`)

**POST `/api/search`**
- Public endpoint
- Advanced search with natural language processing
- Supports:
  - Budget extraction from text
  - Location extraction
  - Property type detection
  - Feature/amenity matching
- Returns properties and launches matching criteria

### Upload Flow (`/api/uploads`)

**POST `/api/uploads`**
- Requires `authMiddleware`
- Accepts multipart/form-data
- Validates file type (images/videos only)
- Uploads to Cloudinary with optimizations
- Returns upload result with URLs and public IDs
- Supports single or multiple file uploads

### Dashboard Flow (`/api/dashboard`)

**GET `/api/dashboard/stats`**
- Requires `authMiddleware` + `access_dashboard` permission
- Returns statistics:
  - Total properties (by status, type)
  - Total users
  - Total inquiries
  - Revenue metrics (if applicable)
  - Recent activity
- Filtered by user permissions (sales agents see own stats, admins see all)
- Cached for 1 minute

### Bulk Upload Flow (`/api/bulk-uploads`)
  
**POST `/api/bulk-uploads/:entityType`**
- Entity types: `users`, `properties`, `leads`, `developers`, `cities`, `launches`, `areas`
- Requires `authMiddleware` + hierarchy check (varies by entity type)
- Accepts JSON array in request body (Excel files are converted to JSON on frontend before submission)
- Validates all records before insertion using `bulkValidation.js`
- Handles duplicate detection and skipping
- Resolves entity references (developers, locations, etc.)
- Returns success/failure report with detailed summary
  - Summary includes: total, imported, skipped, failed counts
  - Skipped records with reasons
  - Validation errors with record indices
  - Image warnings (if applicable)
- Extended timeout (15 minutes for large batches)
- Supports up to 1000 records per upload

**GET `/api/bulk-uploads/template/:entityType`**
- Returns JSON template with example data structure
- Includes comments explaining field formats

**GET `/api/bulk-uploads/template/:entityType/excel`**
- Returns Excel template file (.xlsx)
- Uses ExcelJS library to generate formatted Excel file
- Flattens nested JSON structure into column format (e.g., `location.city`, `specifications.bedrooms`)
- Includes header row with all possible column names
- Includes example data rows
- Auto-sized columns and frozen header row
- Proper MIME type headers for file download

**Frontend Excel Processing**:
- `client/src/utils/excelToJson.js` - Excel file parser
  - Supports `.xlsx` and `.xls` formats
  - Converts flattened columns to nested JSON structure
  - Handles comma-separated arrays
  - Supports JSON strings for complex objects
  - Automatic type conversion

**Bulk Upload Modal** (`client/src/components/admin/BulkUploadModal.js`):
- Accepts both JSON and Excel files
- Auto-detects file type
- Converts Excel to JSON format before submission
- Template download buttons for both formats

---

## Integration & Data Flow

### Frontend-Backend Communication

#### Request Flow:

1. **User Action** (e.g., clicking "Search Properties")
2. **React Component** calls API method from `client/src/utils/api.js`
3. **Axios Instance**:
   - Adds authentication token from localStorage
   - Queues request if needed
   - Sends HTTP request to backend
4. **Backend Route Handler**:
   - Validates request (middleware chain)
   - Processes business logic
   - Queries database
   - Returns response
5. **Axios Interceptor**:
   - Handles errors (401 → logout, 429 → retry)
   - Returns data to component
6. **React Component**:
   - Updates state with data
   - Re-renders UI

#### Authentication Flow:

1. **Login**:
   ```
   User enters credentials
   → Frontend: POST /api/auth/login
   → Backend: Validates, generates JWT
   → Frontend: Stores token in localStorage
   → Frontend: Updates AuthContext
   → Frontend: Redirects to dashboard/home
   ```

2. **Authenticated Request**:
   ```
   Component makes API call
   → Axios interceptor adds token to header
   → Backend: authMiddleware validates token
   → Backend: Loads user, attaches to req.user
   → Backend: Processes request
   → Returns response
   ```

3. **Token Expiration**:
   ```
   Backend returns 401
   → Axios interceptor catches 401
   → Frontend: Clears localStorage
   → Frontend: Redirects to /login
   ```

### Image Upload Flow:

1. **User selects image** in form
2. **Frontend** sends file to `/api/uploads`
3. **Backend** (`server/routes/uploads.js`):
   - Receives multipart/form-data
   - Validates file type and size
   - Uploads to Cloudinary via `server/utils/cloudinary.js`
   - Cloudinary generates multiple sizes
   - Returns URLs and public IDs
4. **Frontend** receives URLs
5. **Frontend** includes URLs in property/compound form submission
6. **Backend** saves URLs to database

### AI Chat Flow:

1. **User sends message** in chat widget
2. **Frontend** (`client/src/components/common/ChatWidget.jsx`):
   - Sends message to `/api/chat/conversations/:id/messages`
3. **Backend** (`server/routes/chat.js`):
   - Saves user message to database
   - Extracts preferences using `server/utils/propertySearch.js`
   - Searches properties/launches using `smartSearch()`
   - Formats properties for AI using `server/utils/aiService.js`
   - Calls OpenRouter API with context
   - Saves AI response to database
   - Returns AI response and property matches
4. **Frontend**:
   - Displays AI response
   - Renders property cards if matches found
   - Updates conversation state

### Property Approval Workflow:

1. **Sales Agent creates property**:
   - Property saved with `approvalStatus: 'pending'`
   - `isActive: false` (not visible to public)

2. **Admin/Sales Manager reviews**:
   - Views pending properties in admin panel
   - Can approve or reject

3. **Approval**:
   - Sets `approvalStatus: 'approved'`
   - Sets `isActive: true`
   - Property becomes visible to public
   - Caches cleared

4. **Rejection**:
   - Sets `approvalStatus: 'rejected'`
   - Property remains inactive
   - Creator can be notified

### Compound-Property Relationship:

1. **Property linked to compound**:
   - Property has `compound` field (ObjectId reference)
   - Property has `isCompound: true` if it's a compound overview card

2. **Auto-fill on property creation**:
   - When compound selected in property form
   - Frontend auto-fills: developer, governorate, city, area
   - Reduces manual data entry

3. **Compound detail page**:
   - Shows all properties linked to compound
   - Displays compound information (dates, amenities, gallery)

### Location Hierarchy Integration:

1. **Three-level hierarchy**: Governorate → City → Area

2. **Property location**:
   - Can use old structure: `location.city`, `location.state`
   - Can use new structure: `governorate_ref`, `city_ref`, `area_ref`
   - `useNewLocationStructure` flag determines which to use

3. **Form auto-population**:
   - Selecting governorate filters cities
   - Selecting city filters areas
   - Selecting area completes location

---

## Deployment & Operations

### Development Workflow

#### Local Development:

1. **Prerequisites**:
   - Node.js (v16+)
   - MongoDB Atlas account (or local MongoDB)
   - Cloudinary account
   - OpenRouter API key (for AI chat)

2. **Setup**:
   ```bash
   # Install dependencies
   npm run install-all
   
   # Configure environment
   cp .env.example .env
   # Edit .env with your credentials
   
   # Start development servers
   npm run dev
   # Runs both client (port 3000) and server (port 5001)
   ```

3. **Environment Variables** (`.env`):
   ```
   # MongoDB
   MONGO_URI=mongodb+srv://...
   
   # JWT
   JWT_SECRET=your-secret-key
   
   # Cloudinary
   CLOUDINARY_CLOUD_NAME=...
   CLOUDINARY_API_KEY=...
   CLOUDINARY_API_SECRET=...
   
   # OpenRouter (AI)
   OPENROUTER_API_KEY=...
   OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
   
   # Client URL
   CLIENT_URL=http://localhost:3000
   
   # Node Environment
   NODE_ENV=development
   ```

#### Database Seeding:

**Location Seeding**:
```bash
npm run seed:locations
# Seeds governorates, cities, and areas for Egypt
```

**Property Seeding**:
```bash
cd server
npm run seed-properties
# Seeds sample properties (various scripts available)
```

**Admin User Creation**:
```bash
cd server
npm run create-admin
# Creates admin user interactively

npm run seed-super-admin
# Creates Basira super admin
```

**Available Scripts** (`server/scripts/`):
- `seedLocations.js` - Seed location hierarchy (governorates, cities, areas)
- `seedRealProperties.js` - Seed realistic properties
- `seedProperties.js` - Seed sample properties
- `seedProperties40.js` - Seed 40 sample properties
- `seedTenProperties.js` - Seed 10 sample properties
- `seedJiranProperties.js` - Seed JIRAN Residence properties
- `seedLaunches.js` - Seed property launches
- `seedBlogs.js` - Seed blog posts
- `seedSearchData.js` - Seed search analytics data
- `createAdmin.js` - Create admin user interactively
- `seedBasiraSuperAdmin.js` - Create Basira super admin
- `createCustomAdmin.js` - Create custom admin with specific permissions
- `migrateDevelopers.js` - Migrate developer data
- `migratePropertyApprovalStatus.js` - Migrate property approval statuses
- `migrateUserLeadsPermission.js` - Migrate user lead permissions
- Various utility and verification scripts

### Production Deployment

#### Frontend Deployment (Vercel):

1. **Connect Repository** to Vercel
2. **Configure Build**:
   - Root Directory: `client`
   - Build Command: `npm run build`
   - Output Directory: `build`
3. **Environment Variables**:
   - `REACT_APP_API_URL` - Backend API URL
4. **Automatic Deployments**:
   - Deploys on push to main branch
   - Preview deployments for pull requests

#### Backend Deployment (Vercel):

1. **Configure** `server/vercel.json`:
   ```json
   {
     "builds": [{ "src": "server/index.js", "use": "@vercel/node" }],
     "routes": [{ "src": "/(.*)", "dest": "server/index.js" }]
   }
   ```

2. **Environment Variables**:
   - All backend environment variables
   - MongoDB connection string
   - Cloudinary credentials
   - JWT secret
   - OpenRouter API key

3. **Serverless Functions**:
   - Vercel converts Express app to serverless functions
   - Automatic scaling

#### Database (MongoDB Atlas):

1. **Create Cluster** on MongoDB Atlas
2. **Configure Network Access**:
   - Allow Vercel IP ranges
   - Or allow all IPs (0.0.0.0/0) for development
3. **Create Database User**
4. **Get Connection String**
5. **Set `MONGO_URI`** in environment variables

#### Media Storage (Cloudinary):

1. **Create Account** on Cloudinary
2. **Get Credentials**:
   - Cloud Name
   - API Key
   - API Secret
3. **Configure Upload Presets** (optional)
4. **Set Environment Variables**

### Monitoring & Maintenance

#### Performance Optimization:

1. **Caching**:
   - Property list: 5 minutes
   - Property detail: 2 minutes
   - Stats: 1 minute
   - Cache invalidation on updates

2. **Database Indexing**:
   - Text indexes on searchable fields
   - Indexes on frequently queried fields
   - Compound indexes for complex queries

3. **Image Optimization**:
   - Cloudinary auto-optimization
   - Multiple size variants
   - WebP format for modern browsers

4. **Frontend Optimization**:
   - Code splitting (lazy loading)
   - Image lazy loading
   - Request queueing to prevent API overload

#### Error Handling:

1. **Backend**:
   - Global error middleware
   - Try-catch blocks in route handlers
   - Graceful error responses

2. **Frontend**:
   - Axios interceptors for error handling
   - React Error Boundaries (future enhancement)
   - User-friendly error messages

#### Logging:

- Console logging for development
- Error logging for production (can integrate with services like Sentry)
- Request logging (optional)

### Backup & Recovery:

1. **Database Backups**:
   - MongoDB Atlas automatic backups (if enabled)
   - Manual exports via `mongodump`

2. **Media Backups**:
   - Cloudinary provides versioning
   - Can export media if needed

3. **Code Backups**:
   - Git repository (GitHub)
   - Version control for all changes

---

## Key Features & Business Logic

### Property Approval System

**Purpose**: Ensure quality control before properties go live

**Flow**:
1. **Property Creation**:
   - Sales agents and regular users can submit properties
   - Regular users submit via `/submit-property` page
   - All user submissions automatically set `approvalStatus: 'pending'`
   - Admin submissions are auto-approved based on permissions
   - Properties are saved with `submittedBy` field for tracking

2. **Review Process**:
   - Admins/sales managers review in `/admin/pending-properties`
   - Can view detailed property information in `/admin/properties/:id`
   - Approval status visible with visual badges

3. **Approval**:
   - Sets `approvalStatus: 'approved'`
   - Sets `isActive: true`
   - Property becomes visible to public
   - Clears property caches

4. **Rejection**:
   - Sets `approvalStatus: 'rejected'`
   - Sets `isActive: false`
   - Stores `rejectionReason` for user feedback
   - **Automatic Image Cleanup**: If rejected property was submitted by a regular user, all associated Cloudinary images are automatically deleted to prevent storage waste
   - User can view rejection reason in `/my-submissions` page

**User Submission Tracking**:
- Users can view their submissions at `/my-submissions`
- Shows approval status for each submitted property
- Displays rejection reason if property was rejected
- Links to approved property detail page

**Permissions**:
- Regular users (`role: 'user'`): Can create properties (requires approval)
- Sales agents (hierarchy 4): Can create properties (requires approval)
- Sales team leaders (hierarchy 3): Can create and approve properties
- Sales managers (hierarchy 2): Can create and approve properties
- Admins (hierarchy 1): Full access, auto-approve own submissions

### Compound System

**Purpose**: Group related properties under master-planned communities

**Features**:
- Compound overview cards (`isCompound: true`)
- Properties linked to compounds
- Compound detail pages with all linked properties
- Compound-specific information (launch date, handover date, amenities)

**Auto-fill Logic**:
- Selecting compound in property form auto-fills:
  - Developer
  - Governorate
  - City
  - Area
- Reduces data entry errors

### AI Chat Assistant

**Purpose**: Provide 24/7 property recommendations

**Capabilities**:
- Understands natural language property requests
- Extracts preferences (budget, location, type, features)
- Searches database for matches
- Provides conversational recommendations
- Handles greetings and questions
- Filters out gibberish

**Integration**:
- OpenRouter API (Claude 3.5 Sonnet)
- Property context injection
- Fallback responses on API errors

### Search System

**Features**:
- Text search (title, description)
- Advanced filters (type, status, price, location, specifications)
- Natural language processing (budget extraction)
- Featured property prioritization
- Sorting options

**Performance**:
- MongoDB text indexes
- Result caching
- Pagination

### Internationalization

**Languages**: English, Arabic

**Features**:
- RTL support for Arabic
- Language detection
- Manual language switching
- Comprehensive translations for all UI elements

### Image Management

**Features**:
- Multiple image uploads
- Hero image selection
- Image ordering
- Automatic optimization (Cloudinary)
- Multiple size variants
- WebP format support
- Video support

### Analytics & Tracking

**Tracked Metrics**:
- Property views
- User activity (properties viewed, inquiries sent)
- Search queries
- Conversion tracking (future enhancement)

**Dashboard Statistics**:
- Total properties by status/type
- User counts
- Inquiry counts
- Revenue metrics (if applicable)

### Lead Generation

**Forms**:
- Property inquiry forms
- Contact forms
- Lead capture forms (home page)
- **Standalone Lead Form Page** (`/lead-form`)
  - Dedicated page for lead generation
  - Uses reusable `LeadCaptureForm` component
  - Simplified layout with heading and form card
  - Source tracking for analytics

**Reusable Components**:
- **LeadCaptureForm** (`client/src/components/lead/LeadCaptureForm.jsx`)
  - Configurable badge, title, and subtitle text
  - Form validation using react-hook-form
  - Supports multiple form fields: name, email, phone, service type, property type, purpose, budget range, location, message
  - Optional fade animation support
  - Source tracking parameter

**Management**:
- Admin panel for viewing leads (`/admin/leads`)
- Lead status tracking
- Notes and follow-up management
- Lead source analytics

### ROI Calculator

**Purpose**: Help investors calculate returns

**Features**:
- Property price input
- Down payment calculation
- Monthly payment calculation
- ROI estimation
- Rental yield calculation

---

## Future Considerations

### Potential Enhancements:

1. **Real-time Features**:
   - WebSocket integration for live chat
   - Real-time property updates
   - Live notifications

2. **Advanced Search**:
   - Map-based search
   - Saved searches
   - Search alerts

3. **User Features**:
   - Favorite properties
   - Property comparisons
   - Saved searches
   - Email notifications

4. **Analytics**:
   - Google Analytics integration
   - Advanced dashboard metrics
   - User behavior tracking

5. **Performance**:
   - Redis caching layer
   - CDN for static assets
   - Database query optimization

6. **Testing**:
   - Unit tests
   - Integration tests
   - E2E tests

7. **Security**:
   - Rate limiting per user
   - CSRF protection
   - Input sanitization enhancements
   - Security headers

8. **Mobile App**:
   - React Native app
   - Push notifications
   - Offline support

---

## Conclusion

This architecture documentation provides a comprehensive overview of the Basira Real Estate platform. The system is designed for scalability, maintainability, and user experience, with clear separation of concerns between frontend and backend, robust authentication and authorization, and efficient data management.

For questions or contributions, please refer to the project repository or contact the development team.

---

---

## Recent Updates & New Features

### User Property Submission System

**Implementation Date**: 2024

**Overview**: Allows regular authenticated users to submit properties for admin review, enabling property owners to list their properties on the platform.

**Key Components**:
- **SubmitProperty Page** (`client/src/pages/user/SubmitProperty.js`)
  - Form for property submission with all required fields
  - Multiple image upload support (max 6 images)
  - Hero image selection
  - Client-side validation
  - Image management (upload, remove, set hero)
  - Automatic approval status set to 'pending'

- **MySubmissions Page** (`client/src/pages/user/MySubmissions.js`)
  - Displays all properties submitted by the logged-in user
  - Shows approval status with visual badges (pending, approved, rejected)
  - Displays rejection reason if property was rejected
  - Links to approved property detail page
  - Accessible from user profile page

- **API Endpoint**: `GET /api/properties/my-submissions`
  - Returns paginated list of user's submitted properties
  - Includes approval status and rejection reason
  - Populates location references

**Backend Changes**:
- `allowPropertyCreation` middleware in `server/routes/properties.js`
  - Permits both admin and regular user property creation
  - Sets `isUserGeneratedProperty` flag for regular user submissions
- Automatic image cleanup on rejection for user-submitted properties
- `submittedBy` field tracking for all properties

### Lead Form Page

**Implementation**: Standalone lead capture page at `/lead-form`

**Features**:
- Dedicated page for lead generation
- Uses reusable `LeadCaptureForm` component
- Simplified layout with heading and form card
- Source tracking for analytics ('lead-page' source)
- Mobile responsive design

**Component**: `client/src/components/lead/LeadCaptureForm.jsx`
- Reusable across Home page and Lead Form page
- Configurable props for badge, title, subtitle text
- Optional fade animation support (`enableFade` prop)
- Form validation with react-hook-form
- Source tracking parameter

### Excel File Support for Bulk Upload

**Implementation Date**: 2024

**Overview**: Extended bulk upload functionality to accept Excel files (.xlsx and .xls) in addition to JSON format.

**Frontend Components**:
- **Excel Parser** (`client/src/utils/excelToJson.js`)
  - Parses Excel files using `xlsx` library
  - Converts flattened columns to nested JSON structure
  - Handles column naming: `location.city`, `specifications.bedrooms`
  - Parses comma-separated arrays (e.g., `features: "pool,garden,balcony"`)
  - Supports JSON strings for complex nested objects
  - Automatic type conversion (numbers, booleans)

- **Updated BulkUploadModal** (`client/src/components/admin/BulkUploadModal.js`)
  - Accepts `.json`, `.xlsx`, and `.xls` files
  - Auto-detects file type and processes accordingly
  - Shows parsing progress for Excel files
  - Preview support for both formats
  - Template download buttons for both JSON and Excel

**Backend Components**:
- **Excel Template Generation** (`server/routes/bulkUploads.js`)
  - `GET /api/bulk-uploads/template/:entityType/excel` endpoint
  - Uses ExcelJS library to generate formatted Excel files
  - Flattens nested JSON template structure into columns
  - Includes header row with all possible column names
  - Example data rows included
  - Auto-sized columns and frozen header row
  - Proper Content-Type headers for file download

**Excel Column Structure**:
- Flattened nested fields: `location.city`, `location.address`, `location.coordinates.latitude`
- Arrays as comma-separated: `features: "pool,garden,balcony"`
- Complex objects as JSON strings: `images: '[{"url":"...","caption":"..."}]'`
- Type conversion: Automatic parsing of numbers and booleans

### Admin Property Review Enhancements

**ViewProperty Page** (`client/src/pages/admin/ViewProperty.js`)
- Detailed property view for admin review
- Displays all property information including images, specifications, location
- Approval/rejection actions with reason input
- Shows submission metadata (submitted by, submission date)
- Accessible from pending properties list

**PendingProperties Page Updates**
- Updated styling to match admin dashboard dark theme
- Glass morphism effects and modern card design
- Improved responsive layout
- Better status badges and visual feedback

### Property Detail Page Improvements

**Updates** (`client/src/pages/PropertyDetail.js`):
- Removed agent information section
- Removed agent contact buttons (Call Agent, Email Agent)
- Improved icon visibility on white backgrounds
- Enhanced navigation arrow and action button styling

### Image Management Enhancements

**Automatic Cleanup**:
- When a user-submitted property is rejected, all associated images are automatically deleted from Cloudinary
- Prevents storage waste from rejected submissions
- Implemented in `PUT /api/properties/:id/reject` endpoint
- Uses `deleteCloudinaryImages` helper function

---

**Last Updated**: December 2024
**Version**: 1.1.0
**Maintained By**: Basira Real Estate Development Team

