"use client";
import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/bridge/Button";
import { Input } from "@/components/bridge/Input";
import DataTable from "@/components/ui/DataTable";
import { getUserFriendlyErrorMessage, FrontendActionError } from "@/lib/errors/error-messages";
import type { MonthlyContractRow } from "@/lib/settings-api";

export default function MonthlySection({
  canEdit,
  onNotify,
  auditReason
}: {
  canEdit: boolean;
  onNotify: (n: { kind: "ok" | "err" | "info"; text: string } | null) => void;
  auditReason: string;
}) {
  const [rows, setRows] = useState<MonthlyContractRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [plate, setPlate] = useState("");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { fetchMonthlyContracts } = await import("@/lib/settings-api");
      const res = await fetchMonthlyContracts({ plate: plate || undefined, page, size: 15 });
      setRows(res.content);
      setTotalPages(res.totalPages);
    } catch (e) {
      onNotify({ kind: "err", text: getUserFriendlyErrorMessage(e, FrontendActionError.LOAD_DATA) });
    } finally {
      setLoading(false);
    }
  }, [plate, page, onNotify]);

  useEffect(() => { load().catch(() => {}); }, [load]);

  return (
    <div className="space-y-4">
      <div className="surface rounded-2xl p-4 flex gap-3 items-end">
        <Input label="Placa"  size="sm" value={plate} onChange={(e) => setPlate(e.target.value)} className="w-48" />
        <Button color="primary" variant="outline" size="md" onPress={() => { load().catch(() => {}); }} isLoading={loading}>Buscar</Button>
      </div>
      <DataTable
        columns={[
          { key: "plate", label: "Placa" },
          { key: "holderName", label: "Titular" },
          { key: "startDate", label: "Desde" },
          { key: "endDate", label: "Hasta" },
          { key: "amount", label: "Valor" },
          { key: "active", label: "Activa", render: (r: any) => (r.active ? "Sí" : "No") }
        ]}
        rows={rows as any[]}
      />
      <div className="flex items-center gap-4">
        <Button size="sm" variant="tertiary" color="primary" isDisabled={page <= 0} onPress={() => setPage(p => Math.max(0, p - 1))}>Anterior</Button>
        <span className="text-sm">Página {page + 1} de {Math.max(1, totalPages)}</span>
        <Button size="sm" variant="tertiary" color="primary" isDisabled={page + 1 >= totalPages} onPress={() => setPage(p => p + 1)}>Siguiente</Button>
      </div>
    </div>
  );
}
