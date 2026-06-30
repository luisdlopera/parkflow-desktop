"use client";

import React, { useState } from "react";
import DataTable from "@/components/ui/DataTable";
import { DataTableColumn } from "@/components/data-table";

/**
 * Ejemplo práctico: Tabla de Vehículos con el nuevo sistema de tipos de columna.
 * Demuestra cómo usar el DataTable extensible con tipos nativos 
 * en lugar de funciones render manualmente.
 */

interface Vehicle {
  id: string;
  plate: string;
  vehicleType: string;
  status: "ACTIVE" | "INACTIVE" | "PENDING";
  ownerName: string;
  ownerEmail: string;
  entryDate: string;
  exitDate: string | null;
  paymentAmount: number;
  photoUrl: string | null;
  tags: string[];
}

const COLUMNS: DataTableColumn<Vehicle>[] = [
  {
    key: "plate",
    label: "Placa",
    type: "copyable",
    options: {
      toastMessage: "Placa copiada",
    },
  },
  {
    key: "vehicleType",
    label: "Tipo",
    type: "formatEnum",
    options: {
      labelMap: {
        CAR: "Carro",
        MOTORCYCLE: "Moto",
        BIKE: "Bicicleta",
        MIXED: "Mixto",
        OTHER: "Otro",
      },
    },
  },
  {
    key: "status",
    label: "Estado",
    type: "status",
    options: {
      labelMap: {
        ACTIVE: "Activo",
        INACTIVE: "Inactivo",
        PENDING: "Pendiente",
      },
      colorMap: {
        ACTIVE: "success",
        INACTIVE: "danger",
        PENDING: "warning",
      },
    },
  },
  {
    key: "ownerName",
    label: "Propietario",
    type: "text",
  },
  {
    key: "ownerEmail",
    label: "Email",
    type: "text",
  },
  {
    key: "entryDate",
    label: "Entrada",
    type: "datetime",
  },
  {
    key: "exitDate",
    label: "Salida",
    type: "datetime",
  },
  {
    key: "paymentAmount",
    label: "Valor",
    type: "currency",
    options: {
      currency: "COP",
      locale: "es-CO",
    },
  },
  {
    key: "photoUrl",
    label: "Foto",
    type: "image",
    options: {
      size: 40,
      rounded: true,
      fallback: "No foto",
    },
  },
  {
    key: "tags",
    label: "Tags",
    type: "tags",
    options: {
      maxVisible: 3,
      colorMap: {
        VIP: "warning",
        MENSUAL: "success",
        VISITA: "default",
      },
      labelMap: {
        VIP: "VIP",
        MENSUAL: "Mensual",
        VISITA: "Visita",
      },
    },
  },
];

const DATA: Vehicle[] = [
  {
    id: "1",
    plate: "ABC 123",
    vehicleType: "CAR",
    status: "ACTIVE",
    ownerName: "Carlos Rodríguez",
    ownerEmail: "carlos@example.com",
    entryDate: "2024-06-15T08:30:00",
    exitDate: null,
    paymentAmount: 5000,
    photoUrl: "https://example.com/car1.jpg",
    tags: ["VIP", "MENSUAL"],
  },
  {
    id: "2",
    plate: "XYZ 789",
    vehicleType: "MOTORCYCLE",
    status: "PENDING",
    ownerName: "María López",
    ownerEmail: "maria@example.com",
    entryDate: "2024-06-15T09:15:00",
    exitDate: "2024-06-15T12:00:00",
    paymentAmount: 3000,
    photoUrl: null,
    tags: ["VISITA"],
  },
  {
    id: "3",
    plate: "DEF 456",
    vehicleType: "BIKE",
    status: "INACTIVE",
    ownerName: "Juan Pérez",
    ownerEmail: "juan@example.com",
    entryDate: "2024-06-14T10:00:00",
    exitDate: "2024-06-14T14:00:00",
    paymentAmount: 1500,
    photoUrl: null,
    tags: [],
  },
];

export default function VehiclesPage() {
  const [data] = useState<Vehicle[]>(DATA);

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Vehículos (Ejemplo DataTable Extensible)</h1>
      <p className="text-default-500 mb-4">
        Este ejemplo muestra el nuevo sistema de tipos de columna.
        No se usa ninguna función `render` manual — todo es declarativo.
      </p>
      <DataTable<Vehicle>
        columns={COLUMNS}
        data={data}
        emptyMessage="No hay vehículos registrados"
      />
    </div>
  );
}
