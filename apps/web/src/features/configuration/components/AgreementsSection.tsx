"use client";
import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import DataTable from "@/components/ui/DataTable";
import { getUserFriendlyErrorMessage, FrontendActionError } from "@/lib/errors/error-messages";
import type { AgreementRow } from "@/lib/settings-api";

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
      const { fetchAgreements } = await import("@/lib/settings-api");
      const res = await fetchAgreements({ q: q || undefined, page, size: 15 });
      setRows(res.content);
      setTotalPages(res.totalPages);
    } catch (e) {
      onNotify({ kind: "err", text: getUserFriendlyErrorMessage(e, FrontendActionError.LOAD_DATA) });
    } finally {
      setLoading(false);
    }
  }, [q, page, onNotify]);

  useEffect(() => { load().catch(console.error); }, [load]);

  return (
    <div className="space-y-4">
      <div className="surface rounded-2xl p-4 flex gap-3 items-end">
        <Input label="Buscar"  size="sm" value={q} onChange={(e) => setQ(e.target.value)} className="w-64" placeholder="Empresa o código..." />
        <Button color="primary" variant="outline" size="md" onPress={() => { load().catch(console.error); }} isLoading={loading}>Buscar</Button>
      </div>
      <DataTable
        columns={[
          { key: "code", label: "Código" },
          { key: "companyName", label: "Empresa" },
          { key: "discountPercent", label: "Descuento", render: (r: any) => `${r.discountPercent}%` },
          { key: "flatAmount", label: "Tarifa Fija", render: (r: any) => r.flatAmount ? `$${r.flatAmount}` : "-" },
          { key: "active", label: "Activo", render: (r: any) => (r.active ? "Sí" : "No") }
        ]}
        rows={rows as any[]}
      />
    </div>
  );
}
