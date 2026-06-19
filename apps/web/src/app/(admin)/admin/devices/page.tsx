"use client";

import { useState, useCallback, useMemo } from "react";
import { useOverlayState, Button as HeroButton, Skeleton } from "@heroui/react";
import { Chip } from "@/components/ui/Chip";
import { DropdownItem } from "@/components/ui/Dropdown";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Tabs, Tab } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Monitor, Eye, RefreshCw, Send, Pause, Play, Ban, Building2, Cpu } from "lucide-react";
import { useCompanies } from "@/lib/licensing/hooks";
import type { LicensedDevice } from "@/lib/licensing/types";
import type { DataTableColumn } from "@/components/ui/DataTable";
import { EntityManagementPage } from "@/shared/components/crud/EntityManagementPage";

interface DeviceWithCompany extends LicensedDevice {
  companyName: string;
  companyId: string;
}

export default function DevicesPage() {
  const { data: companies, isLoading, error, mutate } = useCompanies();
  const [selectedDevice, setSelectedDevice] = useState<DeviceWithCompany | null>(null);
  const [activeTab, setActiveTab] = useState("all");

  const { isOpen: isDetailOpen, open: onDetailOpen, close: onDetailClose } = useOverlayState();
  const { isOpen: isCommandOpen, open: onCommandOpen, close: onCommandClose } = useOverlayState();

  const allDevices = useMemo(() => {
    if (!companies) return [];
    return companies.flatMap(company => 
      (company.devices || []).map(device => ({
        ...device,
        companyName: company.name,
        companyId: company.id,
      }))
    );
  }, [companies]);

  const handleViewDetails = useCallback((device: DeviceWithCompany) => {
    setSelectedDevice(device);
    onDetailOpen();
  }, [onDetailOpen]);

  const handleSendCommand = useCallback((device: DeviceWithCompany) => {
    setSelectedDevice(device);
    onCommandOpen();
  }, [onCommandOpen]);

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
            <p className="text-xs text-default-500 font-mono">{device.deviceFingerprint.slice(0, 20)}...</p>
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
            <Badge color="warning" content={device.pendingSyncEvents}><span className="text-warning">Pendiente</span></Badge>
          ) : (<span className="text-success">Sincronizado</span>)}
        </div>
      ),
    },
  ];

  const renderStats = () => {
    const total = allDevices.length;
    const online = allDevices.filter(d => d.isCurrentlyOnline).length;
    const offline = allDevices.filter(d => !d.isCurrentlyOnline).length;
    const sync = allDevices.filter(d => (d.pendingSyncEvents || 0) > 0).length;

    return (
      <div className="space-y-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><Card.Content className="flex items-center gap-3"><div className="p-2 bg-primary/10 rounded-lg"><Monitor className="w-5 h-5 text-primary" /></div><div><p className="text-sm text-default-500">Total</p><p className="text-xl font-bold">{total}</p></div></Card.Content></Card>
          <Card><Card.Content className="flex items-center gap-3"><div className="p-2 bg-success/10 rounded-lg"><Play className="w-5 h-5 text-success" /></div><div><p className="text-sm text-default-500">En Línea</p><p className="text-xl font-bold">{online}</p></div></Card.Content></Card>
          <Card><Card.Content className="flex items-center gap-3"><div className="p-2 bg-default/10 rounded-lg"><Pause className="w-5 h-5 text-default-500" /></div><div><p className="text-sm text-default-500">Desconectados</p><p className="text-xl font-bold">{offline}</p></div></Card.Content></Card>
          <Card><Card.Content className="flex items-center gap-3"><div className="p-2 bg-warning/10 rounded-lg"><RefreshCw className="w-5 h-5 text-warning" /></div><div><p className="text-sm text-default-500">Sync Pendiente</p><p className="text-xl font-bold">{sync}</p></div></Card.Content></Card>
        </div>
        <Tabs selectedKey={activeTab} onChange={(k) => setActiveTab(k as string)}>
          <Tab key="all" title={`Todos (${total})`} />
          <Tab key="online" title={`En Línea (${online})`} />
          <Tab key="offline" title={`Desconectados (${offline})`} />
          <Tab key="sync_pending" title={`Sync Pendiente (${sync})`} />
        </Tabs>
      </div>
    );
  };

  const filteredDevices = useMemo(() => {
    if (activeTab === "all") return allDevices;
    if (activeTab === "online") return allDevices.filter(d => d.isCurrentlyOnline);
    if (activeTab === "offline") return allDevices.filter(d => !d.isCurrentlyOnline);
    if (activeTab === "sync_pending") return allDevices.filter(d => (d.pendingSyncEvents || 0) > 0);
    return allDevices;
  }, [allDevices, activeTab]);

  return (
    <>
      <EntityManagementPage
        title="Dispositivos"
        description="Monitoree todos los dispositivos licenciados del sistema"
        data={filteredDevices}
        columns={columns}
        isLoading={isLoading}
        error={error}
        getRowKey={(d) => d.id}
        searchable
        searchPlaceholder="Buscar por nombre, empresa o sistema operativo..."
        renderStats={renderStats}
        filters={[
          { key: "isCurrentlyOnline", label: "Conectado", type: "boolean" },
          { key: "companyName", label: "Empresa", type: "text" },
          { key: "pendingSyncEvents", label: "Sync pendiente", type: "numberRange" },
        ]}
        customActions={(device) => [
          <DropdownItem key="view" textValue="Ver detalle" startContent={<Eye className="w-4 h-4" />} onPress={() => handleViewDetails(device)}>Ver detalle</DropdownItem>,
          <DropdownItem key="command" textValue="Enviar comando" startContent={<Send className="w-4 h-4" />} onPress={() => handleSendCommand(device)}>Enviar comando</DropdownItem>,
          <DropdownItem key="diagnose" textValue="Diagnosticar" startContent={<Cpu className="w-4 h-4" />}>Diagnosticar</DropdownItem>
        ]}
      />

      {/* Device Detail Modal */}
      <Modal state={ { isOpen: isDetailOpen, setOpen: (v: boolean) => { if(!v) onDetailClose(); }, open: () => {}, close: onDetailClose, toggle: () => {} } }>
        <Modal.Content>
          <Modal.Header>
            <div className="flex items-center gap-3">
              <Monitor className="w-6 h-6 text-primary" />
              <div>
                <h2 className="text-xl font-bold">{selectedDevice?.hostname || "Dispositivo sin nombre"}</h2>
                <p className="text-sm text-default-500 font-mono">{selectedDevice?.deviceFingerprint}</p>
              </div>
            </div>
          </Modal.Header>
          <Modal.Body>
            {selectedDevice && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card><Card.Content><p className="text-sm text-default-500">Empresa</p><p className="font-medium">{selectedDevice.companyName}</p></Card.Content></Card>
                  <Card><Card.Content><p className="text-sm text-default-500">Estado</p><Chip color={selectedDevice.isCurrentlyOnline ? "success" : "default"} variant="soft" size="sm">{selectedDevice.isCurrentlyOnline ? "En línea" : "Desconectado"}</Chip></Card.Content></Card>
                </div>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="tertiary" color="primary" onPress={onDetailClose}>Cerrar</Button>
          </Modal.Footer>
        </Modal.Content>
      </Modal>

      {/* Send Command Modal */}
      <Modal state={ { isOpen: isCommandOpen, setOpen: (v: boolean) => { if(!v) onCommandClose(); }, open: () => {}, close: onCommandClose, toggle: () => {} } }>
        <Modal.Content>
          <Modal.Header>
            <div className="flex items-center gap-3">
              <Send className="w-6 h-6 text-primary" />
              <div><h2 className="text-xl font-bold">Enviar Comando Remoto</h2><p className="text-sm text-default-500">{selectedDevice?.hostname}</p></div>
            </div>
          </Modal.Header>
          <Modal.Body>
            <div className="space-y-3">
              <Button fullWidth variant="tertiary" color="primary" startContent={<Ban className="w-4 h-4" />}>Bloquear Sistema</Button>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="tertiary" color="primary" onPress={onCommandClose}>Cancelar</Button>
          </Modal.Footer>
        </Modal.Content>
      </Modal>
    </>
  );
}
