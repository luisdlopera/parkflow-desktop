"use client";
import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/bridge/Button";
import { Input } from "@/components/bridge/Input";
import DataTable from "@/components/ui/DataTable";
import { errorService } from "@/lib/errors/error-service";
import { fetchAgreements, type AgreementRow } from "@/lib/api/agreements-api";

export default function AgreementsSection({
  canEdit,
  onNotify,
  auditReason
}: {
  canEdit: boolean;
  onNotify: (n: { kind: "ok" | "err" | "info"; text: string } | null) => void;
  auditReason: string;
}) {
  const [rows, setRows] = useState<AgreementRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAgreements({ q: q || undefined, page, size: 15 });
      setRows(res.content);
      setTotalPages(res.totalPages);
    } catch (e) {
      onNotify({ kind: "err", text: errorService.normalize(e).message });
    } finally {
      setLoading(false);
    }
  }, [q, page, onNotify]);

  useEffect(() => { load().catch(() => {}); }, [load]);

  return (
    <div className="space-y-4">
      <div className="surface rounded-2xl p-4 flex gap-3 items-end">
        <Input label="Buscar"  size="sm" value={q} onChange={(e) => setQ(e.target.value)} className="w-64" placeholder="Empresa o código..." />
        <Button color="primary" variant="outline" size="md" onPress={() => { load().catch(() => {}); }} isLoading={loading}>Buscar</Button>
      </div>
      <DataTable
        columns={[
          { key: "code", label: "Código" },
          { key: "companyName", label: "Empresa" },
          { key: "discountPercent", label: "Descuento", render: (r: AgreementRow) => `${r.discountPercent}%` },
          { key: "flatAmount", label: "Tarifa Fija", render: (r: AgreementRow) => r.flatAmount ? `$${r.flatAmount}` : "-" },
          { key: "active", label: "Activo", render: (r: AgreementRow) => (r.active ? "Sí" : "No") }
        ]}
        rows={rows}
      />
    </div>
  );
}
