"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@heroui/react";
import DataTable from "@/components/ui/DataTable";
import { buildApiHeaders } from "@/lib/api";

type ActiveSessionRow = {
  ticketNumber: string;
  plate: string;
  vehicleType: string;
  duration: string;
  rateName: string | null;
};

export default function VehiculosActivosPage() {
  const [rows, setRows] = useState<ActiveSessionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:6011/api/v1/operations";

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${apiBase.replace(/\/$/, "")}/sessions/active-list`, {
        cache: "no-store",
        headers: await buildApiHeaders()
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error ?? "No se pudo cargar el listado");
        setRows([]);
        return;
      }

      setRows(payload);
    } catch {
      setError("Error de red consultando vehículos activos");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm uppercase tracking-[0.3em] text-amber-700/80 font-medium">
            Control Diario
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Vehículos Activos</h1>
        </div>
        <div className="flex items-center gap-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {loading ? "Cargando..." : `${rows.length} vehículos en patio`}
          </p>
          <Button
            size="sm"
            variant="flat"
            color="primary"
            className="font-bold"
            onPress={() => void loadRows()}
            isLoading={loading}
          >
            Actualizar
          </Button>
        </div>
      </div>

      {error ? <p className="text-sm text-rose-700 font-medium">{error}</p> : null}

      <DataTable
        columns={[
          { key: "plate", label: "Placa", priority: "high" },
          { key: "ticketNumber", label: "Ticket", priority: "medium" },
          { key: "vehicleType", label: "Tipo", priority: "high" },
          { key: "duration", label: "Tiempo", priority: "medium" },
          {
            key: "rateName",
            label: "Tarifa",
            priority: "low",
            render: (row) => row.rateName ?? <span className="text-slate-400">Sin tarifa</span>
          }
        ]}
        rows={rows}
        emptyMessage="No hay vehículos activos en este momento."
      />
    </div>
  );
}
