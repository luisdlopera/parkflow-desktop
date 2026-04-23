"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

  const apiBase = useMemo(
    () => process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080/api/v1/operations",
    []
  );

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${apiBase}/sessions/active-list`, {
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
      setError("Error de red consultando vehiculos activos");
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
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-amber-700/80">
          Control diario
        </p>
        <h1 className="text-3xl font-semibold text-slate-900">Vehiculos activos</h1>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">
          {loading ? "Cargando..." : `${rows.length} vehiculos activos`}
        </p>
        <button
          type="button"
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700"
          onClick={() => void loadRows()}
          disabled={loading}
        >
          Actualizar
        </button>
      </div>

      {error ? <p className="text-sm text-rose-700">{error}</p> : null}

      <DataTable
        columns={[
          { key: "ticketNumber", label: "Ticket" },
          { key: "plate", label: "Placa" },
          { key: "vehicleType", label: "Tipo" },
          { key: "duration", label: "Tiempo" },
          {
            key: "rateName",
            label: "Tarifa",
            render: (row) => row.rateName ?? "Sin tarifa"
          }
        ]}
        rows={rows}
      />
    </div>
  );
}
