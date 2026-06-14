"use client";

import { useState, useEffect } from "react";
import { Modal, Dropdown } from "@heroui/react";
import { Button } from "@/components/ui/Button";
import DataTable from "@/components/ui/DataTable";
import { useActiveSessions } from "@/hooks/useActiveSessions";
import { useTerminalCaja } from "@/hooks/useTerminalCaja";
import { useTenantConfig } from "@/lib/hooks/useTenantConfig";
import { fetchHelmetLockers, type HelmetLockerDto } from "@/services/helmet-lockers.service";
import Link from "next/link";
import { AlertTriangle, Eye, MoreVertical, Edit, Printer, LogOut } from "lucide-react";
import { GetActiveSessionsQuery, ActiveSessionDto } from "@/services/sessions.service";
import type { SortDescriptor, Selection } from "@heroui/react";

export default function VehiculosActivosPage() {
  const [params, setParams] = useState<GetActiveSessionsQuery>({
    page: 1,
    limit: 25,
    search: "",
    sortBy: "entryAt",
    sortDir: "desc"
  });

  const { rows, meta, summary, loading, error, reload } = useActiveSessions(params);
  const { cajaOpen } = useTerminalCaja();
  const { runtimeConfig } = useTenantConfig();
  const [ticketPreview, setTicketPreview] = useState<ActiveSessionDto | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Selection>(new Set());
  const [helmetLockers, setHelmetLockers] = useState<HelmetLockerDto[]>([]);
  const [helmetLockersLoading, setHelmetLockersLoading] = useState(false);

  const enableCustodiedItem = runtimeConfig?.operationConfiguration?.enableCustodiedItem as boolean ?? true;
  const vehicleTypes = runtimeConfig?.vehicleTypes ?? [];
  const hasMotorcycles = vehicleTypes.includes("MOTORCYCLE");
  const hasHelmetLockers = helmetLockers.length > 0;
  const showHelmetAlert = !helmetLockersLoading && enableCustodiedItem && hasMotorcycles && !hasHelmetLockers;

  useEffect(() => {
    if (enableCustodiedItem && hasMotorcycles) {
      setHelmetLockersLoading(true);
      fetchHelmetLockers()
        .then((lockers) => setHelmetLockers(lockers))
        .catch(() => setHelmetLockers([]))
        .finally(() => setHelmetLockersLoading(false));
    }
  }, [enableCustodiedItem, hasMotorcycles]);

  // ... skip unchanged lines and add selectable to DataTable
  // We'll do this carefully. Let me re-do the replacement to target the correct lines.

  return (
    <div className="space-y-6">
      {/* Full-screen modal when cash register is closed */}
      {cajaOpen === false ? (
        <Modal.Backdrop isOpen={true} onOpenChange={() => {}} isDismissable={false} isKeyboardDismissDisabled>
          <Modal.Container size="full">
            <Modal.Dialog className="flex flex-col items-center justify-center text-center py-32">
              <Modal.Header className="flex-col items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-brand-100 flex items-center justify-center">
                  <AlertTriangle className="w-10 h-10 text-brand-600" />
                </div>
                <Modal.Heading className="text-3xl font-bold text-slate-900">
                  Caja no abierta
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body className="max-w-md">
                <p className="text-lg text-slate-600">
                  No hay una sesión de caja abierta en este terminal. Debes abrir caja antes de
                  procesar entradas o salidas de vehículos.
                </p>
              </Modal.Body>
              <Modal.Footer className="flex-col gap-3 w-full max-w-xs">
                <Link href="/caja" className="w-full">
                  <Button color="warning" size="lg" className="w-full h-14 text-lg font-bold">
                    Ir a Abrir Caja
                  </Button>
                </Link>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      ) : null}

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm uppercase tracking-[0.3em] text-amber-700/80 font-medium">
            Control Diario
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Vehículos Activos</h1>
        </div>
        <div className="flex items-center gap-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {loading ? "Cargando..." : `${meta?.total ?? rows.length} vehículos en patio`}
          </p>
          <Button
            size="sm"
            variant="tertiary"
            color="warning"
            className="font-bold"
            onPress={() => reload()}
            isLoading={loading}
          >
            Actualizar
          </Button>
        </div>
      </div>

      {error ? <p className="text-sm text-rose-700 font-medium">{error}</p> : null}

      {/* Alerta cuando no hay celdas configuradas */}
      {summary && (summary.activeSpaces === undefined || summary.activeSpaces === null || summary.activeSpaces === 0) ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-800 space-y-2">
          <p className="font-semibold flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> No tienes celdas configuradas</p>
          <p>Para poder visualizar la disponibilidad de espacios y registrar ingresos de vehículos, primero debes configurar la capacidad de tu parqueadero.</p>
          <Link href="/configuracion/espacios">
            <Button size="sm" color="warning" className="mt-1">
              Ir a Configurar Espacios
            </Button>
          </Link>
        </div>
      ) : null}

      {/* Alerta cuando no hay fichas de cascos configuradas */}
      {showHelmetAlert && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800 space-y-2">
          <p className="font-semibold flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> No tienes fichas de cascos configuradas</p>
          <p>Para poder registrar cascos en custodia al ingresar motocicletas, necesitas configurar las fichas/casilleros.</p>
          <Link href="/configuracion/fichas">
            <Button size="sm" color="warning" className="mt-1">
              Ir a Configurar Fichas
            </Button>
          </Link>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Ocupados</p>
          <p className="text-2xl font-bold text-slate-900">
            {summary ? (summary.activeSpaces - summary.availableSpaces) : rows.length}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Disponibles</p>
          <p className="text-2xl font-bold text-emerald-700">
            {summary ? `${summary.availableSpaces} / ${summary.activeSpaces}` : "—"}
          </p>
        </div>
      </div>

      {/* Ticket preview modal */}
      {ticketPreview && (
        <Modal.Backdrop isOpen={true} onOpenChange={(open) => { if (!open) setTicketPreview(null); }}>
          <Modal.Container size="sm">
            <Modal.Dialog className="sm:max-w-sm">
              <Modal.CloseTrigger onClick={() => setTicketPreview(null)} />
              <Modal.Header>
                <Modal.Heading>Ticket {ticketPreview.ticketNumber}</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-slate-500 font-medium">Ticket:</span>
                  <span className="font-semibold">{ticketPreview.ticketNumber}</span>
                  <span className="text-slate-500 font-medium">Placa:</span>
                  <span className="font-semibold uppercase">{ticketPreview.plate}</span>
                  <span className="text-slate-500 font-medium">Tipo:</span>
                  <span className="font-semibold">{ticketPreview.vehicleType}</span>
                  <span className="text-slate-500 font-medium">Tiempo:</span>
                  <span className="font-semibold">{ticketPreview.duration}</span>
                  <span className="text-slate-500 font-medium">Celda:</span>
                  <span className="font-semibold">{ticketPreview.parkingSpaceCode ?? "Sin asignar"}</span>
                  <span className="text-slate-500 font-medium">Tarifa:</span>
                  <span className="font-semibold">{ticketPreview.rateName ?? "Sin tarifa"}</span>
                  {ticketPreview.custodiedItems && ticketPreview.custodiedItems.length > 0 && (
                    <>
                      <span className="text-slate-500 font-medium">Cascos:</span>
                      <span className="font-semibold">
                        {ticketPreview.custodiedItems.map((item: any) => item.identifier).join(", ")}
                      </span>
                    </>
                  )}
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Button size="sm" variant="ghost" color="default" onPress={() => setTicketPreview(null)}>
                  Cerrar
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      )}
      <div className="flex justify-between items-center mb-4">
        {(selectedKeys === "all" || (selectedKeys as Set<string>).size > 0) && (
          <div className="flex gap-2 items-center bg-blue-50 px-4 py-2 rounded-lg border border-blue-100">
            <span className="text-sm font-medium text-blue-800">{selectedKeys === "all" ? rows.length : (selectedKeys as Set<string>).size} seleccionados</span>
            <div className="h-4 w-px bg-blue-200 mx-2"></div>
            <Button size="sm" color="warning" variant="flat">Salida Masiva</Button>
            <Button size="sm" color="default" variant="flat">Cambiar Tarifa</Button>
          </div>
        )}
      </div>

      <DataTable
        selectable
        selectedKeys={selectedKeys === "all" ? new Set(rows.map((r: any) => r.ticketNumber)) : selectedKeys}
        onRowSelectionChange={(keys) => setSelectedKeys(keys as Set<string>)}
        serverSide
        searchable
        searchPlaceholder="Buscar por placa o ticket..."
        onSearchChange={(search) => setParams(p => ({ ...p, search, page: 1 }))}
        sortDescriptor={{ column: params.sortBy || "entryAt", direction: params.sortDir === "asc" ? "ascending" : "descending" }}
        onSortChange={(desc) => setParams(p => ({ ...p, sortBy: String(desc.column), sortDir: desc.direction === "ascending" ? "asc" : "desc" }))}
        pagination={{
          page: params.page || 1,
          pageSize: params.limit || 25,
          total: meta?.total ?? 0,
        }}
        onPaginationChange={(page, limit) => setParams(p => ({ ...p, page, limit }))}
        columns={[
          {
            key: "plate",
            label: "Placa",
            priority: "high",
            sortable: true,
            render: (row) => {
              if (!row.plate || row.plate.startsWith("NP-")) {
                return <span className="rounded-full bg-amber-100 text-amber-700 px-3 py-1 text-xs font-semibold">SIN PLACA</span>;
              }
              return row.plate;
            }
          },
          { key: "ticketNumber", label: "Ticket", priority: "medium", sortable: true },
          { key: "vehicleType", label: "Tipo", priority: "high", sortable: false },
          {
            key: "parkingSpaceCode",
            label: "Celda",
            priority: "high",
            sortable: false,
            render: (row) => row.parkingSpaceCode ?? <span className="text-slate-400">Sin asignar</span>
          },
          { key: "duration", label: "Tiempo", priority: "medium", sortable: false },
          {
            key: "rateName",
            label: "Tarifa",
            priority: "low",
            sortable: false,
            render: (row) => row.rateName ?? <span className="text-slate-400">Sin tarifa</span>
          },
          {
            key: "cascos",
            label: "Cascos",
            priority: "medium",
            sortable: false,
            render: (row) => {
              const items = (row as ActiveSessionDto).custodiedItems;
              if (!items || items.length === 0) return <span className="text-slate-400">—</span>;
              return (
                <div className="flex flex-wrap gap-1">
                  {items.map((item: any) => (
                    <span
                      key={item.identifier}
                      className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-200 text-amber-800 px-2.5 py-1 text-xs font-bold"
                      title={item.observations ?? "Sin observaciones"}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                      {item.identifier}
                      {item.observations && (
                        <span className="font-normal text-amber-600 ml-0.5">· {item.observations}</span>
                      )}
                    </span>
                  ))}
                </div>
              );
            }
          },
          {
            key: "actions",
            label: "",
            priority: "high",
            render: (row) => (
              <div className="flex justify-end relative">
                <Dropdown>
                  <Dropdown.Trigger>
                    <Button
                      size="sm"
                      variant="ghost"
                      color="default"
                      isIconOnly
                      aria-label="Opciones"
                    >
                      <MoreVertical className="h-4 w-4 text-slate-500" />
                    </Button>
                  </Dropdown.Trigger>
                  <Dropdown.Popover>
                    <Dropdown.Menu aria-label="Acciones de vehículo" onAction={(key) => {
                      if (key === "view") setTicketPreview(row as ActiveSessionDto);
                      // Handle others here...
                    }}>
                      <Dropdown.Item id="view" textValue="Ver detalle">
                        <div className="flex items-center gap-2">
                          <Eye className="w-4 h-4 text-slate-500" />
                          <span>Ver detalle</span>
                        </div>
                      </Dropdown.Item>
                      <Dropdown.Item id="edit" textValue="Editar">
                        <div className="flex items-center gap-2">
                          <Edit className="w-4 h-4 text-slate-500" />
                          <span>Editar</span>
                        </div>
                      </Dropdown.Item>
                      <Dropdown.Item id="reprint" textValue="Reimprimir ticket">
                        <div className="flex items-center gap-2">
                          <Printer className="w-4 h-4 text-slate-500" />
                          <span>Reimprimir ticket</span>
                        </div>
                      </Dropdown.Item>
                      <Dropdown.Item id="checkout" textValue="Registrar salida" variant="danger">
                        <div className="flex items-center gap-2 text-danger-500">
                          <LogOut className="w-4 h-4" />
                          <span>Registrar salida</span>
                        </div>
                      </Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown.Popover>
                </Dropdown>
              </div>
            )
          }
        ]}
        rows={rows}
        emptyMessage="No hay vehículos activos en este momento."
      />
    </div>
  );
}
