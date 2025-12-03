#!/bin/bash

# Create deployment package excluding unnecessary files

echo "Creating deployment package..."

cd "$(dirname "$0")/.."

tar --exclude='server/node_modules' \
    --exclude='server/.git' \
    --exclude='server/logs' \
    --exclude='server/.env' \
    --exclude='server/.env.local' \
    --exclude='server/uploads' \
    --exclude='server/prisma/migrations/.gitkeep' \
    --exclude='server/*.log' \
    --exclude='server/.DS_Store' \
    --exclude='server/coverage' \
    --exclude='server/.nyc_output' \
    -czf basira-server-deploy.tar.gz server/

echo "✓ Package created: basira-server-deploy.tar.gz"
echo ""
echo "Upload with:"
echo "scp basira-server-deploy.tar.gz basera@72.61.201.156:/var/www/basira-backend/"
echo ""
echo "Then on VPS run:"
echo "cd /var/www/basira-backend && tar -xzf basira-server-deploy.tar.gz --strip-components=1 && rm basira-server-deploy.tar.gz"




