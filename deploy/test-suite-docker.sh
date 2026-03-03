#!/usr/bin/env sh
set -eu

IMAGE_NAME="coup-tests:latest"

echo "[docker-suite] running full test suite in docker build stage"
docker build -f deploy/Dockerfile --target test -t "$IMAGE_NAME" .
echo "[docker-suite] all tests passed"
