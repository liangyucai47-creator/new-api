#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
ENV_FILE="${1:-$ROOT_DIR/deploy/ecs/.env.ecs}"
COMPOSE_FILE="$ROOT_DIR/docker-compose.ecs.yml"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing env file: $ENV_FILE"
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

if [[ -z "${PUBLIC_HOST:-}" ]]; then
  echo "PUBLIC_HOST is required."
  exit 1
fi

if [[ -z "${LETSENCRYPT_EMAIL:-}" ]]; then
  echo "LETSENCRYPT_EMAIL is required before requesting a certificate."
  exit 1
fi

if [[ "${PUBLIC_HOST}" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "PUBLIC_HOST must be a real domain before enabling HTTPS."
  exit 1
fi

upsert_env_value() {
  local key="$1"
  local value="$2"

  if grep -q "^${key}=" "$ENV_FILE"; then
    sed -i "s#^${key}=.*#${key}=${value}#" "$ENV_FILE"
  else
    printf '%s=%s\n' "$key" "$value" >> "$ENV_FILE"
  fi
}

mkdir -p "$ROOT_DIR/deploy/ecs/nginx/www" "$ROOT_DIR/deploy/ecs/nginx/certs"

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d nginx

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" --profile tls run --rm certbot \
  certonly \
  --webroot \
  -w /var/www/certbot \
  -d "$PUBLIC_HOST" \
  --email "$LETSENCRYPT_EMAIL" \
  --agree-tos \
  --no-eff-email

upsert_env_value "NGINX_TEMPLATE" "https.conf.template"
upsert_env_value "SERVER_ADDRESS" "https://${PUBLIC_HOST}"

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" --profile tls up -d nginx certbot-renew

echo "HTTPS is now configured for https://${PUBLIC_HOST}"
