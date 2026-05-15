"use client";

import { useState, useCallback } from "react";
import {
  Button,
  Card,
  CardBody,
  Chip,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  useDisclosure,
  Skeleton,
} from "@heroui/react";
import {
  Building2,
  Plus,
  MoreVertical,
  Pencil,
  FileBadge,
  Trash2,
  Eye,
} from "lucide-react";
import { 
  useCompanies, 
  useCreateCompany, 
  translatePlan, 
  translateStatus 
} from "@/lib/licensing/hooks";
import type { Company, CreateCompanyRequest } from "@/lib/licensing/types";
import { CompanyForm } from "@/components/admin/CompanyForm";
import { GenerateLicenseDialog } from "@/components/admin/GenerateLicenseDialog";
import { ErrorState } from "@/components/feedback/ErrorState";
import { getUserErrorMessage } from "@/lib/errors/get-user-error-message";
import { ApiError } from "@/lib/errors/api-error";
import DataTable, { type DataTableColumn } from "@/components/ui/DataTable";

export default function CompaniesPage() {
  const { data: companies, isLoading, error, mutate } = useCompanies();
  const { createCompany, isLoading: isCreating } = useCreateCompany();
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  const {
    isOpen: isCreateOpen,
    onOpen: onCreateOpen,
    onClose: onCreateClose,
  } = useDisclosure();

  const {
    isOpen: isLicenseOpen,
    onOpen: onLicenseOpen,
    onClose: onLicenseClose,
  } = useDisclosure();

  const handleCreateCompany = useCallback(
    async (data: CreateCompanyRequest) => {
      try {
        await createCompany(data);
        onCreateClose();
        mutate();
      } catch (err) {
        // Error manejado en el hook
      }
    },
    [createCompany, onCreateClose, mutate]
  );

  const handleGenerateLicense = useCallback((company: Company) => {
    setSelectedCompany(company);
    onLicenseOpen();
  }, [onLicenseOpen]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, "success" | "warning" | "danger" | "default" | "primary"> = {
      ACTIVE: "success",
      TRIAL: "primary",
      PAST_DUE: "warning",
      SUSPENDED: "danger",
      EXPIRED: "danger",
      BLOCKED: "danger",
      CANCELLED: "default",
    };
    return colors[status] || "default";
  };

  const getPlanColor = (plan: string) => {
    const colors: Record<string, "default" | "primary" | "secondary" | "success"> = {
      LOCAL: "default",
      SYNC: "primary",
      PRO: "secondary",
      ENTERPRISE: "success",
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
        <Chip color={getPlanColor(company.plan)} variant="flat" size="sm">
          {translatePlan(company.plan)}
        </Chip>
      ),
    },
    {
      key: "status",
      header: "Estado",
      sortable: true,
      render: (company) => (
        <Chip color={getStatusColor(company.status)} variant="flat" size="sm">
          {translateStatus(company.status)}
        </Chip>
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
              <p className="text-xs text-warning">
                Gracia hasta: {new Date(company.graceUntil).toLocaleDateString("es-CO")}
              </p>
            )}
          </div>
        ) : (
          <span className="text-default-400">-</span>
        ),
    },
    {
      key: "maxDevices",
      header: "Dispositivos",
      align: "right",
      render: (company) => (
        <p className="text-sm">
          {company.devices?.length || 0} / {company.maxDevices}
        </p>
      ),
    },
  ];

  if (error) {
    const userError = getUserErrorMessage(error, "companies.load");
    const apiErr = error instanceof ApiError ? error : undefined;

    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <ErrorState
          title={userError.title}
          description={userError.description}
          actionLabel={userError.actionLabel}
          onRetry={() => mutate()}
          errorCode={apiErr?.code as string}
          correlationId={apiErr?.correlationId}
          technicalDetails={apiErr?.message}
        />
      </div>
    );
  }


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Empresas</h1>
          <p className="text-default-500">
            Gestione las empresas licenciadas en el sistema
          </p>
        </div>
        <Button
          color="primary"
          startContent={<Plus className="w-4 h-4" />}
          onPress={onCreateOpen}
        >
          Nueva Empresa
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardBody className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-default-500">Total Empresas</p>
              <div className="text-xl font-bold">
                {isLoading ? <Skeleton className="w-8 h-6 rounded-md" /> : <span>{companies?.length ?? 0}</span>}
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex items-center gap-3">
            <div className="p-2 bg-success/10 rounded-lg">
              <FileBadge className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-default-500">Activas</p>
              <div className="text-xl font-bold">
                {isLoading ? (
                  <Skeleton className="w-8 h-6 rounded-md" />
                ) : (
                  <span>{companies?.filter((c) => c.status === "ACTIVE" || c.status === "TRIAL").length ?? 0}</span>
                )}
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex items-center gap-3">
            <div className="p-2 bg-warning/10 rounded-lg">
              <FileBadge className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-sm text-default-500">Por Vencer</p>
              <div className="text-xl font-bold">
                {isLoading ? (
                  <Skeleton className="w-8 h-6 rounded-md" />
                ) : (
                  <span>
                    {companies?.filter((c) => {
                      if (!c.expiresAt) return false;
                      const days = Math.ceil(
                        (new Date(c.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                      );
                      return days <= 14 && days > 0;
                    }).length ?? 0}
                  </span>
                )}
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex items-center gap-3">
            <div className="p-2 bg-danger/10 rounded-lg">
              <FileBadge className="w-5 h-5 text-danger" />
            </div>
            <div>
              <p className="text-sm text-default-500">Problemas</p>
              <div className="text-xl font-bold">
                {isLoading ? (
                  <Skeleton className="w-8 h-6 rounded-md" />
                ) : (
                  <span>
                    {companies?.filter(
                      (c) => c.status === "EXPIRED" || c.status === "BLOCKED" || c.status === "SUSPENDED"
                    ).length ?? 0}
                  </span>
                )}
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      <DataTable
        title="Empresas licenciadas"
        description="Busca, filtra y revisa el estado de cada empresa."
        columns={columns}
        data={companies ?? []}
        getRowKey={(company) => company.id}
        isLoading={isLoading}
        emptyMessage="No se encontraron empresas"
        searchable
        searchPlaceholder="Buscar por nombre, NIT o email..."
        filters={[
          {
            key: "plan",
            label: "Plan",
            type: "select",
            options: ["LOCAL", "SYNC", "PRO", "ENTERPRISE"].map((plan) => ({
              label: translatePlan(plan),
              value: plan,
            })),
          },
          {
            key: "status",
            label: "Estado",
            type: "select",
            options: ["ACTIVE", "TRIAL", "PAST_DUE", "SUSPENDED", "EXPIRED", "BLOCKED", "CANCELLED"].map((status) => ({
              label: translateStatus(status),
              value: status,
            })),
          },
          { key: "expiresAt", label: "Vencimiento", type: "dateRange" },
        ]}
        actions={(company) => (
          <Dropdown>
            <DropdownTrigger>
              <Button isIconOnly variant="light" size="sm" aria-label="Más acciones">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownTrigger>
            <DropdownMenu aria-label="Acciones">
              <DropdownItem key="view" textValue="Ver detalle" startContent={<Eye className="w-4 h-4" />}>
                Ver detalle
              </DropdownItem>
              <DropdownItem key="edit" textValue="Editar" startContent={<Pencil className="w-4 h-4" />}>
                Editar
              </DropdownItem>
              <DropdownItem
                key="license"
                textValue="Generar licencia"
                startContent={<FileBadge className="w-4 h-4" />}
                onPress={() => handleGenerateLicense(company)}
              >
                Generar licencia
              </DropdownItem>
              <DropdownItem
                key="delete"
                textValue="Eliminar"
                className="text-danger"
                color="danger"
                startContent={<Trash2 className="w-4 h-4" />}
              >
                Eliminar
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        )}
      />

      {/* Create Company Modal */}
      <Modal isOpen={isCreateOpen} onClose={onCreateClose} size="2xl">
        <ModalContent>
          <ModalHeader>Crear Nueva Empresa</ModalHeader>
          <ModalBody>
            <CompanyForm onSubmit={handleCreateCompany} isLoading={isCreating} />
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Generate License Modal */}
      {selectedCompany && (
        <GenerateLicenseDialog
          isOpen={isLicenseOpen}
          onClose={onLicenseClose}
          company={selectedCompany}
        />
      )}
    </div>
  );
}
