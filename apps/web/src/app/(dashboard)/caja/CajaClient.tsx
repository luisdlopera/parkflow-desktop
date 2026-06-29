"use client";

import { useMemo } from "react";
import { Controller } from "react-hook-form";
import { ListBox, SearchField, useFilter, Tabs, Label, type Key } from "@heroui/react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@/components/bridge/Modal";
import { Autocomplete } from "@/components/bridge/Autocomplete";
import { Button } from "@/components/bridge/Button";
import { Input } from "@/components/bridge/Input";
import { TextArea } from "@/components/bridge/TextArea";
import DataTable, { type DataTableColumn } from "@/components/ui/DataTable";
import { CashSummaryTotals } from "./CashSummaryTotals";
import { CashAuditLog } from "./CashAuditLog";
import Badge from "@/components/bridge/Badge";
import { useDialog } from "@/providers/DialogProvider";
import { useCajaPage } from "@/features/cash-register/hooks/useCajaPage";
import StepProgress from "@/features/cash-register/components/StepProgress";
import SessionStatusCard from "@/features/cash-register/components/SessionStatusCard";
import ManualMovementForm from "@/features/cash-register/components/ManualMovementForm";
import MovementsPanel from "@/features/cash-register/components/MovementsPanel";
import ArqueoForm from "@/features/cash-register/components/ArqueoForm";
import CloseSessionPanel from "@/features/cash-register/components/CloseSessionPanel";
import type { CashMovementDto } from "@/lib/cash/cash-api";

function getStepColor(done: boolean, isCountPending: boolean, index: number): string {
  if (done) return "bg-emerald-500 text-default-50";
  if (isCountPending && index === 2) return "bg-blue-500 text-default-50";
  return "bg-default-200 text-default-400";
}

function CountDiffIndicator({
  countCash, countCard, countTransfer, countOther, expectedLedgerTotal,
}: {
  countCash: string; countCard: string; countTransfer: string; countOther: string;
  expectedLedgerTotal: number;
}) {
  const parsed =
    (Number(countCash.replace(",", ".")) || 0) +
    (Number(countCard.replace(",", ".")) || 0) +
    (Number(countTransfer.replace(",", ".")) || 0) +
    (Number(countOther.replace(",", ".")) || 0);
  const diff = parsed - expectedLedgerTotal;
  if (parsed === 0) return null;
  return (
    <div className={`mt-4 rounded-xl border px-4 py-3 text-sm ${diff === 0 ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
      <p>
        <strong>Total contado:</strong> ${parsed.toLocaleString()} &mdash;{" "}
        <strong>Esperado:</strong> ${expectedLedgerTotal.toLocaleString()}
        {diff !== 0 ? (
          <span className="font-semibold"> &mdash; <strong>Diferencia:</strong> {diff > 0 ? "+" : ""}${diff.toLocaleString()}
            <span className="ml-1 text-amber-700">(requiere observaciones)</span>
          </span>
        ) : (
          <span className="text-emerald-700 font-semibold"> &mdash; Coincide ✓</span>
        )}
      </p>
    </div>
  );
}

const SESSION_STEPS = [
  { label: "Abrir" },
  { label: "Movimientos" },
  { label: "Arqueo" },
  { label: "Cerrar" },
];

export default function CajaClient() {
  const { confirm } = useDialog();
  const { contains } = useFilter({ sensitivity: "base" });
  const p = useCajaPage();

  const movementColumns = useMemo<DataTableColumn<CashMovementDto>[]>(
    () => [
      { key: "createdAt", label: "Fecha", render: (m) => new Date(m.createdAt).toLocaleString() },
      { key: "movementType", label: "Tipo" },
      { key: "paymentMethod", label: "Medio" },
      { key: "amount", label: "Valor", align: "right" },
      { key: "registrar", label: "Registra", render: (m) => m.createdByName ?? m.createdById?.slice(0, 8) },
      { key: "terminal", label: "Equipo", render: (m) => m.terminal ?? "—" },
      { key: "status", label: "Estado" },
      {
        key: "actions",
        label: "Acciones",
        render: (m) =>
          m.status === "POSTED" && m.movementType !== "VOID_OFFSET" && p.perms.canVoid ? (
            <Button size="sm" variant="tertiary" color="danger" onPress={() => p.setVoidTarget(m.id)}>
              Anular
            </Button>
          ) : null,
      },
    ],
    [p],
  );

  const filterConfig = useMemo(() => [
    {
      key: "filterType",
      label: "Filtrar por tipo",
      type: "select" as const,
      options: [
        { label: "Todos los tipos", value: "" },
        { label: "Cobro parqueo", value: "PARKING_PAYMENT" },
        { label: "Ingreso manual", value: "MANUAL_INCOME" },
        { label: "Egreso manual", value: "MANUAL_EXPENSE" },
        { label: "Retiro / Transferencia a Tesorería", value: "WITHDRAWAL" },
        { label: "Devolucion al cliente", value: "CUSTOMER_REFUND" },
        { label: "Descuento", value: "DISCOUNT" },
        { label: "Ajuste", value: "ADJUSTMENT" },
        { label: "Cobro ticket perdido", value: "LOST_TICKET_PAYMENT" },
        { label: "Reimpresion cobrada", value: "REPRINT_FEE" },
        { label: "Contrapartida anulacion", value: "VOID_OFFSET" },
      ],
    },
    {
      key: "filterMethod",
      label: "Filtrar por medio",
      type: "select" as const,
      options: [
        { label: "Todos los medios", value: "" },
        { label: "Efectivo", value: "CASH" },
        { label: "Tarjeta débito", value: "DEBIT_CARD" },
        { label: "Tarjeta crédito", value: "CREDIT_CARD" },
        { label: "Tarjeta legacy", value: "CARD" },
        { label: "QR", value: "QR" },
        { label: "Nequi", value: "NEQUI" },
        { label: "Daviplata", value: "DAVIPLATA" },
        { label: "Transferencia", value: "TRANSFER" },
        { label: "Convenio", value: "AGREEMENT" },
        { label: "Crédito interno", value: "INTERNAL_CREDIT" },
        { label: "Otro", value: "OTHER" },
        { label: "Mixto", value: "MIXED" },
      ],
    },
  ], []);

  const handleFilterChange = (values: Record<string, string>) => {
    if (values.filterType !== undefined) p.setFilterType(values.filterType);
    if (values.filterMethod !== undefined) p.setFilterMethod(values.filterMethod);
  };

  // stepsState replaced by StepProgress component

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-amber-700/80">Caja</p>
        <h1 className="text-2xl sm:text-3xl font-semibold text-foreground">Cierre de caja</h1>
        {p.outboxCount > 0 ? (
          <div className="mt-2 rounded-xl border border-red-400 bg-red-100 px-4 py-3 text-red-900">
            <p className="font-bold uppercase text-red-800">¡Alerta de Sincronización!</p>
            <p className="mt-1">
              Tiene <strong>{p.outboxCount}</strong> movimiento(s) pendiente(s) de sincronizar.
              <strong> No podrá cerrar la caja hasta que se restablezca la conexión.</strong>
            </p>
          </div>
        ) : null}

      </div>

      {/* Error banner */}
      {p.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{p.error}</div>
      ) : null}

      {/* Terminal selector — hide when only 1 register */}
      {p.registerRows.length !== 1 ? (
        <div className={`grid gap-4 grid-cols-1 items-end ${p.siteCount > 1 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
          {p.siteCount > 1 && (
            <Input label="Sede" size="sm" value={p.site} onChange={(e) => p.setSite(e.target.value)} isDisabled={p.closed} />
          )}
          <div className="flex flex-col gap-2">
            {p.registerRows.length > 0 && (
              <Autocomplete
                placeholder="Seleccionar terminal"
                selectionMode="single"
                value={p.registerRows.some((r) => r.terminal === p.terminal) ? p.terminal : null}
                onChange={(key: Key | null) => p.setTerminal(key as string)}
                isDisabled={p.closed}
              >
                <Label>Terminal / caja</Label>
                <Autocomplete.Trigger>
                  <Autocomplete.Value /><Autocomplete.ClearButton /><Autocomplete.Indicator />
                </Autocomplete.Trigger>
                <Autocomplete.Popover>
                  <Autocomplete.Filter filter={contains}>
                    <SearchField autoFocus name="search" variant="secondary" aria-label="Buscar terminal">
                      <SearchField.Group>
                        <SearchField.SearchIcon />
                        <SearchField.Input placeholder="Buscar terminal..." />
                        <SearchField.ClearButton />
                      </SearchField.Group>
                    </SearchField>
                    <ListBox>
                      {p.registerRows.map((r) => (
                        <ListBox.Item key={r.terminal} id={r.terminal} textValue={r.terminal}>
                          {(r.label ?? r.terminal) + ` (${r.terminal})`}
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Autocomplete.Filter>
                </Autocomplete.Popover>
              </Autocomplete>
            )}
          </div>
          {p.terminal && (
            <div className="text-sm space-y-1">
              <p className="text-default-500">Terminal configurada</p>
              <p className="font-semibold text-foreground">{p.terminal}</p>
              <p className="text-xs text-default-400">Editar desde Configuración › Cajas</p>
            </div>
          )}
          <Button variant="solid" color="primary" className="font-semibold h-[48px] w-full"
            onPress={() => { p.reload().catch(() => {}); }} isLoading={p.busy}>
            Actualizar
          </Button>
        </div>
      ) : null}

      {/* No session — show status + open form */}
      <div className={`grid gap-4 sm:gap-6 grid-cols-1 ${p.session ? "" : "lg:grid-cols-2"}`}>
        {!p.session || !p.isOpen ? (
          <div className="surface rounded-2xl p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-foreground">Estado actual</h2>
            {p.loading ? (
              <p className="mt-4 text-sm text-default-600">Cargando...</p>
            ) : !p.session ? (
              <div className="mt-4 text-sm text-default-600">
                <p>No hay una caja abierta en este terminal.</p>
                <p className="mt-2">Para operar caja: ingresa el monto inicial y presiona <strong>Abrir caja</strong>.</p>
              </div>
              ) : (
               <SessionStatusCard p={p} />
              )}
          </div>
        ) : null}

        {!p.session ? (
          <div className="surface rounded-2xl p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-foreground">Abrir caja</h2>
            <p className="mt-2 text-sm text-default-600">Requiere permiso de apertura y terminal configurado.</p>
            <div className="mt-4">
              <Input
                label="Monto inicial"
                data-testid="initial-amount"
                aria-label="Monto inicial"
                className="mt-1 w-full"
                value={p.openAmount}
                onValueChange={(val) => p.setOpenAmount(val)}
                isDisabled={p.busy || !!p.session}
              />
            </div>
            <div className="mt-4">
              <Button className="w-full font-bold" color="primary" size="lg"
                isDisabled={p.busy || !!p.session || !p.perms.canOpen}
                isLoading={p.busy}
                onPress={() => { p.onOpen().catch(() => {}); }}>
                Abrir caja
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Open session — tabs */}
      {p.isOpen ? (
        <>
          <div className="surface rounded-2xl p-4 sm:p-6 mt-4">
            <h2 className="text-lg font-semibold text-foreground">Estado actual</h2>
            <SessionStatusCard p={p} />
          </div>

          <Tabs className="w-full mt-6">
            <Tabs.ListContainer>
              <Tabs.List aria-label="Opciones de caja" className="w-full sm:w-fit overflow-x-auto">
                <Tabs.Tab id="movimientos">Movimientos<Tabs.Indicator /></Tabs.Tab>
                <Tabs.Tab id="arqueos">Arqueos<Tabs.Indicator /></Tabs.Tab>
                {p.perms.canClose && <Tabs.Tab id="cierre">Cierre<Tabs.Indicator /></Tabs.Tab>}
              </Tabs.List>
            </Tabs.ListContainer>

            {/* Movimientos tab */}
            <Tabs.Panel id="movimientos" className="pt-4">
              <div className="surface rounded-2xl p-4 sm:p-6 mt-4">
                <h2 className="text-lg font-semibold text-foreground">Movimientos</h2>
                <DataTable<CashMovementDto> 
                  columns={movementColumns} 
                  rows={p.movements} 
                  filters={filterConfig}
                  onFilterChange={handleFilterChange}
                />
                {p.movements.length === 0 && p.isOpen ? (
                  <p className="mt-3 text-xs text-default-500 text-center">
                    No hay movimientos registrados en esta sesión.
                  </p>
                ) : null}

                <ManualMovementForm p={p} contains={contains} />
              </div>
            </Tabs.Panel>

            {/* Arqueos tab */}
            <Tabs.Panel id="arqueos" className="pt-4">
              <ArqueoForm p={p} />
            </Tabs.Panel>

            {/* Cierre tab */}
            {p.perms.canClose && (
              <Tabs.Panel id="cierre" className="pt-4">
                <CloseSessionPanel p={p} confirm={confirm} />
              </Tabs.Panel>
            )}
          </Tabs>
        </>
      ) : null}

      {p.isOpen && !p.perms.canClose ? (
        <p className="mt-6 text-xs text-default-500 italic">
          No tienes permiso para cerrar la caja. Solicita el permiso <strong>cierres_caja:cerrar</strong>.
        </p>
      ) : null}

      {/* Closed session — print closing */}
      {p.closed && p.session ? (
        <div className="surface rounded-2xl p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-foreground">Caja cerrada</h2>
          <p className="mt-2 text-sm text-default-600">Imprima el comprobante de cierre para archivo.</p>
          <div className="mt-6 w-full sm:max-w-md">
            <Button className="w-full font-bold" color="primary"
              isDisabled={p.busy} isLoading={p.busy}
              onPress={() => { p.onPrintClosing().catch(() => {}); }}>
              Imprimir cierre
            </Button>
          </div>
        </div>
      ) : null}

      {/* Shift change modal */}
      <Modal state={{ isOpen: p.showShiftChangeModal, setOpen: (v: boolean) => { if (!v) p.setShowShiftChangeModal(false); }, open: () => {}, close: () => p.setShowShiftChangeModal(false), toggle: () => {} }}>
        <Modal.Content>
          <Modal.Header>Cambio de turno</Modal.Header>
          <Modal.Body>
            <p className="text-sm text-default-600 mb-4">Se cerrará la caja actual y se dejará lista para el siguiente operador.</p>
            <Controller name="nextOpenAmount" control={p.shiftForm.control}
              render={({ field }) => <Input label="Monto base para siguiente turno" type="number" {...field} />}
            />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="ghost" onPress={() => p.setShowShiftChangeModal(false)}>Cancelar</Button>
            <Button color="primary" isLoading={p.busy} onPress={() => { p.onShiftChange().catch(() => {}); }}>
              Confirmar Cambio
            </Button>
          </Modal.Footer>
        </Modal.Content>
      </Modal>

      {/* Void movement modal */}
      {(() => {
        const movToVoid = p.voidTarget ? p.movements.find((m) => m.id === p.voidTarget) : null;
        const TYPE_LABEL: Record<string, string> = {
          PARKING_PAYMENT: "Cobro parqueo",
          MANUAL_INCOME: "Ingreso manual",
          MANUAL_EXPENSE: "Egreso manual",
          WITHDRAWAL: "Retiro / Transferencia",
          CUSTOMER_REFUND: "Devolución al cliente",
          DISCOUNT: "Descuento",
          ADJUSTMENT: "Ajuste",
          LOST_TICKET_PAYMENT: "Cobro ticket perdido",
          REPRINT_FEE: "Reimpresión cobrada",
        };
        return (
          <Modal state={{ isOpen: !!p.voidTarget, setOpen: (v: boolean) => { if (!v) p.setVoidTarget(null); }, open: () => {}, close: () => p.setVoidTarget(null), toggle: () => {} }}>
            <Modal.Content>
              <Modal.Header>Anular movimiento</Modal.Header>
              <Modal.Body>
                {movToVoid && (
                  <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                    <p className="font-semibold mb-1">Vas a anular:</p>
                    <p>{TYPE_LABEL[movToVoid.movementType] ?? movToVoid.movementType} — <strong>${movToVoid.amount.toLocaleString()}</strong> ({movToVoid.paymentMethod})</p>
                    <p className="text-xs text-rose-600 mt-1">Esta acción genera una contrapartida contable y no se puede deshacer.</p>
                  </div>
                )}
                <p className="text-sm text-default-600 mb-2">Motivo obligatorio (auditoría).</p>
                <Controller name="voidReason" control={p.voidForm.control}
                  render={({ field }) => (
                    <TextArea label="Motivo" placeholder="Describa la razón de la anulación..." {...field} />
                  )}
                />
              </Modal.Body>
              <Modal.Footer>
                <Button variant="ghost" color="primary" onPress={() => p.setVoidTarget(null)}>Cancelar</Button>
                <Button color="danger" isLoading={p.busy} onPress={() => { p.onVoid().catch(() => {}); }}>
                  Confirmar anulación
                </Button>
              </Modal.Footer>
            </Modal.Content>
          </Modal>
        );
      })()}
    </div>
  );
}
