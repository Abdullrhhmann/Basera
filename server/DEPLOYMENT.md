# Basira Real Estate - Production Deployment Guide

Complete guide for deploying the Basira backend to a production VPS server.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial VPS Setup](#initial-vps-setup)
3. [Automated Deployment](#automated-deployment)
4. [Manual Deployment](#manual-deployment)
5. [Environment Configuration](#environment-configuration)
6. [Database Setup](#database-setup)
7. [SSL Certificate](#ssl-certificate)
8. [Application Startup](#application-startup)
9. [Database Backups](#database-backups)
10. [Monitoring & Maintenance](#monitoring--maintenance)
11. [Troubleshooting](#troubleshooting)
12. [Security Checklist](#security-checklist)

---

## Prerequisites

Before starting, ensure you have:

- ✅ Ubuntu 20.04+ or Debian 11+ VPS
- ✅ Root or sudo access to the server
- ✅ Domain name pointed to your VPS IP address
- ✅ At least 2GB RAM (4GB recommended)
- ✅ At least 20GB storage
- ✅ Cloudinary account for media uploads
- ✅ SSH access configured

---

## Initial VPS Setup

### 1. Connect to Your VPS

```bash
ssh root@your-vps-ip
# or
ssh your-username@your-vps-ip
```

### 2. Update System

```bash
sudo apt update && sudo apt upgrade -y
```

### 3. Create Application User (Optional but Recommended)

```bash
sudo adduser basira
sudo usermod -aG sudo basira
su - basira
```

---

## Automated Deployment

We provide an automated deployment script that handles most of the setup:

### 1. Download and Run the Deployment Script

```bash
# Download the deployment script
wget https://raw.githubusercontent.com/your-repo/basira-backend/main/deploy-vps.sh
# or copy it manually to your VPS

# Make it executable
chmod +x deploy-vps.sh

# Run the script
bash deploy-vps.sh
```

The script will:
- Install Node.js, PostgreSQL, Nginx
- Create database and user
- Configure firewall
- Set up Nginx reverse proxy
- Install PM2 process manager
- Prepare application directory

### 2. Follow Post-Installation Steps

After the script completes, follow the on-screen instructions to:
- Copy your application code
- Configure environment variables
- Install dependencies
- Run migrations
- Start the application

---

## Manual Deployment

If you prefer to deploy manually or the automated script doesn't fit your needs:

### 1. Install Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
node -v  # Verify installation
```

### 2. Install PostgreSQL

```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 3. Create Database and User

```bash
sudo -u postgres psql

-- In PostgreSQL prompt:
CREATE DATABASE basera_prod;
CREATE USER basera_user WITH PASSWORD 'your-strong-password-here';
GRANT ALL PRIVILEGES ON DATABASE basera_prod TO basera_user;
GRANT ALL ON SCHEMA public TO basera_user;
\q
```

### 4. Install Nginx

```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 5. Configure Firewall

```bash
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

### 6. Create Application Directory

```bash
sudo mkdir -p /var/www/basira-backend
sudo chown -R $USER:$USER /var/www/basira-backend
```

---

## Environment Configuration

### 1. Copy Application Code

From your local machine:

```bash
# Using SCP
scp -r ./server/* username@your-vps:/var/www/basira-backend/

# Or using rsync (recommended)
rsync -avz --exclude='node_modules' --exclude='.env' \
  ./server/ username@your-vps:/var/www/basira-backend/
```

Or using Git on the VPS:

```bash
cd /var/www/basira-backend
git clone https://github.com/your-repo/basira-backend.git .
```

### 2. Create Production Environment File

```bash
cd /var/www/basira-backend
cp env.production.example .env
nano .env
```

### 3. Configure Environment Variables

Edit `.env` with your production values:

```bash
NODE_ENV=production
PORT=5001
CLIENT_URL=https://your-frontend.com
SITE_URL=https://api.your-domain.com
RATE_LIMIT_MAX=500

# Generate a secure JWT secret:
# node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=your-generated-jwt-secret-here

DATABASE_URL=postgresql://basera_user:your-password@localhost:5432/basera_prod?schema=public

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

OPENROUTER_API_KEY=your_api_key  # Optional
```

### 4. Secure the Environment File

```bash
chmod 600 .env
```

---

## Database Setup

### 1. Install Dependencies

```bash
cd /var/www/basira-backend
npm install --production
```

### 2. Generate Prisma Client

```bash
npm run prisma:generate
```

### 3. Run Database Migrations

```bash
npm run prisma:migrate:deploy
```

### 4. Seed Super Admin (Optional)

```bash
npm run seed-super-admin
```

This creates a default super admin account. **Change the password immediately after first login!**

---

## Configure Nginx

### 1. Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/basira-backend
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name api.your-domain.com;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location / {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts for large file uploads
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }

    # Max upload size
    client_max_body_size 100M;
}
```

### 2. Enable the Site

```bash
sudo ln -s /etc/nginx/sites-available/basira-backend /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default  # Remove default site
sudo nginx -t  # Test configuration
sudo systemctl reload nginx
```

---

## SSL Certificate

### 1. Install Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 2. Obtain SSL Certificate

```bash
sudo certbot --nginx -d api.your-domain.com
```

Follow the prompts. Certbot will automatically:
- Obtain the certificate
- Configure Nginx for HTTPS
- Set up auto-renewal

### 3. Verify Auto-Renewal

```bash
sudo certbot renew --dry-run
```

---

## Application Startup

### 1. Install PM2

```bash
sudo npm install -g pm2
```

### 2. Start Application with PM2

```bash
cd /var/www/basira-backend
npm run start:prod
```

Or manually:

```bash
pm2 start ecosystem.config.js --env production
pm2 save
```

### 3. Configure PM2 Startup

```bash
pm2 startup systemd
# Copy and run the command that PM2 outputs
pm2 save
```

### 4. Verify Application is Running

```bash
pm2 status
pm2 logs basira-backend
```

### 5. Test the API

```bash
curl https://api.your-domain.com/api/health
```

You should receive: `{"status":"OK","timestamp":"..."}`

---

## Database Backups

### 1. Setup Automated Backups

```bash
cd /var/www/basira-backend
chmod +x backup-db.sh

# Test the backup script
bash backup-db.sh
```

### 2. Schedule Daily Backups with Cron

```bash
crontab -e
```

Add this line for daily backups at 2 AM:

```cron
0 2 * * * /var/www/basira-backend/backup-db.sh
```

### 3. Verify Backup Directory

```bash
ls -lh /var/backups/basira-db/
```

### 4. Manual Backup

```bash
npm run backup:db
```

### 5. Restore from Backup

```bash
# Decompress the backup
gunzip /var/backups/basira-db/basira_basera_prod_YYYYMMDD_HHMMSS.sql.gz

# Restore to database
psql -U basera_user -d basera_prod < /var/backups/basira-db/basira_basera_prod_YYYYMMDD_HHMMSS.sql
```

---

## Monitoring & Maintenance

### PM2 Commands

```bash
# View status
npm run status

# View logs
npm run logs

# View error logs only
npm run logs:error

# Restart application
npm run restart:prod

# Reload with zero-downtime
npm run reload:prod

# Stop application
npm run stop:prod

# Monitor in real-time
npm run monit
```

### System Monitoring

```bash
# Check disk space
df -h

# Check memory usage
free -m

# Check CPU usage
top

# Check Nginx status
sudo systemctl status nginx

# Check PostgreSQL status
sudo systemctl status postgresql

# View Nginx error logs
sudo tail -f /var/log/nginx/error.log

# View application logs
pm2 logs basira-backend --lines 100
```

### Regular Maintenance Tasks

1. **Weekly:**
   - Check application logs for errors
   - Monitor disk space
   - Review backup logs

2. **Monthly:**
   - Update system packages: `sudo apt update && sudo apt upgrade`
   - Review and rotate logs
   - Test backup restoration
   - Review security updates

3. **Quarterly:**
   - Update Node.js dependencies
   - Review SSL certificate expiration
   - Audit user accounts and permissions

---

## Troubleshooting

### Application Won't Start

**Check PM2 logs:**
```bash
pm2 logs basira-backend --err
```

**Common issues:**
- Missing environment variables
- Database connection failed
- Port already in use

**Solution:**
```bash
# Check .env file
cat .env

# Test database connection
psql -U basera_user -d basera_prod -c "SELECT 1"

# Check if port 5001 is in use
sudo lsof -i :5001
```

### Database Connection Errors

**Check PostgreSQL is running:**
```bash
sudo systemctl status postgresql
sudo systemctl restart postgresql
```

**Verify credentials:**
```bash
psql -U basera_user -d basera_prod
```

**Check DATABASE_URL in .env:**
- Ensure correct username, password, host, port, database name

### CORS Errors

**Verify CLIENT_URL in .env matches your frontend domain:**
```bash
grep CLIENT_URL .env
```

**Check server logs:**
```bash
pm2 logs basira-backend | grep CORS
```

### 502 Bad Gateway

**Application is not running:**
```bash
pm2 restart basira-backend
```

**Nginx misconfiguration:**
```bash
sudo nginx -t
sudo systemctl restart nginx
```

### SSL Certificate Issues

**Renew certificate manually:**
```bash
sudo certbot renew
sudo systemctl reload nginx
```

**Check certificate expiration:**
```bash
sudo certbot certificates
```

### High Memory Usage

**Restart application:**
```bash
pm2 restart basira-backend
```

**Adjust PM2 memory limit in ecosystem.config.js:**
```javascript
max_memory_restart: '2G'  // Increase if needed
```

### Prisma Errors

**Regenerate Prisma client:**
```bash
npm run prisma:generate
pm2 restart basira-backend
```

---

## Security Checklist

Before going live, verify:

- [ ] `.env` file has secure permissions (`chmod 600 .env`)
- [ ] JWT_SECRET is a long, random string (64+ characters)
- [ ] Database user has a strong password
- [ ] Firewall is enabled and configured (ports 22, 80, 443 only)
- [ ] SSL certificate is installed and valid
- [ ] CORS is restricted to your frontend domain only
- [ ] Rate limiting is enabled for production
- [ ] NODE_ENV is set to `production`
- [ ] Cloudinary credentials are valid and secure
- [ ] Default admin password has been changed
- [ ] Regular backups are scheduled and tested
- [ ] System updates are applied
- [ ] Nginx security headers are configured
- [ ] Error messages don't expose sensitive information
- [ ] Database backups are stored securely
- [ ] SSH key authentication is used (password auth disabled)
- [ ] Fail2ban is installed to prevent brute force attacks

### Optional Security Enhancements

```bash
# Install fail2ban
sudo apt install fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Disable password authentication for SSH
sudo nano /etc/ssh/sshd_config
# Set: PasswordAuthentication no
sudo systemctl restart sshd
```

---

## Post-Deployment

### 1. Test All Endpoints

- Health check: `https://api.your-domain.com/api/health`
- Authentication: Test login/register
- Properties: Test CRUD operations
- File uploads: Test image/video uploads
- Search: Test search functionality

### 2. Monitor for 24 Hours

Keep an eye on:
- Application logs
- Error rates
- Response times
- Memory usage
- Disk space

### 3. Update Frontend Configuration

Update your frontend `.env` to point to the production API:

```
REACT_APP_API_URL=https://api.your-domain.com
```

### 4. Create Documentation

Document:
- Admin credentials (store securely!)
- Database backup location
- Emergency contacts
- Rollback procedures

---

## Support

For issues or questions:

1. Check application logs: `pm2 logs basira-backend`
2. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Review this documentation
4. Contact your development team

---

## Quick Reference

### Important Directories

- Application: `/var/www/basira-backend`
- Logs: `/var/www/basira-backend/logs`
- Backups: `/var/backups/basira-db`
- Nginx config: `/etc/nginx/sites-available/basira-backend`

### Important Commands

```bash
# Restart everything
pm2 restart basira-backend
sudo systemctl restart nginx
sudo systemctl restart postgresql

# View logs
pm2 logs basira-backend
sudo tail -f /var/log/nginx/error.log

# Check status
pm2 status
sudo systemctl status nginx
sudo systemctl status postgresql

# Backup database
npm run backup:db
```

---

**🎉 Congratulations! Your Basira backend is now deployed and ready for production use!**

