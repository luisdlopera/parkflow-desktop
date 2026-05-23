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

# Trackear estado global
FAILED_STEP=""
MAIN_TICKET=""
MAIN_SESSION_ID=""

#######################################
# UTILS
#######################################

curl_json() {
  local method="$1" url="$2" body="${3:-}"
  local headers=(-H "X-API-Key: $API_KEY" -H "Content-Type: application/json")
  if [[ -n "${AUTH_TOKEN:-}" ]]; then headers+=(-H "Authorization: Bearer $AUTH_TOKEN"); fi
  if [[ -n "$body" ]]; then
    curl -sS -w "\nHTTP_CODE: %{http_code}" -X "$method" "$url" "${headers[@]}" -d "$body"
  else
    curl -sS -w "\nHTTP_CODE: %{http_code}" -X "$method" "$url" "${headers[@]}"
  fi
}

# curl con visibilidad de errores HTTP
curl_json_debug() {
  local method="$1" url="$2" body="${3:-}"
  local response
  response="$(curl_json "$method" "$url" "$body")"
  # Extraer código HTTP si está presente (no debería con -sS, pero por si acaso)
  echo "$response"
}

echo "=== Step 1: Health check ==="
health="$(curl -sS "$API_BASE/health")"
assert_eq "$(jq -r '.status' <<<"$health")" "UP"

echo "=== Step 2: Admin login ==="
login_admin="$(curl_json POST "$API_BASE/auth/login" "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\",\"deviceId\":\"ci-admin-device\",\"deviceName\":\"CI Admin\",\"platform\":\"ci\",\"fingerprint\":\"ci-admin-fp\"}")"
echo "Admin login response: $login_admin"
ADMIN_REFRESH_TOKEN="$(jq -r '.refreshToken' <<<"$login_admin")"
AUTH_TOKEN="$(jq -r '.accessToken' <<<"$login_admin")"
[[ "$AUTH_TOKEN" != "null" ]] || { echo "Admin login failed: got null token"; exit 1; }
echo "✓ Admin login passed"

echo "=== Step 3: Refresh token ==="
refresh_resp="$(curl_json POST "$API_BASE/auth/refresh" "{\"refreshToken\":\"$ADMIN_REFRESH_TOKEN\",\"deviceId\":\"ci-admin-device\"}")"
echo "Refresh response: $refresh_resp"
AUTH_TOKEN="$(jq -r '.accessToken' <<<"$refresh_resp")"
echo "✓ Token refresh passed"

echo "=== Step 4: Cashier login ==="
login_cashier="$(curl_json POST "$API_BASE/auth/login" "{\"email\":\"$CASHIER_EMAIL\",\"password\":\"$CASHIER_PASSWORD\",\"deviceId\":\"ci-cashier-device\",\"deviceName\":\"CI Cashier\",\"platform\":\"ci\",\"fingerprint\":\"ci-cashier-fp\"}")"
echo "Cashier login response: $login_cashier"
AUTH_TOKEN="$(jq -r '.accessToken' <<<"$login_cashier")"
echo "✓ Cashier login passed"

echo "=== Step 5: Create entry ==="
plate="E2E$RANDOM"
entry_resp="$(curl_json POST "$API_BASE/operations/entries" "{\"plate\":\"$plate\",\"type\":\"CAR\",\"rateId\":\"$RATE_CAR_ID\",\"operatorUserId\":\"$CASHIER_OPERATOR_ID\",\"entryAt\":\"2026-05-01T08:00:00Z\",\"site\":\"CI\",\"lane\":\"L1\",\"booth\":\"B1\",\"terminal\":\"TERM-CI\"}")"
echo "Entry response: $entry_resp"
ticket="$(jq -r '.receipt.ticketNumber' <<<"$entry_resp")"
MAIN_TICKET="$ticket"
assert_eq "$(jq -r '.receipt.status' <<<"$entry_resp")" "ACTIVE"
echo "✓ Entry created: $ticket"

echo "=== Step 6: Get active session ==="
active_resp="$(curl_json GET "$API_BASE/operations/sessions/active?ticketNumber=$ticket")"
echo "Active session response: $active_resp"
assert_eq "$(jq -r '.receipt.ticketNumber' <<<"$active_resp")" "$ticket"
echo "✓ Active session verified"

echo "=== Step 7: Create exit ==="
exit_resp="$(curl_json POST "$API_BASE/operations/exits" "{\"ticketNumber\":\"$ticket\",\"operatorUserId\":\"$CASHIER_OPERATOR_ID\",\"paymentMethod\":\"CASH\",\"exitAt\":\"2026-05-01T09:15:00Z\"}")"
echo "Exit response: $exit_resp"
assert_eq "$(jq -r '.receipt.status' <<<"$exit_resp")" "CLOSED"
session_id="$(jq -r '.receipt.sessionId' <<<"$exit_resp")"
echo "✓ Exit created, session: $session_id"

echo "=== Step 8: Create print job ==="
print_job="$(curl_json POST "$API_BASE/print-jobs" "{\"sessionId\":\"$session_id\",\"operatorUserId\":\"$CASHIER_OPERATOR_ID\",\"documentType\":\"TICKET\",\"idempotencyKey\":\"ci-print-$ticket\",\"payloadHash\":\"hash-$ticket\",\"ticketSnapshotJson\":\"{}\",\"terminalId\":\"TERM-CI\"}")"
echo "Print job response: $print_job"
print_id="$(jq -r '.id' <<<"$print_job")"
[[ "$print_id" != "null" ]] || { echo "Print job creation failed"; exit 1; }
echo "✓ Print job created: $print_id"

echo "=== Step 9: Sync push ==="
sync_push="$(curl_json POST "$API_BASE/sync/push" "{\"idempotencyKey\":\"ci-sync-$ticket\",\"eventType\":\"SESSION_CLOSED\",\"aggregateId\":\"$session_id\",\"payloadJson\":\"{\\\"ticketNumber\\\":\\\"$ticket\\\"}\",\"origin\":\"CI\"}")"
echo "Sync push response: $sync_push"
sync_id="$(jq -r '.id' <<<"$sync_push")"
[[ "$sync_id" != "null" ]] || { echo "Sync push failed"; exit 1; }
echo "✓ Sync push created: $sync_id"

echo "=== Step 10: Sync pull ==="
sync_pull="$(curl_json GET "$API_BASE/sync/pull?limit=10")"
echo "Sync pull response: $sync_pull"
[[ "$(jq 'length' <<<"$sync_pull")" -ge 1 ]] || { echo "Sync pull returned empty list"; exit 1; }
echo "✓ Sync pull verified"

echo "=== Step 11: Reprint ticket ==="
reprint="$(curl_json POST "$API_BASE/operations/tickets/reprint" "{\"ticketNumber\":\"$ticket\",\"operatorUserId\":\"$CASHIER_OPERATOR_ID\",\"reason\":\"CI test\"}")"
echo "Reprint response: $reprint"
[[ "$(jq -r '.receipt.reprintCount' <<<"$reprint")" != "null" ]] || { echo "Reprint failed"; exit 1; }
echo "✓ Reprint verified"

echo "=== Step 12: Lost ticket flow ==="
lost_entry="$(curl_json POST "$API_BASE/operations/entries" "{\"plate\":\"LP$RANDOM\",\"type\":\"CAR\",\"rateId\":\"$RATE_CAR_ID\",\"operatorUserId\":\"$CASHIER_OPERATOR_ID\",\"entryAt\":\"2026-05-01T10:00:00Z\",\"site\":\"CI\",\"lane\":\"L2\",\"booth\":\"B2\",\"terminal\":\"TERM-CI\"}")"
echo "Lost entry response: $lost_entry"
lost_ticket="$(jq -r '.receipt.ticketNumber' <<<"$lost_entry")"
AUTH_TOKEN="$(jq -r '.accessToken' <<<"$refresh_resp")"
lost_resp="$(curl_json POST "$API_BASE/operations/tickets/lost" "{\"ticketNumber\":\"$lost_ticket\",\"operatorUserId\":\"$ADMIN_OPERATOR_ID\",\"paymentMethod\":\"CASH\",\"reason\":\"CI lost flow\"}")"
echo "Lost ticket response: $lost_resp"
assert_eq "$(jq -r '.receipt.lostTicket' <<<"$lost_resp")" "true"
echo "✓ Lost ticket flow verified"

echo ""
echo "========================================"
echo "✅ E2E critical flows passed"
echo "========================================"
