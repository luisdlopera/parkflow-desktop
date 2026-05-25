#!/usr/bin/env bash
# =============================================================================
# OWASP ZAP API Scan Script (Local)
# =============================================================================
# Usage: ./security/scripts/zap-api-scan.sh [API_URL] [OPENAPI_PATH]
# Default API URL: http://localhost:8080
# Default OpenAPI: /tmp/openapi.json (auto-fetched if not provided)
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
API_URL="${1:-http://localhost:8080}"
OPENAPI_PATH="${2:-/tmp/openapi.json}"
REPORTS_DIR="${ROOT_DIR}/security/reports"
CONFIG_FILE="${ROOT_DIR}/security/zap/api-scan.conf"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
API_KEY="${PARKFLOW_API_KEY:-ci-test-api-key-12345}"

echo "=========================================="
echo "OWASP ZAP API Scan"
echo "API URL: ${API_URL}"
echo "OpenAPI: ${OPENAPI_PATH}"
echo "Reports: ${REPORTS_DIR}"
echo "=========================================="

mkdir -p "${REPORTS_DIR}"

# Check if API is reachable
if ! curl -fsS "${API_URL}/api/v1/health" >/dev/null 2>&1; then
  echo "❌ API ${API_URL} is not reachable. Start the API first:"
  echo "   pnpm dev:api"
  exit 1
fi

# Fetch OpenAPI spec if not provided
if [ ! -f "${OPENAPI_PATH}" ]; then
  echo "📥 Fetching OpenAPI spec from ${API_URL}/api/v1/api-docs ..."
  curl -fsS "${API_URL}/api/v1/api-docs" -o "${OPENAPI_PATH}" || {
    echo "❌ Failed to fetch OpenAPI spec"
    exit 1
  }
fi

# Run ZAP API scan via Docker
docker run --rm \
  --network=host \
  -e API_KEY="${API_KEY}" \
  -v "${CONFIG_FILE}:/zap/wrk/api-scan.conf:ro" \
  -v "${REPORTS_DIR}:/zap/wrk/reports:rw" \
  -v "${OPENAPI_PATH}:/zap/wrk/openapi.json:ro" \
  ghcr.io/zaproxy/zaproxy:stable \
  zap-api-scan.py \
    -t /zap/wrk/openapi.json \
    -f openapi \
    -r "reports/zap-api-${TIMESTAMP}.html" \
    -w "reports/zap-api-${TIMESTAMP}.md" \
    -J "reports/zap-api-${TIMESTAMP}.json" \
    -c /zap/wrk/api-scan.conf \
    -a \
    -z "-config replacer.full_list(0).description=auth" \
    -z "-config replacer.full_list(0).enabled=true" \
    -z "-config replacer.full_list(0).matchtype=REQ_HEADER" \
    -z "-config replacer.full_list(0).matchstr=Authorization" \
    -z "-config replacer.full_list(0).regex=false" \
    -z "-config replacer.full_list(0).replacement=Bearer ${API_KEY}"

echo "✅ API scan complete. Reports saved to ${REPORTS_DIR}"
