"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ListBox } from "@heroui/react";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import {
  fetchConfigurationPrinters,
  createConfigurationPrinter,
  updateConfigurationPrinter,
  patchConfigurationPrinterStatus,
  fetchConfigurationSites,
  type SettingsPage,
} from "@/lib/settings-api";
import { printerSchema, type PrinterSchema } from "@/modules/settings/schemas";
import type { ParkingSiteRow, PrinterRow } from "@/modules/settings/types";
import { DataTableSection, type ColumnDef } from "@/components/settings/DataTableSection";
import { StatusToggle } from "@/components/settings/StatusToggle";
import { FormDrawer } from "@/components/settings/FormDrawer";

const COLS: ColumnDef<PrinterRow>[] = [
  { key: "name", label: "Nombre" },
  { key: "type", label: "Tipo" },
  { key: "connection", label: "Conexión" },
  { key: "paperWidthMm", label: "Ancho (mm)" },
  {
    key: "isDefault",
    label: "Predet.",
    render: (r) => (r.isDefault ? "Sí" : "No"),
  },
  {
    key: "isActive",
    label: "Activo",
    render: (r) => (
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${r.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
        {r.isActive ? "Sí" : "No"}
      </span>
    ),
  },
];

export default function ImpresorasPage() {
  const [data, setData] = useState<SettingsPage<PrinterRow>>({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 20 });
  const [sites, setSites] = useState<ParkingSiteRow[]>([]);
  const [siteId, setSiteId] = useState("");
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<PrinterRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PrinterSchema>({ resolver: zodResolver(printerSchema), defaultValues: { type: "THERMAL", connection: "USB", paperWidthMm: 80, isActive: true, isDefault: false } });
  
  const selectedSiteLabel = useMemo(
    () => sites.find((site) => site.id === siteId)?.name ?? "Sin sede seleccionada",
    [sites, siteId]
  );

  useEffect(() => {
    const loadCatalog = async () => {
      setCatalogLoading(true);
      try {
        const sitePage = await fetchConfigurationSites({ active: true, page: 0, size: 200 });
        const activeSites = sitePage.content ?? [];
        setSites(activeSites);
        if (activeSites.length === 1) {
          setSiteId(activeSites[0].id);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error cargando sedes");
      } finally {
        setCatalogLoading(false);
      }
    };

    void loadCatalog();
  }, []);

  const load = async (q?: string) => {
    setLoading(true);
    try {
      const page = await fetchConfigurationPrinters({ q, page: 0, size: 50 });
      setData(page);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando impresoras");
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    reset({ name: "", type: "THERMAL", connection: "USB", paperWidthMm: 80, endpointOrDevice: "", isActive: true, isDefault: false });
    setDrawerOpen(true);
  };

  const openEdit = (row: PrinterRow) => {
    setEditing(row);
    reset({ name: row.name, type: row.type, connection: row.connection, paperWidthMm: row.paperWidthMm as 58 | 80, endpointOrDevice: row.endpointOrDevice ?? "", isActive: row.isActive, isDefault: row.isDefault });
    setDrawerOpen(true);
  };

  const onSubmit = async (values: PrinterSchema) => {
    setError(null);
    try {
      const payload = { ...values } as Record<string, unknown>;
      if (editing) {
        await updateConfigurationPrinter(editing.id, payload);
      } else {
        if (!siteId) {
          setError("Selecciona una sede para crear la impresora");
          return;
        }
        await createConfigurationPrinter(payload, siteId);
      }
      setDrawerOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error guardando");
    }
  };

  const toggleStatus = async (row: PrinterRow) => {
    try {
      await patchConfigurationPrinterStatus(row.id, !row.isActive);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error cambiando estado");
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <h1 className="text-2xl font-bold text-slate-900">Impresoras</h1>
      
      <Card shadow="sm" className="border border-slate-200 bg-slate-50/50">
        <Card.Content className="p-4 flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="flex-1">
            <Select
              label="Sede para nueva impresora"
              placeholder="Selecciona una sede"
              
              value={siteId ? [siteId] : []}
              onChange={(keys) => setSiteId(Array.from(keys)[0] as string)}
              isDisabled={catalogLoading || sites.length <= 1}
            >
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>

              {sites.map((site) => (
                <ListBox.Item key={site.id} textValue={`${site.code} - ${site.name}`}>
                  {`${site.code} - ${site.name}`}
                </ListBox.Item>
              ))}
            
        </ListBox>
      </Select.Popover>
    </Select>
          </div>
          <p className="text-xs text-slate-500 max-w-xs">
            La impresora nueva quedará asociada a: <span className="font-bold text-amber-700">{selectedSiteLabel}</span>. 
            {sites.length <= 1 && " Se ha seleccionado automáticamente."}
          </p>
        </Card.Content>
      </Card>

      <DataTableSection
        title=""
        columns={COLS}
        rows={data.content}
        loading={loading}
        onSearch={(q) => { void load(q); }}
        onCreate={openCreate}
        emptyMessage="No hay impresoras registradas"
        actions={(row) => (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="tertiary"
              color="primary"
              className="font-semibold"
              onPress={() => openEdit(row)}
            >
              Editar
            </Button>
            <StatusToggle active={row.isActive} onChange={() => toggleStatus(row)} confirmMessage="¿Cambiar estado?" />
          </div>
        )}
      />

      <FormDrawer
        open={drawerOpen}
        title={editing ? "Editar Impresora" : "Nueva Impresora"}
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleSubmit(onSubmit)}
        loading={isSubmitting}
        error={error}
      >
        <div className="space-y-4">
          <Input
            {...register("name")}
            label="Nombre"
            
            errorMessage={errors.name?.message}
            isInvalid={!!errors.name}
          />

          <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs text-amber-800">
            {editing ? (
              <p>Sede fija: <span className="font-bold">{sites.find((site) => site.id === editing.siteId)?.code ?? editing.siteId}</span></p>
            ) : (
              <p>Se creará asociada a la sede seleccionada en la pantalla principal.</p>
            )}
          </div>

          <Select
            {...register("type")}
            label="Tipo"
            
            defaultSelectedKey={"THERMAL"}
          >
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>

            <ListBox.Item key="THERMAL" textValue="Térmica">Térmica</ListBox.Item>
            <ListBox.Item key="PDF" textValue="PDF">PDF</ListBox.Item>
            <ListBox.Item key="OS" textValue="Sistema">Sistema</ListBox.Item>
          
        </ListBox>
      </Select.Popover>
    </Select>

          <Select
            {...register("connection")}
            label="Conexión"
            
            defaultSelectedKey={"USB"}
          >
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>

            <ListBox.Item key="USB" textValue="USB">USB</ListBox.Item>
            <ListBox.Item key="NET" textValue="Red">Red</ListBox.Item>
            <ListBox.Item key="BLUETOOTH" textValue="Bluetooth">Bluetooth</ListBox.Item>
            <ListBox.Item key="LOCAL_AGENT" textValue="Agente local">Agente local</ListBox.Item>
          
        </ListBox>
      </Select.Popover>
    </Select>

          <Select
            {...register("paperWidthMm", { valueAsNumber: true })}
            label="Ancho papel (mm)"
            
            defaultSelectedKey={"80"}
          >
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>

            <ListBox.Item key="58" textValue="58">58</ListBox.Item>
            <ListBox.Item key="80" textValue="80">80</ListBox.Item>
          
        </ListBox>
      </Select.Popover>
    </Select>

          <Input
            {...register("endpointOrDevice")}
            label="Endpoint / Dispositivo"
            
            placeholder="/dev/usb/lp0 or IP"
          />

          <div className="flex flex-col gap-2 pt-2">
            <Checkbox {...register("isDefault")}>
              Predeterminada
            </Checkbox>
            <Checkbox {...register("isActive")}>
              Activa
            </Checkbox>
          </div>
        </div>
      </FormDrawer>
    </div>
  );
}
