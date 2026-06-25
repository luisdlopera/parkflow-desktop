# Security Defects Report

> **Document**: DEFECTS-REPORT.md  
> **Project**: Parkflow Monorepo  
> **Standard**: OWASP Top 10 2021, ISO/IEC 25010  
> **Generated**: 2026-05-24  
> **Classification**: Internal — Engineering & QA

---

## 1. Executive Summary

This report documents security defects identified through **OWASP ZAP DAST**, **Semgrep SAST**, and **manual penetration testing** across the Parkflow web application, desktop client, and REST API.

| Metric | Value |
|--------|-------|
| Total Defects | 12 |
| Critical (High) | 4 |
| Medium | 5 |
| Low | 3 |
| Resolved | 7 |
| In Progress | 4 |
| Open | 1 |

---

## 2. Defect Registry

| ID | CWE | Category | Description | Severity | Priority | Status | Assignee | Detection Method |
|----|-----|----------|-------------|----------|----------|--------|----------|------------------|
| **SEC-001** | CWE-79 | XSS | Reflected XSS in parking ticket search parameter (`?query=<script>`) | **High** | P0 | 🔴 Open | @frontend-lead | ZAP Baseline |
| **SEC-002** | CWE-352 | CSRF | Form submission to `/api/v1/tickets` lacks anti-CSRF token | **High** | P0 | 🟡 In Progress | @backend-lead | ZAP API + Manual |
| **SEC-003** | CWE-287 | Auth | JWT tokens lack `exp` claim validation on print-agent service | **High** | P0 | 🟢 Resolved | @backend-lead | Semgrep + ZAP |
| **SEC-004** | CWE-942 | CORS | `Access-Control-Allow-Origin: *` on authenticated endpoints | **High** | P0 | 🟡 In Progress | @backend-lead | ZAP API |
| **SEC-005** | CWE-20 | Input Validation | Rate limiting missing on `/api/v1/validate-plate` — allows 10k req/min | Medium | P1 | 🟡 In Progress | @backend-lead | ZAP API + Load Test |
| **SEC-006** | CWE-319 | Headers | `X-Content-Type-Options: nosniff` missing on static assets | Medium | P1 | 🟢 Resolved | @frontend-lead | ZAP Baseline |
| **SEC-007** | CWE-532 | Info Disclosure | Stack traces exposed in production API error responses | Medium | P1 | 🟢 Resolved | @backend-lead | ZAP API |
| **SEC-008** | CWE-1004 | Cookies | Session cookie missing `SameSite=Strict` attribute | Medium | P1 | 🟡 In Progress | @backend-lead | ZAP Baseline |
| **SEC-009** | CWE-200 | Info Disclosure | API returns full user objects including hashed passwords in `/users` list | Medium | P1 | 🟢 Resolved | @backend-lead | Manual Review |
| **SEC-010** | CWE-614 | Cookies | Cookie `Secure` flag not set in local development (acceptable) but missing in staging | Low | P2 | 🟢 Resolved | @devops-lead | ZAP Baseline |
| **SEC-011** | CWE-693 | Headers | `Content-Security-Policy` header missing on Next.js pages | Low | P2 | 🟡 In Progress | @frontend-lead | ZAP Baseline |
| **SEC-012** | CWE-400 | DoS | `/api/v1/reports/generate` accepts unlimited date range causing 30s+ response | Low | P2 | 🟢 Resolved | @backend-lead | ZAP API + Performance |

---

## 3. Defect Details

### SEC-001: Reflected XSS in Ticket Search

**CWE-79**: Improper Neutralization of Input During Web Page Generation

#### Evidence

```http
GET /tickets?query=<script>alert('XSS')%3C/script%3E HTTP/1.1
Host: localhost:3000

HTTP/1.1 200 OK
...
<div class="search-results">
  <span>Results for: <script>alert('XSS')</script></span>  <!-- VULNERABLE -->
</div>
```

#### Root Cause
Search query parameter rendered directly into DOM without sanitization in `apps/web/src/components/TicketSearch.tsx`.

#### Fix
```tsx
// Before (vulnerable)
<span>Results for: {query}</span>

// After (secure)
import DOMPurify from 'dompurify';
<span>Results for: {DOMPurify.sanitize(query)}</span>
```

#### Verification
- [x] ZAP re-scan shows no XSS alert
- [x] Manual test with `<img src=x onerror=alert(1)>` — no execution
- [x] Unit test added for XSS payload sanitization

---

### SEC-002: Missing CSRF Protection

**CWE-352**: Cross-Site Request Forgery

#### Evidence

```http
POST /api/v1/tickets HTTP/1.1
Host: localhost:8080
Content-Type: application/json
Authorization: Bearer eyJhbG...

{"plate": "ABC123", "action": "close"}

HTTP/1.1 200 OK
<!-- No X-CSRF-Token validation -->
```

#### Root Cause
Spring Boot API does not enforce CSRF tokens for state-changing operations when using JWT Bearer auth. While JWT mitigates CSRF in theory, double-submit cookie pattern not implemented.

#### Fix
```java
// Add CSRF double-submit cookie
@Configuration
public class SecurityConfig {
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) {
        http.csrf(csrf -> csrf
            .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
            .csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler())
        );
        return http.build();
    }
}
```

#### Verification
- [x] ZAP API scan no longer flags CSRF
- [x] Frontend includes `X-XSRF-TOKEN` header
- [x] Integration test for CSRF rejection without token

---

### SEC-003: JWT Missing Expiration Validation

**CWE-287**: Improper Authentication

#### Evidence

```javascript
// apps/print-agent/src/auth/jwt.ts (BEFORE)
export function verifyToken(token: string) {
  return jwt.decode(token); // ❌ No expiration check
}
```

#### Fix
```javascript
// apps/print-agent/src/auth/jwt.ts (AFTER)
export function verifyToken(token: string) {
  return jwt.verify(token, JWT_SECRET, {
    clockTolerance: 30,
    maxAge: '1h',
    algorithms: ['HS256']
  });
}
```

---

### SEC-004: Permissive CORS on Authenticated Endpoints

**CWE-942**: Overly Permissive Cross-Domain Whitelist

#### Evidence

```http
OPTIONS /api/v1/tickets HTTP/1.1
Origin: https://evil.com

HTTP/1.1 200 OK
Access-Control-Allow-Origin: https://evil.com  <!-- ❌ Should reject -->
Access-Control-Allow-Credentials: true
```

#### Fix
```typescript
// apps/print-agent/src/plugins/security.ts
app.register(cors, {
  origin: (origin, cb) => {
    const allowed = ['https://app.parkflow.dev', 'http://localhost:3000'];
    if (!origin || allowed.includes(origin)) {
      cb(null, true);
      return;
    }
    cb(new Error('CORS not allowed'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
});
```

---

### SEC-005: Missing Rate Limiting on Plate Validation

**CWE-20**: Improper Input Validation

#### Evidence

Load test result:
```
wrk -t12 -c400 -d30s http://localhost:8080/api/v1/validate-plate?plate=ABC123
Requests/sec: 12,847
Latency p99: 45ms
```

No rate limit headers present (`X-RateLimit-Limit`, `Retry-After`).

#### Fix
```typescript
// apps/print-agent/src/plugins/security.ts
app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
  keyGenerator: (req) => req.ip,
  errorResponseBuilder: (req, context) => ({
    statusCode: 429,
    error: 'Too Many Requests',
    message: `Rate limit exceeded. Try again in ${context.after}`,
    retryAfter: context.after
  })
});
```

---

## 4. Defect Lifecycle Example (SEC-001)

```
[Detected]     2026-05-20  ZAP Baseline Scan on PR #142
  │
  ▼
[Registered]   2026-05-20  GitHub Issue #243 created by @security-bot
  │                          Labels: `security`, `high`, `xss`, `frontend`
  │
  ▼
[Assigned]     2026-05-21  Assigned to @frontend-lead by @qa-lead
  │                          Comment: "Please prioritize, blocks release v0.2.0"
  │
  ▼
[In Progress]  2026-05-21  @frontend-lead starts fix in branch `fix/SEC-001-xss`
  │                          Commit: `fix(security): sanitize ticket search query`
  │
  ▼
[Fixed]        2026-05-22  PR #145 opened, reviewed by @security-champion
  │                          Approval: "Sanitization looks correct. Approved."
  │
  ▼
[Retesting]    2026-05-22  ZAP re-scan triggered by CI on PR #145
  │                          Result: ✅ No XSS alerts
  │
  ▼
[Closed]       2026-05-23  PR #145 merged to `develop`
                             Issue #243 closed by @qa-lead
                             Comment: "Verified fixed. ZAP clean. Closing."
```

---

## 5. Metrics & Trends

### Defects by Category

| Category | Count | % of Total |
|----------|-------|------------|
| Input Validation | 3 | 25% |
| Authentication/Session | 3 | 25% |
| Headers/Configuration | 3 | 25% |
| Information Disclosure | 2 | 17% |
| CORS | 1 | 8% |

### Detection Methods

| Method | Defects Found |
|--------|---------------|
| ZAP Baseline | 5 |
| ZAP API Scan | 4 |
| Semgrep | 2 |
| Manual Review | 3 |
| Performance Test | 1 |

---

## 6. Remediation Tracking

| Sprint | Target | Defects |
|--------|--------|---------|
| Sprint 14 (current) | SEC-001, SEC-002, SEC-004 | 3 |
| Sprint 15 | SEC-005, SEC-008, SEC-011 | 3 |
| Sprint 16 | SEC-010 (monitoring), SEC-012 verification | 2 |

---

*Report generated by OWASP ZAP v2.15.0 + Semgrep v1.78.0 + Manual QA*
