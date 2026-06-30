"use client";

import React, { useState } from "react";
import DataTable from "@/components/ui/DataTable";
import { DataTableColumn } from "@/components/data-table";

/**
 * Ejemplo práctico: Tabla de Auditoría con el nuevo sistema de tipos de columna.
 */

interface AuditLog {
  id: string;
  user: string; // Simula una relación a usuario
  action: string;
  changes: Record<string, unknown>; // Cambios como JSON
  timestamp: string;
}

const COLUMNS: DataTableColumn<AuditLog>[] = [
  {
    key: "timestamp",
    label: "Fecha",
    type: "datetime",
  },
  {
    key: "user",
    label: "Usuario",
    type: "text",
  },
  {
    key: "action",
    label: "Acción",
    type: "badge",
    options: {
      labelMap: { CREATE: "Creación", UPDATE: "Actualización", DELETE: "Eliminación" },
      colorMap: { CREATE: "success", UPDATE: "warning", DELETE: "danger" },
    },
  },
  {
    key: "changes",
    label: "Cambios",
    type: "json",
    options: {
      collapsed: true,
      maxLength: 80,
      pretty: false,
    },
  },
];

const DATA: AuditLog[] = [
  {
    id: "1",
    user: "Juan爪子 Perez",
    action: "UPDATE",
    changes: { name: { from: "Carlos", to: "Juan" }, email: { from: "c@ej.com", to: "j@ej.com" } },
    timestamp: "2024-06-15T10:30:00",
  },
  {
    id: "2",
    user: "Sistema",
    action: "CREATE",
    changes: { id: "123", type: "USER", role: "ADMIN" },
    timestamp: "2024-06-15T11:00:00",
  },
  {
    id: "3",
    user: "María Ló иск",
    action: "DELETE",
    changes: { id: "456", reason: "Inactivity" },
    timestamp: "2024-06-15T12:15:00",
  },
];

export default function AuditPage() {
  const [data] = useState<AuditLog[]>(DATA);

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Auditoría (Ejemplo DataTable)</h1>
      <DataTable<AuditLog> columns={COLUMNS} data={data} emptyMessage="No hay registros de auditoría" />
    </div>
  );
}
