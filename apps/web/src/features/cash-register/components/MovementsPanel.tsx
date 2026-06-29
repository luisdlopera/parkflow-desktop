"use client";
import React, { useMemo } from "react";
import DataTable, { type DataTableColumn } from "@/components/ui/DataTable";
import { Button } from "@/components/bridge/Button";
import { ListBox } from "@heroui/react";
import type { CashMovementDto } from "@/lib/cash/cash-api";

export default function MovementsPanel({ p }: { p: any }) {
  const movementColumns = useMemo<DataTableColumn<CashMovementDto>[]>(() => {
    const cols = [
      { key: "createdAt", label: "Fecha", render: (m: CashMovementDto) => new Date(m.createdAt).toLocaleString() },
      { key: "movementType", label: "Tipo" },
      { key: "paymentMethod", label: "Medio" },
      { key: "amount", label: "Valor", align: "right" as const },
      { key: "registrar", label: "Registra", render: (m: any) => m.createdByName ?? m.createdById?.slice(0, 8) },
      { key: "terminal", label: "Equipo", render: (m: any) => m.terminal ?? "—" },
      { key: "status", label: "Estado" },
      {
        key: "actions",
        label: "Acciones",
        render: (m: any) =>
          m.status === "POSTED" && m.movementType !== "VOID_OFFSET" && p.perms.canVoid ? (
            <Button size="sm" variant="tertiary" color="danger" onPress={() => p.setVoidTarget(m.id)}>
              Anular
            </Button>
          ) : null,
      },
    ];
    return cols;
  }, [p.perms.canVoid, p.setVoidTarget]);

  return (
    <>
      <div className="surface rounded-2xl p-4 sm:p-6 mt-4">
        <h2 className="text-lg font-semibold text-foreground">Movimientos</h2>
        <div className="mt-4 flex flex-wrap gap-4 mb-6">
          {/* Filters are handled at page level; keep placeholder area to preserve layout */}
        </div>

        <DataTable columns={movementColumns} rows={p.movements} />
        {p.movements.length === 0 && p.isOpen ? (
          <p className="mt-3 text-xs text-default-500 text-center">No hay movimientos registrados en esta sesión.</p>
        ) : null}

        {/* Manual movement form is rendered elsewhere */}
      </div>
    </>
  );
}
