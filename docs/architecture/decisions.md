# Architecture Decision Records (ADRs)

**Format:** Architecture Decision Records (Nygard, 2011)  
**Scope:** ParkFlow Backend & Infrastructure  
**Latest Update:** 27 de junio de 2026

---

## ADR-001: Monorepo Architecture (pnpm workspaces)

**Status:** ✅ IMPLEMENTED & ENFORCED  
**Date:** 2026-04-01  
**Author:** Platform Team

### Context

ParkFlow has three distinct applications: Desktop (Tauri), Web (Next.js), API (Spring Boot). Originally considered separate repositories but unified development needed coordination.

### Decision

Use a **monorepo with pnpm workspaces** rather than separate git repositories.

### Rationale

- **Single version source:** All apps share same semantic version (e.g., v1.2.3)
- **Coordinated releases:** Changes across apps can be tested together before release
- **Shared dependencies:** Common packages (@parkflow/config, @parkflow/types) centralized
- **CI/CD simplification:** One build pipeline, not three separate ones
- **Developer experience:** Change one thing, test everything in one place

### Alternatives Considered

1. **Multi-repo (separate git repos):** Simpler isolation but complex version coordination
2. **Monolith (single app):** Not applicable; desktop and web are fundamentally different

### Consequences

- ✅ Unified CI/CD pipeline
- ✅ Shared configuration (@parkflow/config)
- ✅ Easier to refactor cross-app concerns
- ⚠️ Larger git repository
- ⚠️ Requires discipline to avoid circular deps

### Implementation

```
pnpm-workspace.yaml
apps/
  ├── api/
  ├── web/
  ├── desktop/
  └── print-agent/
packages/
  ├── config/     (shared eslint, tsconfig, vitest)
  └── types/      (shared TS types)
```

### Review Schedule

Q4 2026 or after 100+ developers join team.

---

## ADR-002: Hexagonal Architecture (Backend)

**Status:** ✅ IMPLEMENTED & ENFORCED (17/17 modules)  
**Date:** 2026-05-15  
**Author:** Backend Team

### Context

Initial backend had mixed concerns: controllers with business logic, services directly accessing database, hard to test.

### Decision

**All modules MUST follow hexagonal architecture:**
- Domain layer (pure business logic, no frameworks)
- Application layer (ports define contracts)
- Infrastructure layer (JPA adapters, controllers, config)

### Rationale

- **Testability:** Domain logic tests run without Spring
- **Dependency inversion:** Services don't know if repository is JPA or REST
- **Clarity:** Each layer has one job; easy to understand
- **Refactoring:** Swap implementations without changing business logic

### Alternatives Considered

1. **Layered (traditional):** Simpler initially, but harder to test
2. **Vertical slicing:** Matches business, but requires discipline
3. **CQRS:** More complex, only for read-heavy systems

### Consequences

- ✅ Testable business logic
- ✅ Clear layer responsibilities
- ✅ Easy to understand for new developers
- ⚠️ More interfaces/classes initially (more files)
- ⚠️ Developers must understand port concept

### Implementation

```
modules/parking/
├── domain/
│   ├── ParkingSession.java
│   └── exception/
├── application/
│   ├── port/in/    (input ports: EntryUseCase, ExitUseCase)
│   ├── port/out/   (output ports: SessionRepositoryPort)
│   └── service/    (implementations)
└── infrastructure/
    ├── controller/ (REST endpoints)
    └── persistence/ (JPA adapters)
```

### Enforcement

- Code review checks: no god services (>5 methods), no field injection, ports exist
- Pre-commit hooks validate structure
- Documentation in HEXAGONAL_STRUCTURE.md, ANTIPATTERNS.md

### References

- [HEXAGONAL_STRUCTURE.md](HEXAGONAL_STRUCTURE.md)
- [ANTIPATTERNS.md](ANTIPATTERNS.md)
- [HEXAGONAL_PORTS.md](HEXAGONAL_PORTS.md)

---

## ADR-003: DTOs Consolidation (common module)

**Status:** ✅ IMPLEMENTED  
**Date:** 2026-06-24  
**Author:** Architecture Team

### Context

13 different request/response DTOs were duplicated across modules (RateResponse in 5 places, CashSessionResponse in 4 places, etc.).

### Decision

**Centralize shared DTOs in `/common/dto/` module.** Module-specific DTOs stay local.

### Rationale

- **Single source of truth:** RateResponse defined once
- **Avoid sync issues:** Change price field → auto-propagated
- **Easier evolution:** Add fields without hunting 5 files
- **API contract clarity:** Client sees canonical response structure

### Alternatives Considered

1. **Keep DTOs in each module:** Freedom, but duplicate definitions
2. **Use Jackson polymorphism:** Too complex for this scale

### Consequences

- ✅ No more duplicate DTOs
- ✅ Easier to maintain API contracts
- ⚠️ common module grows (now 1 module instead of 0)
- ⚠️ Circular dep risk (carefully managed)

### Shared DTOs (13 total)

- RateResponse, RateRequest
- CashSessionResponse, CashMovementResponse
- ParkingSessionResponse, ReceiptResponse, PaymentEntryResponse
- InvoiceResponse, InvoiceItemResponse
- LicenseResponse
- AuditLogResponse
- ErrorResponse

### Implementation

```
common/dto/
├── RateResponse.java
├── CashSessionResponse.java
├── ParkingSessionResponse.java
├── InvoiceResponse.java
└── ... (13 total)
```

### References

- [COMMON_DTOS.md](COMMON_DTOS.md)

---

## ADR-004: Multi-Tenant with Row-Level Security (PostgreSQL RLS)

**Status:** ✅ IMPLEMENTED  
**Date:** 2026-04-15  
**Author:** Data Team

### Context

SaaS platform with multiple companies (tenants). Data isolation critical.

### Decision

**Use PostgreSQL Row-Level Security (RLS) policies** rather than application-level filtering.

### Rationale

- **Stronger isolation:** Database enforces filtering, not application code
- **Breach impact:** Data exfiltration only affects one tenant
- **Performance:** DB can optimize with RLS predicates
- **Simplicity:** No need to pass tenant_id everywhere in code

### Alternatives Considered

1. **Application-level filtering:** Cheaper, but risks forgotten filters → data leak
2. **Separate databases per tenant:** Most secure, but 10x cost for 10 tenants

### Consequences

- ✅ Automatic tenant isolation
- ✅ Safer against bugs (forgotten where clauses)
- ⚠️ Need to set `app.tenant_id` context on each request
- ⚠️ Must test RLS policies (no data = silent failure)

### Implementation

```sql
-- Example RLS policy
ALTER TABLE parking_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY rls_parking_sessions ON parking_sessions TO parkflow_app
USING (company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
```

**In Java:**
```java
@Component
public class TenantFilter extends OncePerRequestFilter {
    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain) {
        String tenantId = extractFromJWT(req);
        jdbcTemplate.update(
            "SELECT set_config('app.tenant_id', ?, false)",
            tenantId
        );
        // Request processed with RLS filter
    }
}
```

---

## ADR-005: No Service Facades (Single Responsibility per Service)

**Status:** ✅ ENFORCED IN CODE REVIEW  
**Date:** 2026-06-24  
**Author:** Architecture Team

### Context

Services were growing (CashSessionService: open, close, move, query, audit = 7 methods). Hard to test, confusing responsibilities.

### Decision

**Maximum 5 public methods per service. Split by use case.**

Examples:
- ❌ `CashSessionService` (all operations)
- ✅ `OpenCashSessionService` (1 method: open)
- ✅ `CloseCashSessionService` (1 method: close)
- ✅ `CashSessionQueryService` (3 methods: query operations)

### Rationale

- **Single Responsibility Principle:** Each service does one thing
- **Testing:** Mock fewer ports per test
- **Naming:** `OpenCashSessionService.open()` is clear vs generic `execute()`
- **Ports clarity:** Each service = one input port = one use case

### Alternatives Considered

1. **Facades (aggregate):** Grouping for convenience, but breaks SRP
2. **Unlimited methods:** Simpler structure, but confusing

### Consequences

- ✅ Clear, testable services
- ✅ Easy to understand what each service does
- ⚠️ More classes (might seem over-engineered)
- ⚠️ More ports to inject

### Enforcement

- Code review rejects services >5 public methods
- Pre-commit check counts methods

### References

- [ANTIPATTERNS.md](ANTIPATTERNS.md#service-design)
- [GOD_SERVICES_ROADMAP.md](GOD_SERVICES_ROADMAP.md)

---

## ADR-006: No Circular Module Dependencies

**Status:** ✅ ENFORCED  
**Date:** 2026-06-25  
**Author:** Architecture Team

### Context

Modules should not form cycles (A → B → A). Makes testing impossible, deployments risky.

### Decision

**Dependency graph MUST be acyclic (DAG).** Enforce via code review + automated checks.

### Dependency Hierarchy

```
auth (core)
  ↓
configuration, audit, licensing (depend only on auth)
  ↓
parking.operation (depends on auth, configuration)
  ↓
cash, billing, tickets (depend on parking.operation)
  ↓
sync, search, reports (read-only from multiple modules)
```

### Implementation

- Code review: Check imports in PR (no backward deps)
- ArchUnit tests: Verify hierarchy automatically
- Documentation: Dependency matrix in backend-modules.md

### References

- [backend-modules.md](backend-modules.md#-dependency-matrix)

---

## ADR-007: Deprecation Path for Settings → Configuration Endpoints

**Status:** ✅ IMPLEMENTED  
**Date:** 2026-06-24  
**Author:** API Team

### Context

Early API had `/api/v1/settings/*` endpoints. Renamed to `/api/v1/configuration/*` for clarity.

### Decision

**Both endpoints work during transition. Deprecate settings/* over 2 sprints.**

- **Sprint 4 (now):** Both work; `/settings/*` returns `X-Deprecated: true` header
- **Sprint 5:** Client warnings logged; `/settings/*` slower (not cached)
- **Sprint 6:** `/settings/*` removed; only `/configuration/*` available

### Rationale

- **Backward compat:** Existing clients still work
- **Gradual migration:** Developers can update at own pace
- **No breaking changes:** No client downtime

### Alternatives Considered

1. **Big bang:** Remove /settings/* immediately (breaks clients)
2. **Permanent dual:** Maintain both forever (confusing)

### References

- [api-modules.md](api-modules.md)
- Migration guide in CONTRIBUTING.md

---

## Decision Template (for future ADRs)

```markdown
## ADR-NNN: [Title]

**Status:** PROPOSED | ACCEPTED | DEPRECATED  
**Date:** YYYY-MM-DD  
**Author:** Name

### Context

Why is this decision needed?

### Decision

What is the decision?

### Rationale

Why this decision?

### Alternatives Considered

Other options?

### Consequences

What follows?

### References

Links to relevant docs.
```

---

**Last Review:** 27 de junio de 2026  
**Next ADR Expected:** Q3 2026 (god service decomposition, if triggered)
