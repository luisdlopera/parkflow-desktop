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
  Card,
  CardBody,
} from "@heroui/react";
import {
  fetchConfigurationSites,
  createConfigurationSite,
  updateConfigurationSite,
  patchConfigurationSiteStatus,
  type SettingsPage,
} from "@/lib/settings-api";
import { listCompanies } from "@/lib/licensing/api";
import { parkingSiteSchema, type ParkingSiteSchema } from "@/modules/settings/schemas";
import type { ParkingSiteRow } from "@/modules/settings/types";
import type { Company } from "@/lib/licensing/types";
import { DataTableSection, type ColumnDef } from "@/components/settings/DataTableSection";
import { StatusToggle } from "@/components/settings/StatusToggle";
import { FormDrawer } from "@/components/settings/FormDrawer";

const SITE_COLUMNS: ColumnDef<ParkingSiteRow>[] = [
  { key: "code", label: "Código" },
  { key: "name", label: "Nombre" },
  { key: "city", label: "Ciudad" },
  { key: "currency", label: "Moneda" },
  {
    key: "maxCapacity",
    label: "Aforo",
    render: (row) => row.maxCapacity > 0 ? row.maxCapacity : "Ilimitado",
  },
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

export default function SedesPage() {
  const [data, setData] = useState<SettingsPage<ParkingSiteRow>>({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 20 });
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<ParkingSiteRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ParkingSiteSchema>({ resolver: zodResolver(parkingSiteSchema), defaultValues: { timezone: "America/Bogota", currency: "COP", maxCapacity: 0, isActive: true } });
  
  const selectedCompanyLabel = useMemo(
    () => companies.find((company) => company.id === companyId)?.name ?? "Sin empresa seleccionada",
    [companies, companyId]
  );

  useEffect(() => {
    const loadCatalog = async () => {
      setCatalogLoading(true);
      try {
        const companyList = await listCompanies();
        setCompanies(companyList ?? []);
        if (companyList.length === 1) {
          setCompanyId(companyList[0].id);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error cargando empresas");
      } finally {
        setCatalogLoading(false);
      }
    };

    void loadCatalog();
  }, []);

  const load = async (q?: string) => {
    setLoading(true);
    try {
      const page = await fetchConfigurationSites({ q, page: 0, size: 50 });
      setData(page);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando sedes");
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    reset({ code: "", name: "", address: "", city: "", phone: "", managerName: "", timezone: "America/Bogota", currency: "COP", maxCapacity: 0, isActive: true });
    setDrawerOpen(true);
  };

  const openEdit = (row: ParkingSiteRow) => {
    setEditing(row);
    reset({
      code: row.code,
      name: row.name,
      address: row.address ?? "",
      city: row.city ?? "",
      phone: row.phone ?? "",
      managerName: row.managerName ?? "",
      timezone: row.timezone,
      currency: row.currency,
      maxCapacity: row.maxCapacity ?? 0,
      isActive: row.isActive,
    });
    setDrawerOpen(true);
  };

  const onSubmit = async (values: ParkingSiteSchema) => {
    setError(null);
    try {
      const payload = { ...values } as Record<string, unknown>;
      if (editing) {
        await updateConfigurationSite(editing.id, payload);
      } else {
        if (!companyId) {
          setError("Selecciona una empresa para crear la sede");
          return;
        }
        await createConfigurationSite(payload, companyId);
      }
      setDrawerOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error guardando");
    }
  };

  const toggleStatus = async (row: ParkingSiteRow) => {
    try {
      await patchConfigurationSiteStatus(row.id, !row.isActive);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error cambiando estado");
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <h1 className="text-2xl font-bold text-slate-900">Sedes / Parqueaderos</h1>
      
      <Card shadow="sm" className="border border-slate-200 bg-slate-50/50">
        <CardBody className="p-4 flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="flex-1">
            <Select
              label="Empresa"
              placeholder="Selecciona una empresa"
              variant="flat"
              selectedKeys={companyId ? [companyId] : []}
              onSelectionChange={(keys) => setCompanyId(Array.from(keys)[0] as string)}
              isDisabled={catalogLoading || companies.length <= 1}
            >
              {companies.map((company) => (
                <SelectItem key={company.id} textValue={`${company.name} ${company.status ? `(${company.status})` : ""}`}>
                  {`${company.name} ${company.status ? `(${company.status})` : ""}`}
                </SelectItem>
              ))}
            </Select>
          </div>
          <p className="text-xs text-slate-500 max-w-xs">
            La nueva sede quedará asociada a: <span className="font-bold text-amber-700">{selectedCompanyLabel}</span>. 
            {companies.length <= 1 && " Se ha seleccionado automáticamente."}
          </p>
        </CardBody>
      </Card>

      <DataTableSection
        title=""
        columns={SITE_COLUMNS}
        rows={data.content}
        loading={loading}
        onSearch={(q) => { void load(q); }}
        onCreate={openCreate}
        emptyMessage="No hay sedes registradas"
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
            <StatusToggle active={row.isActive} onChange={() => toggleStatus(row)} confirmMessage="¿Cambiar estado?" />
          </div>
        )}
      />

      <FormDrawer
        open={drawerOpen}
        title={editing ? "Editar Sede" : "Nueva Sede"}
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
            errorMessage={errors.name?.message}
            isInvalid={!!errors.name}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              {...register("city")}
              label="Ciudad"
              variant="flat"
            />
            <Input
              {...register("phone")}
              label="Teléfono"
              variant="flat"
            />
          </div>
          <Input
            {...register("address")}
            label="Dirección"
            variant="flat"
          />
          <Input
            {...register("managerName")}
            label="Responsable"
            variant="flat"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              {...register("timezone")}
              label="Zona horaria"
              variant="flat"
            />
            <Input
              {...register("currency")}
              label="Moneda"
              variant="flat"
            />
          </div>
          <Input
            {...register("maxCapacity", { valueAsNumber: true })}
            type="number"
            min={0}
            label="Aforo máximo"
            description="0 deja la sede sin límite operativo de cupos"
            variant="flat"
            errorMessage={errors.maxCapacity?.message}
            isInvalid={!!errors.maxCapacity}
          />
          <Checkbox {...register("isActive")}>
            Activa
          </Checkbox>
        </div>
      </FormDrawer>
    </div>
  );
}
