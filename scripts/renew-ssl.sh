#!/bin/bash
# Auto-renew SSL certificate
set -e

PROJECT_DIR="/opt/predictru"
SSL_DIR="$PROJECT_DIR/ssl"
CERTBOT_DIR="$PROJECT_DIR/certbot/www"

docker run --rm \
  -v "$CERTBOT_DIR":/var/www/certbot \
  -v "$SSL_DIR":/etc/letsencrypt \
  certbot/certbot renew --quiet

# Find renewed cert and copy to expected location
for dir in "$SSL_DIR"/live/*/; do
  if [ -f "$dir/fullchain.pem" ]; then
    cp "$dir/fullchain.pem" "$SSL_DIR/fullchain.pem"
    cp "$dir/privkey.pem" "$SSL_DIR/privkey.pem"
  fi
done

cd "$PROJECT_DIR"
docker compose exec -T nginx nginx -s reload
