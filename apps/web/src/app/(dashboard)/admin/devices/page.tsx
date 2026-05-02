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
  Badge,
} from "@heroui/react";
import {
  Monitor,
  Search,
  MoreVertical,
  Eye,
  RefreshCw,
  Send,
  Pause,
  Play,
  Ban,
  Building2,
  Cpu,
} from "lucide-react";
import { useCompanies } from "@/lib/licensing/hooks";
import type { Company, LicensedDevice } from "@/lib/licensing/types";

interface DeviceWithCompany extends LicensedDevice {
  companyName: string;
  companyId: string;
}

export default function DevicesPage() {
  const { data: companies, isLoading, error, mutate } = useCompanies();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDevice, setSelectedDevice] = useState<DeviceWithCompany | null>(null);
  const [activeTab, setActiveTab] = useState("all");

  const {
    isOpen: isDetailOpen,
    onOpen: onDetailOpen,
    onClose: onDetailClose,
  } = useDisclosure();

  const {
    isOpen: isCommandOpen,
    onOpen: onCommandOpen,
    onClose: onCommandClose,
  } = useDisclosure();

  // Flatten all devices from all companies
  const allDevices = useMemo(() => {
    if (!companies) return [];
    const devices: DeviceWithCompany[] = [];
    companies.forEach((company) => {
      company.devices?.forEach((device) => {
        devices.push({
          ...device,
          companyName: company.name,
          companyId: company.id,
        });
      });
    });
    return devices;
  }, [companies]);

  const filteredDevices = useMemo(() => {
    let filtered = allDevices.filter((device) => {
      const query = searchQuery.toLowerCase();
      return (
        device.hostname?.toLowerCase().includes(query) ||
        device.deviceFingerprint.toLowerCase().includes(query) ||
        device.companyName.toLowerCase().includes(query) ||
        device.operatingSystem?.toLowerCase().includes(query)
      );
    });

    if (activeTab !== "all") {
      filtered = filtered.filter((d) => {
        switch (activeTab) {
          case "online":
            return d.isCurrentlyOnline;
          case "offline":
            return !d.isCurrentlyOnline;
          case "sync_pending":
            return (d.pendingSyncEvents || 0) > 0;
          default:
            return true;
        }
      });
    }

    return filtered;
  }, [allDevices, searchQuery, activeTab]);

  const handleViewDetails = useCallback((device: DeviceWithCompany) => {
    setSelectedDevice(device);
    onDetailOpen();
  }, [onDetailOpen]);

  const handleSendCommand = useCallback((device: DeviceWithCompany) => {
    setSelectedDevice(device);
    onCommandOpen();
  }, [onCommandOpen]);

  const stats = useMemo(() => {
    if (!allDevices.length) return null;
    return {
      total: allDevices.length,
      online: allDevices.filter((d) => d.isCurrentlyOnline).length,
      offline: allDevices.filter((d) => !d.isCurrentlyOnline).length,
      withSyncPending: allDevices.filter((d) => (d.pendingSyncEvents || 0) > 0).length,
    };
  }, [allDevices]);

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Dispositivos</h1>
        <Alert color="danger">
          Error al cargar dispositivos: {error.message}
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Dispositivos</h1>
          <p className="text-default-500">
            Monitoree todos los dispositivos licenciados del sistema
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardBody className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Monitor className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-default-500">Total Dispositivos</p>
                <p className="text-xl font-bold">{stats.total}</p>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="flex items-center gap-3">
              <div className="p-2 bg-success/10 rounded-lg">
                <Play className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-default-500">En Línea</p>
                <p className="text-xl font-bold">{stats.online}</p>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="flex items-center gap-3">
              <div className="p-2 bg-default/10 rounded-lg">
                <Pause className="w-5 h-5 text-default-500" />
              </div>
              <div>
                <p className="text-sm text-default-500">Desconectados</p>
                <p className="text-xl font-bold">{stats.offline}</p>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="flex items-center gap-3">
              <div className="p-2 bg-warning/10 rounded-lg">
                <RefreshCw className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-default-500">Sync Pendiente</p>
                <p className="text-xl font-bold">{stats.withSyncPending}</p>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Tabs & Search */}
      <Card>
        <CardHeader className="flex flex-col gap-4">
          <Tabs selectedKey={activeTab} onSelectionChange={(k) => setActiveTab(k as string)}>
            <Tab key="all" title={`Todos (${stats?.total || 0})`} />
            <Tab key="online" title={`En Línea (${stats?.online || 0})`} />
            <Tab key="offline" title={`Desconectados (${stats?.offline || 0})`} />
            <Tab key="sync_pending" title={`Sync Pendiente (${stats?.withSyncPending || 0})`} />
          </Tabs>
          <Input
            placeholder="Buscar por nombre, empresa o sistema operativo..."
            startContent={<Search className="w-4 h-4 text-default-400" />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:w-96"
          />
        </CardHeader>
        <CardBody>
          <Table aria-label="Tabla de dispositivos">
            <TableHeader>
              <TableColumn>DISPOSITIVO</TableColumn>
              <TableColumn>EMPRESA</TableColumn>
              <TableColumn>ESTADO</TableColumn>
              <TableColumn>VERSION</TableColumn>
              <TableColumn>SINCRONIZACIÓN</TableColumn>
              <TableColumn align="center">ACCIONES</TableColumn>
            </TableHeader>
            <TableBody
              emptyContent="No se encontraron dispositivos"
              isLoading={isLoading}
              loadingContent={<Skeleton className="w-full h-12" />}
            >
              {filteredDevices.map((device) => (
                <TableRow key={device.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${device.isCurrentlyOnline ? 'bg-success/10' : 'bg-default-100'}`}>
                        <Monitor className={`w-4 h-4 ${device.isCurrentlyOnline ? 'text-success' : 'text-default-500'}`} />
                      </div>
                      <div>
                        <p className="font-medium">{device.hostname || "Sin nombre"}</p>
                        <p className="text-xs text-default-500 font-mono">
                          {device.deviceFingerprint.slice(0, 20)}...
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-default-400" />
                      <span className="text-sm">{device.companyName}</span>
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
                    <div className="text-sm">
                      <p>v{device.appVersion || "?"}</p>
                      <p className="text-xs text-default-400">{device.operatingSystem}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {(device.pendingSyncEvents || 0) > 0 ? (
                        <Badge color="warning" content={device.pendingSyncEvents}>
                          <span className="text-warning">Pendiente</span>
                        </Badge>
                      ) : (
                        <span className="text-success">Sincronizado</span>
                      )}
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
                          onPress={() => handleViewDetails(device)}
                        >
                          Ver detalle
                        </DropdownItem>
                        <DropdownItem
                          key="command"
                          startContent={<Send className="w-4 h-4" />}
                          onPress={() => handleSendCommand(device)}
                        >
                          Enviar comando
                        </DropdownItem>
                        <DropdownItem
                          key="diagnose"
                          startContent={<Cpu className="w-4 h-4" />}
                        >
                          Diagnosticar
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

      {/* Device Detail Modal */}
      <Modal isOpen={isDetailOpen} onClose={onDetailClose} size="2xl">
        <ModalContent>
          <ModalHeader>
            <div className="flex items-center gap-3">
              <Monitor className="w-6 h-6 text-primary" />
              <div>
                <h2 className="text-xl font-bold">
                  {selectedDevice?.hostname || "Dispositivo sin nombre"}
                </h2>
                <p className="text-sm text-default-500 font-mono">
                  {selectedDevice?.deviceFingerprint}
                </p>
              </div>
            </div>
          </ModalHeader>
          <ModalBody>
            {selectedDevice && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardBody>
                      <p className="text-sm text-default-500">Empresa</p>
                      <p className="font-medium">{selectedDevice.companyName}</p>
                    </CardBody>
                  </Card>
                  <Card>
                    <CardBody>
                      <p className="text-sm text-default-500">Estado</p>
                      <Chip
                        color={selectedDevice.isCurrentlyOnline ? "success" : "default"}
                        variant="flat"
                        size="sm"
                      >
                        {selectedDevice.isCurrentlyOnline ? "En línea" : "Desconectado"}
                      </Chip>
                    </CardBody>
                  </Card>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardBody>
                      <p className="text-sm text-default-500">Sistema Operativo</p>
                      <p className="font-medium">{selectedDevice.operatingSystem || "Desconocido"}</p>
                    </CardBody>
                  </Card>
                  <Card>
                    <CardBody>
                      <p className="text-sm text-default-500">Versión App</p>
                      <p className="font-medium">{selectedDevice.appVersion || "Desconocida"}</p>
                    </CardBody>
                  </Card>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardBody>
                      <p className="text-sm text-default-500">Último Heartbeat</p>
                      <p className="font-medium">
                        {selectedDevice.lastHeartbeatAt
                          ? new Date(selectedDevice.lastHeartbeatAt).toLocaleString("es-CO")
                          : "Nunca"}
                      </p>
                    </CardBody>
                  </Card>
                  <Card>
                    <CardBody>
                      <p className="text-sm text-default-500">Última Conexión</p>
                      <p className="font-medium">
                        {selectedDevice.lastSeenAt
                          ? new Date(selectedDevice.lastSeenAt).toLocaleString("es-CO")
                          : "Nunca"}
                      </p>
                    </CardBody>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold">Estadísticas de Sincronización</h3>
                  </CardHeader>
                  <CardBody>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold">{selectedDevice.heartbeatCount || 0}</p>
                        <p className="text-sm text-default-500">Heartbeats</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-warning">{selectedDevice.pendingSyncEvents || 0}</p>
                        <p className="text-sm text-default-500">Pendientes</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-success">{selectedDevice.syncedEvents || 0}</p>
                        <p className="text-sm text-default-500">Sincronizados</p>
                      </div>
                    </div>
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold">Información de Licencia</h3>
                  </CardHeader>
                  <CardBody>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-default-500">Estado de Licencia:</span>
                        <Chip variant="flat" size="sm">{selectedDevice.status}</Chip>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-default-500">Vencimiento:</span>
                        <span>
                          {selectedDevice.expiresAt
                            ? new Date(selectedDevice.expiresAt).toLocaleDateString("es-CO")
                            : "Sin vencimiento"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-default-500">Registrado:</span>
                        <span>
                          {selectedDevice.createdAt
                            ? new Date(selectedDevice.createdAt).toLocaleDateString("es-CO")
                            : "Desconocido"}
                        </span>
                      </div>
                    </div>
                  </CardBody>
                </Card>
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

      {/* Send Command Modal */}
      <Modal isOpen={isCommandOpen} onClose={onCommandClose} size="md">
        <ModalContent>
          <ModalHeader>
            <div className="flex items-center gap-3">
              <Send className="w-6 h-6 text-primary" />
              <div>
                <h2 className="text-xl font-bold">Enviar Comando Remoto</h2>
                <p className="text-sm text-default-500">{selectedDevice?.hostname}</p>
              </div>
            </div>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-3">
              <Button
                fullWidth
                variant="flat"
                startContent={<Ban className="w-4 h-4" />}
              >
                Bloquear Sistema
              </Button>
              <Button
                fullWidth
                variant="flat"
                startContent={<Pause className="w-4 h-4" />}
              >
                Deshabilitar Sync
              </Button>
              <Button
                fullWidth
                variant="flat"
                startContent={<RefreshCw className="w-4 h-4" />}
              >
                Limpiar Caché de Licencia
              </Button>
              <Button
                fullWidth
                variant="flat"
                startContent={<Send className="w-4 h-4" />}
              >
                Solicitar Renovación
              </Button>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={onCommandClose}>
              Cancelar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
