"use client";

import React, { useState } from "react";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Pagination,
  Chip,
  Input,
  Button
} from "@heroui/react";

export default function AuditPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  // Simplified Mock Data based on AuditEvent Entity
  const audits = [
    {
      id: "uuid-1",
      timestampUtc: "2026-06-16T10:30:00Z",
      username: "admin",
      module: "Caja",
      action: "Apertura",
      status: "EXITOSA",
      integrityHash: "xyz123"
    },
    {
      id: "uuid-2",
      timestampUtc: "2026-06-16T11:45:22Z",
      username: "cajero_1",
      module: "Tarifas",
      action: "Actualización",
      status: "EXITOSA",
      integrityHash: "abc987"
    }
  ];

  const renderCell = (audit: any, columnKey: React.Key) => {
    const cellValue = audit[columnKey as keyof typeof audit];

    switch (columnKey) {
      case "status":
        return (
          <Chip color={cellValue === "EXITOSA" ? "success" : "danger"} size="sm" variant="flat">
            {cellValue}
          </Chip>
        );
      case "timestampUtc":
        return new Date(cellValue).toLocaleString();
      case "actions":
        return (
          <Button size="sm" variant="flat" onPress={() => console.log("Ver detalles", audit.id)}>
            Ver Detalles
          </Button>
        );
      default:
        return cellValue;
    }
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Auditoría del Sistema</h1>
        <div className="flex gap-2">
            <Input
              placeholder="Buscar por usuario o módulo..."
              value={search}
              onValueChange={setSearch}
              className="w-64"
            />
            <Button color="primary">Exportar PDF</Button>
        </div>
      </div>

      <Table
        aria-label="Tabla de registros de auditoría"
        bottomContent={
          <div className="flex w-full justify-center">
            <Pagination
              isCompact
              showControls
              showShadow
              color="primary"
              page={page}
              total={10}
              onChange={(page) => setPage(page)}
            />
          </div>
        }
      >
        <TableHeader>
          <TableColumn key="timestampUtc">FECHA Y HORA</TableColumn>
          <TableColumn key="username">USUARIO</TableColumn>
          <TableColumn key="module">MÓDULO</TableColumn>
          <TableColumn key="action">ACCIÓN</TableColumn>
          <TableColumn key="status">ESTADO</TableColumn>
          <TableColumn key="actions">ACCIONES</TableColumn>
        </TableHeader>
        <TableBody items={audits}>
          {(item) => (
            <TableRow key={item.id}>
              {(columnKey) => <TableCell>{renderCell(item, columnKey)}</TableCell>}
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
