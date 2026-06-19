"use client";

import { ConfigPageHeader } from "@/features/configuration/components/ui/ConfigPageHeader";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ListBox } from "@heroui/react";
import { Select } from "@/components/bridge/Select";
import { Button } from "@/components/bridge/Button";
import { Checkbox } from "@/components/bridge/Checkbox";
import { Input } from "@/components/bridge/Input";
import {
  fetchConfigurationCashRegisters,
  createConfigurationCashRegister,
  updateConfigurationCashRegister,
  patchConfigurationCashRegisterStatus,
  fetchConfigurationSites,
  fetchConfigurationPrinters,
  fetchUsers,
  type UserAdminRow,
} from "@/lib/settings-api";
import { cashRegisterSchema, type CashRegisterSchema } from "@/modules/settings/schemas";
import type { CashRegisterRow, ParkingSiteRow, PrinterRow } from "@/modules/settings/types";
import { DataTableSection, type ColumnDef } from "@/components/settings/DataTableSection";
import { FormDrawer } from "@/components/ui/FormDrawer";
import { StatusToggle } from "@/components/settings/StatusToggle";
import { useConfigCrud } from "@/hooks/core/useConfigCrud";

const COLS: ColumnDef<CashRegisterRow>[] = [
  { key: "code", label: "Código" },
  { key: "name", label: "Nombre" },
  { key: "site", label: "Sede" },
  { key: "terminal", label: "Terminal" },
  { key: "printerName", label: "Impresora" },
  {
    key: "active",
    label: "Activo",
    render: (r) => (
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${r.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
        {r.active ? "Sí" : "No"}
      </span>
    ),
  },
];

const DEFAULTS: CashRegisterSchema = { site: "DEFAULT", siteId: "", code: "", name: "", terminal: "", label: "", printerId: "", responsibleUserId: "", active: true };

export default function CajasPage() {
  const [sites, setSites] = useState<ParkingSiteRow[]>([]);
  const [printers, setPrinters] = useState<PrinterRow[]>([]);
  const [users, setUsers] = useState<UserAdminRow[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);

  const crud = useConfigCrud<CashRegisterRow>({
    loadFn: (q?: unknown) => fetchConfigurationCashRegisters({ q: q as string, page: 0, size: 50 }),
    createFn: (data) => createConfigurationCashRegister(data),
    updateFn: (id, data) => updateConfigurationCashRegister(id, data),
    toggleStatusFn: (id, active) => patchConfigurationCashRegisterStatus(id, active),
  });

  const { register, handleSubmit, reset, setValue, control, formState: { errors, isSubmitting } } = useForm<CashRegisterSchema>({
    resolver: zodResolver(cashRegisterSchema),
    defaultValues: DEFAULTS,
  });

  const siteField = register("site");
  const siteIdField = register("siteId");

  const siteOptions = useMemo(() => sites.map((s) => ({ value: s.id, label: `${s.code} - ${s.name}`, code: s.code })), [sites]);
  const printerOptions = useMemo(() => printers.map((p) => ({ value: p.id, label: `${p.name} (${p.isDefault ? "Default" : "Secundaria"})` })), [printers]);
  const userOptions = useMemo(() => users.map((u) => ({ value: u.id, label: u.name })), [users]);
  const currentSite = useWatch({ control, name: "site" });
  const watchSiteId = useWatch({ control, name: "siteId" });
  const watchPrinterId = useWatch({ control, name: "printerId" });
  const watchResponsibleUserId = useWatch({ control, name: "responsibleUserId" });

  useEffect(() => {
    const loadCatalogs = async () => {
      setCatalogLoading(true);
      try {
        const [sitePage, printerPage, userPage] = await Promise.all([
          fetchConfigurationSites({ active: true, page: 0, size: 200 }),
          fetchConfigurationPrinters({ active: true, page: 0, size: 200 }),
          fetchUsers({ active: true, page: 0, size: 200 }),
        ]);
        setSites(sitePage.content ?? []);
        setPrinters(printerPage.content ?? []);
        setUsers(userPage.content ?? []);
      } finally {
        setCatalogLoading(false);
      }
    };
    void loadCatalogs();
    void crud.load();
  }, []);

  const handleOpenCreate = () => {
    reset(DEFAULTS);
    crud.openCreate();
  };

  const handleOpenEdit = (row: CashRegisterRow) => {
    reset({ site: row.site, siteId: row.siteId ?? "", code: row.code, name: row.name ?? "", terminal: row.terminal, label: row.label ?? "", printerId: row.printerId ?? "", responsibleUserId: row.responsibleUserId ?? "", active: row.active });
    crud.openEdit(row);
  };

  const onSubmit = async (values: CashRegisterSchema) => {
    const ok = await crud.save(values as Record<string, unknown>);
    if (ok) void crud.load();
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <ConfigPageHeader title="Cajas / Terminales" groupLabel="Cajas" groupId="organizacion" sectionLabel="Puntos de caja y terminales" />
      <DataTableSection
        title=""
        columns={COLS}
        rows={crud.rows}
        loading={crud.loading}
        onSearch={(q) => { void crud.load(q); }}
        onCreate={handleOpenCreate}
        emptyMessage="No hay cajas registradas"
        actions={(row) => (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="tertiary" color="primary" className="font-semibold" onPress={() => handleOpenEdit(row)}>
              Editar
            </Button>
            <StatusToggle active={row.active} onChange={() => crud.handleToggleStatus(row)} confirmMessage="¿Cambiar estado?" />
          </div>
        )}
      />
      <FormDrawer
        open={crud.drawerOpen}
        title={crud.editing ? "Editar Caja" : "Nueva Caja"}
        onClose={crud.closeDrawer}
        onSubmit={handleSubmit(onSubmit)}
        loading={isSubmitting}
        error={crud.error}
      >
        <div className="space-y-4">
          <Input {...register("code")} label="Código" errorMessage={errors.code?.message} isInvalid={!!errors.code} />
          <Input {...register("name")} label="Nombre" />
          <Input {...register("terminal")} label="Terminal" errorMessage={errors.terminal?.message} isInvalid={!!errors.terminal} />
          <Input {...register("label")} label="Etiqueta" />

          <div className="space-y-1">
            <input type="hidden" {...siteField} />
            <Select
              {...siteIdField}
              label="Sede"
              placeholder="Sin sede vinculada"
              isDisabled={catalogLoading}
              onChange={(keys) => {
                const id = Array.from(keys)[0] as string;
                const selected = sites.find((s) => s.id === id);
                setValue("siteId", id);
                setValue("site", selected?.code ?? "DEFAULT");
              }}
              selectedKey={(watchSiteId ? watchSiteId : undefined) as any}
            >
              <Select.Trigger aria-label="Seleccionar opción"><Select.Value aria-label="Seleccionar opción" /><Select.Indicator aria-label="Seleccionar opción" /></Select.Trigger>
              <Select.Popover aria-label="Seleccionar opción">
                <ListBox>
                  {siteOptions.map((s) => <ListBox.Item key={s.value} textValue={s.label}>{s.label}</ListBox.Item>)}
                </ListBox>
              </Select.Popover>
            </Select>
            <p className="px-1 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Código operativo: {currentSite || "DEFAULT"}
            </p>
          </div>

          <Select
            {...register("printerId")}
            label="Impresora"
            placeholder="Sin impresora"
            isDisabled={catalogLoading}
            value={watchPrinterId ? [watchPrinterId as string] : []}
          >
            <Select.Trigger aria-label="Seleccionar opción"><Select.Value aria-label="Seleccionar opción" /><Select.Indicator aria-label="Seleccionar opción" /></Select.Trigger>
            <Select.Popover aria-label="Seleccionar opción">
              <ListBox>
                {printerOptions.map((p) => <ListBox.Item key={p.value} textValue={p.label}>{p.label}</ListBox.Item>)}
              </ListBox>
            </Select.Popover>
          </Select>

          <Select
            {...register("responsibleUserId")}
            label="Responsable"
            placeholder="Sin responsable"
            isDisabled={catalogLoading}
            value={watchResponsibleUserId ? [watchResponsibleUserId as string] : []}
          >
            <Select.Trigger aria-label="Seleccionar opción"><Select.Value aria-label="Seleccionar opción" /><Select.Indicator aria-label="Seleccionar opción" /></Select.Trigger>
            <Select.Popover aria-label="Seleccionar opción">
              <ListBox>
                {userOptions.map((u) => <ListBox.Item key={u.value} textValue={u.label}>{u.label}</ListBox.Item>)}
              </ListBox>
            </Select.Popover>
          </Select>

          <Checkbox {...register("active")}>Activa</Checkbox>
        </div>
      </FormDrawer>
    </div>
  );
}
