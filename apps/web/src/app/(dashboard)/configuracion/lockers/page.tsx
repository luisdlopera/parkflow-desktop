"use client";

import { useCallback, useMemo, useState, useEffect } from "react";
import { Button } from "@/components/bridge/Button";
import { Input } from "@/components/bridge/Input";
import { Switch } from "@/components/bridge/Switch";
import DataTable from "@/components/ui/DataTable";
import { useDialog } from "@/providers/DialogProvider";
import { FrontendActionError } from "@/lib/errors/error-messages";
import { useAsyncAction } from "@/lib/errors/use-async-action";
import {
  fetchLockers,
  createLocker,
  createBatchLockers,
  patchLocker,
  deleteLocker,
  type LockerDto,
} from "@/lib/api/lockers-api";
import { Plus, Trash2, PackagePlus, Tags } from "lucide-react";
import { Select } from "@/components/bridge/Select";
import { ListBox } from "@heroui/react";
import { useFeatureFlags } from "@/providers/FeatureFlagProvider";
import Link from "next/link";
import { ConfigPageHeader } from "@/features/configuration/components/ui/ConfigPageHeader";

export default function LockersPage() {
  const flags = useFeatureFlags();
  const isEnabled = flags.lockers;

  const [lockers, setLockers] = useState<LockerDto[]>([]);
  const { confirm } = useDialog();

  const { run: runOp, isLoading: isOpLoading, error: opError } = useAsyncAction<unknown>({
    showErrorToast: false,
    errorContext: FrontendActionError.LOAD_DATA,
  });

  const [showCreateSingle, setShowCreateSingle] = useState(false);
  const [singleCode, setSingleCode] = useState("");
  const [singleLabel, setSingleLabel] = useState("");

  const [showBatch, setShowBatch] = useState(false);
  const [batchPrefix, setBatchPrefix] = useState("L-");
  const [batchStart, setBatchStart] = useState("1");
  const [batchEnd, setBatchEnd] = useState("10");

  const load = useCallback(async () => {
    if (!isEnabled) return;
    await runOp(async () => {
      setLockers(await fetchLockers());
    });
  }, [isEnabled, runOp]);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    const total = lockers.length;
    const active = lockers.filter((l) => l.isActive).length;
    const occupied = lockers.filter((l) => l.occupied).length;
    const available = active - occupied;
    return { total, active, occupied, available };
  }, [lockers]);

  const handleCreateSingle = useCallback(async () => {
    if (!singleCode.trim()) return;
    await runOp(async () => {
      await createLocker(singleCode.trim(), singleLabel.trim() || undefined);
      setSingleCode("");
      setSingleLabel("");
      setShowCreateSingle(false);
      await load();
    });
  }, [singleCode, singleLabel, load, runOp]);

  const handleBatch = useCallback(async () => {
    const start = Number(batchStart);
    const end = Number(batchEnd);
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 1 || end < start) {
      await runOp(() => Promise.reject(new Error("Rango inválido. El inicio debe ser >= 1 y el final >= inicio.")));
      return;
    }
    const count = end - start + 1;
    if (count > 200) {
      const ok = await confirm(`Vas a crear ${count} lockers. ¿Continuar?`);
      if (!ok) return;
    }
    await runOp(async () => {
      await createBatchLockers(batchPrefix, start, end);
      setBatchPrefix("L-");
      setBatchStart("1");
      setBatchEnd("10");
      setShowBatch(false);
      await load();
    });
  }, [batchPrefix, batchStart, batchEnd, load, confirm, runOp]);

  const handleToggle = useCallback(
    async (locker: LockerDto) => {
      await runOp(async () => {
        await patchLocker(locker.id, { isActive: !locker.isActive });
        await load();
      });
    },
    [load, runOp],
  );

  const handleStatusChange = useCallback(
    async (locker: LockerDto, newStatus: string) => {
      await runOp(async () => {
        await patchLocker(locker.id, { status: newStatus });
        await load();
      });
    },
    [load, runOp],
  );

  const handleDelete = useCallback(
    async (locker: LockerDto) => {
      const ok = await confirm(`¿Eliminar locker "${locker.code}"?`);
      if (!ok) return;
      await runOp(async () => {
        await deleteLocker(locker.id);
        await load();
      });
    },
    [load, confirm, runOp],
  );

  if (!isEnabled) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="bg-amber-50 rounded-full p-4 mb-4">
          <Tags className="w-10 h-10 text-amber-500" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Lockers no configurados</h2>
        <p className="text-default-500 max-w-md mb-6">
          Tu parqueadero actualmente no tiene habilitado el sistema de lockers para la custodia de cascos.
        </p>
        <Link href="/configuracion/operacion">
          <Button color="primary">Ir a Configuración de Operación</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ConfigPageHeader title="Lockers de Cascos" groupLabel="Estacionamiento" groupId="estacionamiento" sectionLabel="Administra los lockers numerados para guardar cascos de moto." />

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="flex gap-2">
          <Button
            size="sm"
            color="primary"
            variant="tertiary"
            onPress={() => {
              setShowBatch(false);
              setShowCreateSingle(!showCreateSingle);
            }}
            startContent={<Plus className="w-4 h-4" />}
          >
            Nuevo locker
          </Button>
          <Button
            size="sm"
            color="warning"
            variant="tertiary"
            onPress={() => {
              setShowCreateSingle(false);
              setShowBatch(!showBatch);
            }}
            startContent={<PackagePlus className="w-4 h-4" />}
          >
            Crear en lote
          </Button>
            <Button
              size="sm"
              color="primary"
              variant="outline"
              onPress={() => load()}
              isLoading={isOpLoading}
            >
              Actualizar
            </Button>
          </div>
        </div>

        {opError && (
          <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 border border-rose-100">
            {opError}
          </div>
        )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Total" value={stats.total} />
        <Stat label="Activos" value={stats.active} />
        <Stat label="Ocupados" value={stats.occupied} />
        <Stat label="Disponibles" value={stats.available} />
      </div>

      {showCreateSingle && (
        <div className="rounded-2xl border border-default-200 bg-default-50 p-4 space-y-3">
          <h3 className="font-semibold text-sm text-default-700">Nuevo locker</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              label="Código"
              placeholder="Ej: L-01"
              value={singleCode}
              onChange={(e) => setSingleCode(e.target.value)}
              className="max-w-xs"
            />
            <Input
              label="Etiqueta (opcional)"
              placeholder="Ej: Casillero esquinero"
              value={singleLabel}
              onChange={(e) => setSingleLabel(e.target.value)}
              className="max-w-sm"
            />
            <div className="flex items-end gap-2">
              <Button size="sm" color="primary" onPress={handleCreateSingle}>
                Guardar
              </Button>
              <Button size="sm" variant="ghost" onPress={() => setShowCreateSingle(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}

      {showBatch && (
        <div className="rounded-2xl border border-default-200 bg-default-50 p-4 space-y-3">
          <h3 className="font-semibold text-sm text-default-700">Crear lockers en lote</h3>
          <p className="text-xs text-default-500">
            Genera varios lockers con un prefijo común y un rango numérico. Ej: L-01, L-02, ..., L-10
          </p>
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <Input
              label="Prefijo"
              placeholder="L-"
              value={batchPrefix}
              onChange={(e) => setBatchPrefix(e.target.value)}
              className="max-w-[100px]"
            />
            <Input
              label="Inicio"
              type="number"
              min={1}
              placeholder="1"
              value={batchStart}
              onChange={(e) => setBatchStart(e.target.value)}
              className="max-w-[100px]"
            />
            <Input
              label="Final"
              type="number"
              min={1}
              placeholder="10"
              value={batchEnd}
              onChange={(e) => setBatchEnd(e.target.value)}
              className="max-w-[100px]"
            />
            <div className="flex items-end gap-2">
              <Button size="sm" color="warning" onPress={handleBatch}>
                Generar
              </Button>
              <Button size="sm" variant="ghost" onPress={() => setShowBatch(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}

      <DataTable
        columns={[
          { key: "code", label: "Locker", priority: "high" },
          {
            key: "label",
            label: "Etiqueta",
            priority: "medium",
            render: (row) => row.label ?? <span className="text-default-400">—</span>,
          },
          {
            key: "status",
            label: "Estado",
            priority: "high",
            render: (row) => (
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  row.status === "DISPONIBLE"
                    ? "bg-emerald-100 text-emerald-700"
                    : row.status === "OCUPADO"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-red-100 text-red-700"
                }`}
              >
                {row.status === "DISPONIBLE" && "Disponible"}
                {row.status === "OCUPADO" && "Ocupado"}
                {row.status === "FUERA_DE_SERVICIO" && "Fuera de servicio"}
              </span>
            ),
          },
          {
            key: "isActive",
            label: "Activo",
            priority: "medium",
            render: (row) => (
              <Switch
                isSelected={row.isActive}
                onChange={() => handleToggle(row as LockerDto)}
                size="sm" aria-label="Alternar opción"
              />
            ),
          },
          {
            key: "actions",
            label: "",
            priority: "high",
            render: (row) => (
              <div className="flex gap-2">
                {row.status !== "FUERA_DE_SERVICIO" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    color="warning"
                    isDisabled={row.occupied}
                    onPress={() => handleStatusChange(row as LockerDto, "FUERA_DE_SERVICIO")}
                  >
                    Fuera de servicio
                  </Button>
                )}
                {row.status === "FUERA_DE_SERVICIO" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    color="primary"
                    onPress={() => handleStatusChange(row as LockerDto, "DISPONIBLE")}
                  >
                    Reactivar
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  color="danger"
                  isDisabled={row.occupied}
                  onPress={() => handleDelete(row as LockerDto)}
                  startContent={<Trash2 className="w-3 h-3" />}
                >
                  Eliminar
                </Button>
              </div>
            ),
          },
        ]}
        rows={lockers}
        emptyMessage="No hay lockers configurados. Crea lockers individuales o en lote para comenzar."
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-default-200 bg-default-50 dark:bg-default-100 px-4 py-3">
      <p className="text-xs uppercase tracking-wider text-default-500 font-semibold">{label}</p>
      <p className="text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}
