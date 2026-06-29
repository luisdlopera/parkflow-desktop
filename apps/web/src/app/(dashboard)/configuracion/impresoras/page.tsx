"use client";

import { ConfigPageHeader } from "@/features/configuration/components/ui/ConfigPageHeader";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ListBox } from "@heroui/react";
import { Card } from "@/components/bridge/Card";
import { Select } from "@/components/bridge/Select";
import { Button } from "@/components/bridge/Button";
import { Checkbox } from "@/components/bridge/Checkbox";
import { Input } from "@/components/bridge/Input";
import {
  fetchConfigurationPrinters,
  createConfigurationPrinter,
  updateConfigurationPrinter,
  patchConfigurationPrinterStatus,
  type PrinterRow,
} from "@/lib/api/printers-api";
import {
  fetchConfigurationSites,
  type ParkingSiteRow,
} from "@/lib/api/sites-api";
import { printerSchema, type PrinterSchema } from "@/lib/schemas/config.schemas";
import { DataTableSection, type ColumnDef } from "@/components/settings/DataTableSection";
import { StatusToggle } from "@/components/settings/StatusToggle";
import { FormDrawer } from "@/components/ui/FormDrawer";
import { getUserFriendlyErrorMessage, FrontendActionError } from "@/lib/errors/error-messages";
import { useConfigCrud } from "@/hooks/core/useConfigCrud";

const COLS: ColumnDef<PrinterRow>[] = [
  { key: "name", label: "Nombre" },
  { key: "type", label: "Tipo" },
  { key: "connection", label: "Conexión" },
  { key: "paperWidthMm", label: "Ancho (mm)" },
  { key: "isDefault", label: "Predet.", render: (r) => (r.isDefault ? "Sí" : "No") },
  {
    key: "isActive",
    label: "Activo",
    render: (r) => (
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${r.isActive ? "bg-emerald-100 text-emerald-700" : "bg-default-100 text-default-500"}`}>
        {r.isActive ? "Sí" : "No"}
      </span>
    ),
  },
];

const DEFAULTS: PrinterSchema = { name: "", type: "THERMAL", connection: "USB", paperWidthMm: 80, endpointOrDevice: "", isActive: true, isDefault: false };

export default function ImpresorasPage() {
  const [sites, setSites] = useState<ParkingSiteRow[]>([]);
  const [siteId, setSiteId] = useState("");
  const [catalogLoading, setCatalogLoading] = useState(false);

  const crud = useConfigCrud<PrinterRow>({
    loadFn: (q?: unknown) => fetchConfigurationPrinters({ q: q as string, page: 0, size: 50 }),
    createFn: (data) => createConfigurationPrinter(data, siteId),
    updateFn: (id, data) => updateConfigurationPrinter(id, data),
    toggleStatusFn: (id, active) => patchConfigurationPrinterStatus(id, active),
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<PrinterSchema>({
    resolver: zodResolver(printerSchema),
    defaultValues: DEFAULTS,
  });

  const selectedSiteLabel = useMemo(
    () => sites.find((s) => s.id === siteId)?.name ?? "Sin sede seleccionada",
    [sites, siteId]
  );

  useEffect(() => {
    const loadCatalog = async () => {
      setCatalogLoading(true);
      try {
        const sitePage = await fetchConfigurationSites({ active: true, page: 0, size: 200 });
        const activeSites = sitePage.content ?? [];
        setSites(activeSites);
        if (activeSites.length === 1) setSiteId(activeSites[0].id);
      } catch (e) {
        // non-blocking catalog failure
      } finally {
        setCatalogLoading(false);
      }
    };
    void loadCatalog();
    void crud.load();
  }, []);

  const handleOpenCreate = () => {
    reset(DEFAULTS);
    crud.openCreate();
  };

  const handleOpenEdit = (row: PrinterRow) => {
    reset({ name: row.name, type: row.type, connection: row.connection, paperWidthMm: row.paperWidthMm as 58 | 80, endpointOrDevice: row.endpointOrDevice ?? "", isActive: row.isActive, isDefault: row.isDefault });
    crud.openEdit(row);
  };

  const onSubmit = async (values: PrinterSchema) => {
    if (!crud.editing && !siteId) return;
    const ok = await crud.save(values as Record<string, unknown>);
    if (ok) void crud.load();
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <ConfigPageHeader title="Impresoras" groupLabel="Infraestructura" groupId="infraestructura" sectionLabel="Dispositivos de impresión" />

      <Card border border-default-200="sm" className="border border-default-200 bg-default-50/50">
        <Card.Content className="p-4 flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="flex-1">
            <Select
              label="Sede para nueva impresora"
              placeholder="Selecciona una sede"
              value={siteId ? [siteId] : []}
              onChange={(keys: Set<string | number | boolean | null | undefined>) => setSiteId(Array.from(keys)[0] as string)}
              isDisabled={catalogLoading || sites.length <= 1}
            >
              <Select.Trigger aria-label="Seleccionar opción"><Select.Value aria-label="Seleccionar opción" /><Select.Indicator aria-label="Seleccionar opción" /></Select.Trigger>
              <Select.Popover aria-label="Seleccionar opción">
                <ListBox>
                  {sites.map((s) => (
                    <ListBox.Item key={s.id} textValue={`${s.code} - ${s.name}`}>
                      {`${s.code} - ${s.name}`}
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          </div>
          <p className="text-xs text-default-500 max-w-xs">
            La impresora nueva quedará asociada a: <span className="font-bold text-amber-700">{selectedSiteLabel}</span>.
            {sites.length <= 1 && " Se ha seleccionado automáticamente."}
          </p>
        </Card.Content>
      </Card>

      <DataTableSection
        title=""
        columns={COLS}
        rows={crud.rows}
        loading={crud.loading}
        onSearch={(q) => { void crud.load(q); }}
        onCreate={handleOpenCreate}
        emptyMessage="No hay impresoras registradas"
        actions={(row) => (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="tertiary" color="primary" className="font-semibold" onPress={() => handleOpenEdit(row)}>
              Editar
            </Button>
            <StatusToggle active={row.isActive} onChange={() => crud.handleToggleStatus(row)} confirmMessage="¿Cambiar estado?" />
          </div>
        )}
      />

      <FormDrawer
        open={crud.drawerOpen}
        title={crud.editing ? "Editar Impresora" : "Nueva Impresora"}
        onClose={crud.closeDrawer}
        onSubmit={handleSubmit(onSubmit)}
        loading={isSubmitting}
        error={crud.error ?? (!crud.editing && !siteId ? "Selecciona una sede para crear la impresora" : null)}
      >
        <div className="space-y-4">
          <Input {...register("name")} label="Nombre" errorMessage={errors.name?.message} isInvalid={!!errors.name} />

          <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs text-amber-800">
            {crud.editing ? (
              <p>Sede fija: <span className="font-bold">{sites.find((s) => s.id === (crud.editing as PrinterRow & { siteId?: string })?.siteId)?.code ?? "—"}</span></p>
            ) : (
              <p>Se creará asociada a la sede seleccionada en la pantalla principal.</p>
            )}
          </div>

          <Select {...register("type")} label="Tipo" defaultSelectedKey="THERMAL">
            <Select.Trigger aria-label="Seleccionar opción"><Select.Value aria-label="Seleccionar opción" /><Select.Indicator aria-label="Seleccionar opción" /></Select.Trigger>
            <Select.Popover aria-label="Seleccionar opción">
              <ListBox>
                <ListBox.Item key="THERMAL" textValue="Térmica">Térmica</ListBox.Item>
                <ListBox.Item key="PDF" textValue="PDF">PDF</ListBox.Item>
                <ListBox.Item key="OS" textValue="Sistema">Sistema</ListBox.Item>
              </ListBox>
            </Select.Popover>
          </Select>

          <Select {...register("connection")} label="Conexión" defaultSelectedKey="USB">
            <Select.Trigger aria-label="Seleccionar opción"><Select.Value aria-label="Seleccionar opción" /><Select.Indicator aria-label="Seleccionar opción" /></Select.Trigger>
            <Select.Popover aria-label="Seleccionar opción">
              <ListBox>
                <ListBox.Item key="USB" textValue="USB">USB</ListBox.Item>
                <ListBox.Item key="NET" textValue="Red">Red</ListBox.Item>
                <ListBox.Item key="BLUETOOTH" textValue="Bluetooth">Bluetooth</ListBox.Item>
                <ListBox.Item key="LOCAL_AGENT" textValue="Agente local">Agente local</ListBox.Item>
              </ListBox>
            </Select.Popover>
          </Select>

          <Select {...register("paperWidthMm", { valueAsNumber: true })} label="Ancho papel (mm)" defaultSelectedKey="80">
            <Select.Trigger aria-label="Seleccionar opción"><Select.Value aria-label="Seleccionar opción" /><Select.Indicator aria-label="Seleccionar opción" /></Select.Trigger>
            <Select.Popover aria-label="Seleccionar opción">
              <ListBox>
                <ListBox.Item key="58" textValue="58">58</ListBox.Item>
                <ListBox.Item key="80" textValue="80">80</ListBox.Item>
              </ListBox>
            </Select.Popover>
          </Select>

          <Input {...register("endpointOrDevice")} label="Endpoint / Dispositivo" placeholder="/dev/usb/lp0 or IP" />

          <div className="flex flex-col gap-2 pt-2">
            <Checkbox {...register("isDefault")}>Predeterminada</Checkbox>
            <Checkbox {...register("isActive")}>Activa</Checkbox>
          </div>
        </div>
      </FormDrawer>
    </div>
  );
}
