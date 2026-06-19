"use client";

import { useState } from "react";
import { useOverlayState } from "@heroui/react";
import { Alert } from "@/components/bridge/Alert";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@/components/bridge/Modal";
import { Chip } from "@/components/bridge/Chip";
import { Progress } from "@/components/bridge/Progress";
import { Badge } from "@/components/bridge/Badge";
import { Card } from "@/components/bridge/Card";
import { Tabs, Tab } from "@/components/bridge/Tabs";
import { Button } from "@/components/bridge/Button";
import { TextArea } from "@/components/bridge/TextArea";
import { BarChart3, RefreshCw, AlertTriangle, Building2, Monitor, Check, Flag, Activity } from "lucide-react";
import DataTable, { type DataTableColumn } from "@/components/ui/DataTable";
import { useMonitoring, type PriorityCase, type BlockEvent } from "@/features/admin/monitoring/hooks/useMonitoring";

export default function MonitoringPage() {
  const { priorityCases, blockEvents, statistics, isLoading, error, fetchData, handleResolve, handleFalsePositive } = useMonitoring();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedEvent, setSelectedEvent] = useState<BlockEvent | null>(null);
  const [resolveNotes, setResolveNotes] = useState("");
  const { isOpen: isResolveOpen, open: onResolveOpen, close: onResolveClose } = useOverlayState();

  const getSeverityColor = (severity: string) => {
    if (severity === "HIGH") return "danger" as const;
    if (severity === "MEDIUM") return "warning" as const;
    return "default" as const;
  };

  const priorityColumns: DataTableColumn<PriorityCase>[] = [
    { key: "companyName", header: "Empresa", render: (c) => <div className="flex items-center gap-2"><Building2 className="w-4 h-4 text-default-400" /><span className="font-medium">{c.companyName}</span></div> },
    { key: "severity", header: "Severidad", sortable: true, render: (c) => <Chip color={getSeverityColor(c.severity)} variant="soft" size="sm">{c.severity}</Chip> },
    { key: "issueType", header: "Problema", render: (c) => <div><p className="font-medium">{c.issueType}</p><p className="text-sm text-default-500">{c.description}</p></div> },
    { key: "affectedDevices", header: "Dispositivos", align: "center", render: (c) => <Badge color="danger" content={c.affectedDevices}><Monitor className="w-4 h-4" /></Badge> },
    { key: "lastIncidentAt", header: "Ultimo incidente", sortable: true, render: (c) => new Date(c.lastIncidentAt).toLocaleString("es-CO") },
    { key: "recommendedAction", header: "Acción recomendada", render: (c) => <span className="text-sm text-warning">{c.recommendedAction}</span> },
  ];

  const blockColumns: DataTableColumn<BlockEvent>[] = [
    { key: "companyName", header: "Empresa", render: (e) => <div className="flex items-center gap-2"><Building2 className="w-4 h-4 text-default-400" /><span className="font-medium">{e.companyName}</span></div> },
    { key: "eventType", header: "Tipo", render: (e) => <Chip variant="soft" size="sm">{e.eventType}</Chip> },
    { key: "reasonCode", header: "Razón", render: (e) => <span className="text-sm font-mono">{e.reasonCode}</span> },
    { key: "reasonDescription", header: "Descripción", render: (e) => <span className="text-sm text-default-500">{e.reasonDescription}</span> },
    { key: "createdAt", header: "Fecha", sortable: true, render: (e) => new Date(e.createdAt).toLocaleString("es-CO") },
  ];

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Monitoreo</h1>
        <Alert color="danger">{error}</Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Monitoreo del Sistema</h1>
          <p className="text-default-500">Visualice en tiempo real el estado de licencias y bloqueos</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-default-500">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-success" />
            </span>
            Actualizando cada 30s
          </div>
          <Button color="primary" startContent={<RefreshCw className="w-4 h-4" />} onPress={fetchData} isLoading={isLoading}>Actualizar</Button>
        </div>
      </div>

      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><Card.Content className="flex items-center gap-3"><div className="p-2 bg-danger/10 rounded-lg"><AlertTriangle className="w-5 h-5 text-danger" /></div><div><p className="text-sm text-default-500">Bloqueos Activos</p><p className="text-xl font-bold">{statistics.unresolvedBlocks}</p></div></Card.Content></Card>
          <Card><Card.Content className="flex items-center gap-3"><div className="p-2 bg-success/10 rounded-lg"><Check className="w-5 h-5 text-success" /></div><div><p className="text-sm text-default-500">Resueltos (7d)</p><p className="text-xl font-bold">{statistics.resolvedBlocks}</p></div></Card.Content></Card>
          <Card><Card.Content className="flex items-center gap-3"><div className="p-2 bg-warning/10 rounded-lg"><Flag className="w-5 h-5 text-warning" /></div><div><p className="text-sm text-default-500">Falsos Positivos</p><p className="text-xl font-bold">{statistics.falsePositives}</p></div></Card.Content></Card>
          <Card><Card.Content className="flex items-center gap-3"><div className="p-2 bg-primary/10 rounded-lg"><Activity className="w-5 h-5 text-primary" /></div><div><p className="text-sm text-default-500">Tiempo Promedio Resolución</p><p className="text-xl font-bold">{Math.round(statistics.averageResolutionTimeMinutes)}m</p></div></Card.Content></Card>
        </div>
      )}

      <Tabs selectedKey={activeTab} onChange={(k) => setActiveTab(k as string)}>
        <Tab key="overview" title="Vista General" />
        <Tab key="cases" title={`Casos Prioritarios (${priorityCases.length})`} />
        <Tab key="blocks" title={`Bloqueos (${blockEvents.length})`} />
      </Tabs>

      {activeTab === "overview" && statistics && (
        <div className="space-y-4">
          <Card>
            <Card.Header><h3 className="text-lg font-semibold">Bloqueos por Motivo</h3></Card.Header>
            <Card.Content>
              <div className="space-y-3">
                {Object.entries(statistics.blocksByReason).map(([reason, count]) => (
                  <div key={reason} className="flex items-center gap-4">
                    <span className="w-48 text-sm">{reason}</span>
                    <Progress value={(count / statistics.totalBlocks) * 100} className="flex-1" color="danger" showValueLabel size="md" />
                    <span className="w-12 text-right font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </Card.Content>
          </Card>
          <Card>
            <Card.Header><h3 className="text-lg font-semibold">Tendencia (Últimos 7 días)</h3></Card.Header>
            <Card.Content>
              <div className="flex items-end gap-2 h-32">
                {(statistics.blocksByDay?.length ?? 0) > 0 ? statistics.blocksByDay.map((day) => {
                  const maxCount = Math.max(...statistics.blocksByDay.map((d) => d.count), 1);
                  return (
                    <div key={day.date} className="flex-1 flex flex-col items-center gap-2">
                      <div className="w-full bg-primary/20 rounded-t" style={{ height: `${(day.count / maxCount) * 100}%`, minHeight: day.count > 0 ? "4px" : "0" }}>
                        {day.count > 0 && <div className="w-full h-full bg-primary rounded-t" />}
                      </div>
                      <span className="text-xs text-default-400">{new Date(day.date).toLocaleDateString("es-CO", { weekday: "short" })}</span>
                      <span className="text-xs font-medium">{day.count}</span>
                    </div>
                  );
                }) : <p className="text-sm text-default-400 w-full text-center">Sin datos de tendencia</p>}
              </div>
            </Card.Content>
          </Card>
        </div>
      )}

      {activeTab === "cases" && (
        <DataTable title="Casos prioritarios" description="Incidentes que requieren atención del equipo de soporte." columns={priorityColumns} data={priorityCases} getRowKey={(c) => `${c.companyId}-${c.issueType}`} isLoading={isLoading} emptyMessage="No hay casos prioritarios"
          filters={[
            { key: "severity", label: "Severidad", type: "select", options: ["HIGH", "MEDIUM", "LOW"].map((s) => ({ label: s, value: s })) },
            { key: "affectedDevices", label: "Dispositivos", type: "numberRange" },
            { key: "lastIncidentAt", label: "Ultimo incidente", type: "dateRange" },
          ]}
        />
      )}

      {activeTab === "blocks" && (
        <DataTable title="Eventos de bloqueo" description="Bloqueos no resueltos y acciones de recuperación." columns={blockColumns} data={blockEvents} getRowKey={(e) => e.id} isLoading={isLoading} emptyMessage="No hay bloqueos pendientes" searchable searchPlaceholder="Buscar empresa, tipo o razón..."
          filters={[
            { key: "eventType", label: "Tipo", type: "text" },
            { key: "reasonCode", label: "Razón", type: "text" },
            { key: "createdAt", label: "Fecha", type: "dateRange" },
          ]}
          actions={(event) => (
            <Button size="sm" color="success" variant="tertiary" startContent={<Check className="w-4 h-4" />} onPress={() => { setSelectedEvent(event); onResolveOpen(); }}>Resolver</Button>
          )}
        />
      )}

      <Modal state={{ isOpen: isResolveOpen, setOpen: (v: boolean) => { if (!v) onResolveClose(); }, open: () => {}, close: onResolveClose, toggle: () => {} }}>
        <ModalContent>
          <ModalHeader>
            <div className="flex items-center gap-3">
              <Check className="w-6 h-6 text-success" />
              <div>
                <h2 className="text-xl font-bold">Resolver Bloqueo</h2>
                <p className="text-sm text-default-500">{selectedEvent?.companyName}</p>
              </div>
            </div>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <div className="p-4 bg-default-50 rounded-lg">
                <p className="text-sm text-default-500">Tipo</p>
                <p className="font-medium">{selectedEvent?.eventType}</p>
                <p className="text-sm text-default-500 mt-2">Razón</p>
                <p className="font-medium">{selectedEvent?.reasonDescription}</p>
              </div>
              <TextArea label="Notas de resolución" placeholder="Describa cómo se resolvió el problema..." value={resolveNotes} onChange={(e) => setResolveNotes(e.target.value)} />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="tertiary" onPress={onResolveClose}>Cancelar</Button>
            <Button color="primary" variant="tertiary" onPress={async () => { if (selectedEvent) { await handleFalsePositive(selectedEvent.id, resolveNotes); onResolveClose(); setResolveNotes(""); } }}>Falso Positivo</Button>
            <Button color="success" onPress={async () => { if (selectedEvent) { await handleResolve(selectedEvent.id, resolveNotes); onResolveClose(); setResolveNotes(""); } }}>Resolver</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
