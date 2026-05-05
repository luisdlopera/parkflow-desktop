"use client";

import { useState, useCallback } from "react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Input,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Skeleton,
  Alert,
} from "@heroui/react";
import {
  Building2,
  Plus,
  Search,
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

export default function CompaniesPage() {
  const { data: companies, isLoading, error, mutate } = useCompanies();
  const { createCompany, isLoading: isCreating } = useCreateCompany();
  const [searchQuery, setSearchQuery] = useState("");
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

  const filteredCompanies = companies?.filter((company) => {
    const query = searchQuery.toLowerCase();
    return (
      company.name.toLowerCase().includes(query) ||
      company.nit?.toLowerCase().includes(query) ||
      company.email?.toLowerCase().includes(query)
    );
  });

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

      {/* Search */}
      <Card>
        <CardHeader className="flex justify-between items-center">
          <Input
            placeholder="Buscar por nombre, NIT o email..."
            startContent={<Search className="w-4 h-4 text-default-400" />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-96"
          />
        </CardHeader>
        <CardBody>
          <Table aria-label="Tabla de empresas">
            <TableHeader>
              <TableColumn>EMPRESA</TableColumn>
              <TableColumn>PLAN</TableColumn>
              <TableColumn>ESTADO</TableColumn>
              <TableColumn>VENCIMIENTO</TableColumn>
              <TableColumn>DISPOSITIVOS</TableColumn>
              <TableColumn align="center">ACCIONES</TableColumn>
            </TableHeader>
            <TableBody
              emptyContent="No se encontraron empresas"
              isLoading={isLoading}
              loadingContent={<Skeleton className="w-full h-12" />}
            >
              {(filteredCompanies ?? []).map((company) => (
                <TableRow key={company.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{company.name}</p>
                      <p className="text-sm text-default-500">{company.nit || "Sin NIT"}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Chip color={getPlanColor(company.plan)} variant="flat" size="sm">
                      {translatePlan(company.plan)}
                    </Chip>
                  </TableCell>
                  <TableCell>
                    <Chip color={getStatusColor(company.status)} variant="flat" size="sm">
                      {translateStatus(company.status)}
                    </Chip>
                  </TableCell>
                  <TableCell>
                    {company.expiresAt ? (
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
                    )}
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">
                      {company.devices?.length || 0} / {company.maxDevices}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Dropdown>
                      <DropdownTrigger>
                        <Button isIconOnly variant="light" size="sm" aria-label="Más acciones">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownTrigger>
                      <DropdownMenu aria-label="Acciones">
                        <DropdownItem
                          key="view"
                          textValue="Ver detalle"
                          startContent={<Eye className="w-4 h-4" />}
                        >
                          Ver detalle
                        </DropdownItem>
                        <DropdownItem
                          key="edit"
                          textValue="Editar"
                          startContent={<Pencil className="w-4 h-4" />}
                        >
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

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
