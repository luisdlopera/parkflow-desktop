# OWASP ZAP DAST Integration Guide

## Overview

This document describes the integration of **OWASP ZAP** (Zed Attack Proxy) for Dynamic Application Security Testing (DAST) in the Parkflow monorepo.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     GitHub Actions CI/CD                     │
├─────────────────────────────────────────────────────────────┤
│  PR / Push / Schedule                                        │
│       │                                                      │
│       ▼                                                      │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐  │
│  │ SAST        │    │ Dependency  │    │ Secret Scanning │  │
│  │ (Semgrep)   │    │ Check       │    │ (GitLeaks)      │  │
│  └──────┬──────┘    └──────┬──────┘    └─────────────────┘  │
│         │                  │                                 │
│         ▼                  ▼                                 │
│  ┌─────────────┐    ┌─────────────┐                          │
│  │ ZAP Baseline│    │ ZAP API     │                          │
│  │ (Web)       │    │ Scan        │                          │
│  └──────┬──────┘    └──────┬──────┘                          │
│         │                  │                                 │
│         ▼                  ▼                                 │
│  ┌─────────────────────────────────┐                        │
│  │ Report Aggregation & Artifacts  │                        │
│  └─────────────────────────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
security/
├── docker-compose.zap.yml    # Docker orchestration for ZAP scans
├── zap/
│   ├── baseline.conf         # ZAP baseline scan rules
│   ├── api-scan.conf         # ZAP API scan rules
│   └── full-scan.conf        # ZAP full scan rules (optional)
├── scripts/
│   ├── zap-baseline.sh       # Local baseline scan runner
│   ├── zap-api-scan.sh       # Local API scan runner
│   └── run-local-zap.sh      # Orchestrates all local scans
└── reports/                  # Generated reports (gitignored)
```

## Scan Types

### 1. Baseline Scan (`zap-baseline.py`)

- **Purpose**: Quick passive scan of the web frontend
- **Duration**: 2-5 minutes
- **Trigger**: Every PR and push to `main`/`develop`
- **Target**: `http://localhost:3000` (Next.js web app)
- **Reports**: HTML, Markdown, JSON

### 2. API Scan (`zap-api-scan.py`)

- **Purpose**: Deep scan of REST API endpoints using OpenAPI spec
- **Duration**: 5-15 minutes
- **Trigger**: Nightly schedule (`cron: 0 3 * * *`)
- **Target**: `http://localhost:8080` (Spring Boot API)
- **Reports**: HTML, Markdown, JSON
- **Authentication**: Bearer token via ZAP Replacer

### 3. Full Scan (`zap-full-scan.py`)

- **Purpose**: Active scanning with attack simulation
- **Duration**: 15-45 minutes
- **Trigger**: Weekly on staging (manual or scheduled)
- **Target**: Staging environment
- **Warning**: Can be destructive — only run against test data

## GitHub Actions Workflow

The security workflow (`.github/workflows/security.yml`) includes:

| Job | Purpose | Trigger |
|-----|---------|---------|
| `sast_semgrep` | Static analysis for code vulnerabilities | PR |
| `dependency_check` | OWASP Dependency-Check for known CVEs | All |
| `secret_scan` | GitLeaks for secrets in commits | All |
| `zap_baseline` | DAST on web frontend | All |
| `zap_api_scan` | DAST on API (OpenAPI) | Schedule / Manual |
| `security_report` | Aggregate all findings | All (always) |

## Configuration Files

### baseline.conf

Rules configuration for baseline scan:
- **Thresholds**: `IGNORE`, `INFO`, `LOW`, `MEDIUM`, `HIGH`
- **Strength**: `DEFAULT`, `LOW`, `MEDIUM`, `HIGH`, `INSANE`
- **Format**: `pluginid | threshold | strength | name`

Example:
```
40012 | MEDIUM | DEFAULT | Cross Site Scripting (Reflected)
40018 | HIGH   | DEFAULT | SQL Injection
```

### api-scan.conf

Similar to baseline but optimized for API context:
- Higher severity for authentication/authorization issues
- Ignores UI-specific false positives
- Includes API-specific rules (BOLA, mass assignment)

## Running Locally

### Prerequisites

- Docker installed and running
- Application stack running (see below)

### Step 1: Start the Stack

```bash
# Terminal 1: Database
pnpm db:up

# Terminal 2: API
pnpm dev:api

# Terminal 3: Web
pnpm dev:web
```

### Step 2: Run Baseline Scan

```bash
pnpm security:zap:baseline
# Or with custom target:
bash security/scripts/zap-baseline.sh http://localhost:3000
```

### Step 3: Run API Scan

```bash
pnpm security:zap:api
# Or with custom params:
bash security/scripts/zap-api-scan.sh http://localhost:8080 /tmp/openapi.json
```

### Step 4: Run All Scans

```bash
pnpm security:zap:local
```

### Step 5: View Reports

```bash
open security/reports/zap-baseline-*.html
open security/reports/zap-api-*.html
```

## Docker Compose Alternative

```bash
# Baseline scan only
docker compose -f security/docker-compose.zap.yml --profile baseline up --abort-on-container-exit

# API scan only
docker compose -f security/docker-compose.zap.yml --profile api up --abort-on-container-exit
```

## Interpreting Results

### Risk Codes

| Code | Level | Action Required |
|------|-------|-----------------|
| 0 | Informational | Document, no action |
| 1 | Low | Address in next sprint |
| 2 | Medium | Address within 2 weeks |
| 3 | High | **Block release, fix immediately** |

### Common Findings

See [DEFECTS-REPORT.md](./DEFECTS-REPORT.md) for real examples from this project.

## Integration with Other Tools

| Tool | Type | Purpose | Integration |
|------|------|---------|-------------|
| **ZAP** | DAST | Runtime vulnerability detection | GitHub Actions + Local |
| **SonarQube** | SAST | Code quality + basic security | SonarCloud scan in CI |
| **Semgrep** | SAST | Pattern-based vulnerability detection | PR checks |
| **Dependency-Check** | SCA | Known CVEs in dependencies | CI artifact + fail on critical |
| **GitLeaks** | Secret Scan | Prevent secret leakage | Pre-commit + CI |

## CI/CD Fail Conditions

The pipeline fails when:
1. Any **HIGH** severity ZAP finding exists
2. Semgrep finds blocking rules (owasp-top-ten, cwe-top-25)
3. Dependency-Check finds CRITICAL CVEs
4. GitLeaks detects secrets

Override (emergency only):
```yaml
env:
  FAIL_ON_HIGH: false
```

## Maintenance

- **Update ZAP rules monthly**: Review `security/zap/*.conf` files
- **Review false positives**: Add `IGNORE` rules with justification comments
- **Rotate test credentials**: Update `PARKFLOW_API_KEY` in CI secrets
- **Update Docker image**: Pin to specific ZAP version in `docker-compose.zap.yml`

## References

- [OWASP ZAP Documentation](https://www.zaproxy.org/docs/)
- [ZAP GitHub Actions](https://github.com/zaproxy/action-baseline)
- [OWASP Testing Guide v4.2](https://owasp.org/www-project-web-security-testing-guide/)
- [OWASP ASVS 4.0](https://owasp.org/www-project-application-security-verification-standard/)
