import { Table } from '@tanstack/react-table';
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@heroui/react';
import { Button } from '@/components/bridge/Button';
import { Columns } from 'lucide-react';

interface DataTableColumnsProps<TData> {
  table: Table<TData>;
}

export function DataTableColumns<TData>({ table }: DataTableColumnsProps<TData>) {
  return (
    <Dropdown>
      <DropdownTrigger>
        <Button 
          variant="ghost" 
          startContent={<Columns size={16} />}
          className="hidden sm:flex"
        >
          Columnas
        </Button>
      </DropdownTrigger>
      <DropdownMenu
        aria-label="Toggle columns"
        selectionMode="multiple"
        selectedKeys={table.getVisibleFlatColumns().map(c => c.id)}
        onSelectionChange={(keys) => {
          if (keys === 'all') {
            table.toggleAllColumnsVisible(true);
          } else {
            const selectedSet = new Set(Array.from(keys).map(k => String(k)));
            table.getAllLeafColumns().forEach(col => {
              col.toggleVisibility(selectedSet.has(col.id));
            });
          }
        }}
      >
        {table.getAllLeafColumns().map(column => {
          return (
            <DropdownItem key={column.id} className="capitalize">
              {typeof column.columnDef.header === 'string' 
                ? column.columnDef.header 
                : column.id}
            </DropdownItem>
          );
        })}
      </DropdownMenu>
    </Dropdown>
  );
}
