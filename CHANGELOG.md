# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **API Traceability:**
  - `CorrelationIdFilter`: Accepts `X-Correlation-Id` header or generates UUID, adds to MDC for logging, returns in response header.
  - `ErrorResponse`: Standardized error format with timestamp, status, code, message, path, correlationId, and optional details.
  - `GlobalExceptionHandler`: Centralized exception handling converting all errors to `ErrorResponse` format.
  - CORS configuration now exposes `X-Correlation-Id` header to clients.
- **Authentication & Security:**
  - `PasswordResetToken` entity and repository for secure password reset flow.
  - `PasswordResetService` with rate limiting (max 3 active tokens per user) and token expiry (1 hour).
  - `PasswordResetRequest` and `PasswordResetConfirmRequest` DTOs.
  - Password reset endpoints: `POST /api/v1/auth/password-reset/request` and `POST /api/v1/auth/password-reset/confirm`.
  - Enhanced logging in `AuthService` with email masking for security.
  - Password strength validation (min 8 chars, uppercase, lowercase, number, special char).
  - `AuthAuditAction.PASSWORD_RESET_REQUESTED` and `PASSWORD_RESET_COMPLETED` events.
- **Frontend - Password Recovery:**
  - `/forgot-password` page with anti-enumeration security (always returns 200).
  - `/reset-password` page with token validation and password strength meter.
  - Password visibility toggle (eye icon) on login and reset password forms.
- **Documentation:**
  - Pull Request template with technical checklist.
  - Comprehensive API documentation in `docs/api/ENDPOINTS.md`.
  - Troubleshooting guides for auth, operations, printing, sync, and cash.
  - Debug runbook at `docs/runbooks/debug-api-request.md`.
  - Updated `README.md` with debugging instructions and pre-login checklist.
- **Tests:**
  - `CorrelationIdIntegrationTest`: Integration tests for correlation ID generation and propagation.
  - `GlobalExceptionHandlerTest`: Unit tests for standardized error responses.
  - Test configuration with H2 database support.

### Changed
- `OperationException`: Added support for error codes.
- `OperationExceptionHandler`: Deprecated in favor of `GlobalExceptionHandler`.
- `SecurityConfig`: Updated to expose correlation ID header in CORS.
- `AuthService`: Added comprehensive audit logging with email masking.
- `AuthController`: Added password reset endpoints and dependency injection for `PasswordResetService`.
- `AuthAuditAction`: Added `PASSWORD_RESET_REQUESTED` and `PASSWORD_RESET_COMPLETED`.
- `CorrelationIdFilter`: Changed order to `Ordered.HIGHEST_PRECEDENCE` for earliest execution.
- `RateLimitFilter`: Changed order to 2 (after CorrelationIdFilter).
- `README.md`: Updated seed data credentials and added security features section.
- `CorrelationIdIntegrationTest`: Updated expected status codes from 401 to 403 for consistency.

### Fixed
- Fixed `useSearchParams` in `/reset-password` by wrapping in `Suspense` boundary.
- Fixed BCrypt hash in seed data for user passwords.

### Security
- Rate limiting on login endpoint (10 requests/minute per IP).
- Password strength enforcement on change and reset.
- Email masking in logs to prevent information leakage.
- Secure token generation using `SecureRandom` and SHA-256 hashing.
- Anti-enumeration on password reset (always returns 200 even if email doesn't exist).

## [0.1.0] - 2026-04-29
- Initial release of the Parkflow Monorepo.
