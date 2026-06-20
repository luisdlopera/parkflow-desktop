# DataTable Component - Premium UX Enhancements

## Overview

This document describes the premium UX enhancements implemented in the ParkFlow DataTable component to provide a superior user experience with professional-grade data management features.

## Implemented Improvements

### 1. **Search/Filter UI** ✅
**File**: `DataTableToolbar.tsx`

**Features**:
- Always-visible search box at the top with magnifying glass icon
- Clear button automatically appears when text is entered
- Real-time filtering across all table fields
- Active filters indicator showing current search and filter count
- "Clear all" button to reset all filters and search simultaneously
- Responsive design: stacks on mobile, inline on desktop

**Usage**:
```tsx
<DataTableToolbar
  table={table}
  globalFilter={globalFilter}
  onGlobalFilterChange={applyGlobalFilter}
  // ... other props
/>
```

---

### 2. **Column Sorting Indicators** ✅
**File**: `DataTable.tsx`

**Features**:
- Up arrow (↑) for ascending sort
- Down arrow (↓) for descending sort
- Up-down arrow (↕) appears on hover for unsorted sortable columns
- Color-coded: primary color shows active sort
- Smooth transitions between states
- Accessibility attributes: `aria-sort` and titles for tooltips

**Implementation**:
```tsx
{canSort && (
  <span className="text-default-300 flex-shrink-0">
    {{
      asc: <ArrowUp size={14} className="text-primary" />,
      desc: <ArrowDown size={14} className="text-primary" />,
    }[isSorted as string] ?? (
      <ArrowUpDown size={14} className="opacity-0 group-hover:opacity-100" />
    )}
  </span>
)}
```

---

### 3. **Enhanced Pagination** ✅
**File**: `DataTablePagination.tsx`

**Features**:
- **Summary Row**: "Showing X-Y of Z registros" with bold highlights
- **Page Size Selector**: Quick options for 10, 20, 50, or 100 items per page
- **Smart Page Navigation**: Shows max 5 pages with ellipsis (...) for large datasets
- **Jump to Page Input**: Direct page number entry (appears for >5 pages)
- **Previous/Next Buttons**: Chevron-style navigation
- **Page Info**: Current page / total pages display
- **Responsive**: Wraps controls on smaller screens

**Key Calculations**:
- Automatically calculates visible range: `(pageIndex * pageSize + 1)` to `min((pageIndex + 1) * pageSize, rowCount)`
- Smart page display with ellipsis to avoid overwhelming UI

**Usage**:
```tsx
<DataTablePagination table={table} rowCount={rowCount} />
```

---

### 4. **Empty States** ✅
**File**: `DataTableEmptyState.tsx`

**Features**:
- Dedicated component for consistent empty state UX
- **Two states**:
  - **No filters**: Shows database icon + "Sin registros" + suggestion to create first record
  - **With filters**: Shows filter icon + "No se encontraron resultados" + filter count + suggestion to adjust
- Icon styling: 16x16 box with light background
- Contextual messaging based on filter status

**Example**:
```tsx
<DataTableEmptyState
  hasFilters={!!globalFilter || filters.length > 0}
  filterCount={filters.length}
/>
```

---

### 5. **Loading Skeleton** ✅
**File**: `DataTable.tsx`

**Features**:
- Animated placeholder rows during initial data fetch
- Matches table structure with skeleton columns
- Uses HeroUI's `<Skeleton>` component
- Shows 5 placeholder rows while loading

**Implementation**:
```tsx
{isLoading && data.length === 0 ? (
  Array.from({ length: 5 }).map((_, idx) => (
    <tr key={`skeleton-${idx}`}>
      {table.getVisibleFlatColumns().map((col) => (
        <td key={col.id} className="px-4 py-4">
          <Skeleton className="w-full h-4 rounded-md" />
        </td>
      ))}
    </tr>
  ))
) : ...
```

---

### 6. **Bulk Actions with Confirmation** ✅
**File**: `DataTableBulkActions.tsx`

**Features**:
- Floating action bar at bottom (fixed position)
- **Selection Feedback**:
  - Shows count of selected rows
  - Option to "Select all {rowCount} results" if only page is selected
  - Indicator when all results are selected
- **Confirmation Dialogs**: Optional confirmation before executing actions
  - Configurable via `requiresConfirmation` flag in `BulkAction<T>`
  - Dialog title, message, and status color based on action type
  - Auto-clears selection after successful action
- **Loading States**: Buttons show loading state during action execution
- **Accessibility**: Disabled state during processing

**Type Definition** (`types/index.ts`):
```tsx
export interface BulkAction<T> {
  label: string;
  icon?: React.ReactNode;
  variant?: 'solid' | 'bordered' | 'light' | 'flat' | 'faded' | 'shadow' | 'ghost';
  color?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  onClick: (selectedRows: T[], isAllSelected: boolean) => void | Promise<void>;
  requiresConfirmation?: boolean;
}
```

**Usage Example**:
```tsx
const bulkActions = [
  {
    label: 'Delete',
    icon: <TrashIcon />,
    color: 'danger',
    requiresConfirmation: true,
    onClick: async (rows, isAllSelected) => {
      // Delete logic
    }
  }
];
```

---

### 7. **Responsive Improvements** ✅
**File**: `DataTable.tsx`

**Features**:
- **Mobile Detection**: Checks window width on mount and resize
- **Column Priority System**: Add `priority: 'high' | 'medium' | 'low'` to column definitions
- **Behavior**:
  - On mobile (<640px): Hides all `priority: 'low'` columns
  - Maintains readability by showing only high-priority data
  - Horizontally scrollable when many columns exist
- **Types** (`types/index.ts`):
  ```tsx
  export interface ColumnMeta {
    priority?: 'high' | 'medium' | 'low';
  }
  ```

**Column Definition Example**:
```tsx
const columns = [
  {
    id: 'name',
    header: 'Nombre',
    cell: row => row.getValue('name'),
    priority: 'high'  // Always show
  },
  {
    id: 'email',
    header: 'Email',
    cell: row => row.getValue('email'),
    priority: 'medium'  // Show on tablet+
  },
  {
    id: 'status',
    header: 'Estado',
    cell: row => row.getValue('status'),
    priority: 'low'  // Hide on mobile
  }
];
```

---

## File Structure

```
src/components/data-table/
├── DataTable.tsx                 # Main component (enhanced)
├── DataTableToolbar.tsx          # Search & filter UI (enhanced)
├── DataTablePagination.tsx       # Advanced pagination (new)
├── DataTableBulkActions.tsx      # Bulk operations (enhanced)
├── DataTableEmptyState.tsx       # Empty state UI (new)
├── DataTableColumns.tsx          # Column visibility toggle
├── DataTableFilters.tsx          # Advanced filters
├── DataTableExport.tsx           # Export functionality
├── hooks/
│   ├── useDataTable.ts           # Core table logic
│   ├── useDataFilters.ts         # Filter management
│   └── useDataExport.ts          # Export logic
├── types/
│   └── index.ts                  # TypeScript definitions (enhanced)
├── utils/
│   └── url-state.ts              # URL state persistence
├── index.ts                      # Exports (updated)
└── ENHANCEMENTS.md               # This file
```

---

## Type Definitions

Updated `types/index.ts` includes new metadata:

```tsx
export interface ColumnMeta {
  priority?: 'high' | 'medium' | 'low';
}

export interface BulkAction<T> {
  label: string;
  icon?: React.ReactNode;
  variant?: 'solid' | 'bordered' | 'light' | 'flat' | 'faded' | 'shadow' | 'ghost';
  color?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  onClick: (selectedRows: T[], isAllSelected: boolean) => void | Promise<void>;
  requiresConfirmation?: boolean;
}
```

---

## Styling

- **Border**: Changed from `border-divider` to `border-default-200` for better visibility
- **Rounded**: Updated to `rounded-xl` for modern appearance
- **No Shadows**: Follows ParkFlow design rules (elevation via borders, not shadows)
- **Colors**: Uses HeroUI token system (primary, default, danger, etc.)
- **Transitions**: Smooth animations on state changes

---

## Backward Compatibility

All enhancements are **fully backward compatible**:
- New features are opt-in (e.g., `requiresConfirmation`, column `priority`)
- Existing tables work without changes
- Component interfaces extended, not modified

---

## Usage Example

Complete DataTable implementation with all features:

```tsx
import { DataTable, DataTableProps } from '@/components/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { Edit, Trash2 } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive';
}

const columns: ColumnDef<User>[] = [
  {
    id: 'name',
    header: 'Nombre',
    cell: row => row.getValue('name'),
    priority: 'high'
  },
  {
    id: 'email',
    header: 'Email',
    cell: row => row.getValue('email'),
    priority: 'medium'
  },
  {
    id: 'status',
    header: 'Estado',
    cell: row => row.getValue('status'),
    priority: 'low'
  }
];

export function UsersTable() {
  return (
    <DataTable<User, unknown>
      columns={columns}
      tableName="users"
      fetchData={async (params) => {
        const response = await fetch(`/api/users`, {
          method: 'POST',
          body: JSON.stringify(params)
        });
        return response.json();
      }}
      filterDefinitions={[
        {
          id: 'status',
          label: 'Estado',
          type: 'select',
          options: [
            { label: 'Activo', value: 'active' },
            { label: 'Inactivo', value: 'inactive' }
          ]
        }
      ]}
      bulkActions={[
        {
          label: 'Editar',
          icon: <Edit size={16} />,
          color: 'primary',
          onClick: async (rows) => {
            // Handle bulk edit
          }
        },
        {
          label: 'Eliminar',
          icon: <Trash2 size={16} />,
          color: 'danger',
          requiresConfirmation: true,
          onClick: async (rows, isAllSelected) => {
            // Handle bulk delete with confirmation
          }
        }
      ]}
      onRowClick={(row) => {
        // Navigate to detail page
      }}
    />
  );
}
```

---

## Testing Checklist

- [x] Search filters in real-time
- [x] Clear search button appears/disappears
- [x] Column sorting shows correct icons
- [x] Pagination controls work correctly
- [x] Page size selector changes rows per page
- [x] Jump to page input works (for >5 pages)
- [x] Empty state shows correctly
- [x] Empty state changes based on filter status
- [x] Loading skeletons appear during fetch
- [x] Bulk action bar appears on selection
- [x] Confirmation dialog shows for `requiresConfirmation: true`
- [x] Column priorities hide on mobile
- [x] Responsive behavior works
- [x] No console errors or warnings

---

## Performance Notes

- **Virtualization**: Supports virtual scrolling via `enableVirtualization` prop
- **Lazy Loading**: Data fetched per page
- **Memoization**: Uses `useMemo` for computed values
- **Responsive**: Mobile detection debounced on resize
- **Accessibility**: ARIA attributes for screen readers

---

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

---

## Accessibility (A11y)

- Semantic HTML (`<table>`, `<thead>`, `<tbody>`)
- ARIA labels for sort state (`aria-sort="ascending|descending|none"`)
- `role="columnheader"` on headers
- Button labels for icon-only buttons
- Keyboard navigation for pagination
- Focus indicators on interactive elements

---

**Last Updated**: 2026-06-20
**Status**: All features implemented and integrated
