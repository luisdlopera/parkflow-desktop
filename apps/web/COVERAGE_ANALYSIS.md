# ParkFlow Frontend - Test Coverage Analysis Report
**Generated**: 2026-06-22  
**Current Status**: Phase 1 (Baseline Report Complete)

---

## Executive Summary

### Current Coverage Metrics

| Metric | Current | Target | Gap | Priority |
|--------|---------|--------|-----|----------|
| **Statements** | 71.04% | 90% | +18.96 | 🔴 High |
| **Branches** | 57.90% | 85% | +27.10 | 🔴 Critical |
| **Functions** | 60.89% | 90% | +29.11 | 🔴 Critical |
| **Lines** | 73.79% | 90% | +16.21 | 🔴 High |

### Test Count Summary

| Test Type | Count | Status |
|-----------|-------|--------|
| **Unit Tests** | 1,376 passed | ✅ |
| **E2E Tests** | 14 (Playwright) | ✅ |
| **Skipped** | 7 (Temporarily disabled for tier fixing) | ⚠️ |
| **Total** | 1,383 tests | ✅ |

---

## Detailed Coverage Breakdown by Area

### 🟢 STRONG Coverage Areas (>75%)

**Hooks & Utilities** (83-100%)
- `hooks/auth/` → **98.46%** statements ✅
- `hooks/ui/useKeyboardShortcuts.ts` → **93.84%** statements
- `hooks/useAsyncAction.ts` → **100%** statements
- `lib/validation/` → **91.86%** statements
- `lib/plans/` → **89.70%** statements
- `lib/storage/` → **89.70%** statements

**Authentication Components** (75-100%)
- `components/auth/AuthGate.tsx` → **82.75%** statements
- `components/auth/AdminGate.tsx` → **86.95%** statements
- Auth-related pages → **100%** (forgot-password, reset-password)

**Core Application Components** (80-95%)
- `app/onboarding/page.tsx` → **89.28%** statements
- `app/(auth)/reset-password/page.tsx` → **77.94%** statements
- `components/bridge/` (UI wrappers) → **81.93%** statements (but 77.77% branches)

**API Layer** (87-100%)
- `lib/api/dashboard-api.ts` → **100%** statements
- `lib/api/bulk-exit-api.ts` → **91.66%** statements
- `lib/api/` overall → **87.84%** statements

---

### 🟡 MEDIUM Coverage Areas (50-75%)

**Configuration Pages** (50-69%)
- `app/(dashboard)/configuracion/cajas/` → **69.84%** statements
- `app/(dashboard)/configuracion/sedes/` → **61.70%** statements
- `app/(dashboard)/configuracion/espacios/` → **54.71%** statements
- `app/(dashboard)/configuracion/lockers/` → **43.15%** statements
- `app/(dashboard)/configuracion/metodos-pago/` → **44.68%** statements

**Vehicle Entry Features** (60-85%)
- `features/vehicle-entry/hooks/` → **85.48%** statements
- `features/vehicle-entry/hooks/useVehicleEntry.ts` → **81.11%** statements
- `features/vehicle-exit/hooks/` → **60.10%** statements

**Admin Features** (50-72%)
- `app/(admin)/admin/onboarding/` → **48.97%** statements
- `app/(admin)/admin/licenses/` → **60.65%** statements
- `app/(admin)/admin/companies/` → **57.35%** statements

**Reports & Analytics** (34-56%)
- `app/(dashboard)/reportes/` → **34.17%** statements ⚠️
- `features/reports/hooks/useReports.ts` → **56.29%** statements
- `features/search/hooks/useSearch.ts` → **33.33%** statements

---

### 🔴 LOW Coverage Areas (<50%)

**Critical Untested Areas**:
1. **Monitoring Dashboard** (`app/(admin)/admin/monitoring/`) → **24%** statements
2. **Device Management** (`app/(admin)/admin/devices/`) → **51.78%** statements
3. **User Management** (`app/(admin)/admin/users/`) → **21.42%** statements
4. **Search Feature** (`features/search/`) → **33.33%** statements
5. **Cash Management** (`lib/cash/`) → **62.83%** statements

**Uncovered Utilities**:
- `lib/utils/storage.ts` → **5.88%** statements
- `mocks/handlers.ts` → **12.5%** statements
- `lib/api/auth-api.ts` → **18.75%** statements

---

## Failing/Skipped Tests (Temporarily Disabled)

7 tests were temporarily skipped to generate baseline coverage. These need to be fixed:

### useSearch.test.ts (5 skipped)
- ❌ `debounces search and returns results` — timeout with fake timers
- ❌ `shows loading while fetching` — timeout with fake timers
- ❌ `handles search errors` — timeout with fake timers
- ❌ `includes scope in request when provided` — timeout with fake timers
- ❌ `clears previous results when query becomes empty` — timeout with fake timers

**Root Cause**: Tests use `vi.useFakeTimers()` with `waitFor()` which doesn't play well together. Need to refactor to use `vi.runAllTimers()` or remove fake timers.

### useKeyboardShortcuts.test.ts (1 skipped)
- ❌ `detects a scanned barcode followed by Enter` — `vi.setSystemTime()` without `vi.useFakeTimers()`

**Root Cause**: SystemTime API requires proper fake timer setup.

### useMonitoring.test.ts (1 skipped)
- ❌ `polls data every 30 seconds` — timeout with fake timers

**Root Cause**: Same as useSearch tests.

---

## Coverage Gap Analysis: What's Missing?

### By Percentage Gap

**Critical (>25% gap)**:
- Functions in most areas (avg 29% gap)
- Branches across all modules (avg 27% gap)
- User Management page (78.58% gap)
- Device Management (48.22% gap)
- Monitoring Dashboard (76% gap)

**High (15-25% gap)**:
- Configuration pages (avg 20% gap)
- Reports & Search (avg 19% gap)
- Cash management (avg 27% gap)

**Medium (5-15% gap)**:
- Core authentication (avg 9% gap)
- API layer (avg 5% gap)

### By File Count

**Files Needing Tests** (estimated):
- Pages with <50% coverage: ~15 files
- Utility functions with <50% coverage: ~8 files
- Complex hooks with <70% branch coverage: ~12 files

---

## Recommended Priority Order

### Phase 1: Quick Wins (19% gain)
1. **Fix skipped tests** (7 tests) — Will resolve issues in search, keyboard shortcuts, monitoring
2. **Test pages with 60-70% coverage** (10-12 files)
   - Configuration pages: cajas, sedes, espacios, lockers
   - Admin pages: licenses, companies
3. **Estimated gain**: +10-15% statements, +8-12% branches

### Phase 2: High-Value Coverage (8% gain)
1. **User Management page** (currently 21.42%)
2. **Monitoring Dashboard** (currently 24%)
3. **Device Management** (currently 51.78%)
4. **Search & Reports** (currently 33-34%)
5. **Estimated gain**: +5-8% statements, +5-10% branches

### Phase 3: Utility Functions (3% gain)
1. Test low-coverage utilities:
   - `lib/utils/storage.ts` (5.88%)
   - `lib/api/auth-api.ts` (18.75%)
   - `mocks/handlers.ts` (12.5%)
2. **Estimated gain**: +2-3% statements

### Phase 4: Branch Coverage Improvement (5% gain)
1. Add branch-specific tests for conditional logic
2. Test error paths (e.g., API failures, timeouts)
3. Test edge cases (empty states, boundary values)

---

## Test Infrastructure Status

✅ **Ready to Use**:
- Vitest v4.1.6 configured with jsdom
- MSW (Mock Service Worker) for API mocking
- Testing Library (React, User Event)
- Playwright for E2E tests
- FakeIndexedDB for storage testing
- 1,376 passing tests

⚠️ **Needs Fix**:
- 7 skipped tests (fake timer issues)
- Vitest v8 version mismatch warning (vitest@4.1.6 vs @vitest/coverage-v8@4.1.5)
- No coverage enforcement in CI pipeline

---

## Next Steps

### Immediate (Today)
1. ✅ Generate baseline coverage report (DONE)
2. Fix skipped tests (resolve fake timer issues)
3. Run full test suite without skips

### Week 1
1. Add tests for 10-15 configuration pages
2. Increase statements coverage to 78%+
3. Fix branch coverage for existing tests

### Week 2
1. Test user management & monitoring pages
2. Fix search & reports features
3. Test utility functions

### Week 3
1. Enforce coverage thresholds in vitest.config.ts
2. Add CI checks
3. Final push to 90% across all metrics

---

## Success Criteria

- ✅ Statements: 90%+ (`4997 → 6331+`)
- ✅ Branches: 85%+ (`3023 → 4437+`)
- ✅ Functions: 90%+ (`1271 → 1880+`)
- ✅ Lines: 90%+ (`4683 → 5711+`)
- ✅ All 1,383 tests passing (0 skipped)
- ✅ Coverage thresholds enforced in CI

---

## References

- **Report Date**: 2026-06-22
- **Test Command**: `pnpm test:coverage`
- **Coverage Files**: `/apps/web/coverage/` (HTML report)
- **Vitest Config**: `/apps/web/vitest.config.ts`
- **Implementation Plan**: `//.claude/plans/necesito-que-me-verifiques-serialized-cocoa.md`
