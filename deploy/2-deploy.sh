#!/bin/bash
# =============================================================================
# DokaGen — Deploy / Update Backend ke VPS
# Jalankan dari folder /var/www/dokagen-api:
#   bash deploy/2-deploy.sh
#
# Untuk deploy pertama kali:
#   cd /var/www/dokagen-api
#   git clone https://github.com/USERNAME/dokagen-api.git .
#   cp deploy/.env.production.template .env
#   nano .env   ← isi semua nilai
#   bash deploy/2-deploy.sh
# =============================================================================

set -e
APP_DIR="/var/www/dokagen-api"
LOG_DIR="/var/log/dokagen"

echo "========================================"
echo "  DokaGen API — Deploy $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================"

cd $APP_DIR

# ── 1. Pull kode terbaru ──────────────────────────────────────────────────────
echo "[1/6] Pull kode terbaru dari git..."
git pull origin main

# ── 2. Install dependencies ───────────────────────────────────────────────────
echo "[2/6] Install dependencies..."
npm ci --omit=dev

# ── 3. Generate Prisma client ─────────────────────────────────────────────────
echo "[3/6] Generate Prisma client..."
npx prisma generate

# ── 4. Database migrate ───────────────────────────────────────────────────────
echo "[4/6] Jalankan database migration..."
npx prisma migrate deploy

# ── 5. Build TypeScript ───────────────────────────────────────────────────────
echo "[5/6] Build TypeScript..."
npm run build

# ── 6. Restart / Start PM2 ───────────────────────────────────────────────────
echo "[6/6] Restart aplikasi..."
if pm2 list | grep -q "dokagen-api"; then
  pm2 reload ecosystem.config.js --env production
else
  pm2 start ecosystem.config.js --env production
  pm2 save
fi

echo ""
echo "========================================"
echo "  Deploy selesai!"
echo "  Status: $(pm2 list | grep dokagen-api | awk '{print $18}')"
echo "  Log   : tail -f $LOG_DIR/out.log"
echo "========================================"
