#!/usr/bin/env sh
set -eu

IMAGE_NAME="coup-app:test"
CONTAINER_NAME="coup-app-smoke"
PORT="18080"

cleanup() {
  docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
}

cleanup
trap cleanup EXIT

echo "[docker-test] building image"
docker build -f deploy/Dockerfile -t "$IMAGE_NAME" .

echo "[docker-test] starting container"
docker run -d --name "$CONTAINER_NAME" -p "$PORT":8080 "$IMAGE_NAME" >/dev/null

echo "[docker-test] waiting for health"
for i in 1 2 3 4 5 6 7 8 9 10; do
  if curl -fsS "http://localhost:$PORT/api/health" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

echo "[docker-test] checking /api/health"
curl -fsS "http://localhost:$PORT/api/health" | grep -q '"ok":true'

echo "[docker-test] checking web index"
curl -fsS "http://localhost:$PORT/" | grep -qi '<!doctype html>'

echo "[docker-test] smoke tests passed"
