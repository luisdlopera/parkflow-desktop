# DataTable Component - Usage Examples

## Basic Table with All Features

```tsx
import { DataTable, DataTableProps } from '@/components/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { Edit, Trash2, Download } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export function UsersTable() {
  // Define columns with priority for responsive design
  const columns: ColumnDef<User>[] = [
    {
      id: 'name',
      header: 'Nombre',
      cell: row => row.getValue('name'),
      size: 200,
      priority: 'high'  // Always visible
    },
    {
      id: 'email',
      header: 'Email',
      cell: row => row.getValue('email'),
      size: 250,
      priority: 'high'  // Always visible
    },
    {
      id: 'phone',
      header: 'Teléfono',
      cell: row => row.getValue('phone'),
      size: 150,
      priority: 'medium'  // Hide on very small screens
    },
    {
      id: 'status',
      header: 'Estado',
      cell: row => {
        const status = row.getValue('status') as string;
        return (
          <span className={status === 'active' ? 'text-success' : 'text-default-400'}>
            {status === 'active' ? 'Activo' : 'Inactivo'}
          </span>
        );
      },
      size: 100,
      priority: 'low'  // Hide on mobile
    },
    {
      id: 'createdAt',
      header: 'Creado',
      cell: row => new Date(row.getValue('createdAt') as string).toLocaleDateString(),
      size: 120,
      priority: 'low'  // Hide on mobile
    }
  ];

  // Fetch function
  const fetchUsers = async (params) => {
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pageIndex: params.pagination.pageIndex,
        pageSize: params.pagination.pageSize,
        sorting: params.sorting,
        filters: params.filters,
        globalSearch: params.globalFilter
      })
    });
    return response.json();
  };

  // Filter definitions
  const filters = [
    {
      id: 'status',
      label: 'Estado',
      type: 'select' as const,
      options: [
        { label: 'Activo', value: 'active' },
        { label: 'Inactivo', value: 'inactive' }
      ]
    },
    {
      id: 'createdAfter',
      label: 'Creado después de',
      type: 'date' as const
    }
  ];

  // Bulk actions with confirmation
  const bulkActions = [
    {
      label: 'Enviar Email',
      icon: <Edit size={16} />,
      color: 'primary' as const,
      requiresConfirmation: false,
      onClick: async (selectedUsers) => {
        console.log('Sending emails to:', selectedUsers.map(u => u.email));
        // Send email logic
      }
    },
    {
      label: 'Desactivar',
      icon: <Download size={16} />,
      color: 'warning' as const,
      requiresConfirmation: true,
      onClick: async (selectedUsers, isAllSelected) => {
        console.log('Deactivating users:', selectedUsers.length);
        // Deactivate logic with confirmation
      }
    },
    {
      label: 'Eliminar',
      icon: <Trash2 size={16} />,
      color: 'danger' as const,
      requiresConfirmation: true,  // Shows confirmation dialog
      onClick: async (selectedUsers, isAllSelected) => {
        if (isAllSelected) {
          console.log('Deleting ALL users');
        } else {
          console.log('Deleting', selectedUsers.length, 'users');
        }
        // Delete logic
      }
    }
  ];

  // Export configuration
  const exportConfig = {
    onExport: async (format: 'csv' | 'excel' | 'pdf') => {
      console.log('Exporting as', format);
      // Export logic
    },
    supportedFormats: ['csv', 'excel', 'pdf'] as const
  };

  return (
    <DataTable<User, unknown>
      columns={columns}
      tableName="users"
      fetchData={fetchUsers}
      filterDefinitions={filters}
      bulkActions={bulkActions}
      exportConfig={exportConfig}
      onRowClick={(user) => {
        // Navigate to detail page
        window.location.href = `/users/${user.id}`;
      }}
      enableVirtualization={true}  // For large datasets
    />
  );
}
```

## Simple Table (Minimal Configuration)

```tsx
import { DataTable } from '@/components/data-table';
import { ColumnDef } from '@tanstack/react-table';

interface Product {
  id: string;
  name: string;
  price: number;
}

export function ProductsTable() {
  const columns: ColumnDef<Product>[] = [
    {
      id: 'name',
      header: 'Nombre',
      cell: row => row.getValue('name')
    },
    {
      id: 'price',
      header: 'Precio',
      cell: row => `$${(row.getValue('price') as number).toFixed(2)}`
    }
  ];

  return (
    <DataTable<Product, unknown>
      columns={columns}
      tableName="products"
      fetchData={async (params) => {
        const res = await fetch('/api/products');
        const data = await res.json();
        return data;
      }}
    />
  );
}
```

## With Custom Empty State

```tsx
<DataTable
  columns={columns}
  tableName="items"
  fetchData={fetchItems}
  emptyStateContent={
    <div className="flex flex-col items-center gap-4">
      <div className="text-4xl">📦</div>
      <h3 className="font-semibold">No items yet</h3>
      <p className="text-sm text-default-500">
        Create your first item to get started
      </p>
      <button className="px-4 py-2 bg-primary text-white rounded">
        Create Item
      </button>
    </div>
  }
/>
```

## Advanced: Configuration Page Pattern

```tsx
import { DataTable } from '@/components/data-table';
import { useDialog } from '@/components/ui/DialogProvider';
import { useState } from 'react';

export function ConfigurationPage() {
  const { confirm } = useDialog();
  const [editingId, setEditingId] = useState<string | null>(null);

  const columns: ColumnDef<Config>[] = [
    {
      id: 'key',
      header: 'Clave',
      cell: row => row.getValue('key'),
      priority: 'high'
    },
    {
      id: 'value',
      header: 'Valor',
      cell: row => {
        const value = row.getValue('value') as string;
        return value.length > 50 ? value.substring(0, 50) + '...' : value;
      },
      priority: 'high'
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: row => (
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditingId(row.original.id);
            }}
            className="text-primary hover:underline"
          >
            Editar
          </button>
        </div>
      ),
      size: 100,
      priority: 'high'
    }
  ];

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        tableName="configurations"
        fetchData={async (params) => {
          // Fetch config items
          const response = await fetch('/api/configurations', {
            method: 'POST',
            body: JSON.stringify(params)
          });
          return response.json();
        }}
        bulkActions={[
          {
            label: 'Eliminar Configuraciones',
            icon: <Trash2 size={16} />,
            color: 'danger',
            requiresConfirmation: true,
            onClick: async (selectedConfigs) => {
              // Delete multiple configurations
              for (const config of selectedConfigs) {
                await fetch(`/api/configurations/${config.id}`, {
                  method: 'DELETE'
                });
              }
              // Refresh table
              window.location.reload();
            }
          }
        ]}
        onRowClick={(config) => setEditingId(config.id)}
      />

      {/* Edit modal/drawer would go here */}
    </div>
  );
}
```

## Mobile-First Column Setup

```tsx
// Define all columns, mark priority for responsive behavior
const columns: ColumnDef<Item>[] = [
  {
    id: 'id',
    header: 'ID',
    cell: row => row.getValue('id'),
    size: 60,
    priority: 'high'  // Always show
  },
  {
    id: 'name',
    header: 'Nombre',
    cell: row => row.getValue('name'),
    size: 200,
    priority: 'high'  // Always show
  },
  {
    id: 'category',
    header: 'Categoría',
    cell: row => row.getValue('category'),
    size: 150,
    priority: 'medium'  // Show on tablets+
  },
  {
    id: 'description',
    header: 'Descripción',
    cell: row => {
      const desc = row.getValue('description') as string;
      return <span className="text-default-500">{desc.substring(0, 80)}...</span>;
    },
    size: 300,
    priority: 'low'  // Hide on mobile
  },
  {
    id: 'lastModified',
    header: 'Modificado',
    cell: row => new Date(row.getValue('lastModified') as string).toLocaleDateString(),
    size: 120,
    priority: 'low'  // Hide on mobile
  },
  {
    id: 'actions',
    header: 'Acciones',
    cell: row => (
      <div className="flex gap-2">
        <button className="text-primary">Editar</button>
        <button className="text-danger">Eliminar</button>
      </div>
    ),
    size: 120,
    priority: 'high'  // Actions always visible
  }
];

// Result on different screen sizes:
// Mobile (<640px):    ID | Nombre | Acciones
// Tablet (640px+):    ID | Nombre | Categoría | Acciones
// Desktop:            ID | Nombre | Categoría | Descripción | Modificado | Acciones
```

## With Complex Sorting

```tsx
// TanStack React Table handles sorting through column definitions
const columns: ColumnDef<Order>[] = [
  {
    id: 'orderNumber',
    header: 'Número de Orden',
    cell: row => `#${row.getValue('orderNumber')}`,
    sortingFn: 'basic'  // Simple alphabetic sort
  },
  {
    id: 'amount',
    header: 'Monto',
    cell: row => `$${(row.getValue('amount') as number).toFixed(2)}`,
    sortingFn: 'basic'  // Will sort numerically due to type
  },
  {
    id: 'createdAt',
    header: 'Fecha',
    cell: row => new Date(row.getValue('createdAt') as string).toLocaleDateString(),
    sortingFn: 'datetime'  // Date-aware sorting
  }
];

// When user clicks header, sort changes:
// Click 1: ↑ (ascending)
// Click 2: ↓ (descending)
// Click 3: ↕ (no sort)
```

## Testing the Features

```tsx
// Test search
// 1. Type in search box
// 2. Verify table filters in real-time
// 3. Click clear (X) button

// Test sorting
// 1. Click column header
// 2. Verify icon changes: ↑ → ↓ → ↕
// 3. Verify data is sorted correctly

// Test pagination
// 1. Change page size: select 10, 20, 50
// 2. Navigate pages using buttons
// 3. Jump to page (if >5 pages) using input

// Test empty state
// 1. Filter to show no results
// 2. Verify "No se encontraron resultados" message
// 3. Clear filters
// 4. Verify "Sin registros" message on first load

// Test bulk actions
// 1. Select multiple rows (checkboxes)
// 2. Floating bar appears at bottom
// 3. Click action with requiresConfirmation: true
// 4. Confirm dialog appears
// 5. Click confirm
// 6. Action executes, selection clears

// Test mobile responsive
// 1. Resize browser to < 640px
// 2. Verify low-priority columns hide
// 3. Verify table remains readable
// 4. Resize back to desktop
// 5. All columns visible again
```

---

**For more details, see `ENHANCEMENTS.md`**
