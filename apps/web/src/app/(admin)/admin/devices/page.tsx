"use client";

import { useState, useCallback, useMemo } from "react";
import { useOverlayState } from "@heroui/react";
import { Alert } from "@/components/ui/Alert";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/Modal";
import { Chip } from "@/components/ui/Chip";
import { DropdownTrigger } from "@/components/ui/Dropdown";
import { Dropdown } from "@/components/ui/Dropdown";
import { DropdownMenu } from "@/components/ui/Dropdown";
import { DropdownItem } from "@/components/ui/Dropdown";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { Tab } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import {
  Monitor,
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
import DataTable, { type DataTableColumn } from "@/components/ui/DataTable";

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
    open: onDetailOpen,
    close: onDetailClose,
  } = useOverlayState();

  const {
    isOpen: isCommandOpen,
    open: onCommandOpen,
    close: onCommandClose,
  } = useOverlayState();

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

  const columns: DataTableColumn<DeviceWithCompany>[] = [
    {
      key: "hostname",
      header: "Dispositivo",
      sortable: true,
      render: (device) => (
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${device.isCurrentlyOnline ? "bg-success/10" : "bg-default-100"}`}>
            <Monitor className={`w-4 h-4 ${device.isCurrentlyOnline ? "text-success" : "text-default-500"}`} />
          </div>
          <div>
            <p className="font-medium">{device.hostname || "Sin nombre"}</p>
            <p className="text-xs text-default-500 font-mono">
              {device.deviceFingerprint.slice(0, 20)}...
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "companyName",
      header: "Empresa",
      sortable: true,
      render: (device) => (
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-default-400" />
          <span className="text-sm">{device.companyName}</span>
        </div>
      ),
    },
    {
      key: "isCurrentlyOnline",
      header: "Estado",
      sortable: true,
      render: (device) => (
        <Chip color={device.isCurrentlyOnline ? "success" : "default"} variant="soft" size="sm">
          {device.isCurrentlyOnline ? "En línea" : "Desconectado"}
        </Chip>
      ),
    },
    {
      key: "appVersion",
      header: "Version",
      render: (device) => (
        <div className="text-sm">
          <p>v{device.appVersion || "?"}</p>
          <p className="text-xs text-default-400">{device.operatingSystem}</p>
        </div>
      ),
    },
    {
      key: "pendingSyncEvents",
      header: "Sincronización",
      align: "center",
      render: (device) => (
        <div className="text-sm">
          {(device.pendingSyncEvents || 0) > 0 ? (
            <Badge color="warning" content={device.pendingSyncEvents}>
              <span className="text-warning">Pendiente</span>
            </Badge>
          ) : (
            <span className="text-success">Sincronizado</span>
          )}
        </div>
      ),
    },
  ];

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
            <Card.Content className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Monitor className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-default-500">Total Dispositivos</p>
                <p className="text-xl font-bold">{stats.total}</p>
              </div>
            </Card.Content>
          </Card>

          <Card>
            <Card.Content className="flex items-center gap-3">
              <div className="p-2 bg-success/10 rounded-lg">
                <Play className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-default-500">En Línea</p>
                <p className="text-xl font-bold">{stats.online}</p>
              </div>
            </Card.Content>
          </Card>

          <Card>
            <Card.Content className="flex items-center gap-3">
              <div className="p-2 bg-default/10 rounded-lg">
                <Pause className="w-5 h-5 text-default-500" />
              </div>
              <div>
                <p className="text-sm text-default-500">Desconectados</p>
                <p className="text-xl font-bold">{stats.offline}</p>
              </div>
            </Card.Content>
          </Card>

          <Card>
            <Card.Content className="flex items-center gap-3">
              <div className="p-2 bg-warning/10 rounded-lg">
                <RefreshCw className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-default-500">Sync Pendiente</p>
                <p className="text-xl font-bold">{stats.withSyncPending}</p>
              </div>
            </Card.Content>
          </Card>
        </div>
      )}

      <div className="space-y-4">
        <Tabs selectedKey={activeTab} onChange={(k) => setActiveTab(k as string)}>
          <Tab key="all" title={`Todos (${stats?.total || 0})`} />
          <Tab key="online" title={`En Línea (${stats?.online || 0})`} />
          <Tab key="offline" title={`Desconectados (${stats?.offline || 0})`} />
          <Tab key="sync_pending" title={`Sync Pendiente (${stats?.withSyncPending || 0})`} />
        </Tabs>
        <DataTable
          title="Inventario de dispositivos"
          description="Monitorea conectividad, versión y sincronización por equipo."
          columns={columns}
          data={filteredDevices}
          getRowKey={(device) => device.id}
          isLoading={isLoading}
          emptyMessage="No se encontraron dispositivos"
          searchable
          searchPlaceholder="Buscar por nombre, empresa o sistema operativo..."
          onSearchChange={setSearchQuery}
          filters={[
            { key: "isCurrentlyOnline", label: "Conectado", type: "boolean" },
            { key: "companyName", label: "Empresa", type: "text" },
            { key: "pendingSyncEvents", label: "Sync pendiente", type: "numberRange" },
          ]}
          actions={(device) => (
            <Dropdown>
              <DropdownTrigger>
                <Button isIconOnly variant="ghost" size="sm" aria-label="Más acciones">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownTrigger>
              <DropdownMenu aria-label="Acciones">
                <DropdownItem
                  key="view"
                  textValue="Ver detalle"
                  startContent={<Eye className="w-4 h-4" />}
                  onPress={() => handleViewDetails(device)}
                >
                  Ver detalle
                </DropdownItem>
                <DropdownItem
                  key="command"
                  textValue="Enviar comando"
                  startContent={<Send className="w-4 h-4" />}
                  onPress={() => handleSendCommand(device)}
                >
                  Enviar comando
                </DropdownItem>
                <DropdownItem key="diagnose" textValue="Diagnosticar" startContent={<Cpu className="w-4 h-4" />}>
                  Diagnosticar
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          )}
        />
      </div>

      {/* Device Detail Modal */}
      <Modal state={ { isOpen: isDetailOpen, setOpen: (v: boolean) => { if(!v) onDetailClose(); }, open: () => {}, close: onDetailClose, toggle: () => {} } }>
        <Modal.Content>
          <Modal.Header>
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
          </Modal.Header>
          <Modal.Body>
            {selectedDevice && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <Card.Content>
                      <p className="text-sm text-default-500">Empresa</p>
                      <p className="font-medium">{selectedDevice.companyName}</p>
                    </Card.Content>
                  </Card>
                  <Card>
                    <Card.Content>
                      <p className="text-sm text-default-500">Estado</p>
                      <Chip
                        color={selectedDevice.isCurrentlyOnline ? "success" : "default"}
                        variant="soft"
                        size="sm"
                      >
                        {selectedDevice.isCurrentlyOnline ? "En línea" : "Desconectado"}
                      </Chip>
                    </Card.Content>
                  </Card>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <Card.Content>
                      <p className="text-sm text-default-500">Sistema Operativo</p>
                      <p className="font-medium">{selectedDevice.operatingSystem || "Desconocido"}</p>
                    </Card.Content>
                  </Card>
                  <Card>
                    <Card.Content>
                      <p className="text-sm text-default-500">Versión App</p>
                      <p className="font-medium">{selectedDevice.appVersion || "Desconocida"}</p>
                    </Card.Content>
                  </Card>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <Card.Content>
                      <p className="text-sm text-default-500">Último Heartbeat</p>
                      <p className="font-medium">
                        {selectedDevice.lastHeartbeatAt
                          ? new Date(selectedDevice.lastHeartbeatAt).toLocaleString("es-CO")
                          : "Nunca"}
                      </p>
                    </Card.Content>
                  </Card>
                  <Card>
                    <Card.Content>
                      <p className="text-sm text-default-500">Última Conexión</p>
                      <p className="font-medium">
                        {selectedDevice.lastSeenAt
                          ? new Date(selectedDevice.lastSeenAt).toLocaleString("es-CO")
                          : "Nunca"}
                      </p>
                    </Card.Content>
                  </Card>
                </div>

                <Card>
                  <Card.Header>
                    <h3 className="text-lg font-semibold">Estadísticas de Sincronización</h3>
                  </Card.Header>
                  <Card.Content>
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
                  </Card.Content>
                </Card>

                <Card>
                  <Card.Header>
                    <h3 className="text-lg font-semibold">Información de Licencia</h3>
                  </Card.Header>
                  <Card.Content>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-default-500">Estado de Licencia:</span>
                        <Chip variant="soft" size="sm">{selectedDevice.status}</Chip>
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
                  </Card.Content>
                </Card>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="tertiary" color="primary" onPress={onDetailClose}>
              Cerrar
            </Button>
          </Modal.Footer>
        </Modal.Content>
      </Modal>

      {/* Send Command Modal */}
      <Modal state={ { isOpen: isCommandOpen, setOpen: (v: boolean) => { if(!v) onCommandClose(); }, open: () => {}, close: onCommandClose, toggle: () => {} } }>
        <Modal.Content>
          <Modal.Header>
            <div className="flex items-center gap-3">
              <Send className="w-6 h-6 text-primary" />
              <div>
                <h2 className="text-xl font-bold">Enviar Comando Remoto</h2>
                <p className="text-sm text-default-500">{selectedDevice?.hostname}</p>
              </div>
            </div>
          </Modal.Header>
          <Modal.Body>
            <div className="space-y-3">
              <Button
                fullWidth
                variant="tertiary"
                color="primary"
                startContent={<Ban className="w-4 h-4" />}
              >
                Bloquear Sistema
              </Button>
              <Button
                fullWidth
                variant="tertiary"
                color="primary"
                startContent={<Pause className="w-4 h-4" />}
              >
                Deshabilitar Sync
              </Button>
              <Button
                fullWidth
                variant="tertiary"
                color="primary"
                startContent={<RefreshCw className="w-4 h-4" />}
              >
                Limpiar Caché de Licencia
              </Button>
              <Button
                fullWidth
                variant="tertiary"
                color="primary"
                startContent={<Send className="w-4 h-4" />}
              >
                Solicitar Renovación
              </Button>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="tertiary" color="primary" onPress={onCommandClose}>
              Cancelar
            </Button>
          </Modal.Footer>
        </Modal.Content>
      </Modal>
    </div>
  );
}
