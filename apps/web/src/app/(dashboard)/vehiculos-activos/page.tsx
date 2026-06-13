"use client";

import { useState } from "react";
import { Modal } from "@heroui/react";
import { Button } from "@/components/ui/Button";
import DataTable from "@/components/ui/DataTable";
import { useActiveSessions } from "@/hooks/useActiveSessions";
import { useTerminalCaja } from "@/hooks/useTerminalCaja";
import Link from "next/link";
import { AlertTriangle, Eye } from "lucide-react";
import type { ActiveSessionDto } from "@/services/sessions.service";

export default function VehiculosActivosPage() {
  const { rows, summary, loading, error, reload } = useActiveSessions();
  const { cajaOpen } = useTerminalCaja();
  const [ticketPreview, setTicketPreview] = useState<ActiveSessionDto | null>(null);

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
            {loading ? "Cargando..." : `${rows.length} vehículos en patio`}
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

      <DataTable
        columns={[
          {
            key: "plate",
            label: "Placa",
            priority: "high",
            render: (row) => {
              if (!row.plate || row.plate.startsWith("NP-")) {
                return <span className="rounded-full bg-amber-100 text-amber-700 px-3 py-1 text-xs font-semibold">SIN PLACA</span>;
              }
              return row.plate;
            }
          },
          { key: "ticketNumber", label: "Ticket", priority: "medium" },
          { key: "vehicleType", label: "Tipo", priority: "high" },
          {
            key: "parkingSpaceCode",
            label: "Celda",
            priority: "high",
            render: (row) => row.parkingSpaceCode ?? <span className="text-slate-400">Sin asignar</span>
          },
          { key: "duration", label: "Tiempo", priority: "medium" },
          {
            key: "rateName",
            label: "Tarifa",
            priority: "low",
            render: (row) => row.rateName ?? <span className="text-slate-400">Sin tarifa</span>
          },
          {
            key: "actions",
            label: "",
            priority: "high",
            render: (row) => (
              <Button
                size="sm"
                variant="ghost"
                color="warning"
                isIconOnly
                aria-label="Ver ticket"
                onPress={() => setTicketPreview(row as ActiveSessionDto)}
              >
                <Eye className="h-4 w-4" />
              </Button>
            )
          }
        ]}
        rows={rows}
        emptyMessage="No hay vehículos activos en este momento."
      />
    </div>
  );
}
