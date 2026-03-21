#!/bin/bash
# AuditWise Pro - Deployment Script
# Run this on server.allelitehosting.com

set -e

APP_DIR="/home/auditwisepro/public_html"
REPO="https://github.com/Millersg1/auditwisepro.git"

echo "=== AuditWise Pro Deployment ==="

# Pull latest code
cd $APP_DIR
if [ -d ".git" ]; then
    echo "Pulling latest changes..."
    git pull origin main
else
    echo "Cloning repository..."
    git clone $REPO .
fi

# Backend setup
echo "Setting up backend..."
cd $APP_DIR/backend
npm install --production

# Run migrations
echo "Running database migrations..."
node -e "
const fs = require('fs');
const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
});
async function migrate() {
    const migrationDir = './src/migrations';
    const files = fs.readdirSync(migrationDir).sort();
    for (const file of files) {
        if (file.endsWith('.sql')) {
            console.log('Running migration:', file);
            const sql = fs.readFileSync(migrationDir + '/' + file, 'utf8');
            await pool.query(sql);
        }
    }
    console.log('Migrations complete!');
    await pool.end();
}
migrate().catch(e => { console.error(e); process.exit(1); });
"

# Frontend setup
echo "Building frontend..."
cd $APP_DIR/frontend
npm install
npm run build

# Restart backend with PM2
echo "Restarting backend..."
cd $APP_DIR/backend
pm2 delete auditwisepro 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save

echo "=== Deployment Complete ==="
echo "Site should be live at https://auditwisepro.com"
