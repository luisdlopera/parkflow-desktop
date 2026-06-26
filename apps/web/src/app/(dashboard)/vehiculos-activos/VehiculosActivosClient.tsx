"use client";

import { useState, useEffect, useMemo } from "react";
import { Modal, Dropdown } from "@heroui/react";
import { Button } from "@/components/bridge/Button";
import DataTable from "@/components/ui/DataTable";
import { useActiveSessions } from "@/features/active-vehicles/hooks/useActiveSessions";
import { useTerminalCaja } from "@/features/cash-register/hooks/useTerminalCaja";
import { useTenantConfig } from "@/providers/TenantConfigProvider";
import { fetchLockers, type LockerDto } from "@/lib/api/lockers-api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Eye, MoreVertical, Edit, Printer, LogOut, Columns } from "lucide-react";
import { GetActiveSessionsQuery, ActiveSessionDto } from "@/lib/api/sessions-api";
import { useBulkExit } from "@/features/active-vehicles/hooks/useBulkExit";
import { TicketPreviewModal } from "@/features/active-vehicles/components/TicketPreviewModal";
import { BulkExitConfirmModal, BulkExitSuccessModal } from "@/features/active-vehicles/components/BulkExitModals";
import { useColumnVisibility } from "@/features/active-vehicles/hooks/useColumnVisibility";
import { VehiculosActivosFilters } from "@/features/active-vehicles/components/VehiculosActivosFilters";
import { hasPermission } from "@/lib/services/auth-domain.service";

export default function VehiculosActivosClient({ fallbackData }: { fallbackData?: { sessions: any; summary: any } | undefined }) {
  const [params, setParams] = useState<GetActiveSessionsQuery>({ page: 1, limit: 25, search: "", sortBy: "entryAt", sortDir: "desc" });
  const { rows, meta, summary, loading, error, reload } = useActiveSessions(params, fallbackData);
  const { caja, requireOpenForPayment } = useTerminalCaja();
  const { runtimeConfig } = useTenantConfig();
  const [ticketPreview, setTicketPreview] = useState<ActiveSessionDto | null>(null);
  const [lockers, setLockers] = useState<LockerDto[]>([]);
  const [lockersLoading, setLockersLoading] = useState(false);
  const [userCanReprint, setUserCanReprint] = useState(false);
  const router = useRouter();

  useEffect(() => {
    hasPermission("tickets:imprimir").then(setUserCanReprint);
  }, []);

  const { visible, toggleColumn, isVisible, resetColumns, columns: colDefs } = useColumnVisibility();

  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

  const { selectedKeys, setSelectedKeys, precalculation, finalResult, isCalculating, isProcessing, hasSelection, selectionCount, availablePaymentMethods, selectedPaymentMethod, setSelectedPaymentMethod, handleCalculate, handleConfirm, closeModal } = useBulkExit(rows, reload);

  const enableCustodiedItem = (runtimeConfig?.operationConfiguration?.enableCustodiedItem as boolean) ?? true;
  const vehicleTypes = (runtimeConfig?.vehicleTypes ?? []) as string[];
  const hasMotorcycles = vehicleTypes.includes("MOTORCYCLE");
  const showHelmetAlert = !lockersLoading && enableCustodiedItem && hasMotorcycles && lockers.length === 0;

  const vehicleTypeOptions = useMemo(
    () => [
      { label: "Todos los tipos", value: "all" },
      ...vehicleTypes.map((vt: string) => ({ label: vt, value: vt })),
    ],
    [vehicleTypes],
  );

  const filterConfig = useMemo(() => [{
    key: "vehicleType",
    label: "Tipo de vehículo",
    type: "select" as const,
    options: vehicleTypeOptions,
  }], [vehicleTypeOptions]);

  const handleFilterChange = (values: Record<string, string>) => {
    setFilterValues((prev) => ({ ...prev, ...values }));
    setParams((p) => ({ ...p, page: 1 }));
  };

  useEffect(() => {
    if (enableCustodiedItem && hasMotorcycles) {
      setLockersLoading(true);
      fetchLockers().then(setLockers).catch(() => setLockers([])).finally(() => setLockersLoading(false));
    }
  }, [enableCustodiedItem, hasMotorcycles]);

  const filteredRows = useMemo(() => {
    let result = rows;
    if (filterValues.vehicleType && filterValues.vehicleType !== "all") {
      result = result.filter((r: ActiveSessionDto) => r.vehicleType === filterValues.vehicleType);
    }
    return result;
  }, [rows, filterValues]);

  return (
    <div className="space-y-6">
      {caja.status === "closed" && requireOpenForPayment && (
        <Modal.Backdrop isOpen isDismissable={false} isKeyboardDismissDisabled onOpenChange={() => {}}>
          <Modal.Container size="full">
            <Modal.Dialog className="flex flex-col items-center justify-center text-center py-32">
              <Modal.Header className="flex-col items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-brand-100 flex items-center justify-center">
                  <AlertTriangle className="w-10 h-10 text-brand-600" />
                </div>
                <Modal.Heading className="text-3xl font-bold text-slate-900">Caja no abierta</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="max-w-md">
                <p className="text-lg text-slate-600">No hay una sesión de caja abierta en este terminal. Debes abrir caja antes de procesar entradas o salidas de vehículos.</p>
              </Modal.Body>
              <Modal.Footer className="flex-col gap-3 w-full max-w-xs">
                <Link href="/caja" className="w-full">
                  <Button color="warning" size="lg" className="w-full h-14 text-lg font-bold">Ir a Abrir Caja</Button>
                </Link>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      )}

      {caja.status === "error" && (
        <Modal.Backdrop isOpen isDismissable={false} isKeyboardDismissDisabled onOpenChange={() => {}}>
          <Modal.Container size="full">
            <Modal.Dialog className="flex flex-col items-center justify-center text-center py-32">
              <Modal.Header className="flex-col items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-rose-100 flex items-center justify-center">
                  <AlertTriangle className="w-10 h-10 text-rose-600" />
                </div>
                <Modal.Heading className="text-3xl font-bold text-slate-900">Error de conexión</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="max-w-md space-y-3">
                <p className="text-lg text-slate-600">
                  {caja.reason === "network" ? "No se puede conectar con el servidor de caja (puerto 6011). Verifica que el backend esté corriendo."
                    : caja.reason === "auth" ? "Tu sesión expiró. Inicia sesión nuevamente para continuar."
                    : "Ocurrió un error al verificar el estado de la caja. Intenta recargar la página."}
                </p>
              </Modal.Body>
              <Modal.Footer className="flex-col gap-3 w-full max-w-xs">
                <Button color="primary" onPress={() => window.location.reload()}>Recargar página</Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      )}

      {caja.status === "closed" && !requireOpenForPayment && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-semibold">Caja no abierta</p>
          <p className="mt-1">No hay una sesión de caja abierta. Puedes operar igualmente, pero los cobros no quedarán asociados a una sesión de caja.{" "}<Link href="/caja" className="underline font-medium">Ir a caja</Link>.</p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm uppercase tracking-[0.3em] text-amber-700/80 font-medium">Control Diario</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Vehículos Activos</h1>
        </div>
        <div className="flex items-center gap-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {loading ? "Cargando..." : `${meta?.total ?? rows.length} vehículos en patio`}
          </p>
          <Button size="sm" variant="tertiary" color="warning" className="font-bold" onPress={() => reload()} isLoading={loading}>Actualizar</Button>
        </div>
      </div>

      {error && <p className="text-sm text-rose-700 font-medium">{error}</p>}

      {summary && (summary.activeSpaces === undefined || summary.activeSpaces === null || summary.activeSpaces === 0) && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-800 space-y-2">
          <p className="font-semibold flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> No tienes celdas configuradas</p>
          <p>Para visualizar la disponibilidad de espacios y registrar ingresos, primero debes configurar la capacidad de tu parqueadero.</p>
          <Link href="/configuracion/espacios"><Button size="sm" color="warning" className="mt-1">Ir a Configurar Espacios</Button></Link>
        </div>
      )}

      {showHelmetAlert && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800 space-y-2">
          <p className="font-semibold flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> No tienes lockers configurados</p>
          <p>Para registrar cascos en custodia al ingresar motocicletas, necesitas configurar los lockers numerados.</p>
          <Link href="/configuracion/lockers"><Button size="sm" color="warning" className="mt-1">Ir a Configurar Lockers</Button></Link>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Ocupados</p>
          <p className="text-2xl font-bold text-slate-900">{summary ? summary.activeSpaces - summary.availableSpaces : rows.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Disponibles</p>
          <p className="text-2xl font-bold text-emerald-700">{summary ? `${summary.availableSpaces} / ${summary.activeSpaces}` : "—"}</p>
        </div>
      </div>

      {ticketPreview && <TicketPreviewModal ticket={ticketPreview} onClose={() => setTicketPreview(null)} />}

      {hasSelection && (
        <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white border-t border-slate-200 p-4 flex justify-between items-center z-50">
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 text-amber-800 rounded-full w-8 h-8 flex items-center justify-center font-bold">{selectionCount}</div>
            <span className="font-semibold text-slate-700">Vehículos seleccionados</span>
          </div>
          <div className="flex gap-3">
            <Button color="default" variant="flat" onPress={() => setSelectedKeys(new Set())}>Cancelar</Button>
            <Button color="warning" onPress={handleCalculate} isLoading={isCalculating} startContent={<LogOut className="w-4 h-4" />}>Pre-liquidar Salida Masiva</Button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
        <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-2 border-b border-slate-100">
          <VehiculosActivosFilters
            filterValues={filterValues}
            onFilterChange={handleFilterChange}
            vehicleTypeOptions={vehicleTypeOptions}
            isLoading={loading}
          />
          <div className="flex items-center gap-2">
            <Dropdown>
            <Button size="sm" variant="ghost" color="default" isIconOnly aria-label="Columnas visibles">
              <Columns className="h-4 w-4 text-slate-500" />
            </Button>
            <Dropdown.Popover>
              <Dropdown.Menu aria-label="Columnas visibles" onAction={(key) => { if (key === "reset") { resetColumns(); } else { toggleColumn(String(key)); } }}>
                {colDefs.filter((c) => c.key !== "actions").map((col) => (
                  <Dropdown.Item key={col.key} textValue={col.label}>
                    <div className="flex items-center gap-2">
                      <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${isVisible(col.key) ? "bg-primary-500 border-primary-500" : "border-slate-300"}`}>
                        {isVisible(col.key) && <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                      </div>
                      <span className="text-sm">{col.label}</span>
                    </div>
                  </Dropdown.Item>
                ))}
                <Dropdown.Item key="reset" textValue="Restaurar" className="border-t border-slate-100 mt-1 pt-1">
                  <div className="flex items-center gap-2 text-xs text-primary-600 font-medium">Restaurar predeterminado</div>
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
            </div>
        </div>

      <DataTable
        selectable
        selectedKeys={selectedKeys === "all" ? new Set(filteredRows.map((r: ActiveSessionDto) => r.ticketNumber)) : (selectedKeys as Set<string>)}
        onRowSelectionChange={(keys: Set<string | number | boolean | null | undefined>) => setSelectedKeys(keys as Set<string>)}
        serverSide
        searchable
        searchPlaceholder="Buscar por placa o ticket..."
        onSearchChange={(search) => setParams((p) => ({ ...p, search, page: 1 }))}
        sortDescriptor={{ column: params.sortBy || "entryAt", direction: params.sortDir === "asc" ? "ascending" : "descending" }}
        onSortChange={(desc) => setParams((p) => ({ ...p, sortBy: String(desc.column), sortDir: desc.direction === "ascending" ? "asc" : "desc" }))}
        pagination={{ page: params.page || 1, pageSize: params.limit || 25, total: meta?.total ?? 0 }}
        onPaginationChange={(page, limit) => setParams((p) => ({ ...p, page, limit }))}
        columns={[
          ...(isVisible("plate") ? [{
            key: "plate" as const, label: "Placa", priority: "high" as const, sortable: true,
            render: (row: ActiveSessionDto) => !row.plate || row.plate.startsWith("NP-")
              ? <span className="rounded-full bg-amber-100 text-amber-700 px-3 py-1 text-xs font-semibold">SIN PLACA</span>
              : row.plate,
          }] : []),
          ...(isVisible("ticketNumber") ? [{ key: "ticketNumber" as const, label: "Ticket", priority: "medium" as const, sortable: true }] : []),
          ...(isVisible("vehicleType") ? [{ key: "vehicleType" as const, label: "Tipo", priority: "high" as const, sortable: false }] : []),
          ...(isVisible("parkingSpaceCode") ? [{
            key: "parkingSpaceCode" as const, label: "Celda", priority: "high" as const, sortable: false,
            render: (row: ActiveSessionDto) => row.parkingSpaceCode ?? <span className="text-slate-400">Sin asignar</span>,
          }] : []),
          ...(isVisible("duration") ? [{ key: "duration" as const, label: "Tiempo", priority: "medium" as const, sortable: false }] : []),
          ...(isVisible("rateName") ? [{
            key: "rateName" as const, label: "Tarifa", priority: "low" as const, sortable: false,
            render: (row: ActiveSessionDto) => row.rateName ?? <span className="text-slate-400">Sin tarifa</span>,
          }] : []),
          ...(isVisible("cascos") ? [{
            key: "cascos" as const, label: "Cascos", priority: "medium" as const, sortable: false,
            render: (row: any) => {
              const items = (row as ActiveSessionDto).custodiedItems;
              if (!items || items.length === 0) return <span className="text-slate-400">—</span>;
              return (
                <div className="flex flex-wrap gap-1">
                  {items.map((item: any) => (
                    <span key={item.identifier} className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-200 text-amber-800 px-2.5 py-1 text-xs font-bold" title={item.observations ?? "Sin observaciones"}>
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                      {item.identifier}
                      {item.observations && <span className="font-normal text-amber-600 ml-0.5">· {item.observations}</span>}
                    </span>
                  ))}
                </div>
              );
            },
          }] : []),
          ...(isVisible("actions") ? [{
            key: "actions" as const, label: "", priority: "high" as const,
            render: (row: any) => (
              <div className="flex justify-end relative">
                <Dropdown>
                  <Button size="sm" variant="ghost" color="default" isIconOnly aria-label="Opciones">
                    <MoreVertical className="h-4 w-4 text-slate-500" />
                  </Button>
                  <Dropdown.Popover>
                    <Dropdown.Menu aria-label="Acciones de vehículo" onAction={(key) => {
                      if (key === "view") setTicketPreview(row as ActiveSessionDto);
                      if (key === "checkout" || key === "reprint") router.push(`/salida-cobro?ticketNumber=${encodeURIComponent(row.ticketNumber)}`);
                    }}>
                      <Dropdown.Item id="view" textValue="Ver detalle">
                        <div className="flex items-center gap-2"><Eye className="w-4 h-4 text-slate-500" /><span>Ver detalle</span></div>
                      </Dropdown.Item>
                      <Dropdown.Item id="edit" textValue="Editar">
                        <div className="flex items-center gap-2"><Edit className="w-4 h-4 text-slate-500" /><span>Editar</span></div>
                      </Dropdown.Item>
                      {runtimeConfig?.tickets?.allowReprint !== false && userCanReprint && (
                        <Dropdown.Item id="reprint" textValue="Reimprimir ticket">
                          <div className="flex items-center gap-2"><Printer className="w-4 h-4 text-slate-500" /><span>Reimprimir ticket</span></div>
                        </Dropdown.Item>
                      )}
                      <Dropdown.Item id="checkout" textValue="Registrar salida" variant="danger">
                        <div className="flex items-center gap-2 text-danger-500"><LogOut className="w-4 h-4" /><span>Registrar salida</span></div>
                      </Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown.Popover>
                </Dropdown>
              </div>
            ),
          }] : []),
        ]}
        rows={filteredRows}
        emptyMessage="No hay vehículos activos en este momento."
      />
      </div>

      {precalculation && !finalResult && (
        <BulkExitConfirmModal 
          precalculation={precalculation} 
          isProcessing={isProcessing} 
          availablePaymentMethods={availablePaymentMethods}
          selectedPaymentMethod={selectedPaymentMethod}
          setSelectedPaymentMethod={setSelectedPaymentMethod}
          onConfirm={handleConfirm} 
          onCancel={closeModal} 
        />
      )}
      {finalResult && <BulkExitSuccessModal result={finalResult} onClose={closeModal} />}
    </div>
  );
}
