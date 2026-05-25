# Security Testing Guide

## Local Development Security Checklist

Before committing code, verify:

- [ ] No secrets in code (run `gitleaks protect --staged`)
- [ ] No `console.log` with sensitive data
- [ ] Input validation uses Zod/class-validator
- [ ] Output is escaped (React does this automatically)
- [ ] API endpoints have authentication where required
- [ ] Rate limiting applied to public endpoints
- [ ] CORS origin is restricted, not `*`
- [ ] Security headers present (check in browser DevTools)

## Running Security Tests Locally

### 1. SAST (Semgrep)

```bash
# Install Semgrep
pip install semgrep

# Run against the codebase
semgrep --config=auto --config=p/security-audit --config=p/owasp-top-ten --config=p/cwe-top-25 .

# Run specific rules
semgrep --config=p/react apps/web/src
semgrep --config=p/typescript apps/print-agent/src
semgrep --config=p/rust apps/desktop/src-tauri/src
semgrep --config=p/java apps/api/src
```

### 2. Dependency Audit

```bash
# Node.js dependencies
pnpm audit --audit-level moderate

# Rust dependencies (desktop)
cd apps/desktop/src-tauri && cargo audit

# Java dependencies
cd apps/api && ./gradlew dependencyCheckAnalyze
```

### 3. Secret Scanning

```bash
# Install gitleaks
brew install gitleaks

# Scan all commits
gitleaks detect --source . --verbose

# Scan staged files only (pre-commit)
gitleaks protect --staged --verbose
```

### 4. ZAP Baseline Scan

```bash
# Ensure app is running
pnpm dev:web    # Terminal 1

# Run scan
pnpm security:zap:baseline

# View report
open security/reports/zap-baseline-*.html
```

### 5. ZAP API Scan

```bash
# Ensure API is running
pnpm db:up      # Terminal 1
pnpm dev:api    # Terminal 2

# Run scan
pnpm security:zap:api

# View report
open security/reports/zap-api-*.html
```

## Pre-Commit Hook

Add to `.git/hooks/pre-commit` (or use Husky):

```bash
#!/bin/bash
set -e

echo "🔍 Running pre-commit security checks..."

# 1. Secret scan
gitleaks protect --staged --verbose

# 2. Dependency audit (fail on high/critical)
pnpm audit --audit-level high || true

# 3. Lint security rules (if using eslint-plugin-security)
cd apps/web && pnpm lint -- --rule 'security/detect-object-injection: error'

echo "✅ Pre-commit checks passed"
```

## CI/CD Security Gates

```
PR Opened
    │
    ▼
┌─────────────────┐
│ Secret Scan     │ ──❌──> Block PR
└────────┬────────┘
         │ ✅
         ▼
┌─────────────────┐
│ SAST (Semgrep)  │ ──❌──> Block PR
└────────┬────────┘
         │ ✅
         ▼
┌─────────────────┐
│ Dependency Check│ ──❌──> Block PR (if critical)
└────────┬────────┘
         │ ✅
         ▼
┌─────────────────┐
│ Unit Tests      │ ──❌──> Block PR
└────────┬────────┘
         │ ✅
         ▼
┌─────────────────┐
│ ZAP Baseline    │ ──❌──> Block PR (if HIGH)
└────────┬────────┘
         │ ✅
         ▼
    PR Approved
         │
         ▼
   Merge to main
         │
         ▼
┌─────────────────┐
│ Nightly ZAP API │ ──📧──> Alert on findings
│ Full DAST       │
└─────────────────┘
```

## Interpreting ZAP Reports

### HTML Report Structure

1. **Summary**: Risk score, total alerts, pass/fail
2. **Alerts by Risk**: Grouped by High/Medium/Low/Informational
3. **Alert Details**:
   - Description
   - Solution
   - Reference (OWASP, CWE, WASC)
   - Evidence (request/response)
   - CWE ID

### Key Metrics

| Metric | Good | Acceptable | Needs Action |
|--------|------|------------|--------------|
| High Risk Alerts | 0 | 0 | >0 |
| Medium Risk Alerts | 0-2 | 3-5 | >5 |
| Low Risk Alerts | 0-5 | 6-10 | >10 |
| Informational | Any | Any | Document |

## Troubleshooting

### ZAP "Target not reachable"

```bash
# Check if app is running
curl http://localhost:3000

# If using Docker Desktop on macOS, use host.docker.internal
docker run --rm --add-host=host.docker.internal:host-gateway ...
```

### ZAP False Positives

Add to `security/zap/baseline.conf`:
```
10027 | IGNORE | DEFAULT | Information Disclosure - Suspicious Comments
```

Document justification in the config file comment.

### Rate Limiting Blocks ZAP

Whitelist ZAP in rate limit config:
```typescript
// apps/print-agent/src/plugins/security.ts
rateLimit: {
  allowList: ['127.0.0.1', '::1'],
  // ...
}
```

## References

- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/latest/)
- [ZAP FAQ](https://www.zaproxy.org/faq/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [Semgrep Registry](https://semgrep.dev/explore)
