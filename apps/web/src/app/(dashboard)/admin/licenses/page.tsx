"use client";

import { useState, useCallback, useMemo } from "react";
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
  Tabs,
  Tab,
  Accordion,
  AccordionItem,
} from "@heroui/react";
import {
  FileBadge,
  Plus,
  Search,
  MoreVertical,
  Pencil,
  Trash2,
  Eye,
  RefreshCw,
  Monitor,
  Building2,
  Key,
} from "lucide-react";
import { useCompanies, translatePlan, translateStatus } from "@/lib/licensing/hooks";
import type { Company, LicensedDevice } from "@/lib/licensing/types";

export default function LicensesPage() {
  const { data: companies, isLoading, error, mutate } = useCompanies();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [activeTab, setActiveTab] = useState("all");

  const {
    isOpen: isDetailOpen,
    onOpen: onDetailOpen,
    onClose: onDetailClose,
  } = useDisclosure();

  const filteredCompanies = useMemo(() => {
    if (!companies) return [];
    let filtered = companies.filter((company) => {
      const query = searchQuery.toLowerCase();
      return (
        company.name.toLowerCase().includes(query) ||
        company.nit?.toLowerCase().includes(query)
      );
    });

    if (activeTab !== "all") {
      filtered = filtered.filter((c) => {
        switch (activeTab) {
          case "active":
            return c.status === "ACTIVE" || c.status === "TRIAL";
          case "expired":
            return c.status === "EXPIRED" || c.status === "BLOCKED";
          case "past_due":
            return c.status === "PAST_DUE" || c.status === "SUSPENDED";
          default:
            return true;
        }
      });
    }

    return filtered;
  }, [companies, searchQuery, activeTab]);

  const handleViewDetails = useCallback((company: Company) => {
    setSelectedCompany(company);
    onDetailOpen();
  }, [onDetailOpen]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, "success" | "warning" | "danger" | "default" | "primary"> = {
      ACTIVE: "success",
      TRIAL: "primary",
      PAST_DUE: "warning",
      SUSPENDED: "warning",
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

  const stats = useMemo(() => {
    if (!companies) return null;
    return {
      total: companies.length,
      active: companies.filter((c) => c.status === "ACTIVE" || c.status === "TRIAL").length,
      expired: companies.filter((c) => c.status === "EXPIRED" || c.status === "BLOCKED").length,
      pastDue: companies.filter((c) => c.status === "PAST_DUE" || c.status === "SUSPENDED").length,
      totalDevices: companies.reduce((acc, c) => acc + (c.devices?.length || 0), 0),
    };
  }, [companies]);

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Licencias</h1>
        <Alert color="danger">
          Error al cargar licencias: {error.message}
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Licencias</h1>
          <p className="text-default-500">
            Gestione las licencias y dispositivos de todas las empresas
          </p>
        </div>
        <Button
          color="primary"
          startContent={<RefreshCw className="w-4 h-4" />}
          onPress={() => mutate()}
          isLoading={isLoading}
        >
          Actualizar
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardBody className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileBadge className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-default-500">Total Licencias</p>
                <p className="text-xl font-bold">{stats.total}</p>
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
                <p className="text-xl font-bold">{stats.active}</p>
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
                <p className="text-xl font-bold">{stats.pastDue}</p>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="flex items-center gap-3">
              <div className="p-2 bg-danger/10 rounded-lg">
                <FileBadge className="w-5 h-5 text-danger" />
              </div>
              <div>
                <p className="text-sm text-default-500">Expiradas</p>
                <p className="text-xl font-bold">{stats.expired}</p>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="flex items-center gap-3">
              <div className="p-2 bg-secondary/10 rounded-lg">
                <Monitor className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <p className="text-sm text-default-500">Dispositivos</p>
                <p className="text-xl font-bold">{stats.totalDevices}</p>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Tabs & Search */}
      <Card>
        <CardHeader className="flex flex-col gap-4">
          <Tabs selectedKey={activeTab} onSelectionChange={(k) => setActiveTab(k as string)}>
            <Tab key="all" title={`Todas (${stats?.total || 0})`} />
            <Tab key="active" title={`Activas (${stats?.active || 0})`} />
            <Tab key="past_due" title={`Por Vencer (${stats?.pastDue || 0})`} />
            <Tab key="expired" title={`Expiradas (${stats?.expired || 0})`} />
          </Tabs>
          <Input
            placeholder="Buscar por empresa o NIT..."
            startContent={<Search className="w-4 h-4 text-default-400" />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:w-96"
          />
        </CardHeader>
        <CardBody>
          <Table aria-label="Tabla de licencias">
            <TableHeader>
              <TableColumn>EMPRESA</TableColumn>
              <TableColumn>PLAN</TableColumn>
              <TableColumn>ESTADO</TableColumn>
              <TableColumn>VENCIMIENTO</TableColumn>
              <TableColumn>DISPOSITIVOS</TableColumn>
              <TableColumn align="center">ACCIONES</TableColumn>
            </TableHeader>
            <TableBody
              emptyContent="No se encontraron licencias"
              isLoading={isLoading}
              loadingContent={<Skeleton className="w-full h-12" />}
            >
              {filteredCompanies.map((company) => (
                <TableRow key={company.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-default-100 rounded-lg">
                        <Building2 className="w-4 h-4 text-default-500" />
                      </div>
                      <div>
                        <p className="font-medium">{company.name}</p>
                        <p className="text-sm text-default-500">{company.nit || "Sin NIT"}</p>
                      </div>
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
                        {company.graceUntil && (
                          <p className="text-xs text-warning">
                            Gracia: {new Date(company.graceUntil).toLocaleDateString("es-CO")}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-default-400">Sin vencimiento</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Monitor className="w-4 h-4 text-default-400" />
                      <span className="text-sm">
                        {company.devices?.length || 0} / {company.maxDevices}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Dropdown>
                      <DropdownTrigger>
                        <Button isIconOnly variant="light" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownTrigger>
                      <DropdownMenu aria-label="Acciones">
                        <DropdownItem
                          key="view"
                          startContent={<Eye className="w-4 h-4" />}
                          onPress={() => handleViewDetails(company)}
                        >
                          Ver detalle
                        </DropdownItem>
                        <DropdownItem
                          key="renew"
                          startContent={<RefreshCw className="w-4 h-4" />}
                        >
                          Renovar licencia
                        </DropdownItem>
                        <DropdownItem
                          key="generate"
                          startContent={<Key className="w-4 h-4" />}
                        >
                          Generar licencia offline
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

      {/* Company Detail Modal */}
      <Modal isOpen={isDetailOpen} onClose={onDetailClose} size="3xl">
        <ModalContent>
          <ModalHeader>
            <div className="flex items-center gap-3">
              <Building2 className="w-6 h-6 text-primary" />
              <div>
                <h2 className="text-xl font-bold">{selectedCompany?.name}</h2>
                <p className="text-sm text-default-500">{selectedCompany?.nit}</p>
              </div>
            </div>
          </ModalHeader>
          <ModalBody>
            {selectedCompany && (
              <div className="space-y-6">
                {/* Company Info */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardBody>
                      <p className="text-sm text-default-500">Plan</p>
                      <Chip color={getPlanColor(selectedCompany.plan)} variant="flat" size="sm">
                        {translatePlan(selectedCompany.plan)}
                      </Chip>
                    </CardBody>
                  </Card>
                  <Card>
                    <CardBody>
                      <p className="text-sm text-default-500">Estado</p>
                      <Chip color={getStatusColor(selectedCompany.status)} variant="flat" size="sm">
                        {translateStatus(selectedCompany.status)}
                      </Chip>
                    </CardBody>
                  </Card>
                </div>

                {/* Devices */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Monitor className="w-5 h-5" />
                    Dispositivos Licenciados
                  </h3>
                  {selectedCompany.devices && selectedCompany.devices.length > 0 ? (
                    <Table aria-label="Dispositivos">
                      <TableHeader>
                        <TableColumn>DISPOSITIVO</TableColumn>
                        <TableColumn>ESTADO</TableColumn>
                        <TableColumn>ULTIMO HEARTBEAT</TableColumn>
                        <TableColumn>SINCRONIZACION</TableColumn>
                      </TableHeader>
                      <TableBody>
                        {selectedCompany.devices.map((device) => (
                          <TableRow key={device.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{device.hostname || "Sin nombre"}</p>
                                <p className="text-xs text-default-500 font-mono">
                                  {device.deviceFingerprint.slice(0, 16)}...
                                </p>
                                <p className="text-xs text-default-400">{device.operatingSystem}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Chip
                                color={device.isCurrentlyOnline ? "success" : "default"}
                                variant="flat"
                                size="sm"
                              >
                                {device.isCurrentlyOnline ? "En línea" : "Desconectado"}
                              </Chip>
                            </TableCell>
                            <TableCell>
                              {device.lastHeartbeatAt
                                ? new Date(device.lastHeartbeatAt).toLocaleString("es-CO")
                                : "Nunca"}
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <p>Pendientes: {device.pendingSyncEvents || 0}</p>
                                <p className="text-default-400">
                                  Sincronizados: {device.syncedEvents || 0}
                                </p>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-default-400 text-center py-8">
                      No hay dispositivos registrados
                    </p>
                  )}
                </div>

                {/* Modules */}
                {selectedCompany.modules && selectedCompany.modules.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Módulos Habilitados</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedCompany.modules.map((module) => (
                        <Chip
                          key={module.id}
                          color={module.enabled ? "success" : "default"}
                          variant="flat"
                          size="sm"
                        >
                          {module.moduleType}
                        </Chip>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={onDetailClose}>
              Cerrar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
