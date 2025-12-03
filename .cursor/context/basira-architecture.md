# Basira Real Estate – Architecture Context

This summary acts as a quick reference for Cursor's context window. For full
details, open `docs/ARCHITECTURE.md`.

## Backend Highlights
- **Entry point**: `server/index.js` – Express app with security middleware,
  CORS, compression, rate limiting, MongoDB connection, and route registration
  under `/api/*`.
- **Auth flow**: JWT with middleware from `server/middleware/auth.js`
  (`authMiddleware`, `adminMiddleware`, role/permission helpers).
- **Data layer**: MongoDB via Mongoose. Key models live in `server/models/`
  (Property, Compound, Developer, Launch, User, Governorate/City/Area, Inquiry,
  Lead, Blog, Conversation, SiteSettings).
- **Utilities**: Cloudinary uploads (`server/utils/cloudinary.js`), AI assistant
  integration (`server/utils/aiService.js`), advanced search logic
  (`server/utils/propertySearch.js`), RBAC definitions (`server/utils/permissions.js`).
- **Routes**: Organized by domain inside `server/routes/` (auth, properties,
  compounds, developers, launches, uploads, site settings, search, dashboard,
  chat, bulk uploads, etc.).

## Frontend Highlights
- **Entry point**: `client/src/App.js` – React Router v6 with lazy-loaded pages,
  React Query, Auth/Chat context providers, Helmet, Lenis smooth scrolling.
- **State Mgmt**: Contexts in `client/src/context/` (AuthContext, ChatContext,
  NavigationContext). Data fetching centralized via Axios instance in
  `client/src/utils/api.js` (automatic auth headers, retry/queue logic).
- **Pages & Components**: Public pages under `client/src/pages/`, admin console
  under `client/src/pages/admin/`, reusable components in
  `client/src/components/` (layout, admin forms, common widgets, UI primitives).
- **Styling**: Tailwind (`tailwind.config.js`) + custom CSS (`client/src/styles/`),
  GSAP/Framer Motion animations, Lenis for smooth scrolling.
- **Internationalization**: i18next setup in `client/src/i18n/` with English
  and Arabic locales.

## Deployment & Ops
- Monorepo scripts (`package.json`) to run both client & server.
- Vercel deployment configs (`vercel.json`, `server/vercel.json`).
- Seed/migration scripts inside `server/scripts/`.
- Environment variables documented in `README.md` and `.env.example`.

Refer to the full architecture document for detailed API flows, data model
schemas, deployment steps, and future considerations. 

