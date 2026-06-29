"use client";
import { ListBox } from "@heroui/react";
import { Select } from "@/components/bridge/Select";
import { Button } from "@/components/bridge/Button";
import { Switch } from "@/components/bridge/Switch";
import { Input } from "@/components/bridge/Input";
import { useDialog } from "@/providers/DialogProvider";
import DataTable from "@/components/ui/DataTable";
import { Dropdown, DropdownMenu, DropdownItem } from "@/components/bridge/Dropdown";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { VehicleTypeIcon } from "@/components/vehicles/VehicleTypeIcon";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getUserFriendlyErrorMessage, FrontendActionError } from "@/lib/errors/error-messages";
import type { DataTableColumn } from "@/components/ui/DataTable";
import {
  fetchMasterVehicleTypes,
  saveMasterVehicleType,
  patchVehicleTypeStatus,
  deleteVehicleType,
  type MasterVehicleTypeRow,
} from "@/lib/api/vehicle-types-api";

type VehicleTypeFormState = {
  code: string;
  name: string;
  icon: string;
  color: string;
  requiresPlate: boolean;
  hasOwnRate: boolean;
  quickAccess: boolean;
  requiresPhoto: boolean;
  displayOrder: number;
};

const defaultVehicleTypeForm: VehicleTypeFormState = {
  code: "",
  name: "",
  icon: "",
  color: "#2563EB",
  requiresPlate: true,
  hasOwnRate: true,
  quickAccess: true,
  requiresPhoto: false,
  displayOrder: 0
};

const STANDARD_VEHICLE_TYPES = [
  { code: "MOTORCYCLE", name: "Moto", icon: "🏍️", color: "#059669", requiresPlate: true, hasOwnRate: true, quickAccess: true, requiresPhoto: false, displayOrder: 1 },
  { code: "CAR", name: "Carro", icon: "🚗", color: "#2563EB", requiresPlate: true, hasOwnRate: true, quickAccess: true, requiresPhoto: false, displayOrder: 2 },
  { code: "BICYCLE", name: "Bicicleta", icon: "🚲", color: "#16A34A", requiresPlate: false, hasOwnRate: true, quickAccess: true, requiresPhoto: false, displayOrder: 3 },
  { code: "VAN", name: "Camioneta", icon: "🚐", color: "#7C3AED", requiresPlate: true, hasOwnRate: true, quickAccess: true, requiresPhoto: false, displayOrder: 4 },
  { code: "TRUCK", name: "Camión", icon: "🚛", color: "#C96A4A", requiresPlate: true, hasOwnRate: true, quickAccess: true, requiresPhoto: false, displayOrder: 5 },
  { code: "BUS", name: "Bus", icon: "🚌", color: "#CA8A04", requiresPlate: true, hasOwnRate: true, quickAccess: true, requiresPhoto: false, displayOrder: 6 },
  { code: "ELECTRIC", name: "Eléctrico", icon: "⚡", color: "#0D9488", requiresPlate: true, hasOwnRate: true, quickAccess: true, requiresPhoto: false, displayOrder: 7 },
  { code: "OTHER", name: "Otro", icon: "🚙", color: "#64748B", requiresPlate: false, hasOwnRate: false, quickAccess: false, requiresPhoto: false, displayOrder: 8 },
];

function vehicleTypeToForm(row: MasterVehicleTypeRow): VehicleTypeFormState {
  return {
    code: row.code,
    name: row.name,
    icon: row.icon ?? "",
    color: row.color ?? "#2563EB",
    requiresPlate: row.requiresPlate ?? true,
    hasOwnRate: row.hasOwnRate ?? true,
    quickAccess: row.quickAccess ?? true,
    requiresPhoto: row.requiresPhoto ?? false,
    displayOrder: row.displayOrder ?? 0
  };
}

export default function MastersSection({
  onNotify,
  canEdit
}: {
  onNotify: (n: { kind: "ok" | "err" | "info"; text: string } | null) => void;
  canEdit: boolean;
}) {
  const [rows, setRows] = useState<MasterVehicleTypeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<MasterVehicleTypeRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [selectedStdType, setSelectedStdType] = useState<string>("");
  const [form, setForm] = useState<VehicleTypeFormState>({ code: "", name: "", icon: "", color: "#64748B", displayOrder: 0, requiresPlate: true, hasOwnRate: false, quickAccess: false, requiresPhoto: false });
  const { confirm } = useDialog();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchMasterVehicleTypes());
    } catch (e) {
      onNotify({ kind: "err", text: getUserFriendlyErrorMessage(e, FrontendActionError.LOAD_DATA) });
    } finally {
      setLoading(false);
    }
  }, [onNotify]);

  useEffect(() => { load().catch(() => {}); }, [load]);

  const toggleActive = useCallback(async (id: string, current: boolean) => {
    try {
      await patchVehicleTypeStatus(id, !current);
      setRows((prev) => prev.map((r) => r.id === id ? { ...r, isActive: !current } : r));
      onNotify({ kind: "ok", text: current ? "Tipo desactivado" : "Tipo activado" });
    } catch (e) {
      onNotify({ kind: "err", text: getUserFriendlyErrorMessage(e, FrontendActionError.CHANGE_STATUS) });
    }
  }, [onNotify]);

  const handleDelete = useCallback(async (id: string) => {
    if (!(await confirm("¿Eliminar este tipo de vehículo?"))) return;
    try {
      await deleteVehicleType(id);
      setRows((prev) => prev.filter((r) => r.id !== id));
      onNotify({ kind: "ok", text: "Tipo eliminado" });
    } catch (e) {
      onNotify({ kind: "err", text: getUserFriendlyErrorMessage(e, FrontendActionError.DELETE_DATA) });
    }
  }, [onNotify, confirm]);

  const processedRows = useMemo(() => {
    let filtered = [...rows];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((r) => r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q));
    }
    return filtered;
  }, [rows, searchQuery]);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return processedRows.slice(start, start + pageSize);
  }, [processedRows, page, pageSize]);

  const columns = useMemo<DataTableColumn<MasterVehicleTypeRow>[]>(() => [
    {
      key: "icon",
      header: "",
      render: (r) => (
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-default-50 border border-default-200" style={{ backgroundColor: r.color ?? "#64748B" }}>
          <VehicleTypeIcon code={r.code} className="w-5 h-5" />
        </span>
      )
    },
    { key: "code", header: "Código", sortable: true },
    { key: "name", header: "Nombre", sortable: true },
    {
      key: "isActive",
      header: "Activo",
      render: (r) => (
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${r.isActive ? "bg-emerald-100 text-emerald-700" : "bg-default-100 text-default-500"}`}>
          {r.isActive ? "Sí" : "No"}
        </span>
      )
    },
    { key: "requiresPlate", header: "Placa", render: (r) => (r.requiresPlate ? "Sí" : "No") },
    { key: "quickAccess", header: "Rápido", render: (r) => (r.quickAccess ? "Sí" : "No") },
  ], []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Tipos de Vehículo</h2>
          <p className="text-sm text-default-500">Administra los tipos de vehículo disponibles en el sistema</p>
        </div>
        {canEdit && (
          <Button
            color="primary"
            size="md"
            className="font-semibold"
            onPress={() => { setCreating(true); setEditing(null); setSelectedStdType(""); setForm(defaultVehicleTypeForm); }}
          >
            Nuevo tipo
          </Button>
        )}
      </div>

      <DataTable
        title="Tipos de vehículo"
        description="Lista de tipos de vehículo configurados"
        columns={columns}
        data={paginatedRows}
        getRowKey={(r) => r.id}
        isLoading={loading}
        emptyMessage="No hay tipos de vehículo registrados"
        selectable
        selectedKeys={selectedKeys}
        onRowSelectionChange={setSelectedKeys}
        searchable
        searchPlaceholder="Buscar por nombre o código..."
        onSearchChange={setSearchQuery}
        pagination={{ page, pageSize, total: processedRows.length }}
        onPaginationChange={(newPage, newPageSize) => {
          setPage(newPage);
          if (newPageSize !== pageSize) setPageSize(newPageSize);
        }}
        actions={(row) => (
          <Dropdown>
            <Button isIconOnly variant="ghost" size="sm" aria-label="Más acciones">
              <MoreVertical className="w-4 h-4" />
            </Button>
            <DropdownMenu aria-label="Acciones">
              <DropdownItem
                key="edit"
                textValue="Editar"
                startContent={<Pencil className="w-4 h-4" />}
                onPress={() => { setEditing(row); setCreating(false); setForm(vehicleTypeToForm(row)); }}
              >
                Editar
              </DropdownItem>
              <DropdownItem key="toggle" textValue={row.isActive ? "Desactivar" : "Activar"} onPress={() => toggleActive(row.id, row.isActive)}>
                {row.isActive ? "Desactivar" : "Activar"}
              </DropdownItem>
              {canEdit && (
                <DropdownItem
                  key="delete"
                  textValue="Eliminar"
                  className="text-danger"
                  color="danger"
                  startContent={<Trash2 className="w-4 h-4" />}
                  onPress={() => handleDelete(row.id)}
                >
                  Eliminar
                </DropdownItem>
              )}
            </DropdownMenu>
          </Dropdown>
        )}
      />

      {(creating || editing) && canEdit ? (
        <div className="surface rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-foreground">{creating ? "Agregar tipo de vehículo" : "Editar tipo de vehículo"}</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {creating ? (
              <Select
                label="Tipo de vehículo"
                value={selectedStdType ? [selectedStdType] : []}
                onChange={(keys: Set<string | number | boolean | null | undefined>) => {
                  const code = Array.from(keys)[0] as string;
                  setSelectedStdType(code);
                  const std = STANDARD_VEHICLE_TYPES.find((t) => t.code === code);
                  if (std) setForm({ code: std.code, name: std.name, icon: std.icon, color: std.color, displayOrder: std.displayOrder, requiresPlate: std.requiresPlate, hasOwnRate: std.hasOwnRate, quickAccess: std.quickAccess, requiresPhoto: std.requiresPhoto });
                }}
              >
                <Select.Trigger aria-label="Seleccionar opción">
                  <Select.Value placeholder="Selecciona un tipo..." aria-label="Seleccionar opción" />
                  <Select.Indicator aria-label="Seleccionar opción" />
                </Select.Trigger>
                <Select.Popover aria-label="Seleccionar opción">
                  <ListBox>
                    {STANDARD_VEHICLE_TYPES
                      .filter((t) => !rows.some((r) => r.code === t.code))
                      .map((t) => (
                        <ListBox.Item key={t.code} textValue={t.name}>
                          <span className="flex items-center gap-2">
                            <span>{t.icon}</span>
                            <span>{t.name}</span>
                            <span className="text-xs text-default-400">({t.code})</span>
                          </span>
                        </ListBox.Item>
                      ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            ) : (
              <div className="flex items-center gap-3 rounded-xl bg-default-50 p-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-default-50" style={{ backgroundColor: form.color || "#64748B" }}>
                  <VehicleTypeIcon code={form.code || "CAR"} className="w-5 h-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{form.name}</p>
                  <p className="text-xs text-default-500">{form.code}</p>
                </div>
              </div>
            )}
            {!creating && (
              <Input
                label="Orden"
                size="sm"
                type="number"
                min={0}
                value={String(form.displayOrder)}
                onChange={(val) => setForm({ ...form, displayOrder: Number.parseInt(val.target.value || "0", 10) })}
              />
            )}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <Switch isSelected={form.requiresPlate} onChange={(val) => setForm({ ...form, requiresPlate: val })} size="sm" aria-label="Alternar opción">Requiere placa</Switch>
            <Switch isSelected={form.hasOwnRate} onChange={(val) => setForm({ ...form, hasOwnRate: val })} size="sm" aria-label="Alternar opción">Tarifa propia</Switch>
            <Switch isSelected={form.quickAccess} onChange={(val) => setForm({ ...form, quickAccess: val })} size="sm" aria-label="Alternar opción">Acceso rápido</Switch>
            <Switch isSelected={form.requiresPhoto} onChange={(val) => setForm({ ...form, requiresPhoto: val })} size="sm" aria-label="Alternar opción">Requiere foto</Switch>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="ghost" color="primary" className="font-semibold" onPress={() => { setCreating(false); setEditing(null); setSelectedStdType(""); }}>Cancelar</Button>
            <Button
              color="success"
              className="font-semibold text-default-50"
              onPress={async () => {
                try {
                              await saveMasterVehicleType(form, editing?.id);
                  onNotify({ kind: "ok", text: "Tipo guardado exitosamente" });
                  setCreating(false);
                  setEditing(null);
                  setSelectedStdType("");
                  load();
                } catch (e) {
                  onNotify({ kind: "err", text: getUserFriendlyErrorMessage(e, FrontendActionError.SAVE_DATA) });
                }
              }}
            >
              Guardar
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
