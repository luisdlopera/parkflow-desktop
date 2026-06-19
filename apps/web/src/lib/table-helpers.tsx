"use client";

import type { DataTableColumn } from "@/components/ui/DataTable";
import { Badge } from "@/components/bridge/Badge";

export function statusColumn<T extends { isActive?: boolean; status?: string }>(
  label: string = "Estado"
): DataTableColumn<T> {
  return {
    key: "status",
    label,
    priority: "high",
    render: (row) => {
      const isActive = row.isActive ?? (row.status === "ACTIVE");
      return (
        <Badge color={isActive ? "success" : "default"}>
          {isActive ? "Activo" : "Inactivo"}
        </Badge>
      );
    },
  };
}

export function dateColumn<T extends { createdAt?: string; updatedAt?: string }>(
  key: "createdAt" | "updatedAt",
  label: string
): DataTableColumn<T> {
  return {
    key,
    label,
    priority: "medium",
    render: (row) => {
      const date = row[key];
      if (!date) return "—";
      return new Date(date).toLocaleDateString("es-CO", {
        year: "numeric",
        month: "short",
        day: "2-digit",
      });
    },
  };
}

export function actionsColumn<T>(
  label: string = "Acciones",
  actions: Array<{
    label: string;
    onClick: (row: T) => void;
    variant?: "tertiary" | "destructive";
    disabled?: (row: T) => boolean;
  }>
): DataTableColumn<T> {
  return {
    key: "actions",
    label,
    priority: "high",
    render: (row) => (
      <div className="flex gap-2">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={() => action.onClick(row)}
            disabled={action.disabled?.(row)}
            className="px-3 py-1 text-sm rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {action.label}
          </button>
        ))}
      </div>
    ),
  };
}
