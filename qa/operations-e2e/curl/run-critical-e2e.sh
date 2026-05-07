#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:8080}"
API_BASE="$BASE_URL/api/v1"
API_KEY="${PARKFLOW_API_KEY:?PARKFLOW_API_KEY is required}"
ADMIN_EMAIL="${PARKFLOW_SEED_ADMIN_EMAIL:-admin@parkflow.local}"
ADMIN_PASSWORD="${PARKFLOW_SEED_ADMIN_PASSWORD:?PARKFLOW_SEED_ADMIN_PASSWORD is required}"
CASHIER_EMAIL="${PARKFLOW_SEED_CASHIER_EMAIL:-cashier@parkflow.local}"
CASHIER_PASSWORD="${PARKFLOW_SEED_CASHIER_PASSWORD:?PARKFLOW_SEED_CASHIER_PASSWORD is required}"
ADMIN_OPERATOR_ID="${ADMIN_OPERATOR_ID:-00000000-0000-0000-0000-000000000001}"
CASHIER_OPERATOR_ID="${CASHIER_OPERATOR_ID:-00000000-0000-0000-0000-000000000002}"
RATE_CAR_ID="${RATE_CAR_ID:-10000000-0000-0000-0000-000000000001}"

curl_json() {
  local method="$1" url="$2" body="${3:-}"
  local headers=(-H "X-API-Key: $API_KEY" -H "Content-Type: application/json")
  if [[ -n "${AUTH_TOKEN:-}" ]]; then headers+=(-H "Authorization: Bearer $AUTH_TOKEN"); fi
  if [[ -n "$body" ]]; then
    curl -sS -X "$method" "$url" "${headers[@]}" -d "$body"
  else
    curl -sS -X "$method" "$url" "${headers[@]}"
  fi
}

assert_eq(){ [[ "$1" == "$2" ]] || { echo "Assertion failed: expected '$2' got '$1'"; exit 1; }; }

health="$(curl -sS "$API_BASE/health")"
assert_eq "$(jq -r '.status' <<<"$health")" "ok"

login_admin="$(curl_json POST "$API_BASE/auth/login" "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\",\"deviceId\":\"ci-admin-device\",\"deviceName\":\"CI Admin\",\"platform\":\"ci\",\"fingerprint\":\"ci-admin-fp\"}")"
ADMIN_REFRESH_TOKEN="$(jq -r '.refreshToken' <<<"$login_admin")"
AUTH_TOKEN="$(jq -r '.accessToken' <<<"$login_admin")"
[[ "$AUTH_TOKEN" != "null" ]] || exit 1

refresh_resp="$(curl_json POST "$API_BASE/auth/refresh" "{\"refreshToken\":\"$ADMIN_REFRESH_TOKEN\",\"deviceId\":\"ci-admin-device\"}")"
AUTH_TOKEN="$(jq -r '.accessToken' <<<"$refresh_resp")"

login_cashier="$(curl_json POST "$API_BASE/auth/login" "{\"email\":\"$CASHIER_EMAIL\",\"password\":\"$CASHIER_PASSWORD\",\"deviceId\":\"ci-cashier-device\",\"deviceName\":\"CI Cashier\",\"platform\":\"ci\",\"fingerprint\":\"ci-cashier-fp\"}")"
AUTH_TOKEN="$(jq -r '.accessToken' <<<"$login_cashier")"

plate="E2E$RANDOM"
entry_resp="$(curl_json POST "$API_BASE/operations/entries" "{\"plate\":\"$plate\",\"type\":\"CAR\",\"rateId\":\"$RATE_CAR_ID\",\"operatorUserId\":\"$CASHIER_OPERATOR_ID\",\"entryAt\":\"2026-05-01T08:00:00Z\",\"site\":\"CI\",\"lane\":\"L1\",\"booth\":\"B1\",\"terminal\":\"TERM-CI\"}")"
ticket="$(jq -r '.receipt.ticketNumber' <<<"$entry_resp")"
assert_eq "$(jq -r '.receipt.status' <<<"$entry_resp")" "ACTIVE"

active_resp="$(curl_json GET "$API_BASE/operations/sessions/active?ticketNumber=$ticket")"
assert_eq "$(jq -r '.receipt.ticketNumber' <<<"$active_resp")" "$ticket"

exit_resp="$(curl_json POST "$API_BASE/operations/exits" "{\"ticketNumber\":\"$ticket\",\"operatorUserId\":\"$CASHIER_OPERATOR_ID\",\"paymentMethod\":\"CASH\",\"exitAt\":\"2026-05-01T09:15:00Z\"}")"
assert_eq "$(jq -r '.receipt.status' <<<"$exit_resp")" "CLOSED"
session_id="$(jq -r '.receipt.sessionId' <<<"$exit_resp")"

print_job="$(curl_json POST "$API_BASE/print-jobs" "{\"sessionId\":\"$session_id\",\"operatorUserId\":\"$CASHIER_OPERATOR_ID\",\"documentType\":\"TICKET\",\"idempotencyKey\":\"ci-print-$ticket\",\"payloadHash\":\"hash-$ticket\",\"ticketSnapshotJson\":\"{}\",\"terminalId\":\"TERM-CI\"}")"
print_id="$(jq -r '.id' <<<"$print_job")"
[[ "$print_id" != "null" ]] || exit 1

sync_push="$(curl_json POST "$API_BASE/sync/push" "{\"idempotencyKey\":\"ci-sync-$ticket\",\"eventType\":\"SESSION_CLOSED\",\"aggregateId\":\"$session_id\",\"payloadJson\":\"{\\\"ticketNumber\\\":\\\"$ticket\\\"}\",\"origin\":\"CI\"}")"
sync_id="$(jq -r '.id' <<<"$sync_push")"
[[ "$sync_id" != "null" ]] || exit 1
sync_pull="$(curl_json GET "$API_BASE/sync/pull?limit=10")"
[[ "$(jq 'length' <<<"$sync_pull")" -ge 1 ]] || exit 1

reprint="$(curl_json POST "$API_BASE/operations/tickets/reprint" "{\"ticketNumber\":\"$ticket\",\"operatorUserId\":\"$CASHIER_OPERATOR_ID\",\"reason\":\"CI test\"}")"
[[ "$(jq -r '.receipt.reprintCount' <<<"$reprint")" != "null" ]] || exit 1

lost_entry="$(curl_json POST "$API_BASE/operations/entries" "{\"plate\":\"LP$RANDOM\",\"type\":\"CAR\",\"rateId\":\"$RATE_CAR_ID\",\"operatorUserId\":\"$CASHIER_OPERATOR_ID\",\"entryAt\":\"2026-05-01T10:00:00Z\",\"site\":\"CI\",\"lane\":\"L2\",\"booth\":\"B2\",\"terminal\":\"TERM-CI\"}")"
lost_ticket="$(jq -r '.receipt.ticketNumber' <<<"$lost_entry")"
AUTH_TOKEN="$(jq -r '.accessToken' <<<"$refresh_resp")"
lost_resp="$(curl_json POST "$API_BASE/operations/tickets/lost" "{\"ticketNumber\":\"$lost_ticket\",\"operatorUserId\":\"$ADMIN_OPERATOR_ID\",\"paymentMethod\":\"CASH\",\"reason\":\"CI lost flow\"}")"
assert_eq "$(jq -r '.receipt.lostTicket' <<<"$lost_resp")" "true"

echo "E2E critical flows passed"
