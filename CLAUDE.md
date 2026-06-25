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
- ❌ NO `service/` directory at module root (consolidate into `application/usecase/` or `application/service/`)
- ❌ NO `repository/` at module root (use `infrastructure/persistence/`)
- ❌ NO `util/` or `helper/` (these belong in specific layers or `/common/`)
- ❌ NO `<module>/service/` files that bypass hexagonal layers

### ✅ Service Decomposition — SIZE LIMITS

**Single Service MUST have ≤5 public methods** (else split into multiple services by use case):

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

✅ **Correct Pattern: Split by Use Case**:
```java
// ✅ GOOD: Focused services by business capability
@Service
public class RateManagementService {
    public Rate createRate(CreateRateRequest req) { ... }
    public Rate updateRate(String id, UpdateRateRequest req) { ... }
    public void deleteRate(String id) { ... }
    public Rate getRate(String id) { ... }
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

---

## Development Rules & Practices

### Code Quality & Standards

1. **File Organization**:
   - ❌ DO NOT create `.md` files in project root
   - ✅ DO place all documentation in `/docs/` folder
   - ✅ Reference docs via relative paths: `[docs/VERIFICATION_PLAN.md](docs/VERIFICATION_PLAN.md)`

2. **Before Committing** ⚠️ **MANDATORY CHECKLIST**:
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
