"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@heroui/react";
import DataTable from "@/components/ui/DataTable";
import { buildApiHeaders } from "@/lib/api";
import { cashCurrent } from "@/lib/cash/cash-api";

type ActiveSessionRow = {
  ticketNumber: string;
  plate: string;
  vehicleType: string;
  duration: string;
  rateName: string | null;
  parkingSpaceCode?: string | null;
  parkingSpaceLabel?: string | null;
};

type Summary = {
  occupiedSpaces: number;
  totalCapacity: number;
  availableSpaces: number;
};

export default function VehiculosActivosPage() {
  const [rows, setRows] = useState<ActiveSessionRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cajaOpen, setCajaOpen] = useState<boolean | null>(null);

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:6011/api/v1/operations";

  useEffect(() => {
    const term = process.env.NEXT_PUBLIC_TERMINAL_ID?.trim() ||
      window.localStorage.getItem("parkflow_terminal_id")?.trim() || "";
    const site = process.env.NEXT_PUBLIC_PARKING_SITE?.trim() || "default";
    cashCurrent(site, term || undefined)
      .then(() => setCajaOpen(true))
      .catch(() => setCajaOpen(false));
  }, []);

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

      const summaryResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:6011/api/v1"}/parking-spaces/summary`, {
        cache: "no-store",
        headers: await buildApiHeaders()
      });
      const summaryPayload = await summaryResponse.json();
      if (summaryResponse.ok) {
        setSummary(summaryPayload);
      } else {
        setSummary(null);
      }
    } catch {
      setError("Error de red consultando vehículos activos");
      setRows([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    loadRows().catch(console.error);
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
            onPress={() => { loadRows().catch(console.error); }}
            isLoading={loading}
          >
            Actualizar
          </Button>
        </div>
      </div>

      {error ? <p className="text-sm text-rose-700 font-medium">{error}</p> : null}
      {cajaOpen === false ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          No hay caja abierta en este terminal. Debe abrir caja antes de procesar entradas o salidas.
        </div>
      ) : null}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Ocupados</p>
          <p className="text-2xl font-bold text-slate-900">{summary?.occupiedSpaces ?? rows.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Disponibles</p>
          <p className="text-2xl font-bold text-emerald-700">
            {summary ? `${summary.availableSpaces} / ${summary.totalCapacity}` : "—"}
          </p>
        </div>
      </div>

      <DataTable
        columns={[
          {
            key: "plate",
            label: "Placa",
            priority: "high",
            render: (row) => {
              if (!row.plate || row.plate.startsWith("NP-")) {
                return <span className="rounded-full bg-amber-100 text-amber-700 px-3 py-1 text-xs font-semibold">SIN PLACA</span>;
              }
              return row.plate;
            }
          },
          { key: "ticketNumber", label: "Ticket", priority: "medium" },
          { key: "vehicleType", label: "Tipo", priority: "high" },
          {
            key: "parkingSpaceCode",
            label: "Celda",
            priority: "high",
            render: (row) => row.parkingSpaceCode ?? <span className="text-slate-400">Sin asignar</span>
          },
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
