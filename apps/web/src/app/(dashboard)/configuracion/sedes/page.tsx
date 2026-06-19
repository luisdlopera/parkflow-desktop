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
  fetchConfigurationSites,
  createConfigurationSite,
  updateConfigurationSite,
  patchConfigurationSiteStatus,
} from "@/lib/settings-api";
import { listCompanies } from "@/lib/licensing/api";
import { parkingSiteSchema, type ParkingSiteSchema } from "@/modules/settings/schemas";
import type { ParkingSiteRow } from "@/modules/settings/types";
import type { Company } from "@/lib/licensing/types";
import { DataTableSection, type ColumnDef } from "@/components/settings/DataTableSection";
import { StatusToggle } from "@/components/settings/StatusToggle";
import { FormDrawer } from "@/components/ui/FormDrawer";
import { getUserFriendlyErrorMessage, FrontendActionError } from "@/lib/errors/error-messages";
import { useConfigCrud } from "@/hooks/core/useConfigCrud";

const SITE_COLUMNS: ColumnDef<ParkingSiteRow>[] = [
  { key: "code", label: "Código" },
  { key: "name", label: "Nombre" },
  { key: "city", label: "Ciudad" },
  { key: "currency", label: "Moneda" },
  { key: "maxCapacity", label: "Aforo", render: (row) => row.maxCapacity > 0 ? row.maxCapacity : "Ilimitado" },
  {
    key: "isActive",
    label: "Activo",
    render: (row) => (
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${row.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
        {row.isActive ? "Sí" : "No"}
      </span>
    ),
  },
];

const DEFAULTS: ParkingSiteSchema = { code: "", name: "", address: "", city: "", phone: "", managerName: "", timezone: "America/Bogota", currency: "COP", maxCapacity: 0, isActive: true };

export default function SedesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [catalogLoading, setCatalogLoading] = useState(false);

  const crud = useConfigCrud<ParkingSiteRow>({
    loadFn: (q?: unknown) => fetchConfigurationSites({ q: q as string, page: 0, size: 50 }),
    createFn: (data) => createConfigurationSite(data, companyId),
    updateFn: (id, data) => updateConfigurationSite(id, data),
    toggleStatusFn: (id, active) => patchConfigurationSiteStatus(id, active),
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ParkingSiteSchema>({
    resolver: zodResolver(parkingSiteSchema),
    defaultValues: DEFAULTS,
  });

  const selectedCompanyLabel = useMemo(
    () => companies.find((c) => c.id === companyId)?.name ?? "Sin empresa seleccionada",
    [companies, companyId]
  );

  useEffect(() => {
    const loadCatalog = async () => {
      setCatalogLoading(true);
      try {
        const list = await listCompanies();
        setCompanies(list ?? []);
        if (list.length === 1) setCompanyId(list[0].id);
      } catch (e) {
        // catalog failure is non-blocking; sites still load
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

  const handleOpenEdit = (row: ParkingSiteRow) => {
    reset({ code: row.code, name: row.name, address: row.address ?? "", city: row.city ?? "", phone: row.phone ?? "", managerName: row.managerName ?? "", timezone: row.timezone, currency: row.currency, maxCapacity: row.maxCapacity ?? 0, isActive: row.isActive });
    crud.openEdit(row);
  };

  const onSubmit = async (values: ParkingSiteSchema) => {
    if (!crud.editing && !companyId) {
      return; // crud.error shown by save() if any
    }
    const ok = await crud.save(values as Record<string, unknown>);
    if (ok) void crud.load();
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <ConfigPageHeader title="Sedes / Parqueaderos" groupLabel="Organización" sectionLabel="Administrar sedes del parqueadero" />

      <Card border border-default-200="sm" className="border border-slate-200 bg-slate-50/50">
        <Card.Content className="p-4 flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="flex-1">
            <Select
              label="Empresa"
              placeholder="Selecciona una empresa"
              value={companyId ? [companyId] : []}
              onChange={(keys) => setCompanyId(Array.from(keys)[0] as string)}
              isDisabled={catalogLoading || companies.length <= 1}
            >
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {companies.map((company) => (
                    <ListBox.Item key={company.id} textValue={`${company.name} ${company.status ? `(${company.status})` : ""}`}>
                      {`${company.name} ${company.status ? `(${company.status})` : ""}`}
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          </div>
          <p className="text-xs text-slate-500 max-w-xs">
            La nueva sede quedará asociada a: <span className="font-bold text-amber-700">{selectedCompanyLabel}</span>.
            {companies.length <= 1 && " Se ha seleccionado automáticamente."}
          </p>
        </Card.Content>
      </Card>

      <DataTableSection
        title=""
        columns={SITE_COLUMNS}
        rows={crud.rows}
        loading={crud.loading}
        onSearch={(q) => { void crud.load(q); }}
        onCreate={handleOpenCreate}
        emptyMessage="No hay sedes registradas"
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
        title={crud.editing ? "Editar Sede" : "Nueva Sede"}
        onClose={crud.closeDrawer}
        onSubmit={handleSubmit(onSubmit)}
        loading={isSubmitting}
        error={crud.error ?? (!crud.editing && !companyId ? "Selecciona una empresa para crear la sede" : null)}
      >
        <div className="space-y-4">
          <Input {...register("code")} label="Código" errorMessage={errors.code?.message} isInvalid={!!errors.code} />
          <Input {...register("name")} label="Nombre" errorMessage={errors.name?.message} isInvalid={!!errors.name} />
          <div className="grid grid-cols-2 gap-4">
            <Input {...register("city")} label="Ciudad" />
            <Input {...register("phone")} label="Teléfono" />
          </div>
          <Input {...register("address")} label="Dirección" />
          <Input {...register("managerName")} label="Responsable" />
          <div className="grid grid-cols-2 gap-4">
            <Input {...register("timezone")} label="Zona horaria" />
            <Input {...register("currency")} label="Moneda" />
          </div>
          <Input {...register("maxCapacity", { valueAsNumber: true })} type="number" min={0} label="Aforo máximo" description="0 deja la sede sin límite operativo de cupos" errorMessage={errors.maxCapacity?.message} isInvalid={!!errors.maxCapacity} />
          <Checkbox {...register("isActive")}>Activa</Checkbox>
        </div>
      </FormDrawer>
    </div>
  );
}
