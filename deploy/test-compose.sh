#!/usr/bin/env sh
set -eu

COMPOSE_FILE="deploy/docker-compose.yml"
SERVICE="coup-app"

cleanup() {
  docker compose -f "$COMPOSE_FILE" down -v >/dev/null 2>&1 || true
}

cleanup
trap cleanup EXIT

echo "[compose-test] starting compose stack"
docker compose -f "$COMPOSE_FILE" up -d --build

echo "[compose-test] waiting for health"
for i in 1 2 3 4 5 6 7 8 9 10 11 12; do
  if curl -fsS "http://localhost:8080/api/health" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

echo "[compose-test] checking /api/health"
curl -fsS "http://localhost:8080/api/health" | grep -q '"ok":true'

echo "[compose-test] checking web index"
curl -fsS "http://localhost:8080/" | grep -qi '<!doctype html>'

echo "[compose-test] compose smoke tests passed"
