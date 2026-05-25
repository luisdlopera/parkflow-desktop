"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Input } from "@heroui/react";
import DataTable from "@/components/ui/DataTable";
import { buildApiHeaders } from "@/lib/api";

type Space = {
  id: string;
  code: string;
  label: string | null;
  type: "GENERAL" | "CAR" | "MOTORCYCLE" | "DISABLED" | "VIP";
  status: "ACTIVE" | "INACTIVE" | "MAINTENANCE";
  sortOrder: number;
  occupied: boolean;
};

type Summary = {
  totalSpaces: number;
  activeSpaces: number;
  occupiedSpaces: number;
  availableSpaces: number;
  maintenanceSpaces: number;
  inactiveSpaces: number;
  occupancyPercentage: number;
};

export default function EspaciosPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [capacity, setCapacity] = useState("0");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:6011/api/v1";

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sumRes, spacesRes] = await Promise.all([
        fetch(`${api}/parking-spaces/summary`, { headers: await buildApiHeaders(), cache: "no-store" }),
        fetch(`${api}/parking-spaces`, { headers: await buildApiHeaders(), cache: "no-store" }),
      ]);

      const sumPayload = await sumRes.json();
      const spacesPayload = await spacesRes.json();

      if (!sumRes.ok || !spacesRes.ok) {
        setError(sumPayload?.error ?? spacesPayload?.error ?? "No se pudo cargar espacios.");
        return;
      }

      setSummary(sumPayload);
      setSpaces(spacesPayload);
      setCapacity(String(sumPayload.activeSpaces ?? 0));
    } catch {
      setError("Error de red cargando espacios del parqueadero.");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  const canReduce = useMemo(() => {
    if (!summary) return true;
    const next = Number(capacity);
    return Number.isFinite(next) && next >= summary.occupiedSpaces;
  }, [capacity, summary]);

  const onResize = useCallback(async () => {
    const next = Number(capacity);
    if (!Number.isFinite(next) || next < 0) {
      setError("Capacidad inválida.");
      return;
    }
    if (summary && next < summary.occupiedSpaces) {
      setError(`No puedes bajar de ${summary.occupiedSpaces} porque hay celdas ocupadas.`);
      return;
    }
    if (summary && next < summary.activeSpaces) {
      const ok = window.confirm("Vas a reducir capacidad. Las celdas libres de mayor número se desactivarán. ¿Continuar?");
      if (!ok) return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${api}/parking-spaces/capacity`, {
        method: "PUT",
        headers: await buildApiHeaders(),
        body: JSON.stringify({ capacity: next }),
      });
      const payload = await res.json();
      if (!res.ok) {
        setError(payload?.error ?? "No se pudo actualizar la capacidad.");
        return;
      }
      await load();
    } catch {
      setError("Error de red actualizando capacidad.");
    } finally {
      setLoading(false);
    }
  }, [api, capacity, load, summary]);

  const patchSpace = useCallback(async (id: string, body: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${api}/parking-spaces/${id}`, {
        method: "PATCH",
        headers: await buildApiHeaders(),
        body: JSON.stringify(body),
      });
      const payload = await res.json();
      if (!res.ok) {
        setError(payload?.error ?? "No se pudo actualizar la celda.");
        return;
      }
      await load();
    } catch {
      setError("Error de red actualizando celda.");
    } finally {
      setLoading(false);
    }
  }, [api, load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-amber-700/80 font-medium">Configuración</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Espacios del parqueadero</h1>
        </div>
        <Button size="sm" color="primary" variant="flat" onPress={() => void load()} isLoading={loading}>Actualizar</Button>
      </div>

      {error ? <p className="text-sm text-rose-700 font-medium">{error}</p> : null}

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <Stat label="Total" value={summary?.totalSpaces} />
        <Stat label="Activas" value={summary?.activeSpaces} />
        <Stat label="Ocupadas" value={summary?.occupiedSpaces} />
        <Stat label="Disponibles" value={summary?.availableSpaces} />
        <Stat label="Mantenimiento" value={summary?.maintenanceSpaces} />
        <Stat label="Inactivas" value={summary?.inactiveSpaces} />
        <Stat label="Ocupación" value={summary ? `${Math.round(summary.occupancyPercentage)}%` : "—"} />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col sm:flex-row gap-3 items-end">
        <Input
          type="number"
          min={0}
          label="Capacidad activa"
          value={capacity}
          onValueChange={setCapacity}
          className="max-w-xs"
        />
        <Button color="primary" onPress={() => void onResize()} isDisabled={!canReduce || loading}>Guardar capacidad</Button>
      </div>

      <DataTable
        columns={[
          { key: "code", label: "Código", priority: "high" },
          { key: "label", label: "Etiqueta", priority: "medium", render: (row) => row.label ?? "—" },
          { key: "type", label: "Tipo", priority: "medium" },
          { key: "status", label: "Estado", priority: "high" },
          { key: "occupied", label: "Ocupada", priority: "high", render: (row) => row.occupied ? "Sí" : "No" },
          {
            key: "actions",
            label: "Acciones",
            priority: "high",
            render: (row) => (
              <div className="flex gap-2">
                <Button size="sm" variant="flat" onPress={() => void patchSpace(row.id, { status: "MAINTENANCE" })} isDisabled={row.occupied}>Mantenimiento</Button>
                <Button size="sm" variant="flat" onPress={() => void patchSpace(row.id, { status: "ACTIVE" })}>Activar</Button>
                <Button size="sm" variant="flat" onPress={() => void patchSpace(row.id, { status: "INACTIVE" })} isDisabled={row.occupied}>Desactivar</Button>
              </div>
            )
          },
        ]}
        rows={spaces}
        emptyMessage="No hay celdas configuradas para este negocio."
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string | undefined }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">{label}</p>
      <p className="text-2xl font-bold text-slate-900">{value ?? "—"}</p>
    </div>
  );
}
