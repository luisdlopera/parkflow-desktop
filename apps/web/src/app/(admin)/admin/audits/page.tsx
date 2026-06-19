"use client";

import React, { useState } from "react";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Input
} from "@heroui/react";
import { Button } from "@/components/bridge/Button";

export default function AuditPage() {
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

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Auditoría del Sistema</h1>
        <div className="flex gap-2">
            <Input
              placeholder="Buscar por usuario o módulo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64" aria-label="Entrada de texto"
            />
            <Button color="primary">Exportar PDF</Button>
        </div>
      </div>

      <Table
        aria-label="Tabla de registros de auditoría"
      >
        <TableHeader>
          <TableColumn>FECHA Y HORA</TableColumn>
          <TableColumn>USUARIO</TableColumn>
          <TableColumn>MÓDULO</TableColumn>
          <TableColumn>ACCIÓN</TableColumn>
          <TableColumn>ESTADO</TableColumn>
          <TableColumn>ACCIONES</TableColumn>
        </TableHeader>
        <TableBody>
          {audits.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{new Date(item.timestampUtc).toLocaleString()}</TableCell>
              <TableCell>{item.username}</TableCell>
              <TableCell>{item.module}</TableCell>
              <TableCell>{item.action}</TableCell>
              <TableCell>
                <Chip color={item.status === "EXITOSA" ? "success" : "danger"} size="sm">
                  {item.status}
                </Chip>
              </TableCell>
              <TableCell>
                <Button size="sm" variant="ghost" onPress={() => console.log("Ver detalles", item.id)}>
                  Ver Detalles
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
