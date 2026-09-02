#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-${REPLIT_DEV_DOMAIN:+https://${REPLIT_DEV_DOMAIN}}}"
FAILED_MARKET="${FAILED_MARKET:-}"

if [[ -z "${BASE_URL}" ]]; then
  echo "Set BASE_URL (or REPLIT_DEV_DOMAIN)." >&2
  exit 2
fi

status() {
  curl -sS -o /dev/null -w '%{http_code}' "${BASE_URL}$1" || true
}

expect_200() {
  local path="$1"
  local actual
  actual="$(status "${path}")"
  printf '%-58s %s\n' "${path}" "${actual}"
  [[ "${actual}" == "200" ]]
}

for market in grain coffee tea; do
  path="/api/v1/${market}/market-data/daily-closes"
  actual="$(status "${path}")"
  printf '%-58s %s\n' "${path}" "${actual}"
  if [[ "${market}" == "${FAILED_MARKET}" ]]; then
    [[ "${actual}" != "200" ]]
  else
    [[ "${actual}" == "200" ]]
  fi
done

expect_200 "/api/readyz"
expect_200 "/api/internal/workers/core/readyz"
expect_200 "/api/internal/workers/grain/readyz"
expect_200 "/api/internal/workers/coffee/readyz"
expect_200 "/api/internal/workers/tea/readyz"
expect_200 "/api/internal/bootstrap/readyz"

echo "Market failure isolation check passed${FAILED_MARKET:+ with ${FAILED_MARKET} unavailable}."