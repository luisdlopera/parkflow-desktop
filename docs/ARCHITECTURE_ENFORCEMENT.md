# Architecture Enforcement & Pre-Commit Verification

**Date**: 2026-06-24  
**Scope**: Backend, Frontend, Monorepo Configuration  
**Enforcement Level**: STRICT (Code Review + Pre-Commit Hook)

---

## Quick Reference: What's Forbidden?

### Backend ❌ DO NOT
| Pattern | Why | Fix |
|---------|-----|-----|
| `modules/<module>/service/` (at root) | Violates hexagonal; unclear layer | Move to `application/usecase/` |
| `modules/<module>/presentation/` | Wrong layer name for HTTP | Rename to `infrastructure/controller/` |
| Service with >5 public methods | God service (SRP violation) | Split by use case |
| Missing `port/out/` | Unclear dependencies | Define repository port interfaces |
| `@Service` with 12+ methods | Configuration, Parking.operation, Cash | Decompose into focused services |
| Dual `application/service/` AND `service/` | Confusing structure | Consolidate to one canonical location |

### Frontend ❌ DO NOT
| Pattern | Why | Fix |
|---------|-----|-----|
| New route without `loading.tsx` | No skeleton state → feels slow | Create template from CLAUDE.md |
| New route without `error.tsx` | Network errors crash page | Create template from CLAUDE.md |
| `shadow-*` or `drop-shadow-*` utilities | Design violation | Use `border border-default-200` |
| New files in `src/lib/hooks/` | Non-canonical location | Move to `src/hooks/` |
| Duplicate API functions | Code duplication (auth-api vs auth.api) | Consolidate into single module |

### Monorepo ❌ DO NOT
| Pattern | Why | Fix |
|---------|-----|-----|
| 3x `playwright.config.ts` (app + desktop + qa/e2e) | Configuration duplication | Create `/packages/config/`, extend from base |
| App-specific `eslint.config.mjs` that doesn't extend | Single source of truth broken | Extend from `@parkflow/config` |
| Unique `tsconfig.json` per app | TypeScript base inconsistent | Use shared base from `@parkflow/config` |

---

## Automated Enforcement: Pre-Commit Hook

### Setup (One-Time)

```bash
cd /Users/luisdlopera/Documents/projects/cv/parkflow-desktop

# Create hook script
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
set -e

echo "🔍 Pre-Commit Architecture Verification..."

# Check 1: Backend god services (rough heuristic: files >300 lines)
echo "✓ Checking backend services..."
LARGE_SERVICES=$(find apps/api/src/main/java/com/parkflow/modules -name "*Service.java" -type f -exec wc -l {} \; | awk '$1 > 300 {print $2}')
if [ -n "$LARGE_SERVICES" ]; then
  echo "  ⚠️  Large services detected (may be god services):"
  echo "$LARGE_SERVICES" | sed 's/^/     /'
  echo "  → Review and decompose if >5 public methods"
fi

# Check 2: Prohibited directory patterns
echo "✓ Checking for prohibited patterns..."
PROHIBITED_DIRS=$(find apps/api/src/main/java/com/parkflow/modules -type d -name "service" -o -type d -name "presentation" -o -type d -name "repository" | grep -v infrastructure)
if [ -n "$PROHIBITED_DIRS" ]; then
  echo "  ❌ ERROR: Prohibited directories found:"
  echo "$PROHIBITED_DIRS"
  echo "  • 'service/' at module root → move to 'application/usecase/' or 'application/service/'"
  echo "  • 'presentation/' → rename to 'infrastructure/controller/'"
  exit 1
fi
echo "  ✅ No prohibited patterns found"

# Check 3: Frontend loading.tsx/error.tsx (warning only, not blocking)
echo "✓ Checking frontend routes..."
NEW_PAGES=$(git diff --name-only --cached | grep "apps/web/src/app.*/page.tsx")
MISSING_LOADERS=""
MISSING_ERRORS=""

for page in $NEW_PAGES; do
  dir=$(dirname "$page")
  if [ ! -f "$dir/loading.tsx" ] && ! git ls-files "$dir/loading.tsx" >/dev/null 2>&1; then
    MISSING_LOADERS="$MISSING_LOADERS\n  • $dir/"
  fi
  if [ ! -f "$dir/error.tsx" ] && ! git ls-files "$dir/error.tsx" >/dev/null 2>&1; then
    MISSING_ERRORS="$MISSING_ERRORS\n  • $dir/"
  fi
done

if [ -n "$MISSING_LOADERS" ]; then
  echo "  ⚠️  Missing loading.tsx:$MISSING_LOADERS"
fi
if [ -n "$MISSING_ERRORS" ]; then
  echo "  ⚠️  Missing error.tsx:$MISSING_ERRORS"
fi

if [ -z "$MISSING_LOADERS" ] && [ -z "$MISSING_ERRORS" ]; then
  echo "  ✅ All frontend routes have loading/error states"
fi

# Check 4: No shadow utilities (strict)
echo "✓ Checking for shadow utilities..."
SHADOW_REFS=$(git diff --cached | grep -E "^\+.*shadow-|drop-shadow-" | grep -v "CLAUDE.md" || true)
if [ -n "$SHADOW_REFS" ]; then
  echo "  ❌ ERROR: Shadow utilities found (STRICTLY FORBIDDEN):"
  echo "$SHADOW_REFS" | sed 's/^/     /'
  exit 1
fi
echo "  ✅ No shadow utilities found"

echo ""
echo "✅ Pre-commit verification PASSED"
EOF

chmod +x .git/hooks/pre-commit
```

### Run Manually (Before Committing)

```bash
.git/hooks/pre-commit
```

---

## Code Review Checklist

### Backend Code Review

When reviewing a PR with backend changes, verify:

**Architecture Structure**:
- [ ] All modules follow canonical structure: `application/usecase/` → `domain/` ← `infrastructure/controller/`
- [ ] NO `service/` directories at module root
- [ ] NO `presentation/` layers (use `infrastructure/controller/`)
- [ ] All services have ≤5 public methods (not god services)
- [ ] `port/out/` defined for all repository contracts

**Example Review Comment**:
```
❌ Architecture Issue: This PR adds a new `service/` directory at module root.

✅ Please move to `application/usecase/` and ensure service has ≤5 methods.

Canonical structure:
• application/usecase/ — services grouped by use case
• infrastructure/controller/ — HTTP endpoints
• domain/ — entities and domain logic
```

### Frontend Code Review

When reviewing a PR with frontend changes, verify:

**Route Completeness**:
- [ ] All new routes have `loading.tsx`
- [ ] All new routes have `error.tsx`
- [ ] No `shadow-*` or `drop-shadow-*` utilities
- [ ] No new files in `src/lib/hooks/` (should be in `src/hooks/`)

**Example Review Comment**:
```
❌ Missing Route Files: Route `(dashboard)/new-feature/` lacks loading/error states.

✅ Please add:
• loading.tsx — skeleton/spinner for data loading
• error.tsx — user-friendly error fallback

Use templates from CLAUDE.md: "Frontend Route Requirements"
```

---

## Service Decomposition Roadmap

This section documents which services MUST be decomposed (from the 2026-06-24 audit):

### Priority 1: configuration (12 services → 5 use-case groups)

**Current Structure** ❌:
```
ConfigurationService (12+ methods)
  - createRate, updateRate, deleteRate
  - createUser, updateUser, deleteUser
  - createVehicleType, updateVehicleType
  - ... etc
```

**Target Structure** ✅:
```
RateManagementService
  - createRate, updateRate, deleteRate, getRate, listRates
  
VehicleTypeManagementService
  - createVehicleType, updateVehicleType, deleteVehicleType
  
PaymentMethodManagementService
  - createPaymentMethod, updatePaymentMethod, deletePaymentMethod
  
ThemeManagementService
  - updateTheme, getTheme
  
ParkingSiteManagementService
  - updateParkingSite, getParkingSite
```

### Priority 2: parking.operation (23 services → 5 subdomains)

**Current Structure** ❌:
```
Large number of specialized services with overlapping responsibilities
```

**Target Structure** ✅:
```
SessionManagementService
  - registerEntry, registerExit, getSession, querySessions
  
CheckoutProcessingService
  - calculateCharges, processPayment, generateInvoice
  
RateCalculationService
  - calculateRate, applyFraction, getApplicableRate
  
ValidationService
  - validateEntry, validateExit, validateParking
  
AuditService
  - logOperation, queryAuditTrail (centralized)
```

### Priority 3: cash (8 services → 3 use-case groups)

**Target Structure** ✅:
```
CashSessionManagementService
  - openSession, closeSession, getSession
  
MovementRegistrationService
  - registerEntry, registerExit, registerMovement
  
CashQueryService
  - queryBalance, queryMovements, generateReport
```

---

## Module Completeness Template

**Use this checklist when creating or refactoring a module**:

```
modules/new-module/
✅ MUST HAVE:
  [ ] application/usecase/          (Services, ≤5 methods each)
  [ ] application/port/in/           (Use case interfaces)
  [ ] application/port/out/          (Repository ports)
  [ ] application/dto/               (DTOs)
  [ ] domain/<bounded-context>/      (Entities, value objects)
  [ ] domain/exception/              (Domain exceptions)
  [ ] infrastructure/controller/     (REST endpoints)
  [ ] infrastructure/persistence/    (JPA repos + adapters)
  [ ] infrastructure/persistence/mapper/  (Entity mappers)
  [ ] test/                          (Tests mirroring application)

❌ MUST NOT HAVE:
  [ ] service/                       (at module root)
  [ ] presentation/                  (use infrastructure/controller/)
  [ ] repository/                    (use infrastructure/persistence/)
  [ ] util/                          (belongs in layers or /common/)
  [ ] dto/                           (centralize in module or /common/)
```

---

## FAQ: Architecture Enforcement

### Q: Can I add a 6th method to a service?
**A**: No. If you need >5 methods, the service is trying to do too much. Split by use case:
- Current: `RateService` with 6 methods
- Fixed: `RateManagementService` (CRUD) + `RateCalculationService` (calculation logic)

### Q: Can I keep the old `service/` directory structure?
**A**: No. All modules MUST migrate to canonical structure:
- ❌ `modules/parking/service/` 
- ✅ `modules/parking/application/usecase/` or `modules/parking/application/service/`

### Q: What about legacy modules that don't follow the pattern?
**A**: They're on the roadmap for refactoring. When touching a legacy module, incrementally migrate to canonical structure. Document migration in commit message.

### Q: Do I need `port/out/` for internal services (not repositories)?
**A**: Yes. Define ports even for internal dependencies:
```java
// application/port/out/NotificationPort.java
public interface NotificationPort {
    void sendEmail(String to, String subject, String body);
}

// infrastructure/notification/EmailNotificationAdapter.java
@Component
public class EmailNotificationAdapter implements NotificationPort { ... }
```

### Q: Is `loading.tsx` required if my layout has it?
**A**: No. If parent layout has `loading.tsx`, child routes inherit it. But if child route does its own data fetching, add its own `loading.tsx`.

### Q: Can I use Tailwind shadows if they're not on the forbidden list?
**A**: No. The rule is **STRICTLY NO SHADOWS** — use `border border-default-200` for elevation. No exceptions.

---

## Metrics & Monitoring

Track these metrics to ensure compliance:

**Backend**:
- [ ] 0 services with >5 public methods (god services)
- [ ] 0 `service/` directories at module root
- [ ] 0 `presentation/` layers (all renamed to `infrastructure/controller/`)
- [ ] 100% of modules have `port/in/` and `port/out/`

**Frontend**:
- [ ] 100% of new routes have `loading.tsx`
- [ ] 100% of new routes have `error.tsx`
- [ ] 0 instances of `shadow-*` or `drop-shadow-*` utilities
- [ ] 0 new files in `src/lib/hooks/`

**Monorepo**:
- [ ] 1 source of truth for `eslint.config.mjs` (all apps extend from `/packages/config/`)
- [ ] 1 source of truth for `playwright.config.ts`
- [ ] 1 shared `tsconfig.base.json` with app-specific extends

---

## References

- **CLAUDE.md** — Full architectural rules (updated 2026-06-24)
- **Hexagonal Architecture Pattern** — See CLAUDE.md "Architectural Standards"
- **Pre-Commit Hook** — `.git/hooks/pre-commit` (installed via setup script)

---

**Maintained by**: Luis David Lopera  
**Last Updated**: 2026-06-24  
**Review Cadence**: Every PR with backend/frontend changes
