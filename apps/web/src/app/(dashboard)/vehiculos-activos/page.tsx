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
import { AlertTriangle, Eye, MoreVertical, Edit, Printer, LogOut, CheckCircle, XCircle } from "lucide-react";
import { GetActiveSessionsQuery, ActiveSessionDto } from "@/services/sessions.service";
import { precalculateBulkExit, processBulkExit, BulkExitCalculateResponseDto, BulkExitResponseDto } from "@/services/bulk-exit.service";
import { currentUser } from "@/lib/auth";
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

  const [precalculation, setPrecalculation] = useState<BulkExitCalculateResponseDto | null>(null);
  const [finalResult, setFinalResult] = useState<BulkExitResponseDto | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

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

  const handleCalculateBulkExit = async () => {
    const user = await currentUser();
    if (!user) return;
    const selectedIds = selectedKeys === "all" ? rows.map(r => r.ticketNumber) : Array.from(selectedKeys);
    if (selectedIds.length === 0) return;
    
    setIsCalculating(true);
    try {
      const result = await precalculateBulkExit({
        locators: selectedIds as string[],
        operatorUserId: user.id
      });
      setPrecalculation(result);
    } catch (err: any) {
      alert("Error en pre-liquidación: " + err.message);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleConfirmProcess = async () => {
    const user = await currentUser();
    if (!user || !precalculation) return;
    const selectedIds = precalculation.items.map(i => i.locator);
    
    setIsProcessing(true);
    try {
      const result = await processBulkExit({
        locators: selectedIds,
        operatorUserId: user.id,
        paymentMethod: "CASH" 
      });
      setFinalResult(result);
      setSelectedKeys(new Set());
      reload();
    } catch (err: any) {
      alert("Error procesando salida masiva: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const closeModal = () => {
    setPrecalculation(null);
    setFinalResult(null);
  };

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
      {((selectedKeys === "all" && rows.length > 0) || (selectedKeys !== "all" && (selectedKeys as Set<string>).size > 0)) && (
        <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] p-4 flex justify-between items-center z-50">
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 text-amber-800 rounded-full w-8 h-8 flex items-center justify-center font-bold">
              {selectedKeys === "all" ? meta?.total ?? rows.length : (selectedKeys as Set<string>).size}
            </div>
            <span className="font-semibold text-slate-700">Vehículos seleccionados</span>
          </div>
          <div className="flex gap-3">
             <Button color="default" variant="flat" onPress={() => setSelectedKeys(new Set())}>Cancelar</Button>
             <Button color="warning" onPress={handleCalculateBulkExit} isLoading={isCalculating} startContent={<LogOut className="w-4 h-4" />}>
               Pre-liquidar Salida Masiva
             </Button>
          </div>
        </div>
      )}

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
                  <Button
                    size="sm"
                    variant="ghost"
                    color="default"
                    isIconOnly
                    aria-label="Opciones"
                  >
                    <MoreVertical className="h-4 w-4 text-slate-500" />
                  </Button>
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

      {/* Precalculation Confirmation Modal */}
      {precalculation && !finalResult && (
        <Modal.Backdrop isOpen={true} onOpenChange={(open) => !open && setPrecalculation(null)}>
          <Modal.Container size="lg">
            <Modal.Dialog>
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>Confirmar Salida Masiva</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-bold">Total Vehículos</p>
                    <p className="text-xl font-bold">{precalculation.totalVehicles}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-bold">Subtotal</p>
                    <p className="text-xl font-bold text-slate-700">${precalculation.totalSubtotal.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-bold">Descuentos</p>
                    <p className="text-xl font-bold text-green-600">-${precalculation.totalDiscount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-bold">Total a Cobrar</p>
                    <p className="text-xl font-bold text-brand-600">${precalculation.finalTotal.toLocaleString()}</p>
                  </div>
                </div>
                
                {precalculation.errors && precalculation.errors.length > 0 && (
                  <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm text-rose-700">
                    <p className="font-bold flex items-center gap-1"><AlertTriangle className="w-4 h-4"/> Vehículos con anomalías (se excluirán/fallarán):</p>
                    <ul className="list-disc pl-5 mt-1">
                      {precalculation.errors.map((e, idx) => <li key={idx}>{e}</li>)}
                    </ul>
                  </div>
                )}
                
                <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-slate-500 font-semibold">Placa</th>
                        <th className="px-4 py-2 text-slate-500 font-semibold">Ticket</th>
                        <th className="px-4 py-2 text-slate-500 font-semibold text-right">Total</th>
                        <th className="px-4 py-2 text-slate-500 font-semibold text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {precalculation.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-2 font-medium">{item.plate}</td>
                          <td className="px-4 py-2 text-slate-500">{item.ticketNumber}</td>
                          <td className="px-4 py-2 text-right font-semibold">${item.total.toLocaleString()}</td>
                          <td className="px-4 py-2 text-center">
                            {item.errorMessage ? (
                              <span className="text-rose-500 text-xs font-bold" title={item.errorMessage}>Error</span>
                            ) : (
                              <span className="text-emerald-500 text-xs font-bold">OK</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Button color="default" variant="ghost" onPress={() => setPrecalculation(null)}>Cancelar</Button>
                <Button color="warning" onPress={handleConfirmProcess} isLoading={isProcessing}>
                  Confirmar e Imprimir
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      )}

      {/* Success Modal */}
      {finalResult && (
        <Modal.Backdrop isOpen={true} onOpenChange={(open) => !open && closeModal()}>
          <Modal.Container size="sm">
            <Modal.Dialog className="text-center p-6 space-y-4">
              <div className="flex justify-center">
                {finalResult.failedCount === 0 ? (
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                ) : (
                  <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-8 h-8" />
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {finalResult.failedCount === 0 ? "Proceso Exitoso" : "Proceso Parcial"}
                </h3>
                <p className="text-slate-500 mt-2">
                  Se procesaron <b>{finalResult.successfulCount}</b> vehículos correctamente. 
                  {finalResult.failedCount > 0 && <span className="text-rose-600 font-medium"> ({finalResult.failedCount} fallaron)</span>}
                </p>
                <p className="text-2xl font-black text-brand-600 mt-4">${finalResult.totalCharged.toLocaleString()}</p>
              </div>
              <Button color="primary" className="w-full" onPress={closeModal}>
                Cerrar
              </Button>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      )}
    </div>
  );
}
