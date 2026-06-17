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

**Current Work**: [Onboarding-to-Configuration Editability](/.claude/plans/necesito-que-me-hagas-moonlit-kite.md)

**Scope**: Make all onboarding-created settings fully editable via configuracion UI

**Phases**:
1. ✅ Phase 1: Backend - Add 5 new API endpoints (COMPLETE - 6/6/2026)
2. ✅ Phase 2: Frontend - Hybrid navigation model (COMPLETE - 6/6/2026)
3. ✅ Phase 3: Validation - Data integrity (COMPLETE - Design & Strategy)
4. ✅ Phase 4: Testing - Verification plan created (In Progress - Manual Testing)

**Compilation Status**:
- ✅ Backend: Build SUCCESSFUL (0 errors)
- ✅ Frontend: Build SUCCESSFUL (0 errors)
- ⚠️ Tests: 21 integration tests (8 need review for response body validation)
- 🟢 Servers: Both running (Web: 6001/6002, API: 6011)

---

## Development Rules & Practices

### Code Quality & Standards

1. **Before Committing**:
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

3. **Hexagonal Architecture** (Backend Only):
   - Use existing pattern: `domain/` + `application/service/` + `infrastructure/controller/`
   - Example: `/modules/configuration/` has `domain/`, `application/service/`, `controller/`
   - DO NOT create new root folders; reuse existing `/modules/` structure

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

6. **Frontend** (Next.js + TypeScript + HeroUI):
   - Use HeroUI components (Button, Select, Input, Alert, Badge, etc.)
   - Patterns: Check `/apps/web/src/components/config/` for configuration UI examples
   - API calls: Use functions in `/lib/settings-api.ts` or create new in `/lib/`
   - State: Use React hooks (`useState`, `useEffect`); no external state management yet
   - Error handling: Show `<Alert variant="destructive">` with user-friendly message
   - Loading: Show spinner via HeroUI `<Spinner />`

---

## MCP Integration

### Tools Available

**Search**: Use for codebase exploration
- Command: `search_symbol "ClassName"` or `search_codebase "pattern"`
- When: Finding existing implementations before creating new code

**HeroUI**: Use for UI component lookup
- Command: Search HeroUI docs or existing usage in `/apps/web/src/components/`
- When: Building configuration pages (Button, Select, Input, Toggle, Slider, etc.)

**Connect**: Use for external API documentation
- Command: Fetch API specs or integration docs
- When: Integrating with external services (not typical for ParkFlow backend)

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

### DO NOT
- ❌ Create new @ConfigurationProperties; reuse existing ones
- ❌ Hardcode values; use environment variables or `application.yml`
- ❌ Mix hexagonal layers; keep domain → service → controller separation
- ❌ Leave TODOs in code; fix or document in code review comment
- ❌ Skip tests; every endpoint must have integration test

### DO
- ✅ Follow existing code patterns in the module you're editing
- ✅ Reuse existing DTOs/exceptions before creating new ones
- ✅ Add `@Operation` + `@ApiResponse` to Swagger docs
- ✅ Log important operations via `AuditLogService`
- ✅ Test error cases (validation, 409 conflicts, 404 not found, etc.)
- ✅ Use existing utility classes (`BeanMapper`, `ValidationUtil`, etc.)

---

## When You Get Stuck

1. **Backend**: Check `/apps/api/src/main/java/com/parkflow/modules/configuration/controller/` for similar endpoints (e.g., `ConfigurationRateController`)
2. **Frontend**: Check `/apps/web/src/app/(dashboard)/configuracion/` for similar pages (e.g., `/sedes/page.tsx`)
3. **Database**: Check `/apps/api/src/main/resources/db/migration/V001__initial_schema.sql` for table structure
4. **Tests**: Check `/apps/api/src/test/java/com/parkflow/controller/` for test patterns

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

**Last Updated**: 2026-06-16 | **Plan**: Onboarding-to-Configuration Editability
