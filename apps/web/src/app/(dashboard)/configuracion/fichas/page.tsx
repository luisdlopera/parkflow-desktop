"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import DataTable from "@/components/ui/DataTable";
import { useDialog } from "@/components/ui/DialogProvider";
import { getUserFriendlyErrorMessage, FrontendActionError } from "@/lib/errors/error-messages";
import {
  fetchHelmetTokens,
  createHelmetToken,
  createBatchHelmetTokens,
  patchHelmetToken,
  deleteHelmetToken,
  type HelmetTokenDto,
} from "@/services/helmet-tokens.service";
import { Plus, Trash2, PackagePlus } from "lucide-react";

export default function FichasPage() {
  const [tokens, setTokens] = useState<HelmetTokenDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { confirm } = useDialog();

  const [showCreateSingle, setShowCreateSingle] = useState(false);
  const [singleCode, setSingleCode] = useState("");
  const [singleLabel, setSingleLabel] = useState("");

  const [showBatch, setShowBatch] = useState(false);
  const [batchPrefix, setBatchPrefix] = useState("F-");
  const [batchStart, setBatchStart] = useState("1");
  const [batchEnd, setBatchEnd] = useState("10");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTokens(await fetchHelmetTokens());
    } catch (e) {
      setError(getUserFriendlyErrorMessage(e, FrontendActionError.LOAD_DATA));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(console.error);
  }, [load]);

  const stats = useMemo(() => {
    const total = tokens.length;
    const active = tokens.filter((l) => l.isActive).length;
    const occupied = tokens.filter((l) => l.occupied).length;
    const available = active - occupied;
    return { total, active, occupied, available };
  }, [tokens]);

  const handleCreateSingle = useCallback(async () => {
    if (!singleCode.trim()) return;
    setError(null);
    try {
      await createHelmetToken(singleCode.trim(), singleLabel.trim() || undefined);
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
      const ok = await confirm(`Vas a crear ${count} fichas. ¿Continuar?`);
      if (!ok) return;
    }
    setError(null);
    try {
      const created = await createBatchHelmetTokens(batchPrefix, start, end);
      setBatchPrefix("F-");
      setBatchStart("1");
      setBatchEnd("10");
      setShowBatch(false);
      await load();
    } catch (e) {
      setError(getUserFriendlyErrorMessage(e, FrontendActionError.SAVE_DATA));
    }
  }, [batchPrefix, batchStart, batchEnd, load, confirm]);

  const handleToggle = useCallback(
    async (token: HelmetTokenDto) => {
      setError(null);
      try {
        await patchHelmetToken(token.id, { isActive: !token.isActive });
        await load();
      } catch (e) {
        setError(getUserFriendlyErrorMessage(e, FrontendActionError.CHANGE_STATUS));
      }
    },
    [load],
  );

  const handleDelete = useCallback(
    async (token: HelmetTokenDto) => {
      const ok = await confirm(`¿Eliminar ficha "${token.code}"?`);
      if (!ok) return;
      setError(null);
      try {
        await deleteHelmetToken(token.id);
        await load();
      } catch (e) {
        setError(getUserFriendlyErrorMessage(e, FrontendActionError.DELETE_DATA));
      }
    },
    [load, confirm],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-amber-700/80 font-medium">
            Configuración
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Fichas de Cascos</h1>
          <p className="text-sm text-slate-500 mt-1">
            Administra los números de ficha/casillero para guardar cascos de moto.
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
            Nueva ficha
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
        <Stat label="Activas" value={stats.active} />
        <Stat label="Ocupadas" value={stats.occupied} />
        <Stat label="Disponibles" value={stats.available} />
      </div>

      {showCreateSingle && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
          <h3 className="font-semibold text-sm text-slate-700">Nueva ficha</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              label="Código"
              placeholder="Ej: F-01"
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
          <h3 className="font-semibold text-sm text-slate-700">Crear fichas en lote</h3>
          <p className="text-xs text-slate-500">
            Genera varias fichas con un prefijo común y un rango numérico. Ej: F-01, F-02, ..., F-10
          </p>
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <Input
              label="Prefijo"
              placeholder="F-"
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
          { key: "code", label: "Ficha", priority: "high" },
          {
            key: "label",
            label: "Etiqueta",
            priority: "medium",
            render: (row) => row.label ?? <span className="text-slate-400">—</span>,
          },
          {
            key: "isActive",
            label: "Activa",
            priority: "medium",
            render: (row) => (
              <Switch
                isSelected={row.isActive}
                onChange={() => handleToggle(row as HelmetTokenDto)}
                size="sm"
              />
            ),
          },
          {
            key: "occupied",
            label: "Ocupada",
            priority: "high",
            render: (row) =>
              row.occupied ? (
                <span className="rounded-full bg-rose-100 text-rose-700 px-3 py-1 text-xs font-semibold">
                  Ocupada
                </span>
              ) : (
                <span className="text-slate-400 text-xs">Disponible</span>
              ),
          },
          {
            key: "actions",
            label: "",
            priority: "high",
            render: (row) => (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  color="danger"
                  isDisabled={row.occupied}
                  onPress={() => handleDelete(row as HelmetTokenDto)}
                  startContent={<Trash2 className="w-3 h-3" />}
                >
                  Eliminar
                </Button>
              </div>
            ),
          },
        ]}
        rows={tokens}
        emptyMessage="No hay fichas configuradas. Crea fichas individuales o en lote para comenzar."
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
