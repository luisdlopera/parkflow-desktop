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
        <Columns className="h-4 w-4 text-slate-500" />
      </Button>
      <Popover.Content className="w-56" placement="bottom end">
        <Popover.Dialog>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">Columnas visibles</p>
              <button
                onClick={resetColumns}
                className="text-xs text-primary-600 hover:text-primary-800 font-medium"
              >
                Restaurar
              </button>
            </div>
            <div className="space-y-1">
              {columns.map((col: ColumnDef) => (
                <label
                  key={col.key}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer text-sm"
                >
                  <input
                    type="checkbox"
                    checked={visible.has(col.key)}
                    onChange={() => toggleColumn(col.key)}
                    className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-slate-700">{col.label}</span>
                </label>
              ))}
            </div>
          </div>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
