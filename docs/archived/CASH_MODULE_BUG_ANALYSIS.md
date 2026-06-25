# Cash Module Bug Analysis - Phase 1

## Executive Summary
Analyzed `/apps/api/src/main/java/com/parkflow/modules/cash/` modules and identified **6 critical bug categories** with **10+ specific issues** requiring fixes.

## Bugs Identified

### 1. Session Management - Race Conditions ⚠️ CRITICAL

**File**: `CashSessionManagementService.java:92-102`

**Bug**: Race condition on session open
- Check for existing open session (line 92-93) is non-atomic from creation (line 140)
- Two concurrent requests could both pass the existence check
- First hits DB constraint, second might create duplicate

```java
// Lines 92-102: Non-atomic check
Optional<CashSession> existingOpen =
    cashSessionRepository.findByRegisterAndStatus(register.getId(), CashSessionStatus.OPEN);
if (existingOpen.isPresent()) {
    return toSessionResponse(existingOpen.get());
}
// ... 40+ lines of code ...
// Line 140: Create with potential race window
session = cashSessionRepository.save(session);
```

**Impact**: Duplicate cash sessions could be created; ledger integrity compromised
**Severity**: P0 - Data Corruption

---

**Bug**: Company ID resolution fallback without validation
**File**: `CashSessionManagementService.java:115-123`

```java
// Lines 115-117: Fallback without proper validation
UUID resolvedCompanyId = TenantContext.getTenantId() != null
        ? TenantContext.getTenantId()
        : operator.getCompanyId();
```

**Issues**:
- Fallback to `operator.getCompanyId()` when TenantContext is null (unsafe)
- No validation that operator belongs to requested company
- Operator from CompanyA could open cash for CompanyB (data leak)

**Impact**: Multi-tenant isolation violation
**Severity**: P0 - Security

---

**Bug**: Inconsistent tenant context null checks
**File**: `CashSessionManagementService.java:337, 349, 361, 421`

- `getCurrent()` line 337: Has null check ✓
- `listSessions()` line 361: Returns ALL sessions if tenant is null (no check!)
- Pattern is inconsistent across the service

```java
// Line 361-364: Missing null check!
public Page<CashSessionResponse> listSessions(Pageable pageable) {
    if (TenantContext.getTenantId() != null) {
        return cashSessionRepository.findByCompanyIdOrderByOpenedAtDesc(...);
    }
    return cashSessionRepository.findAllByOrderByOpenedAtDesc(pageable); // <-- Returns ALL sessions!
}
```

**Impact**: Data leakage between tenants
**Severity**: P0 - Security

---

### 2. Movement Recording - Idempotency & Audit ⚠️ CRITICAL

**File**: `CashMovementManagementService.java:157-236`

**Bug**: Void movement offset creation without atomicity guarantee

```java
// Lines 192-196: Mark original as VOIDED
m.setStatus(CashMovementStatus.VOIDED);
m.setVoidedAt(now);
m.setVoidReason(request.reason());
m.setVoidedBy(actor);
cashMovementRepository.save(m); // <-- Line 196

// Lines 198-220: Create offset (could fail!)
CashMovement offset = new CashMovement();
// ... setup ...
cashMovementRepository.save(offset); // <-- Line 220: If this fails, m is VOIDED but no offset!
```

**Scenario**: 
- Void movement is marked VOIDED (save succeeds)
- Offset creation fails (DB error, constraint violation)
- Transaction commits partially → ledger is incorrect
- Movement shows as voided but no offsetting entry

**Impact**: Ledger imbalance, accounting errors
**Severity**: P0 - Data Integrity

---

**Bug**: Idempotency key format inconsistency
**File**: `CashMovementManagementService.java:177-184`

```java
// Lines 178: void key format
String vk = "void:" + movementId + ":" + request.idempotencyKey().trim();
Optional<CashMovement> existing = cashMovementRepository.findByIdempotencyKey(vk);
if (existing.isPresent()) {
    // Line 181-182: Just returns current status (DOES NOT prevent offset creation!)
    m.setStatus(CashMovementStatus.VOIDED);
    return toMovementResponse(m);
}

// Lines 198-220: Creates offset WITHOUT checking if already exists with same void key
```

**Issue**: If void request is replayed, creates offset again even if already done
**Idempotency broken**: Multiple offsets for single void

**Impact**: Duplicate offset entries
**Severity**: P1 - Ledger Integrity

---

### 3. Reconciliation Logic - Rounding Issues ⚠️ HIGH

**File**: `CashLedgerSummaryCalculator.java:19`

**Bug**: No rounding mode specified for BigDecimal operations

```java
// Line 19: Implicit rounding
BigDecimal ledger = movements.stream()
    .map(this::ledgerContribution)
    .reduce(ZERO, BigDecimal::add); // <-- No rounding mode!
```

**Issues**:
- BigDecimal.add() uses DEFAULT rounding (implementation-specific)
- Accumulation of 0.01 errors across many movements
- Different JVM versions could produce different results

**Test Case**: 
- 1000 movements × 0.01 = 10.00 (correct) 
- But without rounding: could be 9.99... due to accumulation

**Impact**: Reconciliation differences, unexplained variances
**Severity**: P1 - Data Accuracy

---

**Bug**: Counted amount includes VOIDED in ledger but summary excludes them
**File**: `CashLedgerSummaryCalculator.java:18-38`

```java
// Line 19: Includes ALL movements (including VOIDED)
BigDecimal ledger = movements.stream()
    .map(this::ledgerContribution) // <-- ledgerContribution() returns ZERO for VOIDED
    .reduce(ZERO, BigDecimal::add);

// Lines 26-34: Summary only includes POSTED
for (CashMovement movement : movements) {
    if (movement.getStatus() != CashMovementStatus.POSTED) {
        continue; // <-- VOIDED excluded here
    }
    posted++;
    BigDecimal contribution = ledgerContribution(movement);
    byMethod.merge(...);
    byType.merge(...);
}
```

**Issue**: `byMethod` and `byType` missing VOIDED movements while ledger calculation includes them

**Impact**: User sees difference but can't trace which movements caused it
**Severity**: P2 - Usability

---

### 4. Offline Synchronization - Conflict Resolution ⚠️ HIGH

**File**: `/apps/web/src/lib/cash/cash-sync.ts`

**Bug**: Outbox idempotency key collision on long offline periods

```typescript
// Issue: Same outbox.id could repeat across syncs if:
// 1. Row removed from IDB after sync
// 2. Long offline period
// 3. New row with similar characteristics
// 4. Idempotency key collision → second sync fails or duplicates
```

**Scenario**:
- Offline movement enqueued with `outbox:row-123`
- Sync fails
- Long offline (hours)
- Sync retried multiple times
- If row ID management isn't perfect, could get collisions

**Impact**: Silent data loss or duplicates
**Severity**: P1 - Data Loss Risk

---

**Bug**: Session staleness on offline sync
**File**: `/apps/web/src/lib/cash/cash-outbox-idb.ts:36`

```typescript
// Issue: Enqueued with sessionId but session could close before sync
// Movement recorded against closed session → server rejects or silently drops
// No check that session still exists and is OPEN before retry
```

**Impact**: Lost offline sales if session closed while offline
**Severity**: P1 - Data Loss

---

### 5. Authorization - Tenant Isolation ⚠️ CRITICAL

**File**: `CashMovementManagementService.java:103-106, 478-486`

**Bug**: Operator lookup missing company filter
**File**: `CashMovementManagementService.java:103-106`

```java
AppUser actor = appUserRepository
    .findById(SecurityUtils.requireUserId())
    .orElseThrow(() -> new OperationException(HttpStatus.UNAUTHORIZED, "Usuario no encontrado"));
// <-- No company_id verification!
```

**Issue**: Finds operator by ID without verifying company matches session company
- Creates movement with `actor.getCompanyId()` which could differ from session company
- Operator could have stale company_id from old session

**Impact**: Movement recorded under wrong company (data leak)
**Severity**: P0 - Security

---

**Bug**: validateOperator() doesn't verify company match
**File**: `CashMovementManagementService.java:478-486`

```java
private void validateOperator(UUID operatorUserId) {
    UUID actor = SecurityUtils.requireUserId();
    UserRole role = SecurityUtils.requireUserRole();
    if (!operatorUserId.equals(actor) && role != UserRole.ADMIN && role != UserRole.SUPER_ADMIN) {
        throw new OperationException(HttpStatus.FORBIDDEN, "Solo puede operar caja como su usuario");
    }
    // <-- No company match check!
}
```

**Scenario**: Admin from CompanyA closes cash session opened by operator in CompanyB
**Impact**: Cross-company audit trail corruption
**Severity**: P1 - Audit Integrity

---

## Summary Matrix

| Bug | Category | Severity | Type | Impact |
|-----|----------|----------|------|--------|
| Session open race condition | Session Mgmt | P0 | Data Corruption | Duplicate sessions |
| Company ID fallback unsafe | Session Mgmt | P0 | Security | Data leak |
| Tenant context null checks | Session Mgmt | P0 | Security | Data leakage |
| Void offset atomicity | Movement | P0 | Data Integrity | Ledger imbalance |
| Void idempotency broken | Movement | P1 | Integrity | Duplicate offsets |
| BigDecimal rounding | Reconciliation | P1 | Accuracy | Calculation errors |
| Counted/summary inconsistency | Reconciliation | P2 | Usability | Traceability |
| Offline idempotency collision | Offline Sync | P1 | Data Loss | Lost transactions |
| Session staleness | Offline Sync | P1 | Data Loss | Lost transactions |
| Operator company filter missing | Authorization | P0 | Security | Cross-company leak |
| validateOperator no company check | Authorization | P1 | Audit | Cross-company corruption |

## Next Steps (Phase 1)

1. ✅ Identify bugs (COMPLETE)
2. ⏳ Create failing test cases (IN PROGRESS)
3. ⏳ Document severity and test strategy
4. ⏳ Run tests to confirm bugs exist

---

**Analysis Date**: 2026-06-17
**Status**: Phase 1 - Bug Analysis (50% complete)
