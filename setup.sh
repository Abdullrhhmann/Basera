#!/bin/bash

# Basira Real Estate - Setup Script
# This script will help you set up the development environment

echo "🏠 Setting up Basira Real Estate Development Environment"
echo "=================================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ from https://nodejs.org"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js version 16+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install server dependencies
echo "📦 Installing server dependencies..."
cd server
npm install
cd ..

# Install client dependencies
echo "📦 Installing client dependencies..."
cd client
npm install
cd ..

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "⚠️  Please update .env file with your actual environment variables"
fi

# Create server .env file if it doesn't exist
if [ ! -f "server/.env" ]; then
    echo "📝 Creating server .env file..."
    cp .env.example server/.env
    echo "⚠️  Please update server/.env file with your actual environment variables"
fi

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "Next steps:"
echo "1. Update .env files with your environment variables"
echo "2. Set up MongoDB Atlas database"
echo "3. Set up Cloudinary account"
echo "4. Run 'npm run dev' to start development servers"
echo ""
echo "For detailed setup instructions, see DEPLOYMENT.md"
echo ""
echo "Happy coding! 🚀"
