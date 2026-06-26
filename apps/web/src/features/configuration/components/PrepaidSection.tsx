"use client";
import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/bridge/Button";
import DataTable from "@/components/ui/DataTable";
import { getUserFriendlyErrorMessage, FrontendActionError } from "@/lib/errors/error-messages";
import { fetchPrepaidPackages, type PrepaidPackageRow } from "@/lib/api/prepaid-api";

export default function PrepaidSection({
  canEdit,
  onNotify,
  auditReason
}: {
  canEdit: boolean;
  onNotify: (n: { kind: "ok" | "err" | "info"; text: string } | null) => void;
  auditReason: string;
}) {
  const [rows, setRows] = useState<PrepaidPackageRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchPrepaidPackages({ size: 50 });
      setRows(res.content);
    } catch (e) {
      onNotify({ kind: "err", text: getUserFriendlyErrorMessage(e, FrontendActionError.LOAD_DATA) });
    } finally {
      setLoading(false);
    }
  }, [onNotify]);

  useEffect(() => { load().catch(() => {}); }, [load]);

  return (
    <div className="space-y-4">
      <div className="surface rounded-2xl p-4 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-slate-900">Paquetes Prepagados</h2>
        <Button color="primary" variant="outline" size="md" onPress={() => { load().catch(() => {}); }} isLoading={loading}>Actualizar</Button>
      </div>
      <DataTable
        columns={[
          { key: "name", label: "Paquete" },
          { key: "hoursIncluded", label: "Horas" },
          { key: "amount", label: "Precio" },
          { key: "expiresDays", label: "Validez (días)" },
          { key: "active", label: "Activo", render: (r: PrepaidPackageRow) => (r.active ? "Sí" : "No") }
        ]}
        rows={rows}
      />
    </div>
  );
}
