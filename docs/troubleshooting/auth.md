# Troubleshooting: Authentication & Security

## Symptoms
- Client receives `401 Unauthorized`.
- Client receives `403 Forbidden`.
- "Invalid API Key" error in response.
- JWT token rejected or expired.

## Checkpoints

### 1. API Key Issues
- **Header:** Ensure `X-API-Key` is present if required for internal/webhook routes.
- **Value:** Verify the key matches the environment variable `PARKFLOW_API_KEY`.
- **Scope:** Check `ApiKeyAuthFilter.java` to see if the path is in `API_KEY_REQUIRED_PATHS`.

### 2. JWT Issues
- **Expiration:** Access tokens are short-lived (default 15 mins). Ensure the client is handling the refresh token flow.
- **Secret:** If `PARKFLOW_JWT_SECRET_BASE64` changed, all existing tokens will be invalid.
- **Logs:** Look for `ExpiredJwtException` or `SignatureException` in the API logs.

### 3. Role-Based Access Control (RBAC)
- **Permissions:** Ensure the user has the required roles (e.g., `ROLE_MANAGER` for lost tickets).
- **Configuration:** Check `@PreAuthorize` annotations in controllers and `SecurityConfig.java`.

## Common Fixes
- Restart the API with correct environment variables.
- Clear browser local storage/cookies to force a re-login.
- Synchronize system time (JWT validation is sensitive to clock skew).
