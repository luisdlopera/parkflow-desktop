"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  Skeleton,
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
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-danger" />
              Casos Prioritarios Requieren Atención
            </h3>
          </CardHeader>
          <CardBody>
            <Table aria-label="Casos prioritarios">
              <TableHeader>
                <TableColumn>EMPRESA</TableColumn>
                <TableColumn>SEVERIDAD</TableColumn>
                <TableColumn>PROBLEMA</TableColumn>
                <TableColumn>DISPOSITIVOS</TableColumn>
                <TableColumn>ULTIMO INCIDENTE</TableColumn>
                <TableColumn>ACCIÓN RECOMENDADA</TableColumn>
              </TableHeader>
              <TableBody
                emptyContent="No hay casos prioritarios"
                isLoading={isLoading}
                loadingContent={<Skeleton className="w-full h-12" />}
              >
                {priorityCases.map((caseItem) => (
                  <TableRow key={`${caseItem.companyId}-${caseItem.issueType}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-default-400" />
                        <span className="font-medium">{caseItem.companyName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Chip color={getSeverityColor(caseItem.severity)} variant="flat" size="sm">
                        {caseItem.severity}
                      </Chip>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{caseItem.issueType}</p>
                        <p className="text-sm text-default-500">{caseItem.description}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge color="danger" content={caseItem.affectedDevices}>
                        <Monitor className="w-4 h-4" />
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(caseItem.lastIncidentAt).toLocaleString("es-CO")}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-warning">{caseItem.recommendedAction}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardBody>
        </Card>
      )}

      {/* Block Events Tab */}
      {activeTab === "blocks" && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <X className="w-5 h-5 text-danger" />
              Eventos de Bloqueo No Resueltos
            </h3>
          </CardHeader>
          <CardBody>
            <Table aria-label="Eventos de bloqueo">
              <TableHeader>
                <TableColumn>EMPRESA</TableColumn>
                <TableColumn>TIPO</TableColumn>
                <TableColumn>RAZÓN</TableColumn>
                <TableColumn>DESCRIPCIÓN</TableColumn>
                <TableColumn>FECHA</TableColumn>
                <TableColumn align="center">ACCIONES</TableColumn>
              </TableHeader>
              <TableBody
                emptyContent="No hay bloqueos pendientes"
                isLoading={isLoading}
                loadingContent={<Skeleton className="w-full h-12" />}
              >
                {blockEvents.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-default-400" />
                        <span className="font-medium">{event.companyName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Chip variant="flat" size="sm">{event.eventType}</Chip>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-mono">{event.reasonCode}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-default-500">{event.reasonDescription}</span>
                    </TableCell>
                    <TableCell>
                      {new Date(event.createdAt).toLocaleString("es-CO")}
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardBody>
        </Card>
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
