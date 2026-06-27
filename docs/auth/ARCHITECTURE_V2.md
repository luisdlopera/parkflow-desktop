# Auth Architecture v2 — Post-Correction

> Status: IMPLEMENTED (P0-P1) | PENDING (P2-P3)
> Last updated: 2026-06-26

---

## Package Structure (Post-Correction)

```
modules/auth/
├── application/
│   ├── port/in/
│   │   ├── LoginUseCase.java
│   │   ├── LogoutUseCase.java
│   │   ├── TokenRefreshUseCase.java
│   │   ├── PasswordResetUseCase.java
│   │   ├── DeviceManagementUseCase.java
│   │   └── ProfileManagementUseCase.java
│   ├── port/out/
│   │   ├── AppUserPort.java                    ← CORREGIDO
│   │   ├── AuthSessionPort.java                ← ACTUALIZADO (atomic deactivate)
│   │   ├── AuthorizedDevicePort.java
│   │   ├── AuthAuditLogPort.java
│   │   ├── PasswordResetTokenPort.java
│   │   └── AuthCompanyPort.java
│   └── service/
│       ├── LoginUseCaseImpl.java               ← CORREGIDO (usa AppUserPort)
│       ├── LogoutUseCaseImpl.java
│       ├── TokenRefreshUseCaseImpl.java        ← CORREGIDO (atomic deactivate)
│       ├── PasswordResetManagementService.java ← CORREGIDO (usa AppUserPort)
│       ├── DeviceManagementService.java
│       ├── ProfileManagementService.java
│       ├── AuthAuditService.java
│       ├── AuthenticationResponseAssembler.java
│       └── AuthSessionCleanupJob.java
├── domain/
│   ├── AppUser.java
│   ├── AuthSession.java                        ← CORREGIDO (@Version)
│   ├── AuthAuditAction.java
│   ├── AuthAuditLog.java
│   ├── AuthPermission.java
│   ├── AuthorizedDevice.java
│   ├── PasswordResetToken.java
│   ├── UserRole.java
│   └── repository/
│       ├── AppUserPort.java                    ← CORREGIDO (+ count())
│       ├── AuthSessionPort.java               ← CORREGIDO (+ atomic deactivate)
│       ├── AuthorizedDevicePort.java
│       ├── AuthAuditLogPort.java
│       ├── PasswordResetTokenPort.java
│       └── AuthCompanyPort.java
├── dto/
│   ├── LoginRequest.java
│   ├── LoginResponse.java
│   ├── LoginResult.java
│   ├── RefreshRequest.java
│   ├── LogoutRequest.java
│   ├── PasswordResetRequest.java
│   ├── PasswordResetConfirmRequest.java
│   ├── AuthUserResponse.java
│   ├── SessionInfoResponse.java
│   ├── DeviceInfoResponse.java
│   ├── DeviceDecisionRequest.java
│   ├── OfflineLeaseResponse.java
│   ├── ProfileResponse.java
│   └── UpdateProfileRequest.java
├── infrastructure/
│   ├── controller/
│   │   ├── AuthController.java                 ← CORREGIDO (Secure flag + AppUserPort)
│   │   └── AuthAuditController.java (PENDING)
│   └── persistence/
│       ├── AppUserRepository.java
│       ├── AppUserJpaAdapter.java              ← CORREGIDO (+ count())
│       ├── AuthSessionRepository.java          ← CORREGIDO (+ atomic query)
│       ├── AuthSessionJpaAdapter.java          ← CORREGIDO (+ atomic deactivate)
│       ├── AuthorizedDeviceRepository.java
│       ├── AuthorizedDeviceJpaAdapter.java
│       ├── PasswordResetTokenRepository.java
│       ├── PasswordResetTokenJpaAdapter.java
│       ├── AuthAuditLogRepository.java
│       └── AuthAuditLogJpaAdapter.java
└── security/
    ├── JwtTokenService.java                    ← CORREGIDO (+ auth_time, nbf)
    ├── JwtAuthFilter.java
    ├── PasswordHashService.java
    ├── SecurityUtils.java
    ├── RolePermissions.java
    ├── TenantContext.java
    └── AuthPrincipal.java
```

---

## JWT Claims (Post-Correction)

### Access Token
```json
{
  "sub": "uuid-userId",
  "iat": 1234567890,
  "nbf": 1234567890,
  "exp": 1234568790,
  "auth_time": 1234567890,
  "cid": "uuid-companyId",
  "sid": "uuid-sessionId",
  "email": "user@example.com",
  "role": "ADMIN",
  "permissions": ["tickets:emitir", "cobros:registrar"]
}
```

### Refresh Token
```json
{
  "sub": "uuid-userId",
  "iat": 1234567890,
  "exp": 1234567890,
  "sid": "uuid-sessionId",
  "jti": "uuid-unique-per-token",
  "typ": "refresh"
}
```

---

## State Machine: Refresh Token Lifecycle

```
  CREATED (login)
     │
     │  Token stored in DB as SHA-256 hash
     │  active = true
     ▼
  VALID
     │
     ├── Refresh request arrives ──► Atomic UPDATE deactivate
     │                                   │
     │                              ┌────┴────┐
     │                              │         │
     │                         1 row affected   0 rows affected
     │                              │         │
     │                         ┌────┘         └────┐
     │                         ▼                   ▼
     │                    NEW TOKEN          THEFT DETECTED
     │                    CREATED             (log AUDIT)
     │                         │                   │
     │                         ▼                   ▼
     │                    VALID                REVOKED
     │
     ├── Expiration ──► REVOKED (refresh_expires_at)
     │
     └── Manual revoke ──► REVOKED (logout / admin)
```

---

## Token Storage Matrix (Corrected v2)

| Dato | Web Browser | Tauri Desktop | Backend DB | Redis (future) |
|------|-------------|---------------|------------|----------------|
| Access Token JWT | httpOnly cookie | httpOnly cookie | NOT stored | ❌ |
| Refresh Token JWT | httpOnly cookie | httpOnly cookie | SHA-256 hash | ❌ |
| Session ID | Memory (Zustand) | Memory + Keychain | auth_sessions.id | ❌ |
| User profile | Memory (Zustand) | Memory + Keychain (JSON) | app_user | ❌ |
| Permissions | Memory (Zustand) | Memory + SQLCipher | role_permissions (code) | ❌ |
| Company/Tenant | Memory (Zustand) | Memory + Keychain | companies | ❌ |
| Device ID | localStorage (safeUUID) | SQLite local_settings | authorized_devices | ❌ |
| Offline Lease | N/A | SQLCipher | Generated at login | ❌ |
| Fingerprint hash | Not stored | Not stored | SHA-256 hash | ❌ |
| Password hash | ❌ | bcrypt hash (offline-only) | BCrypt(12) | ❌ |
| DB key (SQLCipher) | N/A | OS Keychain | N/A | ❌ |
| Preferences/Theme | localStorage | SQLite local_settings | companies.theme_json | ❌ |
| SQLCipher data | N/A | SQLCipher encrypted DB | N/A | ❌ |
| Rate limit counters | N/A | N/A | N/A | Bucket4j (P3) |
| Perm version cache | N/A | N/A | N/A | 5-min TTL (P3) |
| Token blacklist | N/A | N/A | N/A | JTI blacklist (P3) |

**LEGEND:**
- ✅ = Implemented and correct
- 🔴 = Needs fixing (was wrong in audit)
- ❌ = Not applicable
- (P3) = Planned for Phase 3

---

## Refresh Rotation — Race Condition Fix (Implemented)

### BEFORE (vulnerable):
```java
// Two concurrent requests BOTH see active=true
AuthSession current = repo.findByRefreshJtiAndActiveTrue(jti).orElseThrow();
current.setActive(false);
repo.save(current);  // Both save, one overwrites the other
AuthSession rotated = new AuthSession();
rotated = repo.save(rotated);  // Two sessions created!
```

### AFTER (atomic):
```java
// Atomic: only ONE request can deactivate the session
int deactivated = repo.deactivateIfRefreshHashMatches(id, hash, now);
if (deactivated == 0) {
    // Token already rotated = theft detected
    log.warn("Refresh replay detected: jti={}", jti);
    throw 401;
}
// Safe to create new session — old one is atomically deactivated
AuthSession rotated = new AuthSession();
rotated = repo.save(rotated);
```

---

## Cookie Security (Implemented)

```java
// BEFORE: cookies without Secure flag
"; HttpOnly; SameSite=Strict; Path=/"

// AFTER: Secure flag added in production
"; HttpOnly; SameSite=Strict; Path=/; Secure"
// (conditional based on active Spring profile)
```

---

## Hexagonal Violations Fixed

| Service | BEFORE | AFTER |
|---------|--------|-------|
| `LoginUseCaseImpl` | Injected `AppUserRepository` (JPA) | Injects `AppUserPort` (port) |
| `PasswordResetManagementService` | Injected `AppUserRepository` (JPA) | Injects `AppUserPort` (port) |
| `AuthController` | Injected `AppUserRepository` for count() | Uses `AppUserPort.count()` |

---

## Pending Improvements (Phase 3)

1. **Offline lease HMAC signing**: Server signs `{userId, deviceId, sessionId, expiresAt}` with HMAC-SHA256. Desktop verifies before accepting.
2. **auth_audit_log.metadata_json → JSONB**: Migration to enable GIN indexing and JSON path queries.
3. **company_id denormalization**: Add `company_id` directly to `auth_sessions`, `password_reset_tokens`, `auth_audit_log` to avoid RLS JOINs.
4. **Duplicate auth storage files**: Consolidate `lib/services/auth-storage*` and `features/auth/services/auth-storage*` into one canonical location.
5. **Distributed rate limiting**: Replace Bucket4j in-memory with Redis + Lua.
6. **Concurrent session limits**: Tier-based max sessions per user.
7. **Remember Me**: Add `rememberMe` field to LoginRequest + extended refresh TTL.
