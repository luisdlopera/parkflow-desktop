"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Input,
  Button,
  Select,
  SelectItem,
  Checkbox,
} from "@heroui/react";
import {
  fetchConfigurationCashRegisters,
  createConfigurationCashRegister,
  updateConfigurationCashRegister,
  patchConfigurationCashRegisterStatus,
  fetchConfigurationSites,
  fetchConfigurationPrinters,
  fetchUsers,
  type SettingsPage,
  type UserAdminRow
} from "@/lib/settings-api";
import { cashRegisterSchema, type CashRegisterSchema } from "@/modules/settings/schemas";
import type { CashRegisterRow, ParkingSiteRow, PrinterRow } from "@/modules/settings/types";
import { DataTableSection, type ColumnDef } from "@/components/settings/DataTableSection";
import { StatusToggle } from "@/components/settings/StatusToggle";
import { FormDrawer } from "@/components/settings/FormDrawer";

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

export default function CajasPage() {
  const [data, setData] = useState<SettingsPage<CashRegisterRow>>({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 20 });
  const [sites, setSites] = useState<ParkingSiteRow[]>([]);
  const [printers, setPrinters] = useState<PrinterRow[]>([]);
  const [users, setUsers] = useState<UserAdminRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<CashRegisterRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CashRegisterSchema>({ resolver: zodResolver(cashRegisterSchema), defaultValues: { site: "DEFAULT", terminal: "", active: true } });
  
  const siteField = register("site");
  const siteIdField = register("siteId");

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
  }, []);

  const load = async (q?: string) => {
    setLoading(true);
    try {
      const page = await fetchConfigurationCashRegisters({ q, page: 0, size: 50 });
      setData(page);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando cajas");
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    reset({ site: "DEFAULT", siteId: "", code: "", name: "", terminal: "", label: "", printerId: "", responsibleUserId: "", active: true });
    setDrawerOpen(true);
  };

  const openEdit = (row: CashRegisterRow) => {
    setEditing(row);
    reset({
      site: row.site,
      siteId: row.siteId ?? "",
      code: row.code,
      name: row.name ?? "",
      terminal: row.terminal,
      label: row.label ?? "",
      printerId: row.printerId ?? "",
      responsibleUserId: row.responsibleUserId ?? "",
      active: row.active,
    });
    setDrawerOpen(true);
  };

  const siteOptions = useMemo(() => sites.map((site) => ({ value: site.id, label: `${site.code} - ${site.name}`, code: site.code })), [sites]);
  const printerOptions = useMemo(() => printers.map((printer) => ({ value: printer.id, label: `${printer.name} (${printer.isDefault ? "Default" : "Secundaria"})` })), [printers]);
  const userOptions = useMemo(() => users.map((user) => ({ value: user.id, label: user.name })), [users]);
  const currentSite = watch("site");

  const onSubmit = async (values: CashRegisterSchema) => {
    setError(null);
    try {
      const payload = { ...values } as Record<string, unknown>;
      if (editing) {
        await updateConfigurationCashRegister(editing.id, payload);
      } else {
        await createConfigurationCashRegister(payload);
      }
      setDrawerOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error guardando");
    }
  };

  const toggleStatus = async (row: CashRegisterRow) => {
    try {
      await patchConfigurationCashRegisterStatus(row.id, !row.active);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error cambiando estado");
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <h1 className="text-2xl font-bold text-slate-900">Cajas / Terminales</h1>
      <DataTableSection
        title=""
        columns={COLS}
        rows={data.content}
        loading={loading}
        onSearch={(q) => { void load(q); }}
        onCreate={openCreate}
        emptyMessage="No hay cajas registradas"
        actions={(row) => (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="flat"
              color="primary"
              className="font-semibold"
              onPress={() => openEdit(row)}
            >
              Editar
            </Button>
            <StatusToggle active={row.active} onChange={() => toggleStatus(row)} confirmMessage="¿Cambiar estado?" />
          </div>
        )}
      />
      <FormDrawer
        open={drawerOpen}
        title={editing ? "Editar Caja" : "Nueva Caja"}
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleSubmit(onSubmit)}
        loading={isSubmitting}
        error={error}
      >
        <div className="space-y-4">
          <Input
            {...register("code")}
            label="Código"
            variant="flat"
            errorMessage={errors.code?.message}
            isInvalid={!!errors.code}
          />
          <Input
            {...register("name")}
            label="Nombre"
            variant="flat"
          />
          <Input
            {...register("terminal")}
            label="Terminal"
            variant="flat"
            errorMessage={errors.terminal?.message}
            isInvalid={!!errors.terminal}
          />
          <Input
            {...register("label")}
            label="Etiqueta"
            variant="flat"
          />
          
          <div className="space-y-1">
            <input type="hidden" {...siteField} />
            <Select
              {...siteIdField}
              label="Sede"
              variant="flat"
              placeholder="Sin sede vinculada"
              isDisabled={catalogLoading}
              onSelectionChange={(keys) => {
                const id = Array.from(keys)[0] as string;
                const selected = sites.find((site) => site.id === id);
                setValue("siteId", id);
                setValue("site", selected?.code ?? "DEFAULT");
              }}
              selectedKeys={watch("siteId") ? [watch("siteId") as string] : []}
            >
              {siteOptions.map((site) => (
                <SelectItem key={site.value} textValue={site.label}>{site.label}</SelectItem>
              ))}
            </Select>
            <p className="px-1 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Código operativo: {currentSite || "DEFAULT"}
            </p>
          </div>

          <Select
            {...register("printerId")}
            label="Impresora"
            variant="flat"
            placeholder="Sin impresora"
            isDisabled={catalogLoading}
            selectedKeys={watch("printerId") ? [watch("printerId") as string] : []}
          >
            {printerOptions.map((printer) => (
              <SelectItem key={printer.value} textValue={printer.label}>{printer.label}</SelectItem>
            ))}
          </Select>

          <Select
            {...register("responsibleUserId")}
            label="Responsable"
            variant="flat"
            placeholder="Sin responsable"
            isDisabled={catalogLoading}
            selectedKeys={watch("responsibleUserId") ? [watch("responsibleUserId") as string] : []}
          >
            {userOptions.map((user) => (
              <SelectItem key={user.value} textValue={user.label}>{user.label}</SelectItem>
            ))}
          </Select>

          <Checkbox {...register("active")}>
            Activa
          </Checkbox>
        </div>
      </FormDrawer>
    </div>
  );
}
