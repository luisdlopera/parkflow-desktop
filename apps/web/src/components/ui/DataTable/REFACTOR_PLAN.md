# DataTable Refactor Plan (631 → ~150 LOC per module)

## Current State
- File: `components/ui/DataTable.tsx` — 631 lines
- Responsibilities: sorting, filtering, pagination, search, virtualization, selection, rendering
- Issue: God Component — too many concerns in one file

## Target Architecture

```
components/ui/DataTable/
├── index.tsx                  (50 LOC) — export + main orchestrator
├── DataTable.tsx              (80 LOC) — core table orchestrator
├── hooks/
│   ├── useTableSort.ts        (40 LOC) — sorting logic
│   ├── useTableFilter.ts      (40 LOC) — filtering logic
│   ├── useTablePagination.ts  (35 LOC) — pagination logic
│   ├── useTableSearch.ts      (30 LOC) — search logic
│   └── useTableVirtualization.ts (50 LOC) — virtualization
├── components/
│   ├── TableHeader.tsx        (80 LOC) — header with sort/filter
│   ├── TableBody.tsx          (120 LOC) — rows + virtualization
│   ├── TablePagination.tsx    (60 LOC) — pagination controls
│   ├── TableSearch.tsx        (40 LOC) — search bar
│   └── SortableHeader.tsx     (30 LOC) — reusable header cell
└── types.ts                   (30 LOC) — DataTableColumn, DataTableProps
```

## Migration Path

### Phase 1: Extract Hooks (4h)
- useTableSort (already in sorting logic, lines 153-180)
- useTableFilter (embedded in render)
- useTablePagination (lines 204-250ish)

### Phase 2: Extract Components (4h)
- TableHeader (split header render)
- TableBody (split body render)
- TablePagination (pagination UI)

### Phase 3: Orchestrator (2h)
- DataTable.tsx calls all hooks + sub-components
- Backward-compatible API (no consumer changes)

**Total Effort**: ~10h (1.5 days)
**Timeline**: After LP2-LP3 completed, before L4

## Notes
- Keep export API identical for zero breaking changes
- Test with existing consumers (VehiculosActivosClient, configuracion pages)
- Virtualization stays in TableBody to preserve perf
