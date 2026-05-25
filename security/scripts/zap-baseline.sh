#!/usr/bin/env bash
# =============================================================================
# OWASP ZAP Baseline Scan Script (Local)
# =============================================================================
# Usage: ./security/scripts/zap-baseline.sh [TARGET_URL]
# Default target: http://localhost:3000
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
TARGET_URL="${1:-http://localhost:3000}"
REPORTS_DIR="${ROOT_DIR}/security/reports"
CONFIG_FILE="${ROOT_DIR}/security/zap/baseline.conf"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "=========================================="
echo "OWASP ZAP Baseline Scan"
echo "Target: ${TARGET_URL}"
echo "Reports: ${REPORTS_DIR}"
echo "=========================================="

mkdir -p "${REPORTS_DIR}"

# Check if target is reachable
if ! curl -fsS "${TARGET_URL}" >/dev/null 2>&1; then
  echo "❌ Target ${TARGET_URL} is not reachable. Start the application first:"
  echo "   pnpm dev:web"
  exit 1
fi

# Run ZAP baseline scan via Docker
docker run --rm \
  --network=host \
  -v "${CONFIG_FILE}:/zap/wrk/baseline.conf:ro" \
  -v "${REPORTS_DIR}:/zap/wrk/reports:rw" \
  ghcr.io/zaproxy/zaproxy:stable \
  zap-baseline.py \
    -t "${TARGET_URL}" \
    -r "reports/zap-baseline-${TIMESTAMP}.html" \
    -w "reports/zap-baseline-${TIMESTAMP}.md" \
    -J "reports/zap-baseline-${TIMESTAMP}.json" \
    -c /zap/wrk/baseline.conf \
    -a \
    -j \
    --auto

echo "✅ Baseline scan complete. Reports saved to ${REPORTS_DIR}"
