#!/bin/bash
# =============================================================================
# DokaGen — Setup SSL dengan Certbot (Let's Encrypt)
# Jalankan SETELAH domain sudah mengarah ke IP VPS dan Nginx sudah aktif
# Usage: sudo bash 3-setup-ssl.sh api.dokagen.id
# =============================================================================

set -e
DOMAIN=${1:-"api.dokagen.id"}

echo "Setup SSL untuk domain: $DOMAIN"

# Install Certbot
apt-get install -y certbot python3-certbot-nginx

# Dapatkan sertifikat
certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@dokagen.id \
  --redirect

# Verifikasi auto-renewal
certbot renew --dry-run

echo ""
echo "SSL aktif! https://$DOMAIN"
echo "Auto-renewal sudah dikonfigurasi via cron."
echo ""
echo "Langkah terakhir — update Flutter app:"
echo "  lib/core/constants/api_constants.dart"
echo "  baseUrl = 'https://$DOMAIN/api'"
