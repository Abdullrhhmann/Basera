#!/bin/bash

# ============================================
# BASIRA REAL ESTATE - VPS DEPLOYMENT SCRIPT
# ============================================
# This script automates the deployment of the Basira backend on Ubuntu VPS
# Run as: bash deploy-vps.sh
#

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration variables (customize these)
APP_NAME="basira-backend"
APP_DIR="/var/www/basira-backend"
DB_NAME="basera_prod"
DB_USER="basera_user"
DOMAIN="api.your-domain.com"  # Replace with your actual domain
NODE_VERSION="20"  # Prisma 7+ requires Node.js 20+

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}   BASIRA REAL ESTATE - VPS DEPLOYMENT${NC}"
echo -e "${BLUE}============================================${NC}\n"

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
    echo -e "${RED}Please do not run as root. Run as regular user with sudo privileges.${NC}"
    exit 1
fi

# Function to print status messages
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[→]${NC} $1"
}

# Step 1: Update system
print_info "Updating system packages..."
sudo apt update && sudo apt upgrade -y
print_status "System updated successfully"

# Step 2: Install Node.js
if ! command -v node &> /dev/null; then
    print_info "Installing Node.js ${NODE_VERSION}..."
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
    sudo apt install -y nodejs
    print_status "Node.js installed: $(node -v)"
else
    print_status "Node.js already installed: $(node -v)"
fi

# Step 3: Install PostgreSQL
if ! command -v psql &> /dev/null; then
    print_info "Installing PostgreSQL..."
    sudo apt install -y postgresql postgresql-contrib
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
    print_status "PostgreSQL installed successfully"
else
    print_status "PostgreSQL already installed"
fi

# Step 4: Create PostgreSQL database and user
print_info "Setting up PostgreSQL database..."
read -sp "Enter password for PostgreSQL user '${DB_USER}': " DB_PASSWORD
echo

sudo -u postgres psql -c "SELECT 1 FROM pg_database WHERE datname = '${DB_NAME}'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME};"

sudo -u postgres psql -c "SELECT 1 FROM pg_user WHERE usename = '${DB_USER}'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';"

sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};"
sudo -u postgres psql -d ${DB_NAME} -c "GRANT ALL ON SCHEMA public TO ${DB_USER};"

print_status "Database '${DB_NAME}' and user '${DB_USER}' configured"

# Step 5: Install Nginx
if ! command -v nginx &> /dev/null; then
    print_info "Installing Nginx..."
    sudo apt install -y nginx
    sudo systemctl start nginx
    sudo systemctl enable nginx
    print_status "Nginx installed successfully"
else
    print_status "Nginx already installed"
fi

# Step 6: Configure firewall
print_info "Configuring UFW firewall..."
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw --force enable
print_status "Firewall configured"

# Step 7: Create application directory
print_info "Creating application directory..."
sudo mkdir -p ${APP_DIR}
sudo chown -R $USER:$USER ${APP_DIR}
print_status "Application directory created: ${APP_DIR}"

# Step 8: Install PM2
if ! command -v pm2 &> /dev/null; then
    print_info "Installing PM2..."
    sudo npm install -g pm2
    print_status "PM2 installed successfully"
else
    print_status "PM2 already installed"
fi

# Step 9: Setup PM2 startup script
print_info "Configuring PM2 startup..."
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp /home/$USER
print_status "PM2 startup configured"

# Step 10: Create Nginx configuration
print_info "Creating Nginx configuration..."
sudo tee /etc/nginx/sites-available/${APP_NAME} > /dev/null <<EOF
server {
    listen 80;
    server_name ${DOMAIN};

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    location / {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeouts for large file uploads
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }

    # Max upload size
    client_max_body_size 100M;
}
EOF

# Enable the site
sudo ln -sf /etc/nginx/sites-available/${APP_NAME} /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
sudo nginx -t
sudo systemctl reload nginx
print_status "Nginx configured for domain: ${DOMAIN}"

# Step 11: Install Certbot for Let's Encrypt SSL
print_info "Installing Certbot for SSL certificate..."
sudo apt install -y certbot python3-certbot-nginx

print_warning "To obtain SSL certificate, run after deployment:"
print_warning "sudo certbot --nginx -d ${DOMAIN}"

# Step 12: Create logs directory
mkdir -p ${APP_DIR}/logs
print_status "Logs directory created"

# Step 13: Display next steps
echo -e "\n${BLUE}============================================${NC}"
echo -e "${GREEN}   DEPLOYMENT SETUP COMPLETE!${NC}"
echo -e "${BLUE}============================================${NC}\n"

print_info "Next steps to deploy your application:"
echo ""
echo "1. Copy your application code to: ${APP_DIR}"
echo "   Example: scp -r ./server/* user@your-vps:${APP_DIR}/"
echo ""
echo "2. Create .env file with production settings:"
echo "   cd ${APP_DIR}"
echo "   cp env.production.example .env"
echo "   nano .env  # Edit with your actual values"
echo ""
echo "3. Install dependencies:"
echo "   cd ${APP_DIR}"
echo "   npm install --production"
echo ""
echo "4. Generate Prisma client:"
echo "   npm run prisma:generate"
echo ""
echo "5. Run database migrations:"
echo "   npm run prisma:migrate:deploy"
echo ""
echo "6. (Optional) Seed super admin:"
echo "   npm run seed-super-admin"
echo ""
echo "7. Start application with PM2:"
echo "   pm2 start ecosystem.config.js --env production"
echo "   pm2 save"
echo ""
echo "8. Get SSL certificate:"
echo "   sudo certbot --nginx -d ${DOMAIN}"
echo ""
echo -e "${GREEN}Database Connection String:${NC}"
echo "DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}?schema=public"
echo ""
print_warning "IMPORTANT: Save your database password securely!"
print_warning "Set appropriate permissions: chmod 600 ${APP_DIR}/.env"
echo ""

