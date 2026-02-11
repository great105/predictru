#!/bin/bash
# Initialize SSL certificates for the domain
# Usage: ./scripts/init-ssl.sh <domain> [email]
set -e

DOMAIN="${1:?Usage: $0 <domain> [email]}"
EMAIL="${2:-}"
PROJECT_DIR="/opt/predictru"
SSL_DIR="$PROJECT_DIR/ssl"
CERTBOT_DIR="$PROJECT_DIR/certbot/www"

echo "=== SSL Init for $DOMAIN ==="

mkdir -p "$SSL_DIR" "$CERTBOT_DIR"

# Step 1: Create self-signed cert so nginx can start
echo "[1/4] Creating temporary self-signed certificate..."
openssl req -x509 -nodes -days 1 \
  -newkey rsa:2048 \
  -keyout "$SSL_DIR/privkey.pem" \
  -out "$SSL_DIR/fullchain.pem" \
  -subj "/CN=$DOMAIN" 2>/dev/null

# Step 2: Start the stack
echo "[2/4] Starting services..."
cd "$PROJECT_DIR"
docker compose up -d --build

echo "[3/4] Waiting for nginx to start..."
sleep 15

# Step 3: Get real cert from Let's Encrypt
echo "[4/4] Requesting Let's Encrypt certificate..."
CERTBOT_ARGS=(
  certonly --webroot
  --webroot-path=/var/www/certbot
  --agree-tos --no-eff-email
  -d "$DOMAIN"
)
if [ -n "$EMAIL" ]; then
  CERTBOT_ARGS+=(--email "$EMAIL")
else
  CERTBOT_ARGS+=(--register-unsafely-without-email)
fi

docker run --rm \
  -v "$CERTBOT_DIR":/var/www/certbot \
  -v "$SSL_DIR":/etc/letsencrypt \
  certbot/certbot "${CERTBOT_ARGS[@]}"

# Copy certs from Let's Encrypt directory structure
cp /opt/predictru/ssl/live/"$DOMAIN"/fullchain.pem "$SSL_DIR/fullchain.pem"
cp /opt/predictru/ssl/live/"$DOMAIN"/privkey.pem "$SSL_DIR/privkey.pem"

# Step 4: Reload nginx with real cert
echo "Reloading nginx..."
docker compose exec nginx nginx -s reload

echo "=== Done! SSL certificate installed for $DOMAIN ==="
echo "Certificate will expire in 90 days. Set up auto-renewal with:"
echo "  crontab: 0 3 * * 1 /opt/predictru/scripts/renew-ssl.sh"
