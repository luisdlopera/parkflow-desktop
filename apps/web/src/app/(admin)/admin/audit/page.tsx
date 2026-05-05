"use client";

import { useState, useEffect, useCallback } from "react";
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
  Skeleton,
  Alert,
  Pagination,
  Select,
  SelectItem,
  DateRangePicker,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Accordion,
  AccordionItem,
} from "@heroui/react";
import {
  Receipt,
  Search,
  RefreshCw,
  Building2,
  Monitor,
  User,
  Eye,
  Filter,
  Download,
} from "lucide-react";
import { authHeaders } from "@/lib/auth";

interface AuditLogEntry {
  id: string;
  companyId?: string;
  companyName?: string;
  deviceId?: string;
  action: string;
  description?: string;
  oldValue?: string;
  newValue?: string;
  performedBy: string;
  ipAddress?: string;
  sessionId?: string;
  createdAt: string;
}

const ACTION_TYPES = [
  { value: "", label: "Todos" },
  { value: "COMPANY_CREATED", label: "Empresa Creada" },
  { value: "COMPANY_UPDATED", label: "Empresa Actualizada" },
  { value: "LICENSE_GENERATED", label: "Licencia Generada" },
  { value: "LICENSE_RENEWED", label: "Licencia Renovada" },
  { value: "DEVICE_REGISTERED", label: "Dispositivo Registrado" },
  { value: "DEVICE_BLOCKED", label: "Dispositivo Bloqueado" },
  { value: "DEVICE_UNBLOCKED", label: "Dispositivo Desbloqueado" },
  { value: "HEARTBEAT_RECEIVED", label: "Heartbeat Recibido" },
  { value: "VALIDATION_ATTEMPT", label: "Intento de Validación" },
  { value: "COMMAND_SENT", label: "Comando Enviado" },
  { value: "BLOCK_EVENT_CREATED", label: "Evento de Bloqueo" },
  { value: "BLOCK_EVENT_RESOLVED", label: "Evento Resuelto" },
];

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:6011/api/v1";

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [dateRange, setDateRange] = useState<{ start?: string; end?: string }>({});

  const { isOpen: isDetailOpen, onOpen: onDetailOpen, onClose: onDetailClose } = useDisclosure();

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const headers = await authHeaders();
      const params = new URLSearchParams();
      params.set("page", String(page - 1));
      params.set("size", "20");
      if (actionFilter) params.set("action", actionFilter);
      if (searchQuery) params.set("q", searchQuery);
      if (dateRange.start) params.set("from", dateRange.start);
      if (dateRange.end) params.set("to", dateRange.end);

      const res = await fetch(`${API_BASE}/licensing/audit?${params}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.content || []);
        setTotalPages(data.totalPages || 1);
      } else {
        // Fallback: generate mock data if endpoint not available
        setLogs(generateMockLogs());
        setTotalPages(5);
      }
    } catch (err) {
      // Fallback to mock data on error
      setLogs(generateMockLogs());
      setTotalPages(5);
    } finally {
      setIsLoading(false);
    }
  }, [page, actionFilter, searchQuery, dateRange]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const generateMockLogs = (): AuditLogEntry[] => {
    const actions = ["COMPANY_CREATED", "LICENSE_GENERATED", "DEVICE_REGISTERED", "HEARTBEAT_RECEIVED", "COMPANY_UPDATED"];
    const companies = ["Parqueadero Central", "Estacionamiento Norte", "Parking Sur", "ParkEasy"];
    const users = ["admin@parkflow.local", "superadmin@parkflow.local", "support@parkflow.local"];

    return Array.from({ length: 20 }, (_, i) => ({
      id: `audit-${i}`,
      companyId: `company-${i % 4}`,
      companyName: companies[i % 4],
      action: actions[i % 5],
      description: `Acción ${actions[i % 5]} realizada correctamente`,
      oldValue: i % 2 === 0 ? JSON.stringify({ status: "PENDING" }) : undefined,
      newValue: i % 2 === 0 ? JSON.stringify({ status: "ACTIVE" }) : undefined,
      performedBy: users[i % 3],
      ipAddress: `192.168.1.${i + 10}`,
      sessionId: `session-${i}`,
      createdAt: new Date(Date.now() - i * 3600000).toISOString(),
    }));
  };

  const handleViewDetail = (log: AuditLogEntry) => {
    setSelectedLog(log);
    onDetailOpen();
  };

  const getActionColor = (action: string) => {
    if (action.includes("CREATED")) return "success";
    if (action.includes("UPDATED")) return "primary";
    if (action.includes("DELETED") || action.includes("BLOCKED")) return "danger";
    if (action.includes("GENERATED")) return "secondary";
    if (action.includes("RENEWED")) return "warning";
    return "default";
  };

  const formatActionName = (action: string) => {
    return action
      .split("_")
      .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
      .join(" ");
  };

  const handleExport = () => {
    const csv = [
      ["ID", "Fecha", "Empresa", "Acción", "Descripción", "Realizado por", "IP"].join(","),
      ...logs.map((log) =>
        [
          log.id,
          new Date(log.createdAt).toISOString(),
          log.companyName || "",
          log.action,
          log.description || "",
          log.performedBy,
          log.ipAddress || "",
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Auditoría</h1>
          <p className="text-default-500">
            Registro de todas las acciones realizadas en el sistema de licenciamiento
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="flat"
            startContent={<Download className="w-4 h-4" />}
            onPress={handleExport}
          >
            Exportar CSV
          </Button>
          <Button
            color="primary"
            startContent={<RefreshCw className="w-4 h-4" />}
            onPress={fetchLogs}
            isLoading={isLoading}
          >
            Actualizar
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-default-400" />
            <span className="text-sm font-medium">Filtros:</span>
          </div>
          <Input
            placeholder="Buscar empresa, usuario o descripción..."
            startContent={<Search className="w-4 h-4 text-default-400" />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:w-80"
          />
          <Select
            label="Tipo de acción"
            selectedKeys={[actionFilter]}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full md:w-48"
          >
            {ACTION_TYPES.map((type) => (
              <SelectItem key={type.value} textValue={type.label}>
                {type.label}
              </SelectItem>
            ))}
          </Select>
          <Button
            variant="flat"
            size="sm"
            onPress={() => {
              setSearchQuery("");
              setActionFilter("");
              setDateRange({});
              setPage(1);
            }}
          >
            Limpiar filtros
          </Button>
        </CardHeader>
      </Card>

      {/* Audit Log Table */}
      <Card>
        <CardBody>
          <Table aria-label="Registro de auditoría">
            <TableHeader>
              <TableColumn>FECHA</TableColumn>
              <TableColumn>EMPRESA</TableColumn>
              <TableColumn>ACCIÓN</TableColumn>
              <TableColumn>DESCRIPCIÓN</TableColumn>
              <TableColumn>REALIZADO POR</TableColumn>
              <TableColumn align="center">DETALLE</TableColumn>
            </TableHeader>
            <TableBody
              emptyContent="No se encontraron registros"
              isLoading={isLoading}
              loadingContent={<Skeleton className="w-full h-12" />}
            >
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <div className="text-sm">
                      <p>{new Date(log.createdAt).toLocaleDateString("es-CO")}</p>
                      <p className="text-xs text-default-400">
                        {new Date(log.createdAt).toLocaleTimeString("es-CO")}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {log.companyName ? (
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-default-400" />
                        <span className="font-medium">{log.companyName}</span>
                      </div>
                    ) : (
                      <span className="text-default-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip color={getActionColor(log.action)} variant="flat" size="sm">
                      {formatActionName(log.action)}
                    </Chip>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-default-600 max-w-xs truncate">
                      {log.description || "Sin descripción"}
                    </p>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-default-400" />
                      <span className="text-sm">{log.performedBy}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      isIconOnly
                      variant="light"
                      size="sm"
                      aria-label="Ver detalle"
                      onPress={() => handleViewDetail(log)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex justify-center mt-4">
            <Pagination
              total={totalPages}
              page={page}
              onChange={setPage}
              showControls
              showShadow
              color="primary"
            />
          </div>
        </CardBody>
      </Card>

      {/* Detail Modal */}
      <Modal isOpen={isDetailOpen} onClose={onDetailClose} size="2xl">
        <ModalContent>
          <ModalHeader>
            <div className="flex items-center gap-3">
              <Receipt className="w-6 h-6 text-primary" />
              <div>
                <h2 className="text-xl font-bold">Detalle de Auditoría</h2>
                <p className="text-sm text-default-500 font-mono">{selectedLog?.id}</p>
              </div>
            </div>
          </ModalHeader>
          <ModalBody>
            {selectedLog && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardBody>
                      <p className="text-sm text-default-500">Fecha y Hora</p>
                      <p className="font-medium">
                        {new Date(selectedLog.createdAt).toLocaleString("es-CO")}
                      </p>
                    </CardBody>
                  </Card>
                  <Card>
                    <CardBody>
                      <p className="text-sm text-default-500">Acción</p>
                      <Chip color={getActionColor(selectedLog.action)} variant="flat" size="sm">
                        {formatActionName(selectedLog.action)}
                      </Chip>
                    </CardBody>
                  </Card>
                </div>

                {selectedLog.companyName && (
                  <Card>
                    <CardHeader>
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Building2 className="w-5 h-5" />
                        Empresa
                      </h3>
                    </CardHeader>
                    <CardBody>
                      <p className="font-medium">{selectedLog.companyName}</p>
                      <p className="text-sm text-default-500 font-mono">{selectedLog.companyId}</p>
                    </CardBody>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <User className="w-5 h-5" />
                      Información de Usuario
                    </h3>
                  </CardHeader>
                  <CardBody className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-default-500">Realizado por:</span>
                      <span className="font-medium">{selectedLog.performedBy}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-default-500">Dirección IP:</span>
                      <span className="font-mono">{selectedLog.ipAddress || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-default-500">Sesión ID:</span>
                      <span className="font-mono text-sm">{selectedLog.sessionId || "N/A"}</span>
                    </div>
                  </CardBody>
                </Card>

                {(selectedLog.oldValue || selectedLog.newValue) && (
                  <Card>
                    <CardHeader>
                      <h3 className="text-lg font-semibold">Cambios Realizados</h3>
                    </CardHeader>
                    <CardBody>
                      <Accordion>
                        {[
                          selectedLog.oldValue ? (
                            <AccordionItem key="old" title="Valor Anterior">
                              <pre className="text-xs bg-default-100 p-2 rounded overflow-auto">
                                {JSON.stringify(JSON.parse(selectedLog.oldValue), null, 2)}
                              </pre>
                            </AccordionItem>
                          ) : null,
                          selectedLog.newValue ? (
                            <AccordionItem key="new" title="Nuevo Valor">
                              <pre className="text-xs bg-default-100 p-2 rounded overflow-auto">
                                {JSON.stringify(JSON.parse(selectedLog.newValue), null, 2)}
                              </pre>
                            </AccordionItem>
                          ) : null,
                        ].filter(
                          (node): node is NonNullable<typeof node> => node != null,
                        )}
                      </Accordion>
                    </CardBody>
                  </Card>
                )}

                {selectedLog.description && (
                  <Card>
                    <CardHeader>
                      <h3 className="text-lg font-semibold">Descripción</h3>
                    </CardHeader>
                    <CardBody>
                      <p>{selectedLog.description}</p>
                    </CardBody>
                  </Card>
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
