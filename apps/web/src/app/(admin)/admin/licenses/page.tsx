"use client";

import { useState, useCallback, useMemo } from "react";
import { useOverlayState, Button as HeroButton } from "@heroui/react";
import { Modal } from "@/components/bridge/Modal";
import { Chip } from "@/components/bridge/Chip";
import { DropdownItem } from "@/components/bridge/Dropdown";
import { Card } from "@/components/bridge/Card";
import { Tabs, Tab } from "@/components/bridge/Tabs";
import { Button } from "@/components/bridge/Button";
import { FileBadge, Eye, RefreshCw, Monitor, Building2, Key } from "lucide-react";
import { useCompanies, translatePlan, translateStatus } from "@/lib/licensing/hooks";
import type { Company, LicensedDevice } from "@/lib/licensing/types";
import DataTable, { type DataTableColumn } from "@/components/ui/DataTable";
import { EntityManagementPage } from "@/features/admin/EntityManagementPage";

export default function LicensesPage() {
  const { data: companies, isLoading, error, mutate } = useCompanies();
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [activeTab, setActiveTab] = useState("all");

  const { isOpen: isDetailOpen, open: onDetailOpen, close: onDetailClose } = useOverlayState();

  const handleViewDetails = useCallback((company: Company) => {
    setSelectedCompany(company);
    onDetailOpen();
  }, [onDetailOpen]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, "success" | "warning" | "danger" | "default" | "primary"> = {
      ACTIVE: "success", TRIAL: "primary", PAST_DUE: "warning", SUSPENDED: "warning",
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

  const filteredCompanies = useMemo(() => {
    if (!companies) return [];
    if (activeTab === "all") return companies;
    if (activeTab === "active") return companies.filter(c => c.status === "ACTIVE" || c.status === "TRIAL");
    if (activeTab === "past_due") return companies.filter(c => c.status === "PAST_DUE" || c.status === "SUSPENDED");
    if (activeTab === "expired") return companies.filter(c => c.status === "EXPIRED" || c.status === "BLOCKED");
    return companies;
  }, [companies, activeTab]);

  const columns: DataTableColumn<Company>[] = [
    {
      key: "name",
      header: "Empresa",
      sortable: true,
      render: (company) => (
        <div className="flex items-center gap-3">
          <div className="p-2 bg-default-100 rounded-lg"><Building2 className="w-4 h-4 text-default-500" /></div>
          <div><p className="font-medium">{company.name}</p><p className="text-sm text-default-500">{company.nit || "Sin NIT"}</p></div>
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
      render: (company) => company.expiresAt ? (
        <div>
          <p>{new Date(company.expiresAt).toLocaleDateString("es-CO")}</p>
          {company.graceUntil && (<p className="text-xs text-warning">Gracia: {new Date(company.graceUntil).toLocaleDateString("es-CO")}</p>)}
        </div>
      ) : (<span className="text-default-400">Sin vencimiento</span>),
    },
    {
      key: "maxDevices",
      header: "Dispositivos",
      render: (company) => (
        <div className="flex items-center gap-2"><Monitor className="w-4 h-4 text-default-400" /><span className="text-sm">{company.devices?.length || 0} / {company.maxDevices}</span></div>
      ),
    },
  ];

  const deviceColumns: DataTableColumn<LicensedDevice>[] = [
    {
      key: "hostname",
      header: "Dispositivo",
      render: (device) => (
        <div><p className="font-medium">{device.hostname || "Sin nombre"}</p><p className="text-xs text-default-500 font-mono">{device.deviceFingerprint.slice(0, 16)}...</p><p className="text-xs text-default-400">{device.operatingSystem}</p></div>
      ),
    },
    {
      key: "isCurrentlyOnline",
      header: "Estado",
      render: (device) => (
        <Chip color={device.isCurrentlyOnline ? "success" : "default"} variant="soft" size="sm">{device.isCurrentlyOnline ? "En línea" : "Desconectado"}</Chip>
      ),
    },
    {
      key: "lastHeartbeatAt",
      header: "Ultimo heartbeat",
      render: (device) => device.lastHeartbeatAt ? new Date(device.lastHeartbeatAt).toLocaleString("es-CO") : "Nunca",
    },
    {
      key: "pendingSyncEvents",
      header: "Sincronización",
      render: (device) => (
        <div className="text-sm"><p>Pendientes: {device.pendingSyncEvents || 0}</p><p className="text-default-400">Sincronizados: {device.syncedEvents || 0}</p></div>
      ),
    },
  ];

  const renderStats = () => (
    <div className="space-y-4 mb-4">
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card><Card.Content className="flex items-center gap-3"><div className="p-2 bg-brand/10 rounded-lg"><FileBadge className="w-5 h-5 text-brand" /></div><div><p className="text-sm text-default-500">Total Licencias</p><p className="text-xl font-bold">{stats.total}</p></div></Card.Content></Card>
          <Card><Card.Content className="flex items-center gap-3"><div className="p-2 bg-success/10 rounded-lg"><FileBadge className="w-5 h-5 text-success" /></div><div><p className="text-sm text-default-500">Activas</p><p className="text-xl font-bold">{stats.active}</p></div></Card.Content></Card>
          <Card><Card.Content className="flex items-center gap-3"><div className="p-2 bg-warning/10 rounded-lg"><FileBadge className="w-5 h-5 text-warning" /></div><div><p className="text-sm text-default-500">Por Vencer</p><p className="text-xl font-bold">{stats.pastDue}</p></div></Card.Content></Card>
          <Card><Card.Content className="flex items-center gap-3"><div className="p-2 bg-danger/10 rounded-lg"><FileBadge className="w-5 h-5 text-danger" /></div><div><p className="text-sm text-default-500">Expiradas</p><p className="text-xl font-bold">{stats.expired}</p></div></Card.Content></Card>
          <Card><Card.Content className="flex items-center gap-3"><div className="p-2 bg-secondary/10 rounded-lg"><Monitor className="w-5 h-5 text-secondary" /></div><div><p className="text-sm text-default-500">Dispositivos</p><p className="text-xl font-bold">{stats.totalDevices}</p></div></Card.Content></Card>
        </div>
      )}
      <Tabs selectedKey={activeTab} onChange={(k) => setActiveTab(k as string)}>
        <Tab key="all" title={`Todas (${stats?.total || 0})`} />
        <Tab key="active" title={`Activas (${stats?.active || 0})`} />
        <Tab key="past_due" title={`Por Vencer (${stats?.pastDue || 0})`} />
        <Tab key="expired" title={`Expiradas (${stats?.expired || 0})`} />
      </Tabs>
    </div>
  );

  return (
    <>
      <EntityManagementPage
        title="Licencias"
        description="Consulta planes, vencimientos y capacidad de dispositivos."
        data={filteredCompanies}
        columns={columns}
        isLoading={isLoading}
        error={error}
        getRowKey={(company) => company.id}
        searchable
        searchPlaceholder="Buscar por empresa o NIT..."
        renderStats={renderStats}
        filters={[
          { key: "plan", label: "Plan", type: "select", options: ["LOCAL", "SYNC", "PRO", "ENTERPRISE"].map((plan) => ({ label: translatePlan(plan), value: plan })) },
          { key: "status", label: "Estado", type: "select", options: ["ACTIVE", "TRIAL", "PAST_DUE", "SUSPENDED", "EXPIRED", "BLOCKED", "CANCELLED"].map((status) => ({ label: translateStatus(status), value: status })) },
          { key: "expiresAt", label: "Vencimiento", type: "dateRange" },
        ]}
        customActions={(company) => [
          <DropdownItem key="view" textValue="Ver detalle" startContent={<Eye className="w-4 h-4" />} onPress={() => handleViewDetails(company)}>Ver detalle</DropdownItem>,
          <DropdownItem key="renew" textValue="Renovar licencia" startContent={<RefreshCw className="w-4 h-4" />}>Renovar licencia</DropdownItem>,
          <DropdownItem key="generate" textValue="Generar licencia offline" startContent={<Key className="w-4 h-4" />}>Generar licencia offline</DropdownItem>
        ]}
      />

      {/* Company Detail Modal */}
      <Modal state={ { isOpen: isDetailOpen, setOpen: (v: boolean) => { if(!v) onDetailClose(); }, open: () => {}, close: onDetailClose, toggle: () => {} } }>
        <Modal.Content>
          <Modal.Header>
            <div className="flex items-center gap-3">
              <Building2 className="w-6 h-6 text-brand" />
              <div><h2 className="text-xl font-bold">{selectedCompany?.name}</h2><p className="text-sm text-default-500">{selectedCompany?.nit}</p></div>
            </div>
          </Modal.Header>
          <Modal.Body>
            {selectedCompany && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <Card><Card.Content><p className="text-sm text-default-500">Plan</p><Chip color={getPlanColor(selectedCompany.plan)} variant="soft" size="sm">{translatePlan(selectedCompany.plan)}</Chip></Card.Content></Card>
                  <Card><Card.Content><p className="text-sm text-default-500">Estado</p><Chip color={getStatusColor(selectedCompany.status)} variant="soft" size="sm">{translateStatus(selectedCompany.status)}</Chip></Card.Content></Card>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><Monitor className="w-5 h-5" />Dispositivos Licenciados</h3>
                  <DataTable columns={deviceColumns} data={selectedCompany.devices ?? []} getRowKey={(device) => device.id} emptyMessage="No hay dispositivos registrados" />
                </div>
                {selectedCompany.modules && selectedCompany.modules.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Módulos Habilitados</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedCompany.modules.map((module) => (
                        <Chip key={module.id} color={module.enabled ? "success" : "default"} variant="soft" size="sm">{module.moduleType}</Chip>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="tertiary" onPress={onDetailClose}>Cerrar</Button>
          </Modal.Footer>
        </Modal.Content>
      </Modal>
    </>
  );
}
