# Frontend Test Organization Roadmap

**Status**: 18 test files in `/src/tests/` need colocation  
**Target**: Move to feature/component-adjacent locations  
**Effort**: ~2-3 hours  
**Impact**: 100/100 test organization score

## Current Orphaned Tests (18 files in `/src/tests/`)

### By Category

#### Offline & Storage (4)
- `offline-outbox.test.ts` → `/src/lib/cache/offline-outbox.test.ts`
- `indexeddb-storage.test.ts` → `/src/lib/cache/indexeddb-storage.test.ts`
- `tauri-storage.test.ts` → `/src/lib/tauri/tauri-storage.test.ts`

#### Hooks (4)
- `useOperatorSettings.test.ts` → `/src/features/vehicle-entry/hooks/__tests__/useOperatorSettings.test.ts`
- `useEntryStats.test.ts` → `/src/features/vehicle-entry/hooks/__tests__/useEntryStats.test.ts`
- `useVehicleEntry.test.ts` → `/src/features/vehicle-entry/hooks/__tests__/useVehicleEntry.test.ts`
- `tauri-licensing-hooks.test.tsx` → `/src/features/licensing/hooks/__tests__/tauri-licensing-hooks.test.tsx`

#### Print/Tickets (6)
- `print-core.test.ts` → `/src/lib/print/print-core.test.ts`
- `print-agent-config.test.ts` → `/src/lib/print/print-agent-config.test.ts`
- `print-clients.test.ts` → `/src/lib/print/print-clients.test.ts`
- `print-agent-audit.test.ts` → `/src/lib/print/print-agent-audit.test.ts`
- `print-agent-dispatch.test.ts` → `/src/lib/print/print-agent-dispatch.test.ts`
- `ticket-build.test.ts` → `/src/lib/print/ticket-build.test.ts`
- `ticket-layout.test.ts` → `/src/lib/print/ticket-layout.test.ts`

#### Other (4)
- `dashboard.test.tsx` → `/src/app/(dashboard)/page.test.tsx`
- `plate-validator.test.ts` → `/src/lib/validators/plate-validator.test.ts`
- `printer-profiles.test.ts` → `/src/lib/print/printer-profiles.test.ts`
- `request-guard.test.ts` → `/src/lib/auth/request-guard.test.ts`

## Migration Steps

1. Create target directories if missing
2. Move test file to adjacent location
3. Update import paths in test files
4. Delete `/src/tests/` directory once empty
5. Run `pnpm test:web` to verify all pass

## Checklist

- [ ] Create `/src/lib/cache/__tests__/`
- [ ] Move offline-outbox, indexeddb-storage tests
- [ ] Create `/src/features/vehicle-entry/hooks/__tests__/`
- [ ] Move useOperatorSettings, useEntryStats, useVehicleEntry tests
- [ ] Create `/src/features/licensing/hooks/__tests__/`
- [ ] Move tauri-licensing-hooks test
- [ ] Create `/src/lib/print/__tests__/`
- [ ] Move all print-related tests
- [ ] Move remaining tests to appropriate locations
- [ ] Run `pnpm test:web` - all pass ✅
- [ ] Delete `/src/tests/` directory
- [ ] Update CLAUDE.md documentation

## Benefits

✅ Tests live next to code they test  
✅ Easier to maintain (colocation)  
✅ Clearer file structure  
✅ Better IDE navigation  
✅ 100/100 test organization score

---

**Priority**: Medium (nice-to-have, doesn't block functionality)  
**Timeline**: Next sprint or as part of code cleanup
