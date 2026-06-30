"use client";

import React, { useState } from "react";
import DataTable from "@/components/ui/DataTable";
import { DataTableColumn } from "@/components/data-table";

/**
 * Ejemplo práctico: Tabla de Usuarios con el nuevo sistema de tipos de columna.
 */

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
}

const COLUMNS: DataTableColumn<User>[] = [
  {
    key: "name",
    label: "Nombre",
    type: "text",
  },
  {
    key: "email",
    label: "Email",
    type: "copyable",
    options: { toastMessage: "Email copiado" },
  },
  {
    key: "role",
    label: "Rol",
    type: "formatEnum",
    options: {
      labelMap: {
        ADMIN: "Administrador",
        OPERATOR: "Operador",
        MANAGER: "Gerente",
      },
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
  {
    key: "createdAt",
    label: "Fecha de creación",
    type: "datetime",
  },
];

const DATA: User[] = [
  { id: "1", name: "Juan Pérez", email: "juan@parkflow.com", role: "ADMIN", status: "ACTIVE", createdAt: "2024-01-15T09:00:00" },
  { id: "2", name: "María López", email: "maria@parkflow.com", role: "OPERATOR", status: "INACTIVE", createdAt: "2024-03-20T14:30:00" },
  { id: "3", name: "Carlos Ruiz", email: "carlos@parkflow.com", role: "MANAGER", status: "ACTIVE", createdAt: "2024-05-10T11:15:00" },
];

export default function UsersPage() {
  const [data] = useState<User[]>(DATA);

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Usuarios (Ejemplo DataTable)</h1>
      <DataTable<User> columns={COLUMNS} data={data} emptyMessage="No hay usuarios registrados" />
    </div>
  );
}
