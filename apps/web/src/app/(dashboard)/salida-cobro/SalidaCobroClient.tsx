"use client";

import { Modal, ListBox } from "@heroui/react";
import { Checkbox } from "@/components/bridge/Checkbox";
import { Select } from "@/components/bridge/Select";
import { Button } from "@/components/bridge/Button";
import { Input } from "@/components/bridge/Input";
import { TextArea } from "@/components/bridge/TextArea";
import Badge from "@/components/bridge/Badge";
import TicketReceiptPreview from "@/components/tickets/TicketReceiptPreview";
import { ChangeCalculator } from "@/components/ui/ChangeCalculator";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { resolvePaperWidthMm } from "@/lib/tauri-print";
import { useOsShortcut } from "@/hooks/core/useOsShortcut";
import { useExitShortcuts } from "@/hooks/ui/useKeyboardShortcuts";
import TicketPrintWarning from "@/components/tickets/TicketPrintWarning";
import { useVehicleExit } from "@/features/vehicle-exit/hooks/useVehicleExit";
import { useFeatureFlags } from "@/components/providers/FeatureFlagProvider";

const ENTRY_MODE_LABEL: Record<string, string> = {
  VISITOR: "Visitante",
  AGREEMENT: "Convenio",
  SUBSCRIBER: "Abonado",
  EMPLOYEE: "Empleado / cortesía",
};

export default function SalidaCobroClient() {
  const { modifier } = useOsShortcut();
  const p = useVehicleExit();
  const { agreements } = useFeatureFlags();

  useExitShortcuts({
    onCashPayment: () => p.processExitAction(p.firstMethod),
    onCardPayment: () => p.processExitAction(p.secondMethod),
    onSearch: p.lookup,
    isActive: !!p.active && !p.processing,
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Caja not open — blocking modal */}
      {p.caja.status === "closed" && p.requireOpenForPayment ? (
        <Modal.Backdrop isOpen={true} onOpenChange={() => {}} isDismissable={false} isKeyboardDismissDisabled>
          <Modal.Container size="full">
            <Modal.Dialog className="flex flex-col items-center justify-center text-center py-32">
              <Modal.Header className="flex-col items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-brand-100 flex items-center justify-center">
                  <AlertTriangle className="w-10 h-10 text-brand-600" />
                </div>
                <Modal.Heading className="text-3xl font-bold text-slate-900">Caja no abierta</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="max-w-md">
                <p className="text-lg text-slate-600">
                  No hay una sesión de caja abierta en este terminal. Debes abrir caja antes de procesar entradas o salidas.
                </p>
              </Modal.Body>
              <Modal.Footer className="flex-col gap-3 w-full max-w-xs">
                <Link href="/caja" className="w-full">
                  <Button color="warning" size="lg" className="w-full h-14 text-lg font-bold">Ir a Abrir Caja</Button>
                </Link>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      ) : null}

      {/* Caja connection error */}
      {p.caja.status === "error" ? (
        <Modal.Backdrop isOpen={true} onOpenChange={() => {}} isDismissable={false} isKeyboardDismissDisabled>
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
                  {p.caja.reason === "network"
                    ? "No se puede conectar con el servidor de caja. Verifica que el backend esté corriendo."
                    : p.caja.reason === "auth"
                      ? "Tu sesión expiró. Inicia sesión nuevamente para continuar."
                      : "Ocurrió un error al verificar el estado de la caja. Intenta recargar la página."}
                </p>
              </Modal.Body>
              <Modal.Footer className="flex-col gap-3 w-full max-w-xs">
                <Button color="primary" onPress={() => window.location.reload()}>Recargar página</Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      ) : null}

      {/* Caja soft warning */}
      {p.caja.status === "closed" && !p.requireOpenForPayment ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-semibold">Caja no abierta</p>
          <p className="mt-1">
            No hay una sesión de caja abierta. Puedes operar igualmente, pero los cobros no quedarán asociados a una sesión de caja.{" "}
            <Link href="/caja" className="underline font-medium">Ir a caja</Link>.
          </p>
        </div>
      ) : null}

      {/* Print warning */}
      {p.printWarning ? (
        <TicketPrintWarning
          ticketNumber={p.printWarning.ticketNumber}
          plate={p.printWarning.plate}
          previewLines={p.printWarning.previewLines}
          onDownload={p.handleDownloadPrintWarning}
          onReprint={() => void p.reprintTicket()}
          onClose={p.handleClosePrintWarning}
          reprintLoading={p.reprintLoading}
          allowTicketReprint={p.allowTicketReprint}
        />
      ) : null}

      {/* Header */}
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-amber-700/80">Salida y cobro</p>
        <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900">Finalizar servicio</h1>
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Left: Search + session info */}
        <div className="surface rounded-2xl p-4 sm:p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-900">Busqueda</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input
              ref={p.ticketInputRef}
              label="Número de ticket"
              value={p.ticketNumber}
              onChange={(e) => p.setTicketNumber(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void p.lookup(); } }}
              endContent={<span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">Enter</span>}
            />
            <div className="space-y-1">
              <Input
                label="Placa"
                value={p.plate}
                onChange={(val) => p.setPlate(val.target.value.toUpperCase())}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void p.lookup(); } }}
                endContent={<span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">Placa</span>}
              />
              {p.plate.startsWith("NP-") && (
                <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                  Esta placa corresponde a un ingreso sin placa. Use el número de ticket para buscar.
                </p>
              )}
            </div>
          </div>
          {agreements && (
            <div className="mt-4">
              <Input
                label="Código de convenio (opcional)"
                placeholder="CONV-123"
                value={p.agreementCode}
                onChange={(e) => p.setAgreementCode(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void p.lookup(); } }}
                classNames={{ input: "uppercase font-mono" }}
              />
            </div>
          )}
          <div className="mt-4">
            <Button
              color="primary"
              className="font-bold w-full sm:w-auto"
              onPress={() => void p.lookup()}
              isLoading={p.searching}
              isDisabled={p.processing}
              startContent={!p.searching && (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
            >
              Buscar sesion ({modifier}+Enter)
            </Button>
          </div>

          {p.active ? (
            <>
              <div className="mt-6 bg-gradient-to-br from-brand-50 to-amber-50 border-2 border-brand-200 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-brand-500 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <Badge label="Sesion Activa" tone="warning" />
                    {p.active.receipt.plate?.startsWith("NP-") ? (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="rounded-full bg-amber-100 text-amber-700 px-3 py-1 text-xs font-semibold">SIN PLACA</span>
                        <span className="text-sm text-slate-500">(Ingreso sin placa — busque por ticket)</span>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-600 font-medium">Placa: {p.active.receipt.plate}</p>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-xl p-4 mb-4 text-center border border-brand-100">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total a pagar</p>
                  <p className="text-4xl font-bold text-slate-900">${p.totalDue.toLocaleString("es-CO")}</p>
                  <p className="text-sm text-slate-500 mt-1">
                    Tiempo: {p.active.receipt.duration} • {p.active.receipt.rateName ?? "Tarifa estándar"}
                  </p>
                  {(p.active.receipt.entryMode && p.active.receipt.entryMode !== "VISITOR") ? (
                    <p className="text-sm font-semibold text-emerald-700 mt-2">
                      {ENTRY_MODE_LABEL[p.active.receipt.entryMode] ?? p.active.receipt.entryMode}: cobro a puerta $0 (mensualidad / cortesía)
                    </p>
                  ) : p.active.receipt.monthlySession ? (
                    <p className="text-sm font-semibold text-emerald-700 mt-2">Mensualidad activa: cobro $0</p>
                  ) : null}
                  {(p.active.receipt.prepaidMinutes && p.active.receipt.prepaidMinutes > 0) ? (
                    <p className="text-xs font-medium text-emerald-600 mt-1">
                      Minutos prepagados aplicados: {p.active.receipt.prepaidMinutes} min
                    </p>
                  ) : null}
                  {(() => {
                    const sub = Number(p.active?.subtotal ?? 0);
                    const sur = Number(p.active?.surcharge ?? 0);
                    const tot = Number(p.active?.total ?? p.active?.receipt.totalAmount ?? 0);
                    const discount = Math.max(0, (sub + sur) - tot);
                    if ((sub + sur) <= 0 && discount <= 0) return null;
                    return (
                      <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-1 text-left">
                        {sub > 0 ? <p>Subtotal tarifa: ${sub.toLocaleString("es-CO")}</p> : null}
                        {sur > 0 ? <p>Recargos: ${sur.toLocaleString("es-CO")}</p> : null}
                        {discount > 0.009 ? (
                          <p className="text-emerald-700 font-medium">
                            Valor no cobrado (cortesía / convenio / descuento): ${discount.toLocaleString("es-CO")}
                          </p>
                        ) : null}
                        {p.active?.receipt.agreementCode ? (
                          <p className="text-[10px] text-slate-400 mt-1 uppercase">Convenio aplicado: {p.active.receipt.agreementCode}</p>
                        ) : null}
                      </div>
                    );
                  })()}
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-white/70 rounded-lg p-3">
                    <span className="text-slate-500">Ticket:</span>
                    <span className="font-mono font-medium ml-1">{p.active.receipt.ticketNumber}</span>
                  </div>
                  {p.allowTicketReprint && (
                    <div className="bg-white/70 rounded-lg p-3">
                      <span className="text-slate-500">Reimpresiones:</span>
                      <span className="font-medium ml-1">{p.active.receipt.reprintCount}</span>
                    </div>
                  )}
                </div>

                {/* Custodied items */}
                {p.enableCustodiedItem && p.pendingCustodiedItems.length > 0 && (
                  <div className="mt-4 bg-red-100 border border-red-400 rounded-xl p-4 animate-pulse">
                    <div className="flex items-start gap-2">
                      <svg className="w-6 h-6 text-red-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="text-sm">
                        <p className="font-bold text-red-900 text-lg uppercase">¡ATENCIÓN! Elementos custodiados</p>
                        {p.pendingCustodiedItems.map((item) => (
                          <div key={item.id} className="mt-2 flex items-start gap-2">
                            <Checkbox
                              aria-label={`Confirmar devolución de ${item.itemType === "HELMET" ? "Casco" : item.itemType}${item.identifier ? ` #${item.identifier}` : ""}`}
                              isSelected={p.returnConfirmedIds.includes(item.id)}
                              onValueChange={(checked) => p.toggleReturnItem(item.id, checked)}
                              className="mt-1"
                            />
                            <div>
                              <p className="font-bold text-red-900">
                                {item.itemType === "HELMET" ? "Casco" : item.itemType} {item.identifier ? `— #${item.identifier}` : ""}
                              </p>
                              {item.observations && <p className="text-xs text-red-700 italic font-semibold">{item.observations}</p>}
                              <p className="text-red-600 text-xs">Recibido por {item.receivedByName ?? "N/A"} — {item.receivedAt ? new Date(item.receivedAt).toLocaleString("es-CO") : ""}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {p.enableVehicleCondition && (
                <div className="mt-4">
                  <TextArea
                    label="Estado del vehículo"
                    placeholder="Sin novedades a la salida..."
                    value={p.vehicleCondition}
                    onChange={(e) => p.setVehicleCondition(e.target.value)}
                  />
                </div>
              )}
            </>
          ) : null}

          {p.message ? <p className="mt-4 text-sm text-emerald-700">{p.message}</p> : null}
          {p.error ? <p className="mt-4 text-sm text-rose-700">{p.error}</p> : null}
          {p.previewLines ? <TicketReceiptPreview lines={p.previewLines} paperWidthMm={resolvePaperWidthMm()} /> : null}
        </div>

        {/* Right: Payment actions */}
        <div className="surface rounded-2xl p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">Acciones</h2>
          <p className="mt-2 text-sm text-slate-600">
            {p.active ? "Seleccione el medio real de pago o use mixto para pago dividido." : "Busque una sesion activa para habilitar cobros."}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Salida rápida: F2 abre esta pantalla; {modifier}+Enter ejecuta la búsqueda
            {p.availablePaymentMethods.length > 0
              ? `; con sesión activa use 1 (${p.availablePaymentMethods[0].label.toLowerCase()})${p.availablePaymentMethods.length > 1 ? ` o 2 (${p.availablePaymentMethods[1].label.toLowerCase()})` : ""}.`
              : "."}
          </p>

          {p.isPaymentConfigMissing && (
            <div className="mt-4 rounded-xl border border-warning-200 bg-warning-50 p-4 text-sm text-warning-700">
              No hay métodos de pago configurados.{" "}
              <Link href="/configuracion/metodos-pago" className="underline font-medium">
                Ir a Configuración → Métodos de pago
              </Link>{" "}
              para habilitarlos antes de cobrar.
            </div>
          )}

          <div className="mt-4 grid grid-cols-1 gap-2">
            {p.availablePaymentMethods.map((method, index) => (
              <Button
                key={method.code}
                className={`min-h-14 justify-start text-left font-bold ${
                  p.active && !p.processing
                    ? `${method.tone} text-white border border-default-200`
                    : "bg-slate-200 text-slate-400"
                } ${p.selectedPaymentMethod === method.code ? "ring-2 ring-offset-2 ring-slate-900" : ""}`}
                isDisabled={!p.active || p.searching || p.processing}
                onPress={() => p.setSelectedPaymentMethod(method.code)}
              >
                <div className={`w-8 h-8 rounded-lg flex shrink-0 items-center justify-center text-sm ${p.active && !p.processing ? "bg-white/20" : "bg-slate-300"}`}>
                  {index < 9 ? index + 1 : "•"}
                </div>
                <div className="min-w-0">
                  <div className="text-sm sm:text-base leading-tight">{method.label}</div>
                  <div className="text-[11px] opacity-85 font-normal leading-tight">{method.hint}</div>
                </div>
              </Button>
            ))}
          </div>

          {/* Cash change calculator */}
          {p.active && p.selectedPaymentMethod === "CASH" ? (
            <div className="mt-5 rounded-xl border border-emerald-200/80 bg-emerald-50/90 p-3 space-y-3">
              <Input
                label="Recibido en efectivo"
                type="number"
                value={p.cashReceived}
                onChange={(e) => p.setCashReceived(e.target.value)}
                placeholder={String(p.totalDue)}
              />
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg bg-white p-3 border border-emerald-200/80">
                  <p className="text-xs uppercase text-slate-500">Cambio</p>
                  <p className="text-lg font-bold text-emerald-700 tabular-nums">${p.changeDue.toLocaleString("es-CO")}</p>
                </div>
                <div className="rounded-lg bg-white p-3 border border-emerald-200/80">
                  <p className="text-xs uppercase text-slate-500">Vuelto</p>
                  <p className="text-lg font-bold text-emerald-700 tabular-nums">${p.changeDue.toLocaleString("es-CO")}</p>
                </div>
              </div>
            </div>
          ) : null}

          {/* Split payment */}
          {p.active && p.isSplitPayment ? (
            <div className="mt-5 rounded-xl border border-teal-100 bg-teal-50 p-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Pago dividido</p>
                  <p className="text-xs text-slate-600">
                    Suma: ${p.splitTotal.toLocaleString("es-CO")} / ${p.totalDue.toLocaleString("es-CO")}
                  </p>
                </div>
                <Button size="sm" variant="tertiary" onPress={p.addSplitRow} isDisabled={p.processing}>
                  Agregar
                </Button>
              </div>

              {p.splitPayments.map((row) => (
                <div key={row.id} className="grid grid-cols-[1fr_120px_auto] gap-2 items-end">
                  <Select
                    label="Medio"
                    value={[row.method]}
                    onChange={(keys) => {
                      const next = Array.from(keys)[0] as typeof row.method | undefined;
                      if (next) p.updateSplitRow(row.id, { method: next });
                    }}
                  >
                    <Select.Trigger aria-label="Seleccionar opción"><Select.Value aria-label="Seleccionar opción" /><Select.Indicator aria-label="Seleccionar opción" /></Select.Trigger>
                    <Select.Popover aria-label="Seleccionar opción">
                      <ListBox>
                        {p.availablePaymentMethods.map((method) => (
                          <ListBox.Item key={method.code} textValue={method.label}>{method.label}</ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                  <Input
                    label="Valor"
                    size="sm"
                    type="number"
                    value={row.amount}
                    onChange={(e) => p.updateSplitRow(row.id, { amount: e.target.value })}
                  />
                  <Button size="sm" variant="ghost" color="danger"
                    isDisabled={p.splitPayments.length <= 2}
                    onPress={() => p.removeSplitRow(row.id)}>
                    Quitar
                  </Button>
                </div>
              ))}

              <div className={`rounded-lg p-3 text-sm font-semibold ${
                Math.abs(p.splitTotal - p.totalDue) <= 0.009
                  ? "bg-white text-emerald-700 border border-emerald-200"
                  : "bg-white text-amber-700 border border-amber-200"
              }`}>
                {Math.abs(p.splitTotal - p.totalDue) <= 0.009
                  ? "Pago dividido completo"
                  : `Falta por distribuir: $${p.splitRemaining.toLocaleString("es-CO")}`}
              </div>
              {p.splitCashReceived > p.totalDue ? (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg bg-white p-3 border border-teal-200">
                    <p className="text-xs uppercase text-slate-500">Cambio</p>
                    <p className="text-lg font-bold text-emerald-700 tabular-nums">${p.changeDue.toLocaleString("es-CO")}</p>
                  </div>
                  <div className="rounded-lg bg-white p-3 border border-teal-200">
                    <p className="text-xs uppercase text-slate-500">Vuelto</p>
                    <p className="text-lg font-bold text-emerald-700 tabular-nums">${p.changeDue.toLocaleString("es-CO")}</p>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <Button
            color="primary"
            size="lg"
            className="mt-5 h-14 w-full font-bold border border-default-200"
            isDisabled={!p.active || p.searching || p.processing || !!p.printWarning || p.isPaymentConfigMissing}
            isLoading={p.processing}
            onPress={() => void p.processExitAction()}
          >
            Registrar pago y salida
          </Button>

          {p.active && p.selectedPaymentMethod === "CASH" && (
            <div className="mt-6">
              <ChangeCalculator totalAmount={p.totalDue} />
            </div>
          )}

          {/* Secondary actions */}
          <div className="mt-6 pt-4 border-t border-slate-200 space-y-3">
            {p.allowTicketReprint && (
              <>
                <Input
                  value={p.reprintReason}
                  aria-label="Motivo de reimpresión"
                  onValueChange={p.setReprintReason}
                  className="w-full"
                  placeholder="Motivo reimpresion"
                />
                <Button
                  type="button"
                  disabled={!p.active || p.searching || p.processing}
                  onClick={() => void p.reprintTicket()}
                  variant="ghost"
                  data-testid="reprint-ticket"
                >
                  Reimprimir ticket
                </Button>
              </>
            )}

            <Input
              value={p.lostReason}
              aria-label="Motivo de ticket perdido"
              onValueChange={p.setLostReason}
              className="w-full"
              placeholder="Motivo ticket perdido"
            />
            <Button
              type="button"
              disabled={!p.active || p.searching || p.processing}
              onClick={() => void p.lostTicket()}
              variant="ghost"
              data-testid="lost-ticket"
            >
              Procesar ticket perdido
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
