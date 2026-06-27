# Auth State Machine — Complete

> Each session has a lifecycle. This document defines all states and transitions.

---

## Session States

```
                    ┌──────────────────────────────────┐
                    │         UNAUTHENTICATED           │
                    │  (no session exists)              │
                    └────────────┬─────────────────────┘
                                 │
                          login(email, password,
                          deviceId, fingerprint)
                                 │
                                 ▼
                    ┌──────────────────────────────────┐
              ┌────►│         AUTHENTICATED             │◄───────────────────────────┐
              │     │  (session active, tokens valid)   │                            │
              │     └────────────┬─────────────────────┘                            │
              │                  │                                                   │
              │        ┌─────────┼──────────────┬─────────────────┐                 │
              │        │         │              │                 │                 │
              │        ▼         ▼              ▼                 ▼                 │
              │   access     refresh        logout()         password             │
              │   expires    rotation        manual          change()             │
              │        │         │              │                 │                 │
              │        ▼         ▼              │                 │                 │
              │  ┌──────────┐ ┌──────────┐      │                 │                 │
              │  │  REFRESH │ │REFRESHING│      │                 │                 │
              │  │  PENDING │ │ (atomic)  │      │                 │                 │
              │  └────┬─────┘ └────┬──────┘      │                 │                 │
              │       │            │             │                 │                 │
              │    refresh()    success          │                 │                 │
              │       │            │             │                 │                 │
              └───────┴────────────┘             │                 │                 │
                                                  │                 │                 │
                                                  ▼                 ▼                 │
                              ┌──────────────────────────┐   ┌─────────────┐        │
                              │      LOGGING_OUT         │   │ ALL_SESSIONS│        │
                              │  (backend revoke +       │   │  REVOKED   │        │
                              │   clear cookies)         │   │ (password  │        │
                              └────────────┬─────────────┘   │  change)   │        │
                                           │                 └──────┬──────┘        │
                                           ▼                        │               │
                              ┌──────────────────────┐              │               │
                              │   SESSION_EXPIRED    │              │               │
                              │  (auto-cleanup job)  │              │               │
                              └──────────┬───────────┘              │               │
                                         │                          │               │
                                         └──────────────────────────┘───────────────┘
                                                           (re-login required)
```

---

## Device States

```
                    ┌──────────────────────────────────┐
                    │       DEVICE_PENDING              │
                    │  (first login, needs auth)        │
                    └────────────┬─────────────────────┘
                                 │
                          admin authorizes
                                 │
                                 ▼
                    ┌──────────────────────────────────┐
              ┌────►│        DEVICE_AUTHORIZED          │
              │     │  (can create sessions)            │
              │     └────────────┬─────────────────────┘
              │                  │
              │           admin revokes
              │                  │
              │                  ▼
              │     ┌──────────────────────────────────┐
              │     │        DEVICE_REVOKED             │
              │     │  (sessions invalidated)           │
              │     └────────────┬─────────────────────┘
              │                  │
              │           admin authorizes again
              └──────────────────┘
```

---

## Offline State Machine (Desktop)

```
                    ┌─────────────────────────────────────┐
                    │            ONLINE                    │
                    │  (heartbeat OK, connected to API)   │
                    └────────────┬────────────────────────┘
                                 │
                          network_lost detected
                                 │
                                 ▼
                    ┌─────────────────────────────────────┐
                    │          OFFLINE_CHECKING            │
                    │  (is offline lease valid?)           │
                    └────────────┬────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
                    ▼                         ▼
    ┌─────────────────────────┐   ┌─────────────────────────┐
    │     OFFLINE_ACTIVE      │   │   OFFLINE_RESTRICTED    │
    │  (full operations)      │   │  (read-only, no writes) │
    │  lease valid            │   │  lease expired/expiring │
    └────────────┬────────────┘   └────────────┬────────────┘
                 │                              │
          online event                    online event
                 │                              │
                 ▼                              ▼
    ┌─────────────────────────────────────────────┐
    │              RECONNECTING                    │
    │  POST /auth/restore-session + sync queue    │
    └────────────┬────────────────────────────────┘
                 │
       ┌─────────┴──────────────┐
       │                        │
       ▼                        ▼
  ┌──────────┐            ┌──────────┐
  │ BACK TO  │            │ FORCED   │
  │ ONLINE   │            │ LOGOUT   │
  │          │            │ (session │
  │          │            │ revoked) │
  └──────────┘            └──────────┘
```

---

## Tenant Switch State Machine

```
                    ┌──────────────────────────────────────┐
                    │         SINGLE_TENANT                │
                    │  (user belongs to 1 company)         │
                    └────────────┬─────────────────────────┘
                                 │
                    POST /auth/switch-company {targetId}
                                 │
                                 ▼
                    ┌──────────────────────────────────────┐
                    │      TENANT_SWITCHING                │
                    │  (validate access to target)         │
                    └────────────┬─────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
                    ▼                         ▼
    ┌─────────────────────────┐   ┌─────────────────────────┐
    │    TENANT_SWITCHED      │   │    TENANT_SWITCH_FAILED │
    │  (new JWT with new cid) │   │  (no access, stay)      │
    │  new session created    │   │                         │
    │  broadcast to other tabs│   │                         │
    └────────────┬────────────┘   └─────────────────────────┘
                 │
                 ▼
    ┌─────────────────────────┐
    │     RECONFIGURING        │
    │  (reload tenant state)   │
    └────────────┬────────────┘
                 │
                 ▼
    ┌─────────────────────────┐
    │     AUTHENTICATED        │
    │  (new tenant context)    │
    └─────────────────────────┘
```

---

## Events Log (Audit Trail)

Every state transition MUST produce an audit event:

| Event | Trigger | Metadata |
|-------|---------|----------|
| `LOGIN_SUCCESS` | Email+password valid | sessionId, deviceId, fingerprint |
| `LOGIN_FAILED` | Invalid credentials | email, deviceId, reason |
| `LOGIN_BLOCKED` | Account locked | blockedUntil, attemptCount |
| `REFRESH` | Token rotated | oldJti, newJti, sessionId |
| `REFRESH_THEFT` | Replay detected | jti, sessionId, deviceId |
| `LOGOUT` | User logout | sessionId |
| `LOGOUT_ALL` | Logout all devices | sessionsRevoked count |
| `LOGOUT_DEVICE` | Device revoked | deviceId, sessionsRevoked |
| `PASSWORD_CHANGE` | Password updated | (no sensitive data) |
| `PASSWORD_RESET_REQUESTED` | Reset token generated | tokenId |
| `PASSWORD_RESET_COMPLETED` | Password changed via token | (no sensitive data) |
| `DEVICE_AUTHORIZED` | Admin authorizes device | deviceId |
| `DEVICE_REVOKED` | Admin revokes device | deviceId |
| `SESSION_EXPIRED` | Auto-cleanup | sessionId |
| `TENANT_SWITCH` | Company changed | oldCid, newCid |
| `OFFLINE_LEASE_GRANTED` | Login grants offline | leaseHours, expiresAt |
| `OFFLINE_SYNC_STARTED` | Reconnection begins | pendingOperations |
| `OFFLINE_SYNC_COMPLETED` | Sync finished | successCount, failCount |
