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
   - A description of the vulnerability
   - Steps to reproduce
   - Possible impact
   - Suggested fix (if any)
3. We will acknowledge receipt within 48 hours and provide a timeline for resolution.
4. After fix deployment, we will publicly disclose the issue with appropriate credit.

## Security Scanning & DAST

This repository uses **OWASP ZAP** for Dynamic Application Security Testing (DAST):

- **Baseline Scan**: Executed on every PR and push to `main`/`develop`
- **API Scan**: Executed nightly against the OpenAPI specification
- **Full Scan**: Executed weekly on staging environment

### Running Locally

```bash
# Start dependencies
pnpm db:up

# Run baseline scan against local web app
pnpm security:zap:baseline

# Run API scan (requires API running)
pnpm security:zap:api
```

## Security Controls Implemented

- **Helmet**: HTTP header hardening (HSTS, X-Frame-Options, CSP)
- **Rate Limiting**: Request throttling per IP and per user
- **CORS**: Strict origin whitelist with credentials control
- **Secure Cookies**: `HttpOnly`, `Secure`, `SameSite=Strict`
- **Input Validation**: Zod schemas on frontend, class-validator on backend
- **Parameterized Queries**: Prevention of SQL injection via ORM/Query Builder
- **Output Encoding**: XSS prevention via React automatic escaping

## Compliance

- OWASP Top 10 2021
- OWASP ASVS Level 2
- ISO/IEC 25010 Security & Reliability
- CWE/SANS Top 25

## Security Champions

- **Security Lead**: [@security-lead](https://github.com/security-lead)
- **DevSecOps**: [@devsecops](https://github.com/devsecops)

---

*Last updated: 2026-05-24*
