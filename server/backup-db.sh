#!/bin/bash

# ============================================
# BASIRA REAL ESTATE - DATABASE BACKUP SCRIPT
# ============================================
# This script creates automated PostgreSQL backups with rotation
# Schedule with cron: 0 2 * * * /var/www/basira-backend/backup-db.sh
#

set -e  # Exit on any error

# Configuration
DB_NAME="basera_prod"
DB_USER="basera_user"
BACKUP_DIR="/var/backups/basira-db"
DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/basira_${DB_NAME}_${DATE}.sql"
COMPRESSED_FILE="${BACKUP_FILE}.gz"
LOG_FILE="${BACKUP_DIR}/backup.log"

# Retention settings
KEEP_DAILY=7        # Keep 7 daily backups
KEEP_WEEKLY=4       # Keep 4 weekly backups
KEEP_MONTHLY=6      # Keep 6 monthly backups

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Function to log messages
log_message() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "${LOG_FILE}"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a "${LOG_FILE}"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] SUCCESS: $1${NC}" | tee -a "${LOG_FILE}"
}

# Create backup directory if it doesn't exist
if [ ! -d "${BACKUP_DIR}" ]; then
    mkdir -p "${BACKUP_DIR}"
    chmod 700 "${BACKUP_DIR}"
    log_message "Created backup directory: ${BACKUP_DIR}"
fi

# Start backup process
log_message "=========================================="
log_message "Starting database backup for: ${DB_NAME}"
log_message "=========================================="

# Check if PostgreSQL is running
if ! systemctl is-active --quiet postgresql; then
    log_error "PostgreSQL is not running!"
    exit 1
fi

# Create database backup
log_message "Creating database dump..."
if pg_dump -U "${DB_USER}" -d "${DB_NAME}" -F p -f "${BACKUP_FILE}"; then
    log_success "Database dump created: ${BACKUP_FILE}"
else
    log_error "Failed to create database dump!"
    exit 1
fi

# Compress the backup
log_message "Compressing backup..."
if gzip "${BACKUP_FILE}"; then
    BACKUP_SIZE=$(du -h "${COMPRESSED_FILE}" | cut -f1)
    log_success "Backup compressed: ${COMPRESSED_FILE} (${BACKUP_SIZE})"
else
    log_error "Failed to compress backup!"
    exit 1
fi

# Verify backup integrity
log_message "Verifying backup integrity..."
if gunzip -t "${COMPRESSED_FILE}" 2>/dev/null; then
    log_success "Backup integrity verified"
else
    log_error "Backup integrity check failed!"
    exit 1
fi

# Cleanup old backups based on retention policy
log_message "Applying retention policy..."

# Keep daily backups for the last 7 days
find "${BACKUP_DIR}" -name "basira_${DB_NAME}_*.sql.gz" -mtime +${KEEP_DAILY} -type f -delete 2>/dev/null || true

# Keep weekly backups (every Sunday) for the last 4 weeks
CURRENT_DAY=$(date +%u)
if [ "${CURRENT_DAY}" -eq 7 ]; then
    cp "${COMPRESSED_FILE}" "${BACKUP_DIR}/weekly_${DATE}.sql.gz"
    find "${BACKUP_DIR}" -name "weekly_*.sql.gz" -mtime +$((KEEP_WEEKLY * 7)) -type f -delete 2>/dev/null || true
fi

# Keep monthly backups (first day of month) for the last 6 months
CURRENT_DATE=$(date +%d)
if [ "${CURRENT_DATE}" -eq 01 ]; then
    cp "${COMPRESSED_FILE}" "${BACKUP_DIR}/monthly_${DATE}.sql.gz"
    find "${BACKUP_DIR}" -name "monthly_*.sql.gz" -mtime +$((KEEP_MONTHLY * 30)) -type f -delete 2>/dev/null || true
fi

log_message "Old backups cleaned up"

# Count remaining backups
BACKUP_COUNT=$(find "${BACKUP_DIR}" -name "*.sql.gz" -type f | wc -l)
TOTAL_SIZE=$(du -sh "${BACKUP_DIR}" | cut -f1)

log_message "=========================================="
log_success "Backup completed successfully!"
log_message "Total backups: ${BACKUP_COUNT}"
log_message "Total backup size: ${TOTAL_SIZE}"
log_message "=========================================="

# Optional: Upload to cloud storage (uncomment and configure)
# Upload to AWS S3
# log_message "Uploading to AWS S3..."
# aws s3 cp "${COMPRESSED_FILE}" s3://your-bucket/basira-backups/ && \
#     log_success "Backup uploaded to S3"

# Upload to Google Cloud Storage
# log_message "Uploading to Google Cloud Storage..."
# gsutil cp "${COMPRESSED_FILE}" gs://your-bucket/basira-backups/ && \
#     log_success "Backup uploaded to GCS"

# Send notification (optional)
# Uncomment to send email notification on success
# echo "Database backup completed successfully at $(date)" | mail -s "Basira DB Backup Success" admin@your-domain.com

exit 0

