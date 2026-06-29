"use client";
import { Popover } from "@heroui/react";
import { Button } from "@/components/bridge/Button";
import { Columns } from "lucide-react";
import { useColumnVisibility, type ColumnDef } from "../hooks/useColumnVisibility";

export function ColumnVisibilityPopover() {
  const { columns, visible, toggleColumn, resetColumns } = useColumnVisibility();

  return (
    <Popover>
      <Button size="sm" variant="ghost" color="default" isIconOnly aria-label="Columnas visibles">
        <Columns className="h-4 w-4 text-default-500" />
      </Button>
      <Popover.Content className="w-56" placement="bottom end">
        <Popover.Dialog>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">Columnas visibles</p>
              <button
                onClick={resetColumns}
                className="text-xs text-brand-600 dark:text-brand-300 hover:text-brand-800 dark:text-brand-100 font-medium"
              >
                Restaurar
              </button>
            </div>
            <div className="space-y-1">
              {columns.map((col: ColumnDef) => (
                <label
                  key={col.key}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-default-50 cursor-pointer text-sm"
                >
                  <input
                    type="checkbox"
                    checked={visible.has(col.key)}
                    onChange={() => toggleColumn(col.key)}
                    className="rounded border-default-300 text-brand-600 dark:text-brand-300 focus:ring-brand-500 dark:focus:ring-brand-400"
                  />
                  <span className="text-default-700">{col.label}</span>
                </label>
              ))}
            </div>
          </div>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
