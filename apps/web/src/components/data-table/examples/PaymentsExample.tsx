"use client";

import React, { useState } from "react";
import DataTable from "@/components/ui/DataTable";
import { DataTableColumn } from "@/components/data-table";

/**
 * Ejemplo práctico: Tabla de Pagos con el nuevo sistema de tipos de columna.
 */

interface Payment {
  id: string;
  amount: number;
  method: string;
  date: string;
  status: "PAID" | "UNPAID" | "PENDING";
  reference: string;
}

const COLUMNS: DataTableColumn<Payment>[] = [
  {
    key: "reference",
    label: "Referencia",
    type: "copyable",
    options: { toastMessage: "Referencia copiada" },
  },
  {
    key: "amount",
    label: "Monto",
    type: "currency",
    options: { currency: "COP", locale: "es-CO" },
  },
  {
    key: "method",
    label: "Método",
    type: "formatEnum",
    options: {
      labelMap: {
        CASH: "Efectivo",
        CARD: "Tarjeta",
        TRANSFER: "Transferencia",
      },
    },
  },
  {
    key: "date",
    label: "Fecha",
    type: "datetime",
  },
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

const DATA: Payment[] = [
  { id: "1", amount: 15000, method: "CASH", date: "2024-06-15T10:00:00", status: "PAID", reference: "PAY-001" },
  { id: "2", amount: 25000, method: "CARD", date: "2024-06-15T11:30:00", status: "PENDING", reference: "PAY-002" },
];

export default function PaymentsPage() {
  const [data] = useState<Payment[]>(DATA);

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Pagos (Ejemplo DataTable)</h1>
      <DataTable<Payment> columns={COLUMNS} data={data} emptyMessage="No hay pagos registrados" />
    </div>
  );
}
