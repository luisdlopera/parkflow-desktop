# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| >= 0.1.x | :white_check_mark: |
| < 0.1.0   | :x:                |

## Reporting a Vulnerability

We take security seriously. If you discover a vulnerability, please follow these steps:

1. **Do not open a public issue.**
2. Send an email to `security@parkflow.dev` with:
   - Subject: `[ParkFlow Security] <brief description>`
   - A description of the vulnerability
   - Steps to reproduce (minimal, verifiable)
   - Possible impact and exploit scenario
   - Suggested fix (if any)
3. We will acknowledge receipt within **48 hours** and provide a timeline for resolution.
4. After fix deployment, we will publicly disclose the issue with appropriate credit (unless anonymity is requested).

### PGP Encryption

For sensitive reports, you may encrypt your email using our PGP key:

```
Key ID:  0xSECURITY
Fingerprint: 0000 0000 0000 0000 0000  0000 0000 0000 0000 0000
```

## Scope

The following are in scope for security reports:
- ParkFlow API (`apps/api`) — Spring Boot backend
- ParkFlow Web (`apps/web`) — Next.js frontend
- ParkFlow Desktop (`apps/desktop`) — Tauri application
- ParkFlow Print Agent (`apps/print-agent`) — Print service
- Infrastructure configuration (`infra/`, `security/`)

## Security Scanning & DAST

This repository uses **OWASP ZAP** for Dynamic Application Security Testing (DAST):

- **Baseline Scan**: Executed on every PR and push to `main`/`develop`
- **API Scan**: Executed nightly against the OpenAPI specification
- **Full Scan**: Executed weekly on staging environment

### Running Security Checks Locally

```bash
# Dependency audit
pnpm security:deps

# ZAP baseline scan (requires Docker)
pnpm security:zap:baseline

# ZAP API scan (requires API running)
pnpm security:zap:api
```

## Security Controls Implemented

### Network & Transport
- **Helmet**: HTTP header hardening (HSTS, X-Frame-Options, CSP, X-Content-Type-Options)
- **HSTS**: max-age=63072000; includeSubDomains; preload
- **CORS**: Strict origin whitelist with credentials control
- **Secure Cookies**: `HttpOnly`, `Secure`, `SameSite=Strict`

### Authentication & Authorization
- **JWT**: Short-lived access tokens (15 min) + rotating refresh tokens
- **BCrypt**: Password hashing with cost factor 12
- **Rate Limiting**: 10 login attempts/min per IP
- **Session**: Stateless JWT with no server-side session storage

### Data Validation
- **Frontend**: Zod schema validation on all forms
- **Backend**: Jakarta Bean Validation (`@Valid`, `@NotBlank`, etc.)
- **SQL Injection**: Prevented via JPA parameterized queries (no raw SQL)

### Output Security
- **XSS Prevention**: React automatic escaping + CSP headers
- **Safe Error Messages**: No stack traces in production responses
- **Standardized Errors**: `ErrorResponse` with correlation ID for all endpoints

### Licensing Security
- **License Validation**: RSA-signed license keys (production) / HMAC (development)
- **Hardware Binding**: Device fingerprint via CPU, disk, MAC combination
- **Tamper Detection**: Time manipulation detection, grace period enforcement

## Compliance

- OWASP Top 10 2021
- OWASP ASVS Level 2
- ISO/IEC 25010 — Security & Reliability
- CWE/SANS Top 25
- OWASP Dependency-Check (CVSS-based)

## Vulnerability Disclosure Timeline

| Step | Timeframe |
|------|-----------|
| Acknowledgment | 48 hours |
| Initial triage | 5 business days |
| Fix development | 14 days (critical) / 30 days (standard) |
| Patch release | Within 24 hours of fix |
| Public disclosure | 30 days after patch |

## Security Champions

- **Security Lead**: [@luisdlopera](https://github.com/luisdlopera)

---

*Last updated: 2026-06-22*
