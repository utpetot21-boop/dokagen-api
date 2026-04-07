#!/bin/bash
set -e
cd /var/www/dokagen-api
echo ">>> [api] git pull..."
git pull
echo ">>> [api] npm run build..."
npm run build
echo ">>> [api] pm2 restart..."
pm2 restart dokagen-api
echo "✓ Deploy dokagen-api selesai"
