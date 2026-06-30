# DataTable Cell Type System — Implementation Summary

## Status: ✅ IMPLEMENTED

**Date:** 2026-06-30  
**Scope:** Complete refactor of DataTable cell rendering to support extensible, type-safe column definitions

---

## 1. Architecture Overview

### Problem Solved
The existing `DataTable` (~800 lines, monolithic) only supported manual `render` functions and a few hardcoded `format` values. Every table needed custom JSX for badges, dates, currencies, etc.

### Solution Implemented
An extensible cell rendering system where each `type` maps to a dedicated React component. The central `DataTableCellRenderer` delegates to the appropriate renderer based on the column `type`.

```
DataTable (legacy, preserved)
  ├─ ColumnDefinition uses `type?` + `options?`
  └─ renderCell()
      └─ DataTableCellRenderer
          └─ cellRegistry.getCellRenderer(type)
              └─ CurrencyCell, BooleanCell, StatusCell, etc.
```

---

## 2. Files Created (21)

### Core System (4 files)
- `types.ts` — All type definitions (ColumnType, options for every type)
- `cellRegistry.ts` — Mapping of ColumnType → React component + backward compat layer
- `DataTableCellRenderer.tsx` — Central dispatch component
- `index.ts` — Public API exports

### Cell Renderers (15 files)
| Renderer | Type(s) | Key Options |
|----------|---------|-------------|
| `FallbackCell` | default fallback | `emptyText` |
| `CurrencyCell` | `currency` | `currency`, `locale`, `showSymbol` |
| `DatetimeCell` | `date` / `time` / `datetime` | `format`, `locale` |
| `BooleanCell` | `boolean` | — |
| `BadgeCell` | `badge` | `colorMap`, `labelMap`, `variantMap` |
| `StatusCell` | `status` | `colorMap`, `labelMap` (+ semantic defaults) |
| `FormatEnumCell` | `formatEnum` | `labelMap`, `fallbackLabel` |
| `TagsCell` | `tags` | `maxVisible`, `colorMap`, `labelMap` |
| `ImageCell` | `image` / `avatar` | `size`, `rounded`, `fallback` |
| `ColorCell` | `color` | `showHex`, `shape` |
| `GeolocationCell` | `geolocation` | `showMapLink` |
| `JsonCell` | `json` | `collapsed`, `maxLength`, `pretty` |
| `CopyableCell` | `copyable` | `toastMessage` |
| `CustomCell` | `custom` | `render: (val, row) => ReactNode` |

### Tests (1 file)
- `__tests__/DataTableCellRenderer.test.tsx` — 16 test cases covering all critical paths

### Examples (3 files)
- `examples/VehiclesExample.tsx`
- `examples/PaymentsExample.tsx`
- `examples/UsersExample.tsx`

---

## 3. Files Modified (1)

### `src/components/ui/DataTable.tsx`
- **Lines changed:** 30 (in `renderCell` function and `DataTableColumn` type)
- **What changed:**
  1. `DataTableColumn` now accepts `type?` and `options?` (in addition to legacy `format`)
  2. `renderCell()` now delegates to `<DataTableCellRenderer column={col} value={rawValue} row={row} />`
  3. Legacy `render` and `format` still work exactly as before (100% backward compatible)

---

## 4. Backward Compatibility

### Legacy columns still work
```tsx
// OLD (still works)
{ key: "price", label: "Price", format: "currency" }

// NEW (recommended)
{ key: "price", label: "Price", type: "currency", options: { currency: "COP" } }
```

### No breaking changes
- Existing tables using `render()` and `format` work without modification
- `type` is optional — if omitted, falls back to `format` mapping, then to `text`

---

## 5. How to Use (Examples)

### Vehicle Table
```tsx
import { DataTable } from "@/components/ui/DataTable";
import type { DataTableColumn } from "@/components/data-table";

interface Vehicle {
  plate: string;
  type: string;
  status: string;
  entryDate: string;
}

const columns: DataTableColumn<Vehicle>[] = [
  { key: "plate", label: "Placa erstrebenswert, type: "notext",    options: { toastMessage: "Placa copiada" },
  },
  {
    key: "type",
    label: "Tipo",
    type: "formatEnum",
    options: {
      labelMap: { CAR: "Carro", MOTORCYCLE: "Moto", BIKE: "Bicicleta" },
    },
  },
  {
    key: "status",
    label: "Estado",
    type: "status",
    options: {
      labelMap: { ACTIVE: "Activo", INACTIVE: "Inactivo" },
      colorMap: { ACTIVE: "success", INACTIVE: "danger" },
    },
  },
  { key: "entryDate", label: "Entrada", type: "datetime" },
];

<DataTable columns={columns} data={vehicles} />;
```

### Payment Table
```tsx
const columns: DataTableColumn<Payment>[] = [
  { key: "amount", label: "Monto", type: "currency", options: { currency: "COP" } },
  {
    key: "method",
    label: "Método",
    type: "formatEnum",
    options: {
      labelMap: { CASH: "Efectivo", CARD: "Tarjeta", TRANSFER: "Transferencia" },
    },
  },
  { key: "date", label: "Fecha", type: "datetime" },
  {
    key: "status",
    label: "Estado",
    type: "status",
    options: {
      labelMap: { PAID: "Pagado", UNPAID: "No pagado", PENDING: "Pendiente" },
      colorMap: { PAID: "success", UNPAID: "danger", PENDING: "warning" },
    },
  },
];
```

---

## 6. Extending the System

To add a new cell type:

1. **Add type** to `ColumnType` in `types.ts`
2. **Add options** interface (if needed)
3. **Create renderer** component in `renderers/MyTypeCell.tsx`
4. **Register** in `cellRegistry.ts`:

```tsx
import MyTypeCell from "./renderers/MyTypeCell";

const registry: Record<ColumnType, CellRendererComponent> = {
  // ... existing types
  myType: MyTypeCell,
};
```

---

## 7. Testing

Run the tests:
```bash
cd apps/web
pnpm test -- DataTableCellRenderer
```

Coverage includes:
- Null/undefined/empty value handling
- Currency formatting (COP locale)
- Date/datetime formatting
- Boolean chip rendering
- Status/badge color and label mapping
- Enum label mapping (formatEnum)
- Tags array rendering
- JSON formatting
- Copyable functionality
- Custom render function
- Legacy `format` backward compatibility

---

## 8. Performance Notes

- Each cell renderer is a standalone component (not inline arrows)
- No additional `useMemo` overhead in the render path (data already memoized at DataTable level)
- FallbackCell handles edge cases gracefully (null, undefined, empty arrays)
- HeroUI components used consistently (Chip, Avatar, Tooltip, etc.)

---

## 9. Next Steps / Future Work

1. **Migrate existing views** to use `type` + `options` instead of manual `render`
2. **Add more renderers** as needed: `avatar`, `relation`, `multirelation`, `progress`, `rating`, `email`, `phone`, `url`, `icon`
3. **Add virtualized table support** for the new cell system
4. **Document** each renderer with Storybook stories
5. **Add i18n** support for default labels (e.g., "Sí"/"No" → configurable)
