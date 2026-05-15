"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Alert,
  Badge,
  Progress,
  Tabs,
  Tab,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Textarea,
} from "@heroui/react";
import {
  BarChart3,
  RefreshCw,
  AlertTriangle,
  Building2,
  Monitor,
  Check,
  X,
  Flag,
  TrendingUp,
  TrendingDown,
  Activity,
} from "lucide-react";
import { authHeaders } from "@/lib/auth";
import DataTable, { type DataTableColumn } from "@/components/ui/DataTable";

interface PriorityCase {
  companyId: string;
  companyName: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  issueType: string;
  description: string;
  affectedDevices: number;
  lastIncidentAt: string;
  recommendedAction: string;
}

interface BlockEvent {
  id: string;
  companyId: string;
  companyName: string;
  eventType: string;
  reasonCode: string;
  reasonDescription: string;
  createdAt: string;
  resolved: boolean;
  falsePositive: boolean;
}

interface BlockStatistics {
  totalBlocks: number;
  resolvedBlocks: number;
  falsePositives: number;
  unresolvedBlocks: number;
  blocksByReason: Record<string, number>;
  blocksByDay: Array<{ date: string; count: number }>;
  averageResolutionTimeMinutes: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:6011/api/v1";

export default function MonitoringPage() {
  const [priorityCases, setPriorityCases] = useState<PriorityCase[]>([]);
  const [blockEvents, setBlockEvents] = useState<BlockEvent[]>([]);
  const [statistics, setStatistics] = useState<BlockStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedEvent, setSelectedEvent] = useState<BlockEvent | null>(null);
  const [resolveNotes, setResolveNotes] = useState("");

  const { isOpen: isResolveOpen, onOpen: onResolveOpen, onClose: onResolveClose } = useDisclosure();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const headers = await authHeaders();

      // Fetch priority cases
      const casesRes = await fetch(`${API_BASE}/licensing/support/cases/priority`, { headers });
      if (casesRes.ok) {
        setPriorityCases(await casesRes.json());
      }

      // Fetch unresolved blocks
      const blocksRes = await fetch(`${API_BASE}/licensing/support/blocks/unresolved`, { headers });
      if (blocksRes.ok) {
        const blocks = await blocksRes.json();
        setBlockEvents(blocks.map((b: BlockEvent & { companyName?: string }) => ({
          ...b,
          companyName: b.companyName || "Empresa desconocida",
        })));
      }

      // Fetch statistics (last 7 days)
      const statsRes = await fetch(`${API_BASE}/licensing/support/statistics?days=7`, { headers });
      if (statsRes.ok) {
        setStatistics(await statsRes.json());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar datos");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleResolve = async () => {
    if (!selectedEvent) return;
    try {
      const headers = await authHeaders();
      await fetch(`${API_BASE}/licensing/support/blocks/${selectedEvent.id}/resolve`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: resolveNotes,
          correctiveAction: "MANUAL_RESOLUTION",
        }),
      });
      onResolveClose();
      setResolveNotes("");
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al resolver");
    }
  };

  const handleFalsePositive = async () => {
    if (!selectedEvent) return;
    try {
      const headers = await authHeaders();
      await fetch(`${API_BASE}/licensing/support/blocks/${selectedEvent.id}/false-positive`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ notes: resolveNotes }),
      });
      onResolveClose();
      setResolveNotes("");
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al marcar");
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "HIGH":
        return "danger";
      case "MEDIUM":
        return "warning";
      case "LOW":
        return "default";
      default:
        return "default";
    }
  };

  const priorityColumns: DataTableColumn<PriorityCase>[] = [
    {
      key: "companyName",
      header: "Empresa",
      render: (caseItem) => (
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-default-400" />
          <span className="font-medium">{caseItem.companyName}</span>
        </div>
      ),
    },
    {
      key: "severity",
      header: "Severidad",
      sortable: true,
      render: (caseItem) => (
        <Chip color={getSeverityColor(caseItem.severity)} variant="flat" size="sm">
          {caseItem.severity}
        </Chip>
      ),
    },
    {
      key: "issueType",
      header: "Problema",
      render: (caseItem) => (
        <div>
          <p className="font-medium">{caseItem.issueType}</p>
          <p className="text-sm text-default-500">{caseItem.description}</p>
        </div>
      ),
    },
    {
      key: "affectedDevices",
      header: "Dispositivos",
      align: "center",
      render: (caseItem) => (
        <Badge color="danger" content={caseItem.affectedDevices}>
          <Monitor className="w-4 h-4" />
        </Badge>
      ),
    },
    {
      key: "lastIncidentAt",
      header: "Ultimo incidente",
      sortable: true,
      render: (caseItem) => new Date(caseItem.lastIncidentAt).toLocaleString("es-CO"),
    },
    {
      key: "recommendedAction",
      header: "Acción recomendada",
      render: (caseItem) => <span className="text-sm text-warning">{caseItem.recommendedAction}</span>,
    },
  ];

  const blockColumns: DataTableColumn<BlockEvent>[] = [
    {
      key: "companyName",
      header: "Empresa",
      render: (event) => (
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-default-400" />
          <span className="font-medium">{event.companyName}</span>
        </div>
      ),
    },
    {
      key: "eventType",
      header: "Tipo",
      render: (event) => (
        <Chip variant="flat" size="sm">
          {event.eventType}
        </Chip>
      ),
    },
    {
      key: "reasonCode",
      header: "Razón",
      render: (event) => <span className="text-sm font-mono">{event.reasonCode}</span>,
    },
    {
      key: "reasonDescription",
      header: "Descripción",
      render: (event) => <span className="text-sm text-default-500">{event.reasonDescription}</span>,
    },
    {
      key: "createdAt",
      header: "Fecha",
      sortable: true,
      render: (event) => new Date(event.createdAt).toLocaleString("es-CO"),
    },
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Monitoreo del Sistema</h1>
          <p className="text-default-500">
            Visualice en tiempo real el estado de licencias y bloqueos
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-default-500">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-success"></span>
            </span>
            Actualizando cada 30s
          </div>
          <Button
            color="primary"
            startContent={<RefreshCw className="w-4 h-4" />}
            onPress={fetchData}
            isLoading={isLoading}
          >
            Actualizar
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardBody className="flex items-center gap-3">
              <div className="p-2 bg-danger/10 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-danger" />
              </div>
              <div>
                <p className="text-sm text-default-500">Bloqueos Activos</p>
                <p className="text-xl font-bold">{statistics.unresolvedBlocks}</p>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="flex items-center gap-3">
              <div className="p-2 bg-success/10 rounded-lg">
                <Check className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-default-500">Resueltos (7d)</p>
                <p className="text-xl font-bold">{statistics.resolvedBlocks}</p>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="flex items-center gap-3">
              <div className="p-2 bg-warning/10 rounded-lg">
                <Flag className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-default-500">Falsos Positivos</p>
                <p className="text-xl font-bold">{statistics.falsePositives}</p>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Activity className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-default-500">Tiempo Promedio Resolución</p>
                <p className="text-xl font-bold">{Math.round(statistics.averageResolutionTimeMinutes)}m</p>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs selectedKey={activeTab} onSelectionChange={(k) => setActiveTab(k as string)}>
        <Tab key="overview" title="Vista General" />
        <Tab key="cases" title={`Casos Prioritarios (${priorityCases.length})`} />
        <Tab key="blocks" title={`Bloqueos (${blockEvents.length})`} />
      </Tabs>

      {/* Overview Tab */}
      {activeTab === "overview" && statistics && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Bloqueos por Motivo</h3>
            </CardHeader>
            <CardBody>
              <div className="space-y-3">
                {Object.entries(statistics.blocksByReason).map(([reason, count]) => (
                  <div key={reason} className="flex items-center gap-4">
                    <span className="w-48 text-sm">{reason}</span>
                    <Progress
                      value={(count / statistics.totalBlocks) * 100}
                      className="flex-1"
                      color="danger"
                      showValueLabel
                      size="md"
                    />
                    <span className="w-12 text-right font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Tendencia (Últimos 7 días)</h3>
            </CardHeader>
            <CardBody>
              <div className="flex items-end gap-2 h-32">
                {statistics.blocksByDay.map((day) => (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-2">
                    <div
                      className="w-full bg-primary/20 rounded-t"
                      style={{
                        height: `${(day.count / Math.max(...statistics.blocksByDay.map((d) => d.count))) * 100}%`,
                        minHeight: day.count > 0 ? "4px" : "0",
                      }}
                    >
                      {day.count > 0 && (
                        <div className="w-full h-full bg-primary rounded-t" />
                      )}
                    </div>
                    <span className="text-xs text-default-400">
                      {new Date(day.date).toLocaleDateString("es-CO", { weekday: "short" })}
                    </span>
                    <span className="text-xs font-medium">{day.count}</span>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Priority Cases Tab */}
      {activeTab === "cases" && (
        <DataTable
          title="Casos prioritarios"
          description="Incidentes que requieren atención del equipo de soporte."
          columns={priorityColumns}
          data={priorityCases}
          getRowKey={(caseItem) => `${caseItem.companyId}-${caseItem.issueType}`}
          isLoading={isLoading}
          emptyMessage="No hay casos prioritarios"
          filters={[
            {
              key: "severity",
              label: "Severidad",
              type: "select",
              options: ["HIGH", "MEDIUM", "LOW"].map((severity) => ({ label: severity, value: severity })),
            },
            { key: "affectedDevices", label: "Dispositivos", type: "numberRange" },
            { key: "lastIncidentAt", label: "Ultimo incidente", type: "dateRange" },
          ]}
        />
      )}

      {/* Block Events Tab */}
      {activeTab === "blocks" && (
        <DataTable
          title="Eventos de bloqueo"
          description="Bloqueos no resueltos y acciones de recuperación."
          columns={blockColumns}
          data={blockEvents}
          getRowKey={(event) => event.id}
          isLoading={isLoading}
          emptyMessage="No hay bloqueos pendientes"
          searchable
          searchPlaceholder="Buscar empresa, tipo o razón..."
          filters={[
            { key: "eventType", label: "Tipo", type: "text" },
            { key: "reasonCode", label: "Razón", type: "text" },
            { key: "createdAt", label: "Fecha", type: "dateRange" },
          ]}
          actions={(event) => (
            <Button
              size="sm"
              color="success"
              variant="flat"
              startContent={<Check className="w-4 h-4" />}
              onPress={() => {
                setSelectedEvent(event);
                onResolveOpen();
              }}
            >
              Resolver
            </Button>
          )}
        />
      )}

      {/* Resolve Modal */}
      <Modal isOpen={isResolveOpen} onClose={onResolveClose} size="md">
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
              <Textarea
                label="Notas de resolución"
                placeholder="Describa cómo se resolvió el problema..."
                value={resolveNotes}
                onChange={(e) => setResolveNotes(e.target.value)}
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={onResolveClose}>
              Cancelar
            </Button>
            <Button color="primary" variant="flat" onPress={handleFalsePositive}>
              Falso Positivo
            </Button>
            <Button color="success" onPress={handleResolve}>
              Resolver
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
