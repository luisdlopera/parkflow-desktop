"use client";

import { FrontendActionError } from "@/lib/errors/error-messages";
import { useAsyncAction } from "@/lib/errors/use-async-action";
import { ConfigPageHeader } from "@/features/configuration/components/ui/ConfigPageHeader";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Tabs, Tab } from "@/components/bridge/Tabs";
import { Button } from "@/components/bridge/Button";
import { Input } from "@/components/bridge/Input";
import DataTable from "@/components/ui/DataTable";
import { useDialog } from "@/components/ui/DialogProvider";
import {
  fetchParkingSpacesSummary,
  fetchParkingSpaces,
  putParkingSpacesCapacity,
  patchParkingSpace,
  type ParkingSpaceSummary,
  type ParkingSpace,
} from "@/lib/api/sites-api";

export default function EspaciosPage() {
  const [summary, setSummary] = useState<ParkingSpaceSummary | null>(null);
  const [spaces, setSpaces] = useState<ParkingSpace[]>([]);
  const [capacity, setCapacity] = useState("0");
  const [filter, setFilter] = useState("ACTIVE");
  const [error, setError] = useState<string | null>(null);
  const { confirm } = useDialog();
  const { run: runLoad, isLoading: isLoadLoading } = useAsyncAction({ errorContext: FrontendActionError.LOAD_DATA, showErrorToast: true });
  const { run: runSave, isLoading: isSaveLoading } = useAsyncAction({ errorContext: FrontendActionError.SAVE_DATA, showErrorToast: true });

  const load = useCallback(async () => {
    await runLoad(async () => {
      const [sumPayload, spacesPayload] = await Promise.all([
        fetchParkingSpacesSummary(),
        fetchParkingSpaces(filter),
      ]);
      setSummary(sumPayload);
      setSpaces(spacesPayload);
      setCapacity(String(sumPayload.activeSpaces ?? 0));
    });
  }, [filter, runLoad]);

  useEffect(() => {
    load().catch(() => {});
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
      const ok = await confirm("Vas a reducir capacidad. Las celdas libres de mayor número se desactivarán. ¿Continuar?");
      if (!ok) return;
    }

    await runSave(async () => {
      await putParkingSpacesCapacity(next);
      await load();
    });
  }, [capacity, load, summary, confirm, runSave]);

  const onPatchSpace = useCallback(async (id: string, body: Record<string, unknown>) => {
    await runSave(async () => {
      await patchParkingSpace(id, body);
      await load();
    });
  }, [load, runSave]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <ConfigPageHeader title="Espacios del parqueadero" groupLabel="Estacionamiento" groupId="estacionamiento" sectionLabel="Distribución de espacios" />
        <Button size="sm" color="primary" variant="tertiary" onPress={() => { load().catch(() => {}); }} isLoading={isLoadLoading || isSaveLoading}>Actualizar</Button>
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
          onChange={(e) => setCapacity(e.target.value)}
          className="max-w-xs"
        />
        <Button color="primary" onPress={() => { onResize().catch(() => {}); }} isDisabled={!canReduce || isSaveLoading}>Guardar capacidad</Button>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Tabs 
          selectedKey={filter} 
          onSelectionChange={(k) => setFilter(String(k))}


          className="gap-6"
        >
          <Tab key="ACTIVE" title="Activas" />
          <Tab key="INACTIVE" title="Inactivas" />
          <Tab key="ALL" title="Todas" />
        </Tabs>
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
                <Button size="sm" variant="tertiary" onPress={() => { onPatchSpace(row.id, { status: "MAINTENANCE" }).catch(() => {}); }} isDisabled={row.occupied}>Mantenimiento</Button>
                <Button size="sm" variant="tertiary" onPress={() => { onPatchSpace(row.id, { status: "ACTIVE" }).catch(() => {}); }}>Activar</Button>
                <Button size="sm" variant="tertiary" onPress={() => { onPatchSpace(row.id, { status: "INACTIVE" }).catch(() => {}); }} isDisabled={row.occupied}>Desactivar</Button>
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

function Stat({ label, value }: Readonly<{ label: string; value: number | string | undefined }>) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">{label}</p>
      <p className="text-2xl font-bold text-slate-900">{value ?? "—"}</p>
    </div>
  );
}
