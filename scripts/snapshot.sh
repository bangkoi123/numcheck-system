#!/usr/bin/env bash
set -euo pipefail
TS=$(date +%F-%H%M%S)
OUT="snapshots/status-$TS.md"

CID_WEBADMIN="$(docker compose ps -q web-admin || true)"
CID_GATEWAY="$(docker compose ps -q gateway || true)"

{
  echo "# NumCheck Snapshot @ $TS"
  echo
  echo "## Compose PS"
  docker compose ps
  echo
  echo "## Docker PS (ringkas)"
  docker ps --format '{{.Names}}\t{{.Status}}\t{{.Ports}}'
  echo
  echo "## Port Listener (host)"
  ss -lntp | egrep '11800|11801|11802' || true
  echo
  echo "## Health Checks (host)"
  echo "gateway  : "; (curl -sS http://127.0.0.1:11800/healthz || true); echo
  echo "web-admin: "; (curl -sS http://127.0.0.1:11802/healthz || true); echo
  echo "proxy->gw: "; (curl -sS http://127.0.0.1:11802/api/healthz || true); echo
  echo
  if [ -n "$CID_WEBADMIN" ]; then
    echo "## Nginx default.conf (web-admin)"
    docker exec -i "$CID_WEBADMIN" sh -lc 'sed -n "1,200p" /etc/nginx/conf.d/default.conf' || true
    echo
  fi
  echo "## Logs (tail 200 / 30m) gateway & web-admin"
  docker compose logs --since 30m --tail=200 gateway web-admin || true
} > "$OUT"

echo "Snapshot written: $OUT"
