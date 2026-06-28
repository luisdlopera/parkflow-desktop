# ParkFlow Development Guide for Claude

## Project Overview

**ParkFlow**: Hybrid offline-first parking management platform with:
- **Desktop** (Tauri): 100% autonomous parking operations
- **Web** (Next.js): Admin panel for configuration & management
- **API** (Spring Boot 3): Multi-tenant SaaS with sync, licensing, audit

**Monorepo Structure**:
```
apps/
  ├── api/          (Spring Boot 3, Java 21, Gradle)
  ├── web/          (Next.js, TypeScript, Tailwind + HeroUI)
  ├── desktop/      (Tauri 2, Rust)
  └── print-agent/  (Node.js, Fastify)
```

---

## Active Implementation Plan

**Current Work**: [Production Consolidation](/.claude/plans/act-a-como-un-staff-floating-starfish.md) — **SUBSTANTIALLY COMPLETE**

> [!WARNING]
> **Hexagonal Architecture Status:** 
> Contrary to previous claims, the backend is NOT 100% compliant. Controllers have been moved to `infrastructure/controller/`, but `port/in` and `port/out` interfaces are still missing in 10 modules (audit, billing, customers, licensing, parking/locker, parking/spaces, search, support, sync, tickets). "God Services" (>200 lines) also remain to be decomposed (see `docs/REFACTOR_GOD_SERVICES.md`).

**Scope**: Production-ready consolidation — eliminate debt, consolidate schemas, ensure integrity

### ✅ ALL PHASES COMPLETED (8 commits total)

**Phase 1: Blockers Críticos** ✅ (Commit: b0e296e9)
- Resolved V012/V014 migration conflict (V014 deleted - referenced non-existent columns)
- Created V018: FK for cash_session, cash_movement → companies
- Added @Valid validation to 3 controllers (ConfigurationRate, ConfigurationUser, LicenseSupport)
- Documented API endpoint decision: `/api/v1/configuration/*` canonical (deprecate `/api/v1/settings/*`)

**Phase 2: Integridad Referencial** ✅ (Commit: 0a5372b5)
- Created V019: Enable RLS on 10 critical multi-tenant tables (payment, vehicle, rate, etc.)
- Created V020: Verify monthly_contract refactor integrity post-V015
- Created V021: Consolidate payment_methods to per-company model (eliminate global/hybrid)

**Phase 3: Deuda Técnica Arquitectónica** ✅ (3 commits)
- 3.1 ✅ Consolidated Rate entity: Eliminated ConfigRate duplicate (e1b1a99b)
  - Single canonical Rate in parking/operation/domain
  - Updated all imports in RatePort, RateJpaAdapter, RateFraction, etc.
- 3.2 ✅ Consolidated 13 DTOs to common module (73e99fbb)
  - Moved from settings/dto → common/dto
  - Updated imports across 40+ files in configuration, settings, cash, parking, licensing
  - Removed duplicate DTO files from settings/dto
- 3.3 ⏳ Deferred: Extract controller logic (minor, non-blocking)
- 3.4 ⏳ Deferred: Standardize authorization (documented decision, implementation pending)

**Phase 4: Limpieza & Producción** ✅ (3 commits)
- ✅ 4.3: Added @SQLRestriction to Vehicle soft delete (70e1442b)
- ✅ 4.1: Created V022 migration to DROP deprecated columns (410391b0)
  - Removes: app_user.site/terminal, parking_session.site/site_code/lane/booth/terminal, rate.site, cash_register.site
- ✅ 4.4: Introduced CentralizedAuditService (ef2abcce)
  - Single point for audit logging across modules
  - Roadmap to eliminate 500+ lines of duplicated audit code

**Compilation Status**:
- ✅ **Backend: Build SUCCESSFUL (0 errors)** - 8 commits
- ✅ **Frontend: Build SUCCESSFUL (0 errors)**
- ✅ **Migrations: 6 new** (V018-V023 plus custom)
- ✅ **JPA Entities**: Rate consolidated, Vehicle soft-delete fixed
- ✅ **Controllers**: Validations added, imports updated
- ✅ **DTOs**: Centralized to common/dto module

**Production Readiness Checklist**:
- ✅ 4/4 Critical blockers resolved
- ✅ 10/10 Multi-tenant tables have RLS protection
- ✅ 0 Duplicate entities (Rate consolidated)
- ✅ 13/13 DTOs in single location (common)
- ✅ 0 Breaking changes to API (deprecation path documented)
- ⏳ Audit module adoption by all submodules (roadmap created)
- ⏳ Authorization standardization (documented, implementation ready)

---

### API Endpoint Consolidation Decision

**Decision**: **CANONICAL: `/api/v1/configuration/*`** (deprecated `/api/v1/settings/*` over 2 sprints)

**Rationale**:
- `configuration/*` is more specific and aligns with domain language
- `settings/*` is deprecated legacy pattern from early sprints
- Both currently share DTOs; will consolidate in Phase 3
- Auth: migrate all to AUTHORITY-based (granular) vs ROLE-based (simple)

**Deprecation Timeline**:
- Sprint 4 (now): Both endpoints work; `X-Deprecated: true` header on `/settings/*`
- Sprint 5: Client warnings logged; gradual migration to `/configuration/*`
- Sprint 6: `/settings/*` endpoints removed; clients must use `/configuration/*`

**Affected Resources**:
- `rates`: `/api/v1/settings/rates` → `/api/v1/configuration/rates`
- `users`: `/api/v1/settings/users` → `/api/v1/configuration/users`
- `vehicle-types`: `/api/v1/settings/vehicle-types` → `/api/v1/configuration/vehicle-types`

---

## Database Migration Strategy (POST-SQUASH)

**Timeline**: Migrations consolidated 2026-06-26 (38 migrations → 1 baseline)

### Current Migration State

- **V001__initial_schema.sql** — Complete schema baseline (2,493 lines)
  - 84 tables, 136 indexes, 17 RLS policies
  - Squashed from V001-V039 (37 files deleted, history preserved)
  - Immutable once committed
  
- **V040+** — Incremental migrations (add new features here)

### Developer Workflow: Adding a Database Change

**For a new table/column/index**, follow this pattern:

```bash
# 1. Create migration file (determine next version)
cd apps/api/src/main/resources/db/migration
V_NEXT=$(ls | grep '^V[0-9]' | sort -V | tail -1 | sed 's/V0*\([0-9]*\).*/\1/' | awk '{print $1+1}')

cat > V${V_NEXT}__feature_name.sql << 'EOF'
-- Add feature: description here
-- Reason: why this change is needed
-- Date: 2026-06-27

-- For new table (multi-tenant example):
CREATE TABLE feature (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    company_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    CONSTRAINT feature_pkey PRIMARY KEY (id),
    CONSTRAINT fk_feature_company FOREIGN KEY (company_id) 
        REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX idx_feature_company ON feature(company_id);

-- For multi-tenant table: ALWAYS add RLS
ALTER TABLE feature ENABLE ROW LEVEL SECURITY;

CREATE POLICY rls_feature ON feature TO parkflow_app
USING (company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- For existing table (add column example):
-- ALTER TABLE some_table ADD COLUMN new_col VARCHAR(100);
-- CREATE INDEX idx_some_table_new_col ON some_table(new_col);
EOF

# 2. Test on fresh database
pnpm db:down && pnpm db:up  # Removes volumes
cd apps/api && ./gradlew flywayMigrate

# 3. Verify with API
./gradlew bootRun
# Should see: "Started ParkflowApiApplication in X.XXX seconds"
# No Hibernate validation errors

# 4. Commit
git add src/main/resources/db/migration/V${V_NEXT}__feature_name.sql
git commit -m "feat(db): add feature table with RLS"
```

### ⚠️ CRITICAL RULES

**DO:**
- ✅ Test every migration on a clean database (`pnpm db:down -v` removes volumes)
- ✅ Add RLS policies to all multi-tenant tables (see Multi-Tenant Checklist below)
- ✅ Add indexes on foreign keys and filter columns
- ✅ Use IF NOT EXISTS for idempotent operations (create index, create extension)
- ✅ Comment migrations explaining the "why"

**DON'T:**
- ❌ Modify V001 after it's committed (immutable baseline)
- ❌ Delete or rename Flyway migration files (breaks checksum history)
- ❌ Skip RLS on multi-tenant tables
- ❌ Use raw SQL in Java code (migrations are the source of truth)
- ❌ Run migrations manually via psql (Flyway must track them)

### Multi-Tenant Checklist for New Tables

When creating a new table, verify:
- [ ] Column `company_id UUID NOT NULL` exists
- [ ] Foreign key: `CONSTRAINT fk_<table>_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE`
- [ ] Index: `CREATE INDEX idx_<table>_company ON <table>(company_id)`
- [ ] RLS enabled: `ALTER TABLE <table> ENABLE ROW LEVEL SECURITY`
- [ ] RLS policy: 
  ```sql
  CREATE POLICY rls_<table> ON <table> TO parkflow_app
  USING (company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  ```

### Disaster Recovery

**If a migration fails:**
```bash
# 1. Revert the commit
git revert <commit-hash>

# 2. Fix the migration file locally
vim src/main/resources/db/migration/V040__feature.sql

# 3. Completely wipe database (volumes)
pnpm db:down -v && pnpm db:up

# 4. Test again
cd apps/api && ./gradlew flywayMigrate

# 5. Commit the fix
git commit -m "fix(db): correct V040 syntax error"
```

**If someone modifies V001 (NEVER do this):**
```bash
# Revert to committed version
git checkout apps/api/src/main/resources/db/migration/V001__initial_schema.sql

# Repair Flyway checksum
cd apps/api && ./gradlew flywayRepair
```

---

## Architectural Standards (ENFORCE BY REVIEW)

### ✅ Hexagonal Architecture — MANDATORY STRUCTURE

**Every backend module MUST have this exact structure** (no exceptions, no deviations):

```
modules/<module-name>/
├── application/
│   ├── usecase/                      (Grouped by business capability)
│   │   ├── <feature>UseCase.java
│   │   └── <feature>Service.java      (Only if CRUD is simple; else group in usecase/)
│   ├── port/
│   │   ├── in/                        (Input ports - use case interfaces)
│   │   │   └── <Feature>PortIn.java
│   │   └── out/                       (Output ports - repository/service contracts)
│   │       └── <Feature>RepositoryPort.java
│   └── dto/                           (Application DTOs - shared across layers)
├── domain/
│   ├── <bounded-context-1>/           (e.g., rate/, vehicle/, payment/)
│   │   ├── <Entity>.java
│   │   ├── <ValueObject>.java
│   │   └── <DomainService>.java       (RARE: only cross-entity domain logic)
│   ├── exception/
│   │   ├── <DomainException>.java
│   │   └── <ValidationException>.java
│   └── shared/                        (Module-level constants, enums, validators)
├── infrastructure/
│   ├── controller/                    (HTTP REST endpoints)
│   │   ├── <Feature>Controller.java
│   │   └── <Feature>ControllerAdvice.java (if module-specific error handling)
│   ├── persistence/                   (JPA repositories + adapters)
│   │   ├── <Entity>JpaRepository.java
│   │   ├── <Entity>RepositoryAdapter.java (implements RepositoryPort)
│   │   └── mapper/
│   │       └── <Entity>Mapper.java
│   ├── event/                         (Event handlers, publishers)
│   │   ├── <DomainEvent>Handler.java
│   │   └── <DomainEvent>Publisher.java
│   └── config/
│       └── <Module>Config.java        (Module-specific Spring config)
└── test/                              (Unit + integration tests mirroring structure)
```

**Naming Conventions**:
- ✅ Controllers: `<Feature>Controller` (not `<Feature>Rest`, `<Feature>Api`)
- ✅ Services: `<Feature>Service` (not `<Feature>Manager`, `<Feature>Handler`)
- ✅ Use Cases: `<Feature>UseCase` (for domain-specific operations)
- ✅ Repositories: `<Entity>JpaRepository` + `<Entity>RepositoryAdapter`
- ✅ Ports (Input): `<Feature>PortIn` (interface for use cases)
- ✅ Ports (Output): `<Feature>RepositoryPort` (interface for persistence)
- ✅ Events: `<DomainEvent>` (e.g., `VehicleRegisteredEvent`)

**Prohibited Patterns**:
- ❌ NO `presentation/` layer (use `infrastructure/controller/`)
- ❌ NO `service/` directory at module root (consolidate into `application/usecase/`)
- ❌ NO `*FacadeService` classes (use individual Use Cases instead)
- ❌ NO `repository/` at module root (use `infrastructure/persistence/`)
- ❌ NO `util/` or `helper/` (these belong in specific layers or `/common/`)
- ❌ NO `<module>/usecase/` files that bypass hexagonal layers
- ❌ NO multi-method facades aggregating multiple business flows

### ✅ Service Decomposition — SIZE LIMITS & FACADE PROHIBITION

**MANDATORY: NO Facades in application layer.** Use focused Use Cases instead.

**Single Service MUST have ≤5 public methods** (else split into multiple services by use case):

❌ **Facade Anti-Pattern (STRICTLY PROHIBITED)**:
```java
// ❌ WRONG: Facade aggregates multiple business flows
@Service
public class CashSessionFacadeService {
    public CashSessionResponse openSession(...) { }
    public CashSessionResponse closeSession(...) { }
    public CashSessionResponse submitCount(...) { }
    public CashSessionResponse getSession(...) { }
    public Page<CashSessionResponse> listSessions(...) { }
    public CashSummaryResponse getSummary(...) { }
    public List<CashAuditEntry> getAuditTrail(...) { }  // 7 methods - GOD SERVICE!
}
```

**Why**: Facades violate hexagonal architecture by:
- Mixing multiple input ports into one class
- Hiding clear entry points to the system
- Making unit testing harder (can't test use cases in isolation)
- Violating Single Responsibility Principle

❌ **God Service Anti-Pattern**:
```java
// ❌ BAD: ConfigurationService has 12+ methods (rates, users, vehicles, themes, etc.)
@Service
public class ConfigurationService {
    public Rate createRate(CreateRateRequest req) { ... }
    public Rate updateRate(String id, UpdateRateRequest req) { ... }
    public void deleteRate(String id) { ... }
    public User createUser(CreateUserRequest req) { ... }
    public User updateUser(String id, UpdateUserRequest req) { ... }
    public VehicleType createVehicleType(CreateVehicleTypeRequest req) { ... }
    // ... 6 more methods
}
```

✅ **Correct Pattern: Individual Use Cases (Hexagonal Architecture)**:
```java
// ✅ GOOD: Each use case = 1 clear entry point (input port)

// Port definition
public interface OpenCashSessionUseCase {
    CashSessionResponse open(OpenCashRequest request);
}

public interface CloseCashSessionUseCase {
    CashSessionResponse close(UUID sessionId, CashCloseRequest request);
}

public interface QueryCashSessionUseCase {
    CashSessionResponse getSession(UUID sessionId);
    CashSessionResponse getCurrent(String site, String terminal);
    Page<CashSessionResponse> listSessions(Pageable pageable);
}

// Service implementations (1 use case per service)
@Service
public class OpenCashSessionService implements OpenCashSessionUseCase {
    public CashSessionResponse open(OpenCashRequest request) { ... }
}

@Service
public class CloseCashSessionService implements CloseCashSessionUseCase {
    public CashSessionResponse close(UUID sessionId, CashCloseRequest request) { ... }
}

@Service
public class CashSessionQueryService implements QueryCashSessionUseCase {
    public CashSessionResponse getSession(UUID sessionId) { ... }
    public CashSessionResponse getCurrent(String site, String terminal) { ... }
    public Page<CashSessionResponse> listSessions(Pageable pageable) { ... }
}

@Service
public class VehicleTypeManagementService {
    public VehicleType createVehicleType(CreateVehicleTypeRequest req) { ... }
    public VehicleType updateVehicleType(String id, UpdateVehicleTypeRequest req) { ... }
    public void deleteVehicleType(String id) { ... }
    public VehicleType getVehicleType(String id) { ... }
}
```

**Service Responsibility Matrix** (max services per module):
| Module | Current | Max Allowed | Breakdown |
|--------|---------|-------------|-----------|
| **configuration** | 12 | 5 | RateManagement, VehicleTypeManagement, PaymentMethodManagement, ThemeManagement, ParkingSiteManagement |
| **parking.operation** | 23 | 5 | SessionManagement, CheckoutProcessing, RateCalculation, ValidationService, AuditService |
| **cash** | 8 | 3 | CashSessionManagement, MovementRegistration, CashQuery |
| **licensing** | 6 | 3 | LicenseValidation, LicenseActivation, LicenseQuery |
| **auth** | 4 | 3 | AuthenticationService, AuthorizationService, TokenService |

### ✅ Module Completeness Checklist

**Before committing ANY new module, verify**:
- [ ] ✅ `application/usecase/` exists with ≤5 methods per service
- [ ] ✅ `application/port/in/` defined (input port interfaces)
- [ ] ✅ `application/port/out/` defined (output port interfaces for persistence)
- [ ] ✅ `domain/` has entities + bounded context subfolders
- [ ] ✅ `infrastructure/controller/` has REST endpoints
- [ ] ✅ `infrastructure/persistence/` has JPA repositories + adapters
- [ ] ✅ All DTOs centralized in `<module>/dto/` or `/apps/api/src/main/java/com/parkflow/common/dto/`
- [ ] ✅ `test/` mirrors application structure
- [ ] ✅ No `service/` directory at module root
- [ ] ✅ All imports reference canonical paths (no cross-cutting exceptions)

### ✅ Defensive Validation — 3-Layer Pattern (MANDATORY)

**Problem Solved**: Data corruption, security vulnerabilities, ghost data silently persisted

**Pattern**: Every user input must be validated at **3 layers** — frontend, backend, database. No layer trusts the others.

**Layer 1: Frontend (React/TypeScript)**
- ✅ Input validation in components + state management
- ✅ Conditional field visibility based on rules
- ✅ Visual error messages shown to user
- ✅ Example: `onboarding-logic.ts` case 3 validates all Step 3 fields
- ❌ DO NOT rely only on frontend validation (can be bypassed via network tab)

**Layer 2: Backend (Spring/Java)**
- ✅ Field-level validation in dedicated `*Validator` class
- ✅ Whitelist of permitted fields (prevents mass assignment)
- ✅ Type validation + range checking (e.g., `0 ≤ monetary_value ≤ 9_999_999`)
- ✅ Example: `Step3DataValidator` validates 19 permitted fields for onboarding Step 3
- ✅ Reject with `HttpStatus.BAD_REQUEST` + descriptive error message
- ❌ DO NOT trust frontend validation; validate server-side defensively

**Layer 3: Database (PostgreSQL)**
- ✅ Constraints (CHECK, FK, UNIQUE) enforce invariants
- ✅ NOT NULL constraints prevent nullable ghost data
- ✅ Enum validation via CHECK constraint (e.g., `rate_type IN ('HOURLY', 'DAILY', ...)`)
- ✅ Example: V040 migration ensures `RateType.FRACTIONAL` is in DB constraint
- ❌ DO NOT skip DB constraints as a "performance optimization"

**Validator Class Pattern** (Backend):
```java
@Component
public class Step3DataValidator {
  // Define whitelist of permitted fields
  private static final Set<String> PERMITTED_FIELDS = Set.of(...);
  private static final int MAX_RATE_VALUE = 9_999_999;
  
  // Validate and sanitize input
  public ValidationResult validate(Map<String, Object> rawData) {
    Map<String, String> errors = new HashMap<>();
    Map<String, Object> sanitized = new HashMap<>();
    
    for (Map.Entry entry : rawData.entrySet()) {
      if (!PERMITTED_FIELDS.contains(entry.getKey())) {
        log.warn("Ignoring non-whitelisted field '{}'", entry.getKey());
        continue; // S-03: Mass assignment prevention
      }
      // Field-specific validation...
    }
    return new ValidationResult(isValid, errors, sanitized);
  }
}
```

**Integration in Service**:
```java
@Transactional
public OnboardingStatusResponse saveOnboardingStep(UUID companyId, int step, Map<String, Object> data) {
  // Step 3 validation
  if (step == 3) {
    Step3DataValidator.ValidationResult result = step3DataValidator.validate(data);
    if (!result.isValid) {
      throw new OperationException(HttpStatus.BAD_REQUEST, buildErrorMessage(result.errors));
    }
  }
  // Proceed with sanitized data only
  Map<String, Object> sanitized = settingsMapper.sanitizeStepDataByPlan(company, step, data);
  ...
}
```

**When Adding New User Input**:
1. Define `*Validator` class with whitelist + field validations
2. Integrate into service `validateStepData()` or equivalent
3. Add DB constraint (CHECK or FK) matching backend enum/range
4. Frontend shows conditional errors (`stepErrors.fieldName`)
5. All 3 layers aligned = defense in depth

---

## Development Rules & Practices

### Code Quality & Standards

1. **File Organization**:
   - ❌ DO NOT create `.md` files in project root
   - ✅ DO place all documentation in `/docs/` folder
   - ✅ Reference docs via relative paths: `[docs/VERIFICATION_PLAN.md](docs/VERIFICATION_PLAN.md)`

2. **Before Committing** ⚠️ **MANDATORY CHECKLIST**:
   - [ ] **Validation Check** (if user input accepted):
     - [ ] Frontend: Conditional field visibility + error messages shown in JSX
     - [ ] Frontend: All fields in validation logic (onboarding-logic.ts or equivalent)
     - [ ] Backend: Dedicated `*Validator` class created (whitelist + field validation)
     - [ ] Backend: Validator integrated in service (`validateStepData`, etc.)
     - [ ] Database: CHECK constraint added to DB migration for enums/ranges
     - [ ] All 3 layers aligned (frontend validation ≈ backend validation ≈ DB constraint)
   - [ ] **Architecture Check** (Backend Only):
     - [ ] No new `service/` directories at module root
     - [ ] All services have ≤5 public methods
     - [ ] `infrastructure/controller/` used (not `presentation/`)
     - [ ] `port/out/` defined for persistence contracts
   - [ ] **Frontend Check**:
     - [ ] All new routes have `loading.tsx` and `error.tsx`
     - [ ] No `shadow-*` or `drop-shadow-*` utilities used
     - [ ] No new files in `src/lib/hooks/` (consolidate into `src/hooks/`)
   - [ ] **General Checks**:
     - [ ] Run `pnpm validate` (API build + tests + web build)
     - [ ] Run `pnpm test` for changed modules
     - [ ] No console.errors, warnings, or TODOs left behind
     - [ ] Code follows existing patterns in module (don't introduce new patterns)

2. **After Each Feature Implementation**:
   - [ ] **BUILD**: Verify no compilation errors
     - Backend: `gradle build` from `/apps/api`
     - Frontend: `pnpm build:web` from `/apps/web`
   - [ ] **TEST**: Run relevant tests
     - Backend: `gradle test` for module
     - Frontend: `pnpm test:web`
   - [ ] **VERIFY**: Smoke test in dev environment
     - Backend: Check `/actuator/health` endpoint returns 200
     - Frontend: Open page in browser, check no console errors

2.5. **Testing & Technical Debt — MANDATORY**:
   - [ ] **Write tests WHILE implementing**: Not after. Every new method/component needs test coverage.
   - [ ] **All tests MUST PASS before committing**: Zero failing tests allowed. `gradle test` must be 100% green.
   - [ ] **No technical debt introduced**:
     - ❌ DO NOT commit code with known issues, hacks, or `TODO` comments
     - ❌ DO NOT add features that create god services or violate hexagonal architecture
     - ❌ DO NOT duplicate code—consolidate or extract helpers
     - ❌ DO NOT leave console.errors, warnings, or unhandled promise rejections
   - [ ] **Cleanup BEFORE committing**:
     - Remove all `console.log`, `debugger`, `TODO`, `FIXME` statements
     - Fix all TypeScript/linter warnings
     - Remove commented-out code
   - [ ] **If you find debt in existing code, fix it NOW**—don't defer it. It compounds exponentially.

3. **Hexagonal Architecture** (Backend Only):
   - **MANDATORY**: Follow the standardized structure defined above
   - Example: `/modules/configuration/` MUST have `application/usecase/`, `domain/`, `infrastructure/controller/`
   - **ENFORCEMENT**: Code review MUST check for god services (>5 methods), non-canonical layer names, missing ports
   - DO NOT create new root folders; reuse existing `/modules/` structure
   - **DO NOT** create `service/` at module root level (violates hexagonal pattern)

4. **API Endpoints**:
   - Follow REST conventions: `PATCH /api/v1/resource/{id}` for updates
   - Use `@RequestBody` for DTOs, never inline primitive types
   - Return standardized `ApiResponse<T>` or entity
   - Document with `@Operation` + `@ApiResponse` annotations (Springdoc OpenAPI)

5. **Database**:
   - NO raw SQL; use JPA repositories + Spring Data
   - Foreign key cascades validated in migration
   - Audit fields: `created_at`, `updated_at` auto-populated via `@PrePersist`, `@PreUpdate`
   - Migrations: Use Flyway; immutable once deployed (v1.0+)

6. **Frontend** (Next.js + TypeScript + HeroUI v3):
   - **MANDATORY: Always use HeroUI v3 components from `@heroui/react`** (NOT bridge wrappers for new UI)
     - Button, Select, Popover, Badge, Checkbox, Input, DatePicker, Table, Modal, etc.
   - **MANDATORY: Use HeroUI MCP BEFORE building any UI** — query available components and their exact props/API first
     - When uncertain about component usage, props, or variants → use `mcp__heroui-react__get_component_docs`
     - When searching for the right component → use `mcp__heroui-react__list_components`
     - This prevents building with wrong assumptions about component API
   - Use HeroUI **compound component pattern** (e.g., `<Popover>` → `<Popover.Content>` → `<Popover.Dialog>`)
   - Patterns: Check `/apps/web/src/components/config/` for configuration UI examples
   - API calls: Use functions in `/lib/settings-api.ts` or create new in `/lib/`
   - State: Use React hooks (`useState`, `useEffect`); no external state management yet
   - Error handling: Show `<Alert variant="destructive">` with user-friendly message
   - Loading: Show spinner via HeroUI `<Spinner />`

---

## Frontend Route Requirements

### Loading & Error States — MANDATORY PER ROUTE

**Every new route segment MUST have both files**:

```
app/(dashboard)/new-feature/
├── page.tsx                  (Client component)
├── loading.tsx               ✅ REQUIRED
├── error.tsx                 ✅ REQUIRED
└── layout.tsx                (Optional, only if route has children)
```

**Issues Found (Must Fix for 100/100)**
1.  **Missing `loading.tsx` in 10 routes**:
    -   Routes: `(auth)/login/`, `change-password/`, `forgot-password/`, `reset-password/`, `onboarding/`, `(admin)/admin/audits/`, facturacion children
    -   Impact: No skeleton/spinner states, feels slow to users
    -   Fix: Add simple loading.tsx per route (~1 hour total)

2.  **Missing `error.tsx` in 2 routes**:
    -   Routes: `(dashboard)/support/`, `(dashboard)/support/inbox/`
    -   Impact: Network errors crash page without fallback UI
    -   Fix: Add error.tsx per route (~20 mins total)

**loading.tsx template**:
```tsx
import { Skeleton } from "@heroui/react";

export default function Loading() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-8 w-48 rounded-lg" />
      <Skeleton className="h-60 w-full rounded-lg" />
    </div>
  );
}
```

**error.tsx template**:
```tsx
"use client";

import { useEffect } from "react";
import { Alert } from "@heroui/react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="space-y-4 p-6">
      <Alert
        variant="destructive"
        title="Error al cargar la página"
        description={error.message || "Intenta recargar la página"}
      />
      <button onClick={reset}>Reintentar</button>
    </div>
  );
}
```

**Checklist before committing**:
- [ ] New route has `loading.tsx`
- [ ] New route has `error.tsx`
- [ ] Layouts/Parents also have error boundaries (no orphaned routes)
- [ ] **No `shadow-*` or `drop-shadow-*` utilities used** (2 components: `DashboardPageClient.tsx:98`, `ScrollToTopButton.tsx:46`)

---

## Monorepo Configuration DRY Rules

### Shared Configuration Module — MANDATORY

**Problem**: Each app duplicates `eslint.config.mjs`, `playwright.config.ts`, `tsconfig.json`

**Standard**: Create `/packages/config/` with shared base configs

```
packages/config/
├── package.json              (Exported as @parkflow/config)
├── eslint.config.mjs         (Base config, web-specific overrides exist)
├── tsconfig.base.json        (Shared TypeScript base)
├── vitest.config.base.ts     (Shared test setup)
└── playwright.config.base.ts (Shared Playwright base)
```

**Rules**:
- ✅ Each app extends from `/packages/config/` base
- ✅ App-specific overrides in `/apps/<app>/<config-file>`
- ❌ NO duplication of full config files (3x Playwright → 1x base + 3x extends)
- ❌ NO `eslint.config.mjs` at app root that doesn't extend from `@parkflow/config`

**Before committing**:
- [ ] Config files in `/apps/<app>/` extend from `@parkflow/config`
- [ ] No Playwright/eslint/vitest triplicate (use one source of truth)
- [ ] All `.json` configs use `"extends"` or `"$schema"` from package

---

## Frontend Architecture Rules (Post-Audit — 2026-06-18)

Estas reglas provienen de una auditoría completa del frontend. Están en vigor y NO deben revertirse.

### Hooks — Ubicación Canónica

- ✅ Hooks globales van en `src/hooks/` (NO en `src/lib/hooks/` — ese directorio fue eliminado)
- ✅ Hooks de feature van en `src/features/<feature>/hooks/`
- ❌ NO crear `src/lib/hooks/` — fue consolidado en `src/hooks/` en la auditoría
- ❌ NO instalar `use-debounce` npm — usar el hook local `src/hooks/useDebounce.ts`

### BASE_URL de la API

- ✅ Usar siempre `src/lib/api/config.ts` para las URLs base:
  ```ts
  import { apiBase, authBase, opsBase, cfgBase } from "@/lib/api/config";
  ```
- ❌ NO definir `process.env.NEXT_PUBLIC_API_URL` inline en servicios
- ❌ NO crear nuevas variables de entorno de URL — todo deriva de `NEXT_PUBLIC_API_URL`

### Páginas de Configuración (CRUD estándar)

- ✅ Usar el hook `useConfigCrud<T>` de `src/hooks/useConfigCrud.ts` para páginas con patrón DataTable + FormDrawer
- ✅ Páginas que YA usan `useConfigCrud`: metodos-pago, fracciones, sedes, cajas, impresoras
- ❌ NO reimplementar `useState` manual para `rows`, `loading`, `error`, `drawerOpen`, `editing` — eso es exactamente lo que `useConfigCrud` encapsula
- ⚠️ Excepciones válidas (NO usar `useConfigCrud`): `espacios` (status machine + capacity), `lockers` (batch creation), `operacion` (single PUT sin tabla)

### Operaciones Asíncronas

- ✅ Usar `useAsyncAction` de `src/lib/errors/useAsyncAction.ts` para eliminar el patrón repetitivo try/catch/toast/setState
- ❌ NO duplicar el bloque:
  ```ts
  // ❌ PATRÓN A ELIMINAR
  setLoading(true);
  try { ... toast.success(...) } catch (e) { toast.error(...) } finally { setLoading(false) }
  ```

### Error y Loading por Ruta

- ✅ Toda nueva route segment debe incluir `error.tsx` y `loading.tsx`
- ✅ Rutas que YA tienen estos archivos: `(dashboard)/`, `(dashboard)/configuracion/`, `(admin)/admin/`
- ❌ NO dejar rutas nuevas sin `error.tsx` — un error de red rompe la página completa sin él

### Metadata de Página (SEO / títulos)

- ✅ `generateMetadata` solo funciona en Server Components (layouts sin `"use client"`)
- ✅ Usar el template del root layout: `title: { template: "%s | ParkFlow" }` — solo pasar el título de la sección
- ❌ NO intentar `export const metadata` en archivos con `"use client"` — TypeScript no lo impide pero Next.js lo ignora silenciosamente

### Imágenes

- ❌ NO cambiar el `<img>` en `BrandingSection.tsx` a `next/image` — tiene `// eslint-disable-next-line @next/next/no-img-element` intencional porque la app usa `output: "export"` (no hay servidor de imágenes) y las URLs son dinámicas del usuario

### Wrappers de HeroUI

- ✅ Los wrappers en `src/components/ui/` se mantienen durante HeroUI v3 Beta por estabilidad de tipos
- ❌ NO eliminar wrappers — existen para absorber los `as any` casts necesarios por la API inestable de v3 Beta
- ❌ NO agregar nuevos wrappers pass-through sin lógica propia — solo wrappear si agrega comportamiento real

### Tokens de Sesión

- ⚠️ Los tokens de sesión están en `localStorage` (conocido, pendiente de migrar a httpOnly cookies)
- ❌ NO agregar más datos sensibles a `localStorage`
- ❌ NO mover tokens a sessionStorage como "fix" — la migración correcta requiere coordinación con el backend (Spring Boot emitiendo `Set-Cookie: HttpOnly`)

### Archivos Basura

- ❌ NO commitear archivos `.bak`, `.orig`, o copias de seguridad — fueron eliminados en la auditoría
- ❌ NO usar `.catch(console.error)` en código de producción — manejar errores con `useAsyncAction` o `toast.error`

7. **UI Visual Style**:
   - 🚫 **STRICTLY NO BOX SHADOWS**: (`shadow-*`, `shadow-sm`, `shadow-md`, `drop-shadow-*`) anywhere in the UI.
   - 🚫 Do not use shadows for ANY component (Cards, Inputs, Selects, Modals, etc.).
   - ✅ Use thin borders instead: `border border-slate-200` (or `border-default-200`) for cards, inputs, panels.
   - ✅ Elevation via `border` + subtle `bg-*` background contrast, never shadow.
   - ✅ All color pickers and pickers: use HeroUI `ColorPicker`, `ColorArea`, `ColorSlider`, `ColorField`
   - ✅ Consistent border radius: `rounded-xl` for cards, `rounded-lg` for inputs/buttons

---

## MCP Integration

### Tools Available

**Search**: Use for codebase exploration
- Command: `search_symbol "ClassName"` or `search_codebase "pattern"`
- When: Finding existing implementations before creating new code

**HeroUI MCP** ⚠️ **ALWAYS USE BEFORE BUILDING UI**:
- **Mandatory**: Check available components and their exact props before implementing any frontend feature
- Use the HeroUI MCP tool to look up components (ColorPicker, DatePicker, DataTable, Modal, etc.)
- Available components include: `ColorPicker`, `ColorArea`, `ColorSlider`, `ColorField`, `ColorSwatch`, `Popover`, `Tooltip`, `Modal`, `Drawer`, `Select`, `Autocomplete`, `DatePicker`, `DateRangePicker`, `Slider`, `Switch`, `Chip`, `Badge`, `Avatar`, `Progress`, `Spinner`, `Skeleton`, `Accordion`, `Tabs`, `Pagination`, `Table`, and many more
- All HeroUI v3 components are available in `@heroui/react` — check before adding third-party alternatives

**Connect**: Use for external API documentation
- Command: Fetch API specs or integration docs
- When: Integrating with external services (not typical for ParkFlow backend)

---

## First-Time Setup Checklist

**Run this ONCE before first development session:**

```bash
# 1. Create environment files from templates
cd /Users/luisdlopera/Documents/projects/cv/parkflow-desktop
cp .env.example .env 2>/dev/null || echo "✅ .env exists"
cd apps/web && cp .env.example .env 2>/dev/null || echo "✅ web/.env exists"
cd ../api && cp .env.example .env 2>/dev/null || echo "✅ api/.env exists"

# 2. Verify .env has seed password (for database seeding)
grep "PARKFLOW_SEED_ADMIN_PASSWORD=Qwert.12345" /Users/luisdlopera/Documents/projects/cv/parkflow-desktop/.env && echo "✅ Seed password set"

# 3. Start fresh database
cd /Users/luisdlopera/Documents/projects/cv/parkflow-desktop
pnpm db:down 2>/dev/null || true
pnpm db:up

# 4. Start API (runs migrations + seed)
cd apps/api && ./gradlew bootRun &
sleep 20  # Wait for migrations

# 5. Verify seed worked (test login)
curl -s POST http://localhost:6011/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@parkflow.local",
    "password": "Qwert.12345",
    "deviceId": "dev-device-001",
    "deviceName": "Development Workstation",
    "platform": "desktop",
    "fingerprint": "dev-fingerprint-001"
  }' | grep -q '"sessionId"' && echo "✅ Login works" || echo "❌ Login failed"

# 6. Start web dev server
cd apps/web && pnpm dev
# Opens http://localhost:6001
```

**Troubleshooting**:
- If seed fails: `pnpm db:down` then `pnpm db:up` to reset
- If login fails: Verify password in `.env` matches what backend is using
- If web can't start: `rm -rf .next && pnpm dev`

---

## Build & Test Verification Workflow

### After Every Implementation ⚠️ **MANDATORY**

```bash
# Step 1: Build Backend (if Java changed)
cd apps/api
gradle clean build --no-build-cache
# ✅ Success: No compilation errors, all tests pass

# Step 2: Build Frontend (if TypeScript/React changed)
cd apps/web
pnpm build
# ✅ Success: No type errors, no console warnings

# Step 3: Run Smoke Tests
# Backend: Check health
curl http://localhost:6011/actuator/health
# ✅ Response: {"status":"UP"}

# Frontend: Open in browser
open http://localhost:6001
# ✅ Check: No console errors, page renders

# Step 4: Test Coverage (if new endpoints/components)
# Backend module tests:
gradle test --tests "*ConfigurationControllerTest"
# ✅ All tests pass

# Frontend component tests:
pnpm test:web --grep "configuracion"
# ✅ All tests pass
```

### Quick Commands Reference

```bash
# Full validation (run before PR)
pnpm validate

# Backend only
cd apps/api && gradle build && gradle test

# Frontend only
cd apps/web && pnpm build && pnpm test:web

# Dev servers (parallel terminals)
pnpm dev:api      # Terminal 1
pnpm dev:web      # Terminal 2
pnpm dev:desktop  # Terminal 3 (optional)

# Database
pnpm db:up        # Start PostgreSQL
pnpm db:down      # Stop PostgreSQL
```

### Pre-Commit Verification Script

**Run this BEFORE every commit to catch architectural issues**:

```bash
#!/bin/bash
set -e

echo "🔍 Pre-Commit Architecture Verification..."

# Backend: Check for god services (> 5 public methods)
echo "✓ Checking for god services..."
if find apps/api/src/main/java/com/parkflow/modules -name "*.java" -type f | \
   xargs grep -l "public [^ ]* [^ ]*(" | \
   xargs wc -l | awk '$1 > 200 { print; exit 1 }'; then
  echo "  ✅ No obvious god services detected"
else
  echo "  ⚠️  Warning: Some service files are large; review for decomposition"
fi

# Backend: Check for prohibited patterns
echo "✓ Checking for prohibited patterns..."
PROHIBITED=(
  "modules/[^/]*/service/" \
  "modules/[^/]*/presentation/" \
  "modules/[^/]*/repository/$" \
)
for pattern in "${PROHIBITED[@]}"; do
  if find apps/api/src/main/java/com/parkflow -type d -regex ".*$pattern"; then
    echo "  ❌ ERROR: Found prohibited directory pattern: $pattern"
    exit 1
  fi
done
echo "  ✅ No prohibited directory patterns found"

# Frontend: Check for new routes without loading.tsx/error.tsx
echo "✓ Checking Frontend route completeness..."
ROUTES=$(find apps/web/src/app -name "page.tsx" | sed 's|/page.tsx||')
for route in $ROUTES; do
  if [ ! -f "$route/loading.tsx" ] && [ ! -f "$(dirname $route)/loading.tsx" ]; then
    echo "  ⚠️  Warning: $route missing loading.tsx"
  fi
  if [ ! -f "$route/error.tsx" ] && [ ! -f "$(dirname $route)/error.tsx" ]; then
    echo "  ⚠️  Warning: $route missing error.tsx"
  fi
done
echo "  ✅ Route completeness check done (review warnings)"

# Frontend: Check for shadow utilities (STRICTLY FORBIDDEN)
echo "✓ Checking for shadow utilities..."
if grep -r "shadow-\|drop-shadow-" apps/web/src --include="*.tsx" --include="*.ts"; then
  echo "  ❌ ERROR: Found shadow utilities (STRICTLY FORBIDDEN per CLAUDE.md)"
  exit 1
else
  echo "  ✅ No shadow utilities found"
fi

# Frontend: Check for new files in src/lib/hooks/ (PROHIBITED)
if find apps/web/src/lib/hooks -type f -name "*.ts" -newer apps/web/package.json 2>/dev/null | grep -q .; then
  echo "  ❌ ERROR: New files in src/lib/hooks/ (consolidate into src/hooks/)"
  exit 1
else
  echo "  ✅ No new files in src/lib/hooks/"
fi

echo ""
echo "✅ Pre-commit verification PASSED"
echo ""
```

**To install as a git hook**:
```bash
mkdir -p .git/hooks
cp pre-commit-verify.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

---

---

## Implementation Checklist per Phase

### Phase 1: Backend (Starting Now)

**Goal**: Create 5 new API endpoints + validate existing ones

**Tasks**:
- [ ] Create `CapacityManagementController.java` + tests
- [ ] Create `ShiftConfigurationController.java` + tests
- [ ] Create `ModuleConfigurationController.java` + tests
- [ ] Create `RegionConfigurationController.java` + tests
- [ ] Create `HelmetHandlingController.java` + tests + validation
- [ ] Verify `ConfigurationPaymentMethodController.java` has DELETE endpoint
- [ ] Create integration test: `OnboardingConfigurationFlowTest.java`
- [ ] Run `gradle build` → ✅ MUST PASS
- [ ] Run `gradle test` → ✅ All tests pass

**Success Criteria**:
- ✅ All 5 endpoints compile and pass tests
- ✅ No warnings in console during `gradle build`
- ✅ Integration tests cover happy path + error cases
- ✅ Swagger docs show all new endpoints (`http://localhost:6011/swagger-ui/index.html`)

---

## File Locations Quick Reference

### Backend Modules
- **Configuration Module**: `/apps/api/src/main/java/com/parkflow/modules/configuration/`
  - Controllers: `controller/`
  - Services: `application/service/`
  - Domain: `domain/`
  - DTOs: `dto/`
- **Parking Module**: `/apps/api/src/main/java/com/parkflow/modules/parking/`
  - Locker: `locker/`
  - Spaces: `spaces/`
  - Operations: `operation/`
- **Onboarding**: `/apps/api/src/main/java/com/parkflow/modules/onboarding/`
  - Service: `application/service/OnboardingService.java`

### Frontend
- **Configuration Pages**: `/apps/web/src/app/(dashboard)/configuracion/`
- **Config Components**: `/apps/web/src/components/config/`
- **Settings API**: `/apps/web/src/lib/settings-api.ts`
- **HeroUI Components**: `/apps/web/src/components/ui/` (imported from `@heroui/react`)

### Database
- **Migrations**: `/apps/api/src/main/resources/db/migration/`
- **Current Schema**: `V001__initial_schema.sql` (consolidated baseline)

---

## Important Notes

### Backend DO NOT (STRICTLY ENFORCED)
- ❌ Create `service/` directory at module root (use `application/usecase/` or `application/service/`)
- ❌ Create service with >5 public methods (split by use case)
- ❌ Create `presentation/` layer (use `infrastructure/controller/`)
- ❌ Skip `port/out/` definitions (makes testing hard, violates hexagonal)
- ❌ Create new @ConfigurationProperties; reuse existing ones
- ❌ Hardcode values; use environment variables or `application.yml`
- ❌ Mix hexagonal layers; keep domain → service → controller separation
- ❌ Leave TODOs in code; fix or document in code review comment
- ❌ Skip tests; every endpoint must have integration test

### Frontend DO NOT (STRICTLY ENFORCED)
- ❌ Create new routes without `loading.tsx` and `error.tsx`
- ❌ Use `shadow-*` or `drop-shadow-*` utilities ANYWHERE (use `border` instead)
- ❌ Create files in `src/lib/hooks/` (consolidate into `src/hooks/`)
- ❌ Create duplicate API service functions (audit and consolidate)
- ❌ Leave tests orphaned (colocate with components/features)

### Monorepo DO NOT
- ❌ Duplicate config files (eslint, playwright, tsconfig) — extend from `/packages/config/`
- ❌ Create app-specific version of shared config — always extend from canonical source

### Backend DO (MANDATORY)
- ✅ Follow hexagonal architecture: `application/` → `domain/` ← `infrastructure/`
- ✅ Define input ports (`port/in/`) and output ports (`port/out/`)
- ✅ Group services by business capability (max 5 methods per service)
- ✅ Use canonical layer names: `application/usecase/`, `domain/`, `infrastructure/controller/`
- ✅ Follow existing code patterns in the module you're editing
- ✅ Reuse existing DTOs/exceptions before creating new ones
- ✅ Add `@Operation` + `@ApiResponse` to Swagger docs
- ✅ Log important operations via `AuditLogService`
- ✅ Test error cases (validation, 409 conflicts, 404 not found, etc.)
- ✅ Use existing utility classes (`BeanMapper`, `ValidationUtil`, etc.)

### Frontend DO (MANDATORY)
- ✅ Add `loading.tsx` and `error.tsx` to every new route segment
- ✅ Use `border border-default-200` for elevation, NEVER shadows
- ✅ Consolidate hooks into `src/hooks/` (global) or `src/features/<feature>/hooks/` (feature-specific)
- ✅ Colocate tests with components/features
- ✅ Use HeroUI MCP BEFORE building any UI component

---

## When You Get Stuck

### Backend Architecture Questions

1. **"Where should my service go?"**
   - Follow the hexagonal structure: `application/usecase/` (business logic) or `domain/` (cross-entity domain logic)
   - If unsure, check `/apps/api/src/main/java/com/parkflow/modules/configuration/` for the canonical pattern
   - **NEVER** create a `service/` directory at module root

2. **"Should I create a new service or add to existing?"**
   - New service if: handling a different business capability (e.g., RateManagement vs. VehicleTypeManagement)
   - Add to existing if: same capability, related operation
   - **HARD LIMIT**: 5 public methods per service → split if exceeded

3. **"How do I structure my application layer?"**
   - `application/usecase/` groups services by business capability
   - Each service has ≤5 public methods (single responsibility)
   - `application/port/in/` defines use case interfaces (contracts)
   - `application/port/out/` defines repository/external service contracts
   - Example: `/modules/configuration/application/usecase/RateManagementService.java`

4. **"What about domain logic?"**
   - Put in `domain/<bounded-context>/` (e.g., `domain/rate/`, `domain/vehicle/`)
   - Create `DomainService` ONLY for cross-entity logic (rare)
   - Most business logic lives in `application/usecase/` services

### Frontend Route Questions

1. **"Do I need loading.tsx and error.tsx?"**
   - ✅ **YES, ALWAYS** — every new route segment must have both
   - Use templates from "Frontend Route Requirements" section
   - Layouts can share error boundaries with children

2. **"Can I use shadow utilities?"**
   - ❌ **NO, STRICTLY FORBIDDEN** — use `border border-default-200` instead
   - See CLAUDE.md rule: "No box shadows"

### General Questions

1. **"Can I duplicate code?"**
   - ❌ Check `/apps/api/src/main/java/com/parkflow/modules/configuration/controller/` for similar patterns
   - ✅ Reuse existing DTOs, exceptions, and utilities before creating new ones

2. **"Where should tests go?"**
   - Backend: `/apps/api/src/test/java/com/parkflow/modules/<module>/` mirroring application structure
   - Frontend: colocate with components or in `/tests/` folder
   - **NEVER** skip integration tests for endpoints

---

## Commit Message Format

```
feat(api/configuration): add capacity management endpoint

- Add PATCH /api/v1/configuration/capacity endpoint
- Update ParkingSpaceService.resizeCapacity() for idempotency
- Add validation for capacity >= min required spaces
- Add integration test: OnboardingConfigurationFlowTest

Closes #issue-number (if applicable)
```

---

**Last Updated**: 2026-06-24 | **Audit**: Comprehensive Codebase Structure Analysis | **Enforcement**: Hexagonal Architecture Standardization + Pre-Commit Verification

### Summary of Changes (2026-06-24)

Added **mandatory architectural rules** to prevent future structural issues:

1. **Hexagonal Architecture Standardization** (Backend)
   - Exact directory structure for all modules
   - Size limits: ≤5 public methods per service
   - Prohibited patterns: `service/` at root, `presentation/`, missing `port/out/`
   - Module completeness checklist before commit

2. **Frontend Route Completeness** (Frontend)
   - All routes MUST have `loading.tsx` + `error.tsx`
   - Strict prohibition on shadow utilities
   - Rules for hooks organization

3. **Monorepo Configuration DRY**
   - No duplication of eslint/playwright/tsconfig
   - All apps extend from `/packages/config/`

4. **Pre-Commit Verification Script**
   - Automated checks for god services, prohibited patterns, route completeness
   - Can be installed as git hook

5. **Enhanced "When You Get Stuck"** section
   - Architecture decision trees for common questions
   - Canonical examples and patterns
