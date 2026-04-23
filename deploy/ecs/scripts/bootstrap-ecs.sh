#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
ENV_FILE="${1:-$ROOT_DIR/deploy/ecs/.env.ecs}"
COMPOSE_FILE="$ROOT_DIR/docker-compose.ecs.yml"

require_root() {
  if [[ "${EUID}" -ne 0 ]]; then
    echo "Please run as root or with sudo."
    exit 1
  fi
}

install_docker_if_missing() {
  if command -v docker >/dev/null 2>&1; then
    return
  fi

  apt-get update
  apt-get install -y ca-certificates curl git openssl
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker
}

ensure_runtime_dependencies() {
  if ! command -v openssl >/dev/null 2>&1; then
    apt-get update
    apt-get install -y openssl
  fi

  if ! docker compose version >/dev/null 2>&1; then
    echo "docker compose plugin is required but not available."
    exit 1
  fi
}

prepare_env_file() {
  mkdir -p "$ROOT_DIR/deploy/ecs/nginx/www" "$ROOT_DIR/deploy/ecs/nginx/certs" "$ROOT_DIR/data" "$ROOT_DIR/logs"

  if [[ ! -f "$ENV_FILE" ]]; then
    cp "$ROOT_DIR/deploy/ecs/.env.ecs.example" "$ENV_FILE"
    echo "Created $ENV_FILE from the example template."
  fi

  if grep -q '^SESSION_SECRET=CHANGE_ME_' "$ENV_FILE"; then
    local secret
    secret="$(openssl rand -hex 32)"
    sed -i "s#^SESSION_SECRET=.*#SESSION_SECRET=${secret}#" "$ENV_FILE"
    echo "Generated a random SESSION_SECRET in $ENV_FILE."
  fi
}

start_stack() {
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --build new-api nginx
}

print_summary() {
  local app_public_port server_address public_host
  app_public_port="$(grep '^APP_PUBLIC_PORT=' "$ENV_FILE" | cut -d= -f2-)"
  server_address="$(grep '^SERVER_ADDRESS=' "$ENV_FILE" | cut -d= -f2-)"
  public_host="$(grep '^PUBLIC_HOST=' "$ENV_FILE" | cut -d= -f2-)"

  cat <<EOF

ECS bootstrap complete.

- Repo root: $ROOT_DIR
- Compose file: $COMPOSE_FILE
- Env file: $ENV_FILE
- Direct app URL: http://${public_host}:${app_public_port}
- Preferred public URL: ${server_address}

Next checks:
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" logs -f new-api
  curl http://127.0.0.1:${app_public_port}/api/status
  curl -I http://127.0.0.1
EOF
}

require_root
install_docker_if_missing
ensure_runtime_dependencies
prepare_env_file
start_stack
print_summary
