# Basira Real Estate Website

A professional real estate website built with React frontend and Node.js backend.

## Features

- **Authentication System**: User and admin registration/login with JWT
- **Property Listings**: Advanced filtering and detailed property pages
- **Admin Panel**: Property management and user administration
- **ROI Calculator**: Investment return calculations
- **AI Chat Agent**: Automated customer support
- **Lead Capture**: Contact forms and inquiry management
- **Image Management**: Cloudinary integration for property photos

## Tech Stack

- **Frontend**: React, React Router, Axios, Tailwind CSS
- **Backend**: Node.js, Express, PostgreSQL (Prisma)
- **Authentication**: JWT, bcrypt
- **Image Hosting**: Cloudinary
- **Deployment**: Vercel (frontend), Render (backend)

## Project Structure

```
basira-real-estate/
├── client/          # React frontend
├── server/          # Node.js backend
├── .env.example     # Environment variables template
└── README.md
```

## Setup Instructions

1. Clone the repository
2. Run `npm run install-all` to install all dependencies
3. Copy `server/env.example` to `server/.env` and fill in your environment variables (especially `DATABASE_URL`)
4. Run `npm run dev` to start both frontend and backend in development mode

## Environment Variables

See `server/env.example` for required environment variables.

## Deployment

- Frontend: Deploy to Vercel
- Backend: Deploy to Render
- Database: PostgreSQL (managed service)
- Images: Cloudinary
