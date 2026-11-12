#!/usr/bin/env bash
# Runs ON the EC2 instance, as the deploy user (the GitHub workflow calls it over SSH).
# Usage: deploy-server.sh <dev|stage> <image>   (the image is already loaded with docker load)
# Starts the new image, waits until the health check passes, and goes back to the previous image if not.
set -euo pipefail

ENV_NAME="${1:?usage: deploy-server.sh <dev|stage> <image>}"
IMAGE="${2:?usage: deploy-server.sh <dev|stage> <image>}"

case "$ENV_NAME" in
  dev) HOST_PORT=4101 ;;
  stage) HOST_PORT=4102 ;;
  *)
    echo "unknown environment: $ENV_NAME (use dev or stage)" >&2
    exit 2
    ;;
esac

BASE="${CWS_ROOT:-/srv/cws}/$ENV_NAME"
ATTEMPTS="${WAIT_ATTEMPTS:-30}"
PAUSE="${WAIT_SLEEP:-2}"
NAME="cws-$ENV_NAME-server"

cd "$BASE"
if [ ! -f server.env ]; then
  echo "missing $BASE/server.env (run setup-ec2.sh first)" >&2
  exit 2
fi
docker image inspect "$IMAGE" > /dev/null

PREVIOUS=""
if [ -f .current-image ]; then PREVIOUS="$(cat .current-image)"; fi

start() {
  CWS_ENV="$ENV_NAME" HOST_PORT="$HOST_PORT" IMAGE="$1" \
    docker compose -p "cws-$ENV_NAME" -f compose.yml up -d --remove-orphans
}

wait_healthy() {
  local status="missing"
  for _ in $(seq 1 "$ATTEMPTS"); do
    status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$NAME" 2> /dev/null || echo missing)"
    if [ "$status" = "healthy" ]; then return 0; fi
    sleep "$PAUSE"
  done
  echo "container is '$status' after $((ATTEMPTS * PAUSE)) seconds" >&2
  return 1
}

echo "deploying $IMAGE to $ENV_NAME"
start "$IMAGE"

if wait_healthy; then
  if [ -n "$PREVIOUS" ] && [ "$PREVIOUS" != "$IMAGE" ]; then echo "$PREVIOUS" > .previous-image; fi
  echo "$IMAGE" > .current-image
  # keep the newest 5 images of this environment, remove the older ones (images in use are skipped)
  docker image ls cws-server --format '{{.Repository}}:{{.Tag}}' | grep ":$ENV_NAME-" | tail -n +6 | xargs -r docker rmi > /dev/null 2>&1 || true
  echo "deployed $IMAGE"
else
  docker logs --tail 40 "$NAME" >&2 || true
  if [ -n "$PREVIOUS" ]; then
    echo "going back to $PREVIOUS" >&2
    start "$PREVIOUS"
    wait_healthy || echo "the previous version is not healthy either" >&2
  fi
  exit 1
fi
