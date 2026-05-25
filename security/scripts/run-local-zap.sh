#!/usr/bin/env bash
# =============================================================================
# Local ZAP Orchestrator
# =============================================================================
# Usage: pnpm security:zap:local
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

source "${SCRIPT_DIR}/zap-baseline.sh" http://localhost:3000
source "${SCRIPT_DIR}/zap-api-scan.sh" http://localhost:8080

echo ""
echo "=========================================="
echo "All local ZAP scans completed successfully"
echo "Check security/reports/ for results"
echo "=========================================="
