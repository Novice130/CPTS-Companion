#!/bin/bash
# CPTS Companion Deployment Script
# Run this on your Google Cloud VM

set -e

APP_DIR="/var/www/cpts-companion"
REPO_URL="https://github.com/Novice130/CPTS-Companion.git"

echo "=== CPTS Companion Deployment ==="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    sudo npm install -g pm2
fi

# Clone or pull the repository
if [ -d "$APP_DIR" ]; then
    echo "Pulling latest changes..."
    cd $APP_DIR
    git pull origin main
else
    echo "Cloning repository..."
    sudo mkdir -p $APP_DIR
    sudo chown $USER:$USER $APP_DIR
    git clone $REPO_URL $APP_DIR
    cd $APP_DIR
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Start or restart the app with PM2
echo "Starting application..."
pm2 delete cpts-companion 2>/dev/null || true
pm2 start server.ts --name cpts-companion --interpreter="node" --interpreter-args="--experimental-strip-types" -- --port 3001

# Save PM2 process list
pm2 save

echo ""
echo "=== Deployment Complete ==="
echo "App running on port 3001"
echo "Make sure nginx is configured to proxy /cpts-companion to localhost:3001"
