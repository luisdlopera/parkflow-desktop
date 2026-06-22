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

## Development Rules & Practices

### Code Quality & Standards

1. **File Organization**:
   - ❌ DO NOT create `.md` files in project root
   - ✅ DO place all documentation in `/docs/` folder
   - ✅ Reference docs via relative paths: `[docs/VERIFICATION_PLAN.md](docs/VERIFICATION_PLAN.md)`

2. **Before Committing**:
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

**Last Updated**: 2026-06-18 | **Plan**: Onboarding-to-Configuration Editability | **Audit**: Frontend arquitectura completa (Sprint 0–3 done)
