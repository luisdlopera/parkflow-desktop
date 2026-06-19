"use client";

import { toast } from "@heroui/react";
import { useState, useCallback } from "react";
import { Skeleton, useOverlayState, AlertDialog, Button as HeroButton } from "@heroui/react";
import { Chip } from "@/components/ui/Chip";
import { DropdownItem } from "@/components/ui/Dropdown";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Building2, FileBadge, Pencil, Trash2, Eye } from "lucide-react";
import { useCompanies, translatePlan, translateStatus } from "@/lib/licensing/hooks";
import type { Company } from "@/lib/licensing/types";
import { GenerateLicenseDialog } from "@/components/admin/GenerateLicenseDialog";
import { ErrorState } from "@/components/feedback/ErrorState";
import { getUserErrorMessage } from "@/lib/errors/get-user-error-message";
import { ApiError } from "@/lib/errors/api-error";
import type { DataTableColumn } from "@/components/ui/DataTable";
import { EntityManagementPage } from "@/shared/components/crud/EntityManagementPage";

export default function CompaniesPage() {
  const { data: companies, isLoading, error, mutate } = useCompanies();
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
  const [isPurging, setIsPurging] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  const {
    isOpen: isLicenseOpen,
    open: onLicenseOpen,
    close: onLicenseClose,
  } = useOverlayState();

  const handleGenerateLicense = useCallback((company: Company) => {
    setSelectedCompany(company);
    onLicenseOpen();
  }, [onLicenseOpen]);

  const handleDeleteTrigger = (company: Company) => {
    setCompanyToDelete(company);
    setIsPurging(false);
  };

  const handlePurgeTrigger = (company: Company) => {
    setCompanyToDelete(company);
    setIsPurging(true);
  };

  const confirmDelete = async () => {
    if (!companyToDelete) return;
    try {
      setIsDeactivating(true);
      const { apiDeleteCompany, apiPurgeCompany } = await import("@/lib/licensing/api");
      const apiCall = isPurging ? apiPurgeCompany : apiDeleteCompany;
      
      if (companyToDelete.id === "bulk") {
        await Promise.all(Array.from(selectedKeys).map(id => apiCall(id)));
      } else {
        await apiCall(companyToDelete.id);
      }
      mutate();
      setCompanyToDelete(null);
      setSelectedKeys(new Set());
      toast.success("Eliminación exitosa");
    } catch (err: any) {
      console.error("Error al eliminar empresa", err);
      const isUnauthorized = err?.status === 401 || err?.status === 403;
      toast.danger(isUnauthorized ? "No tienes permisos suficientes (SUPER_ADMIN) o tu sesión expiró." : "Ocurrió un error al eliminar.");
    } finally {
      setIsDeactivating(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, "success" | "warning" | "danger" | "default" | "primary"> = {
      ACTIVE: "success", TRIAL: "primary", PAST_DUE: "warning", SUSPENDED: "danger",
      EXPIRED: "danger", BLOCKED: "danger", CANCELLED: "default",
    };
    return colors[status] || "default";
  };

  const getPlanColor = (plan: string) => {
    const colors: Record<string, "default" | "primary" | "secondary" | "success"> = {
      LOCAL: "default", SYNC: "primary", PRO: "secondary", ENTERPRISE: "success",
    };
    return colors[plan] || "default";
  };

  const columns: DataTableColumn<Company>[] = [
    {
      key: "name",
      header: "Empresa",
      sortable: true,
      render: (company) => (
        <div>
          <p className="font-medium">{company.name}</p>
          <p className="text-sm text-default-500">{company.nit || "Sin NIT"}</p>
        </div>
      ),
    },
    {
      key: "plan",
      header: "Plan",
      sortable: true,
      render: (company) => (
        <Chip color={getPlanColor(company.plan)} variant="soft" size="sm">{translatePlan(company.plan)}</Chip>
      ),
    },
    {
      key: "status",
      header: "Estado",
      sortable: true,
      render: (company) => (
        <Chip color={getStatusColor(company.status)} variant="soft" size="sm">{translateStatus(company.status)}</Chip>
      ),
    },
    {
      key: "expiresAt",
      header: "Vencimiento",
      sortable: true,
      render: (company) =>
        company.expiresAt ? (
          <div>
            <p>{new Date(company.expiresAt).toLocaleDateString("es-CO")}</p>
            {company.graceUntil && company.status === "PAST_DUE" && (
              <p className="text-xs text-warning">Gracia hasta: {new Date(company.graceUntil).toLocaleDateString("es-CO")}</p>
            )}
          </div>
        ) : (<span className="text-default-400">-</span>),
    },
    {
      key: "maxDevices",
      header: "Dispositivos",
      align: "right",
      render: (company) => <p className="text-sm">{company.devices?.length || 0} / {company.maxDevices}</p>,
    },
  ];

  if (error) {
    const userError = getUserErrorMessage(error, "companies.load");
    const apiErr = error instanceof ApiError ? error : undefined;
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <ErrorState title={userError.title} description={userError.description} actionLabel={userError.actionLabel} onRetry={() => mutate()} errorCode={apiErr?.code as string} correlationId={apiErr?.correlationId} technicalDetails={apiErr?.message} />
      </div>
    );
  }

  const renderStats = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
      <Card><Card.Content className="flex items-center gap-3"><div className="p-2 bg-primary/10 rounded-lg"><Building2 className="w-5 h-5 text-primary" /></div><div><p className="text-sm text-default-500">Total Empresas</p><div className="text-xl font-bold">{isLoading ? <Skeleton className="w-8 h-6 rounded-md" /> : <span>{companies?.length ?? 0}</span>}</div></div></Card.Content></Card>
      <Card><Card.Content className="flex items-center gap-3"><div className="p-2 bg-success/10 rounded-lg"><FileBadge className="w-5 h-5 text-success" /></div><div><p className="text-sm text-default-500">Activas</p><div className="text-xl font-bold">{isLoading ? <Skeleton className="w-8 h-6 rounded-md" /> : <span>{companies?.filter(c => c.status === "ACTIVE" || c.status === "TRIAL").length ?? 0}</span>}</div></div></Card.Content></Card>
      <Card><Card.Content className="flex items-center gap-3"><div className="p-2 bg-warning/10 rounded-lg"><FileBadge className="w-5 h-5 text-warning" /></div><div><p className="text-sm text-default-500">Por Vencer</p><div className="text-xl font-bold">{isLoading ? <Skeleton className="w-8 h-6 rounded-md" /> : <span>{companies?.filter(c => c.expiresAt && Math.ceil((new Date(c.expiresAt).getTime() - Date.now()) / 86400000) <= 14 && Math.ceil((new Date(c.expiresAt).getTime() - Date.now()) / 86400000) > 0).length ?? 0}</span>}</div></div></Card.Content></Card>
      <Card><Card.Content className="flex items-center gap-3"><div className="p-2 bg-danger/10 rounded-lg"><FileBadge className="w-5 h-5 text-danger" /></div><div><p className="text-sm text-default-500">Problemas</p><div className="text-xl font-bold">{isLoading ? <Skeleton className="w-8 h-6 rounded-md" /> : <span>{companies?.filter(c => ["EXPIRED", "BLOCKED", "SUSPENDED"].includes(c.status)).length ?? 0}</span>}</div></div></Card.Content></Card>
    </div>
  );

  return (
    <>
      <EntityManagementPage
        title="Empresas"
        description="Gestione las empresas licenciadas en el sistema"
        data={companies || []}
        columns={columns}
        isLoading={isLoading}
        getRowKey={(c) => c.id}
        createHref="/admin/companies/new"
        onSave={async () => {}} // Not used due to createHref
        renderStats={renderStats}
        searchable
        searchPlaceholder="Buscar por nombre, NIT o email..."
        filters={[
          { key: "plan", label: "Plan", type: "select", options: ["LOCAL", "SYNC", "PRO", "ENTERPRISE"].map(p => ({ label: translatePlan(p), value: p })) },
          { key: "status", label: "Estado", type: "select", options: ["ACTIVE", "TRIAL", "PAST_DUE", "SUSPENDED", "EXPIRED", "BLOCKED", "CANCELLED"].map(s => ({ label: translateStatus(s), value: s })) }
        ]}
        customActions={(company) => [
          <DropdownItem key="view" textValue="Ver detalle" startContent={<Eye className="w-4 h-4" />}>Ver detalle</DropdownItem>,
          <DropdownItem key="edit" textValue="Editar" startContent={<Pencil className="w-4 h-4" />} href={`/admin/companies/edit?id=${company.id}`} as="a">Editar</DropdownItem>,
          <DropdownItem key="license" textValue="Generar licencia" startContent={<FileBadge className="w-4 h-4" />} onPress={() => handleGenerateLicense(company)}>Generar licencia</DropdownItem>,
          <DropdownItem key="delete" textValue="Eliminar" startContent={<Trash2 className="w-4 h-4" />} onPress={() => handleDeleteTrigger(company)}>Eliminar</DropdownItem>,
          <DropdownItem key="purge" textValue="Purgar" className="text-danger" color="danger" startContent={<Trash2 className="w-4 h-4" />} onPress={() => handlePurgeTrigger(company)}>Purgar (Hard Delete)</DropdownItem>
        ]}
      />

      {selectedCompany && (
        <GenerateLicenseDialog isOpen={isLicenseOpen} onClose={onLicenseClose} company={selectedCompany} />
      )}

      <AlertDialog>
        <AlertDialog.Backdrop isOpen={!!companyToDelete} onOpenChange={(open) => !open && setCompanyToDelete(null)}>
          <AlertDialog.Container>
            <AlertDialog.Dialog className="sm:max-w-[400px]">
              <AlertDialog.Header>
                <AlertDialog.Icon status="danger" />
                <AlertDialog.Heading>¿{isPurging ? "Purgar" : "Eliminar"} empresa?</AlertDialog.Heading>
              </AlertDialog.Header>
              <AlertDialog.Body>
                <p>
                  {isPurging 
                    ? <>Esto eliminará <strong>permanentemente</strong> la empresa y todos sus datos. Esta acción no se puede deshacer.</>
                    : <>Esto ocultará la empresa deteniendo sus licencias y acceso a la plataforma.</>
                  }
                </p>
              </AlertDialog.Body>
              <AlertDialog.Footer>
                <HeroButton variant="tertiary" onPress={() => setCompanyToDelete(null)}>Cancelar</HeroButton>
                <Button className="bg-danger text-white hover:bg-danger/90" onPress={confirmDelete as any} isLoading={isDeactivating}>Eliminar</Button>
              </AlertDialog.Footer>
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>
    </>
  );
}
