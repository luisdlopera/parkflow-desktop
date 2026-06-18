"use client";

import { useCallback, useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import DataTable from "@/components/ui/DataTable";
import { useDialog } from "@/components/ui/DialogProvider";
import { getUserFriendlyErrorMessage, FrontendActionError } from "@/lib/errors/error-messages";
import {
  fetchLockers,
  createLocker,
  createBatchLockers,
  patchLocker,
  deleteLocker,
  type LockerDto,
} from "@/services/lockers.service";
import { Plus, Trash2, PackagePlus, Tags } from "lucide-react";
import { Select } from "@/components/ui/Select";
import { ListBox } from "@heroui/react";
import { useRuntimeConfig } from "@/lib/useRuntimeConfig";
import Link from "next/link";

export default function LockersPage() {
  const { config } = useRuntimeConfig();
  const helmetHandling = config?.operationConfiguration?.helmetHandling;
  const isEnabled = helmetHandling === "LOCKERS";

  const [lockers, setLockers] = useState<LockerDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { confirm } = useDialog();

  const [showCreateSingle, setShowCreateSingle] = useState(false);
  const [singleCode, setSingleCode] = useState("");
  const [singleLabel, setSingleLabel] = useState("");

  const [showBatch, setShowBatch] = useState(false);
  const [batchPrefix, setBatchPrefix] = useState("L-");
  const [batchStart, setBatchStart] = useState("1");
  const [batchEnd, setBatchEnd] = useState("10");

  const load = useCallback(async () => {
    if (!isEnabled) return;
    setLoading(true);
    setError(null);
    try {
      setLockers(await fetchLockers());
    } catch (e) {
      setError(getUserFriendlyErrorMessage(e, FrontendActionError.LOAD_DATA));
    } finally {
      setLoading(false);
    }
  }, [isEnabled]);

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
    setError(null);
    try {
      await createLocker(singleCode.trim(), singleLabel.trim() || undefined);
      setSingleCode("");
      setSingleLabel("");
      setShowCreateSingle(false);
      await load();
    } catch (e) {
      setError(getUserFriendlyErrorMessage(e, FrontendActionError.SAVE_DATA));
    }
  }, [singleCode, singleLabel, load]);

  const handleBatch = useCallback(async () => {
    const start = Number(batchStart);
    const end = Number(batchEnd);
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 1 || end < start) {
      setError("Rango inválido. El inicio debe ser >= 1 y el final >= inicio.");
      return;
    }
    const count = end - start + 1;
    if (count > 200) {
      const ok = await confirm(`Vas a crear ${count} lockers. ¿Continuar?`);
      if (!ok) return;
    }
    setError(null);
    try {
      const created = await createBatchLockers(batchPrefix, start, end);
      setBatchPrefix("L-");
      setBatchStart("1");
      setBatchEnd("10");
      setShowBatch(false);
      await load();
    } catch (e) {
      setError(getUserFriendlyErrorMessage(e, FrontendActionError.SAVE_DATA));
    }
  }, [batchPrefix, batchStart, batchEnd, load, confirm]);

  const handleToggle = useCallback(
    async (locker: LockerDto) => {
      setError(null);
      try {
        await patchLocker(locker.id, { isActive: !locker.isActive });
        await load();
      } catch (e) {
        setError(getUserFriendlyErrorMessage(e, FrontendActionError.CHANGE_STATUS));
      }
    },
    [load],
  );

  const handleStatusChange = useCallback(
    async (locker: LockerDto, newStatus: string) => {
      setError(null);
      try {
        await patchLocker(locker.id, { status: newStatus });
        await load();
      } catch (e) {
        setError(getUserFriendlyErrorMessage(e, FrontendActionError.CHANGE_STATUS));
      }
    },
    [load],
  );

  const handleDelete = useCallback(
    async (locker: LockerDto) => {
      const ok = await confirm(`¿Eliminar locker "${locker.code}"?`);
      if (!ok) return;
      setError(null);
      try {
        await deleteLocker(locker.id);
        await load();
      } catch (e) {
        setError(getUserFriendlyErrorMessage(e, FrontendActionError.DELETE_DATA));
      }
    },
    [load, confirm],
  );

  if (!isEnabled) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="bg-amber-50 rounded-full p-4 mb-4">
          <Tags className="w-10 h-10 text-amber-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Lockers no configurados</h2>
        <p className="text-slate-500 max-w-md mb-6">
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
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-amber-700/80 font-medium">
            Configuración
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Lockers de Cascos</h1>
          <p className="text-sm text-slate-500 mt-1">
            Administra los lockers numerados para guardar cascos de moto.
          </p>
        </div>
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
            isLoading={loading}
          >
            Actualizar
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 border border-rose-100">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Total" value={stats.total} />
        <Stat label="Activos" value={stats.active} />
        <Stat label="Ocupados" value={stats.occupied} />
        <Stat label="Disponibles" value={stats.available} />
      </div>

      {showCreateSingle && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
          <h3 className="font-semibold text-sm text-slate-700">Nuevo locker</h3>
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
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
          <h3 className="font-semibold text-sm text-slate-700">Crear lockers en lote</h3>
          <p className="text-xs text-slate-500">
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
            render: (row) => row.label ?? <span className="text-slate-400">—</span>,
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
                size="sm"
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
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">{label}</p>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
