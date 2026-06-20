"use client";
import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/bridge/Button";
import { Input } from "@/components/bridge/Input";
import { Modal } from "@/components/bridge/Modal";
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

  // Form State
  const [isOpen, setIsOpen] = useState(false);
  const onOpen = () => setIsOpen(true);
  const onClose = () => setIsOpen(false);
  const [saving, setSaving] = useState(false);
  const [rates, setRates] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    plate: "",
    holderName: "",
    holderDocument: "",
    holderPhone: "",
    amount: 0,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
    rateId: "",
    site: "DEFAULT",
    status: "ACTIVE"
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { fetchMonthlyContracts, fetchRates } = await import("@/lib/settings-api");
      const [res, ratesRes] = await Promise.all([
        fetchMonthlyContracts({ plate: plate || undefined, page, size: 15 }),
        fetchRates({ active: true, size: 50 })
      ]);
      setRows(res.content);
      setTotalPages(res.totalPages);
      setRates(ratesRes.content);
      if (ratesRes.content.length > 0 && !formData.rateId) {
        setFormData(prev => ({ ...prev, rateId: ratesRes.content[0].id }));
      }
    } catch (e) {
      onNotify({ kind: "err", text: getUserFriendlyErrorMessage(e, FrontendActionError.LOAD_DATA) });
    } finally {
      setLoading(false);
    }
  }, [plate, page, onNotify, formData.rateId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { saveMonthlyContract } = await import("@/lib/settings-api");
      await saveMonthlyContract(formData, undefined, auditReason);
      onNotify({ kind: "ok", text: "Mensualidad creada exitosamente con auto-creación de Cliente y Vehículo." });
      onClose();
      load();
    } catch (e) {
      onNotify({ kind: "err", text: getUserFriendlyErrorMessage(e, FrontendActionError.SAVE_DATA) });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => { load().catch(() => {}); }, [load]);

  return (
    <div className="space-y-4">
      <div className="surface rounded-2xl p-4 flex gap-3 items-end">
        <Input label="Placa" size="sm" value={plate} onChange={(e) => setPlate(e.target.value)} className="w-48" />
        <Button color="primary" variant="outline" size="md" onPress={() => { load().catch(() => {}); }} isLoading={loading}>Buscar</Button>
        {canEdit && (
          <Button color="primary" size="md" className="ml-auto" onPress={onOpen}>
            Nuevo Contrato
          </Button>
        )}
      </div>

      <DataTable
        columns={[
          { key: "plate", label: "Placa" },
          { key: "holderName", label: "Titular" },
          { key: "startDate", label: "Desde" },
          { key: "endDate", label: "Hasta" },
          { key: "amount", label: "Valor" },
          { key: "active", label: "Activa", render: (r: any) => (r.status === 'ACTIVE' || r.active ? "Sí" : "No") }
        ]}
        rows={rows as any[]}
      />

      <div className="flex items-center gap-4">
        <Button size="sm" variant="tertiary" color="primary" isDisabled={page <= 0} onPress={() => setPage(p => Math.max(0, p - 1))}>Anterior</Button>
        <span className="text-sm">Página {page + 1} de {Math.max(1, totalPages)}</span>
        <Button size="sm" variant="tertiary" color="primary" isDisabled={page + 1 >= totalPages} onPress={() => setPage(p => p + 1)}>Siguiente</Button>
      </div>

      <Modal state={{ isOpen, setOpen: setIsOpen, open: onOpen, close: onClose, toggle: () => setIsOpen(!isOpen) }}>
        <Modal.Content>
          <Modal.Header className="flex flex-col gap-1">Crear Mensualidad (Creación Rápida)</Modal.Header>
          <Modal.Body>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-sm font-medium">Tarifa Base</label>
                <select 
                  className="w-full mt-1 p-2 border rounded-xl surface" 
                  value={formData.rateId} 
                  onChange={e => setFormData({...formData, rateId: e.target.value})}
                >
                  {rates.map(r => <option key={r.id} value={r.id}>{r.name} - ${r.amount}</option>)}
                </select>
              </div>
              <Input label="Placa" value={formData.plate} onChange={(e) => setFormData({ ...formData, plate: e.target.value })} />
              <Input label="Titular" value={formData.holderName} onChange={(e) => setFormData({ ...formData, holderName: e.target.value })} />
              <Input label="Documento" value={formData.holderDocument} onChange={(e) => setFormData({ ...formData, holderDocument: e.target.value })} />
              <Input label="Teléfono" value={formData.holderPhone} onChange={(e) => setFormData({ ...formData, holderPhone: e.target.value })} />
              <Input label="Fecha Inicio" type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} />
              <Input label="Fecha Fin" type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} />
              <Input label="Valor" type="number" value={formData.amount.toString()} onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })} />
            </div>
            <p className="text-xs text-default-500 mt-2">
              Los datos del cliente y vehículo se normalizarán y guardarán automáticamente en la nueva arquitectura.
            </p>
          </Modal.Body>
          <Modal.Footer>
            <Button color="danger" variant="light" onPress={onClose}>
              Cancelar
            </Button>
            <Button color="primary" onPress={handleSave} isLoading={saving} isDisabled={!formData.rateId || !formData.plate || !formData.holderName}>
              Guardar
            </Button>
          </Modal.Footer>
        </Modal.Content>
      </Modal>
    </div>
  );
}
