# OWASP ZAP: Technical Reference & DevSecOps Guide

## 1. What Vulnerabilities Does ZAP Detect?

OWASP ZAP detects **100+ vulnerability categories** organized by risk level:

### High Severity (Immediate Action Required)

| Vulnerability | Plugin ID | CWE | Description |
|--------------|-----------|-----|-------------|
| SQL Injection | 40018-40024 | CWE-89 | Inject malicious SQL via input fields |
| Cross-Site Scripting (Reflected) | 40012 | CWE-79 | Execute scripts via URL parameters |
| Cross-Site Scripting (Persistent) | 40014 | CWE-79 | Store malicious scripts in database |
| Server-Side Request Forgery (SSRF) | 40042 | CWE-918 | Force server to make unauthorized requests |
| Remote Code Execution | 10048 | CWE-94 | Execute arbitrary code on server |
| Path Traversal | 40034 | CWE-22 | Access files outside web root |
| Broken Authentication | 10105 | CWE-287 | Weak or missing authentication |
| XML External Entity (XXE) | 90023 | CWE-611 | Parse malicious XML entities |
| Log4Shell (CVE-2021-44228) | 40043 | CWE-502 | JNDI injection via log messages |
| Spring4Shell (CVE-2022-22965) | 40044 | CWE-94 | Spring Framework class injection |

### Medium Severity (Address Within 2 Weeks)

| Vulnerability | Plugin ID | CWE | Description |
|--------------|-----------|-----|-------------|
| CORS Misconfiguration | 40040 | CWE-942 | Overly permissive cross-origin policies |
| Missing CSP Header | 10038 | CWE-693 | No Content Security Policy |
| Missing HSTS | 10035 | CWE-319 | No HTTPS enforcement |
| Insecure Cookies | 10107-10111 | CWE-1004 | Missing HttpOnly/Secure/SameSite |
| Information Disclosure | 10023-10027 | CWE-200 | Debug info, stack traces in responses |
| Open Redirect | 10028 | CWE-601 | Redirect to attacker-controlled URL |
| Directory Browsing | 10033 | CWE-548 | List directory contents |
| Vulnerable JS Libraries | 10003 | CWE-1035 | Outdated/known-vulnerable libraries |

### Low Severity (Document & Address in Next Sprint)

| Vulnerability | Plugin ID | CWE | Description |
|--------------|-----------|-----|-------------|
| X-Content-Type-Options Missing | 10021 | CWE-693 | MIME sniffing possible |
| X-Frame-Options Missing | 10020 | CWE-693 | Clickjacking possible |
| Server Information Leak | 10036 | CWE-200 | Version numbers in headers |
| Cookie without SameSite | 10054 | CWE-1275 | CSRF risk via cookies |
| Permissions-Policy Missing | 10063 | CWE-693 | No feature policy |

---

## 2. ZAP Limitations

### What ZAP CANNOT Detect

| Limitation | Why | Complementary Tool |
|-----------|-----|-------------------|
| **Business Logic Flaws** | Requires domain knowledge | Manual pentesting, threat modeling |
| **Zero-Day Vulnerabilities** | Relies on known signatures | Semgrep custom rules, Snyk |
| **Server-Side Template Injection (SSTI)** | Limited coverage | Semgrep, CodeQL |
| **Race Conditions** | Single-threaded scanner | Custom tests, Burp Turbo Intruder |
| **Cryptographic Weaknesses** | Doesn't analyze algorithms | SonarQube, Cryptography experts |
| **Source Code Vulnerabilities** | Needs runtime application | SonarQube, Semgrep, CodeQL |
| **Infrastructure Issues** | Focused on application layer | Trivy, ScoutSuite, Prowler |
| **API Authorization (BOLA/BFLA)** | Limited context | Postman/Newman tests, custom scripts |
| **DOM-based XSS (complex)** | Dynamic analysis limitations | Semgrep, ESLint security rules |
| **JWT Weaknesses** | Token analysis limited | jwt_tool, custom validation |

### Operational Limitations

1. **Authentication Complexity**: ZAP struggles with:
   - Multi-factor authentication
   - OAuth 2.0 / OpenID Connect flows
   - CAPTCHA-protected forms
   - **Solution**: Use ZAP Replacer or scripts for token injection

2. **Modern Frontend Frameworks**:
   - Single Page Applications (SPA) require spider tuning
   - React Router / Next.js dynamic routes need manual configuration
   - **Solution**: Use AJAX Spider + manual exploration

3. **Rate Limiting**: ZAP's aggressive scanning can:
   - Trigger WAF blocks
   - Cause IP bans
   - Overload application
   - **Solution**: Configure scan policy delays, use allowlists

4. **State Management**:
   - Complex session flows may confuse ZAP
   - CSRF tokens need manual configuration
   - **Solution**: Use ZAP Scripts (Zest/JS) for custom flows

---

## 3. DAST vs SAST vs SCA vs IAST

### Comparison Matrix

| Aspect | **DAST** (ZAP) | **SAST** (SonarQube/Semgrep) | **SCA** (Dependency-Check) | **IAST** (Contrast/OAST) |
|--------|----------------|------------------------------|----------------------------|--------------------------|
| **When** | Runtime | Compile time | Build time | Runtime (instrumented) |
| **Access** | Black box | White box | Manifest files | Gray box |
| **Code Required** | No | Yes | Partial | Yes |
| **Environment** | Staging/Prod | Dev/CI | CI/CD | Staging/Prod |
| **False Positives** | Low-Medium | Medium-High | Low | Very Low |
| **Coverage** | Exposed surface | All code | Dependencies | Full execution path |
| **Speed** | Slow (minutes-hours) | Fast (seconds-minutes) | Fast | Real-time |
| **Cost** | Free (ZAP) | $$$ (Enterprise) | Free | $$$$ |
| **Best For** | Runtime vulnerabilities | Code quality, injection | Known CVEs | Continuous monitoring |

### How They Complement Each Other

```
┌─────────────────────────────────────────────────────────────┐
│                    DevSecOps Pipeline                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  DEVELOPER                                                  │
│     │                                                       │
│     ▼                                                       │
│  ┌─────────────┐    SAST: Catch injection flaws early       │
│  │ Code + SAST │──────────────────────────────────────▶     │
│  │ (Semgrep)   │                                           │
│  └──────┬──────┘                                           │
│         │                                                   │
│     BUILD                                                   │
│         │                                                   │
│         ▼                                                   │
│  ┌─────────────┐    SCA: Block known vulnerable deps        │
│  │ Dependencies│──────────────────────────────────────▶     │
│  │ (Dep-Check) │                                           │
│  └──────┬──────┘                                           │
│         │                                                   │
│     DEPLOY                                                  │
│         │                                                   │
│         ▼                                                   │
│  ┌─────────────┐    DAST: Find runtime exposure             │
│  │ Application │──────────────────────────────────────▶     │
│  │ (ZAP)       │                                           │
│  └──────┬──────┘                                           │
│         │                                                   │
│     RUNTIME                                                 │
│         │                                                   │
│         ▼                                                   │
│  ┌─────────────┐    IAST: Continuous monitoring (optional)  │
│  │ Production  │──────────────────────────────────────▶     │
│  │ (IAST Agent)│                                           │
│  └─────────────┘                                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Complementing ZAP with SonarQube and Semgrep

### ZAP + SonarQube Integration

**SonarQube** (SAST) analyzes source code for:
- Injection flaws (SQL, XSS, Command)
- Insecure cryptographic implementations
- Hardcoded credentials
- Code smells that lead to vulnerabilities

**Integration Strategy**:
```yaml
# .github/workflows/ci.yml (excerpt)
jobs:
  sonarcloud:
    name: SonarCloud Analysis
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - name: SonarCloud Scan
        uses: SonarSource/sonarqube-scan-action@v4
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
        # SonarQube rules: sonar-security-java, sonar-security-js, sonar-security-ts
```

**Coverage Comparison**:

| Finding | ZAP (DAST) | SonarQube (SAST) | Combined |
|---------|-----------|------------------|----------|
| SQL Injection in API | ✅ Detects endpoint | ✅ Detects code pattern | ✅ Full coverage |
| XSS in React | ✅ Detects response | ✅ Detects dangerouslySetInnerHTML | ✅ Full coverage |
| Hardcoded password | ❌ Cannot see code | ✅ Detects string literals | ✅ Code only |
| Missing CSP header | ✅ Detects response | ❌ Not a code issue | ✅ DAST only |
| CSRF vulnerability | ✅ Detects missing token | ✅ Detects missing annotation | ✅ Full coverage |

### ZAP + Semgrep Integration

**Semgrep** (Lightweight SAST) provides:
- Custom rule creation for team-specific patterns
- OWASP/CWE rule packs
- Fast scanning (seconds vs minutes)
- IDE integration for immediate feedback

**Integration Strategy**:
```yaml
# .github/workflows/security.yml (excerpt)
  sast_semgrep:
    name: SAST — Semgrep
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: returntocorp/semgrep-action@v1
        with:
          config: >-
            p/security-audit
            p/owasp-top-ten
            p/cwe-top-25
            p/react
            p/typescript
            p/rust
            p/java
```

**Example Custom Semgrep Rule**:
```yaml
# .semgrep/custom-xss.yml
rules:
  - id: parkflow-no-dangerous-html
    pattern: dangerouslySetInnerHTML={{ __html: $X }}
    languages: [ts, tsx]
    message: |
      Avoid dangerouslySetInnerHTML. Use DOMPurify or React's safe rendering.
      See SEC-001 for incident reference.
    severity: ERROR
    metadata:
      cwe: "CWE-79: Cross-site Scripting"
      owasp: "A03:2021 – Injection"
```

### Unified Security Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│              Security Dashboard (Example)                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  SAST (Semgrep)          DAST (ZAP)          SCA (DepCheck) │
│  ──────────────          ──────────          ─────────────  │
│  High: 0                 High: 0               Critical: 0  │
│  Medium: 2               Medium: 1             High: 2      │
│  Low: 5                  Low: 3                Medium: 8    │
│                                                             │
│  Top Findings:           Top Findings:         Top Findings:│
│  1. Hardcoded key        1. Missing CSP        1. lodash    │
│  2. Weak regex           2. CORS wildcard      2. axios     │
│                                                             │
│  [View SonarQube]        [View ZAP Report]     [View SCA]   │
│                                                             │
│  Combined Risk Score: 72/100 (Good)                         │
│  Last Scan: 2026-05-24 03:00 UTC                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. ZAP Scan Policies by Environment

### Development (Local)

```bash
# Fast feedback loop
zap-baseline.py -t http://localhost:3000 -a -j --auto
```
- Duration: 2-3 minutes
- Rules: Baseline only
- Fail on: HIGH

### Pull Request (CI)

```yaml
# .github/workflows/security.yml
zap_baseline:
  # ... (see full workflow)
  # Duration: 5 minutes
  # Rules: Baseline + custom exclusions
  # Fail on: HIGH
```

### Staging (Nightly)

```bash
# Comprehensive scan
zap-full-scan.py -t https://staging.parkflow.dev \
  -r staging-report.html \
  -w staging-report.md \
  -J staging-report.json \
  -c full-scan.conf \
  -a -j --auto
```
- Duration: 15-30 minutes
- Rules: Full active scanning
- Fail on: HIGH + MEDIUM

### Production (Weekly)

```bash
# Read-only passive scan
zap-baseline.py -t https://app.parkflow.dev \
  -r prod-report.html \
  --auto \
  -z "-config scanner.attackOnStart=false" \
  -z "-config scanner.attackStrength=LOW"
```
- Duration: 10-15 minutes
- Rules: Passive only (no active attacks)
- Fail on: HIGH (alert only, don't block)

---

## 6. ZAP Configuration Best Practices

### Contexts and Sessions

```bash
# Save context with authentication
zap-cli context import /path/to/context.context
zap-cli context include <context-name> 'https://app.parkflow.dev/.*'

# Set authentication
zap-cli authMethod <context-name> scriptBasedAuthentication
zap-cli authScript <context-name> /path/to/auth.js
```

### Excluding Noise

```bash
# Ignore static assets and health checks
zap-baseline.py -t http://localhost:3000 \
  -c baseline.conf \
  --auto \
  -z "-config spider.excludeList(0).regex=true" \
  -z "-config spider.excludeList(0).value=.*/health" \
  -z "-config spider.excludeList(1).regex=true" \
  -z "-config spider.excludeList(1).value=.*/_next/.*"
```

### Authentication via Replacer

```bash
# Add Bearer token to all requests
zap-api-scan.py -t http://localhost:8080 \
  -f openapi \
  -z "-config replacer.full_list(0).description=auth" \
  -z "-config replacer.full_list(0).enabled=true" \
  -z "-config replacer.full_list(0).matchtype=REQ_HEADER" \
  -z "-config replacer.full_list(0).matchstr=Authorization" \
  -z "-config replacer.full_list(0).regex=false" \
  -z "-config replacer.full_list(0).replacement=Bearer ${TOKEN}"
```

---

## 7. Recommended DevSecOps Pipeline

```yaml
# Complete pipeline integration
stages:
  - secret-scan      # GitLeaks (pre-commit + CI)
  - sast             # Semgrep (PR), SonarQube (main)
  - sca              # Dependency-Check (CI)
  - build
  - unit-test
  - deploy-staging
  - dast-baseline    # ZAP Baseline (every PR)
  - dast-api         # ZAP API Scan (nightly)
  - dast-full        # ZAP Full Scan (weekly staging)
  - deploy-prod
  - monitoring       # IAST (production, optional)

security-gates:
  - Secret leak: BLOCK
  - SAST HIGH: BLOCK
  - SCA CRITICAL: BLOCK
  - DAST HIGH: BLOCK (staging), ALERT (prod)
  - DAST MEDIUM: WARN (PR), BLOCK (staging)
```

---

## 8. Metrics and KPIs

Track these security metrics monthly:

| Metric | Target | Measurement |
|--------|--------|-------------|
| Mean Time to Detect (MTTD) | < 1 hour | CI pipeline duration |
| Mean Time to Remediate (MTTR) | < 48 hours (HIGH) | Issue closed - opened |
| Vulnerability Escape Rate | 0% | Production defects / Total defects |
| False Positive Rate | < 15% | False positives / Total findings |
| Security Test Coverage | > 90% | Endpoints scanned by ZAP / Total endpoints |
| Dependency Patching SLA | < 7 days (CRITICAL) | CVE publish → patch deploy |

---

*Reference: OWASP ZAP 2.15.0, OWASP Testing Guide v4.2, CWE 4.13*
