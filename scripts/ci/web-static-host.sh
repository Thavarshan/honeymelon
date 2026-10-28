#!/usr/bin/env bash
# Exercise the web app on Cloudflare's local static asset runtime without
# account credentials: headers, SPA routing, PWA files and no upload path.
set -euo pipefail
export WRANGLER_SEND_METRICS=false
export TURBO_TELEMETRY_DISABLED=1
honeymelon_server_pid=''
honeymelon_revision=$(git rev-parse HEAD)
honeymelon_log_dir=${RUNNER_TEMP:-$(mktemp -d)}

stop_server() {
  if [ -n "$honeymelon_server_pid" ]; then
    kill -- "-$honeymelon_server_pid" 2>/dev/null || true
    wait "$honeymelon_server_pid" 2>/dev/null || true
    honeymelon_server_pid=''
  fi
}
trap stop_server EXIT

start_server() {
  local target="$1"
  local logfile="$honeymelon_log_dir/honeymelon-web-$target.log"
  setsid npm exec -w @honeymelon/web -- wrangler dev --env "$target" \
    --local --ip 127.0.0.1 --port 8789 > "$logfile" 2>&1 &
  honeymelon_server_pid=$!
  for _ in {1..30}; do
    if ! kill -0 "$honeymelon_server_pid" 2>/dev/null; then
      cat "$logfile"
      return 1
    fi
    if curl --silent --fail http://127.0.0.1:8789/robots.txt > /dev/null; then
      return 0
    fi
    sleep 1
  done
  cat "$logfile"
  return 1
}

for target in preview production; do
  npm run build -w @honeymelon/web
  node apps/web/scripts/prepare-deployment.mjs "$target" "$honeymelon_revision"
  start_server "$target"
  node apps/web/scripts/verify-deployment.mjs http://127.0.0.1:8789 "$target" "$honeymelon_revision"
  stop_server
done

# Leave an undecorated build for later browser tests.
npm run build -w @honeymelon/web
