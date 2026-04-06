#!/bin/bash
# =============================================================================
# DokaGen — Setup VPS (Ubuntu 22.04)
# Jalankan sekali setelah VPS pertama kali aktif:
#   chmod +x 1-setup-vps.sh && sudo bash 1-setup-vps.sh
# =============================================================================

set -e
echo "========================================"
echo "  DokaGen VPS Setup — Ubuntu 22.04"
echo "========================================"

# ── 1. Update sistem ──────────────────────────────────────────────────────────
echo "[1/8] Update sistem..."
apt-get update -y && apt-get upgrade -y

# ── 2. Install dependencies dasar ────────────────────────────────────────────
echo "[2/8] Install tools dasar..."
apt-get install -y curl wget git unzip build-essential ufw fail2ban

# ── 3. Install Node.js 20 LTS ────────────────────────────────────────────────
echo "[3/8] Install Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
node -v && npm -v

# Install PM2
npm install -g pm2

# ── 4. Install PostgreSQL 16 ──────────────────────────────────────────────────
echo "[4/8] Install PostgreSQL 16..."
apt-get install -y postgresql postgresql-contrib

# Start & enable
systemctl start postgresql
systemctl enable postgresql

# Buat database & user
sudo -u postgres psql <<SQL
CREATE USER dokagen WITH PASSWORD 'DokAGen_DB_2026!';
CREATE DATABASE dokagen_db OWNER dokagen;
GRANT ALL PRIVILEGES ON DATABASE dokagen_db TO dokagen;
SQL

echo "PostgreSQL: database 'dokagen_db' dibuat."

# ── 5. Install Redis ──────────────────────────────────────────────────────────
echo "[5/8] Install Redis..."
apt-get install -y redis-server
sed -i 's/^supervised no/supervised systemd/' /etc/redis/redis.conf
systemctl restart redis
systemctl enable redis
echo "Redis: OK"

# ── 6. Install Nginx ──────────────────────────────────────────────────────────
echo "[6/8] Install Nginx..."
apt-get install -y nginx
systemctl start nginx
systemctl enable nginx

# ── 7. Firewall (UFW) ─────────────────────────────────────────────────────────
echo "[7/8] Setup firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
echo "Firewall: SSH + HTTP/HTTPS diizinkan."

# ── 8. Buat user deploy (non-root) ────────────────────────────────────────────
echo "[8/8] Buat user 'dokagen'..."
if ! id "dokagen" &>/dev/null; then
  adduser --disabled-password --gecos "" dokagen
  usermod -aG sudo dokagen
  mkdir -p /home/dokagen/.ssh
  # Salin authorized_keys dari root jika ada
  if [ -f /root/.ssh/authorized_keys ]; then
    cp /root/.ssh/authorized_keys /home/dokagen/.ssh/
    chown -R dokagen:dokagen /home/dokagen/.ssh
    chmod 700 /home/dokagen/.ssh
    chmod 600 /home/dokagen/.ssh/authorized_keys
  fi
fi

# ── Buat folder aplikasi ──────────────────────────────────────────────────────
mkdir -p /var/www/dokagen-api
mkdir -p /var/www/dokagen-api/uploads/scan
mkdir -p /var/www/dokagen-api/uploads/logo
mkdir -p /var/www/dokagen-api/uploads/ttd
mkdir -p /var/log/dokagen
chown -R dokagen:dokagen /var/www/dokagen-api
chown -R dokagen:dokagen /var/log/dokagen

echo ""
echo "========================================"
echo "  Setup selesai!"
echo "========================================"
echo "  PostgreSQL : postgresql://dokagen:DokAGen_DB_2026!@localhost:5432/dokagen_db"
echo "  Redis      : redis://127.0.0.1:6379"
echo "  App folder : /var/www/dokagen-api"
echo ""
echo "  Langkah selanjutnya:"
echo "  1. Upload kode ke /var/www/dokagen-api"
echo "  2. Edit .env production"
echo "  3. Jalankan: bash 2-deploy.sh"
echo "========================================"
