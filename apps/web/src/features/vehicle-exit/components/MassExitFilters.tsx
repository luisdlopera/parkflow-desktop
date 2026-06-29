"use client";

import { Input } from "@/components/bridge/Input";
import { Button } from "@/components/bridge/Button";
import { Select } from "@/components/bridge/Select";
import { ListBox } from "@heroui/react";
import { Search, AlertCircle } from "lucide-react";
import type { UseMassExitReturn } from "../hooks/useMassExit";

const VEHICLE_TYPES = [
  { code: "", label: "Todos los tipos" },
  { code: "AUTO", label: "Automóvil" },
  { code: "MOTO", label: "Motocicleta" },
  { code: "CAMION", label: "Camión" },
  { code: "BUS", label: "Bus" },
  { code: "BICICLETA", label: "Bicicleta" },
];

const PAYMENT_METHODS = [
  { code: "CASH", label: "Efectivo" },
  { code: "CARD", label: "Tarjeta" },
  { code: "QR", label: "QR" },
  { code: "NEQUI", label: "Nequi" },
  { code: "TRANSFER", label: "Transferencia" },
];

type Props = Pick<
  UseMassExitReturn,
  | "filters"
  | "setFilters"
  | "chargeMode"
  | "setChargeMode"
  | "customAmount"
  | "setCustomAmount"
  | "reason"
  | "setReason"
  | "paymentMethod"
  | "setPaymentMethod"
  | "isPreviewing"
  | "previewError"
  | "handlePreview"
>;

export function MassExitFilters({
  filters,
  setFilters,
  chargeMode,
  setChargeMode,
  customAmount,
  setCustomAmount,
  reason,
  setReason,
  paymentMethod,
  setPaymentMethod,
  isPreviewing,
  previewError,
  handlePreview,
}: Props) {
  const canPreview = reason.trim().length > 0;

  return (
    <div className="space-y-6">
      {/* Filters section */}
      <div className="border border-default-200 rounded-xl p-5 space-y-4">
        <h2 className="text-base font-semibold text-default-700">Filtros de vehículos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Select
            label="Tipo de vehículo"
            value={[filters.vehicleTypeCode]}
            onChange={(keys: any) =>
              setFilters((f) => ({ ...f, vehicleTypeCode: String(Array.from(keys)[0] ?? "") }))
            }
          >
            <Select.Trigger aria-label="Seleccionar opción"><Select.Value aria-label="Seleccionar opción" /><Select.Indicator aria-label="Seleccionar opción" /></Select.Trigger>
            <Select.Popover aria-label="Seleccionar opción">
              <ListBox>
                {VEHICLE_TYPES.map((t) => (
                  <ListBox.Item key={t.code} textValue={t.label}>{t.label}</ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>

          <Input
            label="Sede / Zona"
            placeholder="Ej: NORTE, PISO_2"
            value={filters.siteCode}
            onChange={(e) =>
              setFilters((f) => ({ ...f, siteCode: e.target.value }))
            }
          />

          <Input
            label="Entrada desde"
            type="datetime-local"
            value={filters.entryFrom}
            onChange={(e) =>
              setFilters((f) => ({ ...f, entryFrom: e.target.value }))
            }
          />

          <Input
            label="Entrada hasta"
            type="datetime-local"
            value={filters.entryTo}
            onChange={(e) =>
              setFilters((f) => ({ ...f, entryTo: e.target.value }))
            }
          />
        </div>
      </div>

      {/* Operation settings */}
      <div className="border border-default-200 rounded-xl p-5 space-y-4">
        <h2 className="text-base font-semibold text-default-700">Configuración de la operación</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Select
            label="Modo de cobro"
            value={[chargeMode]}
            onChange={(keys: any) => setChargeMode(String(Array.from(keys)[0] ?? "NORMAL") as typeof chargeMode)}
          >
            <Select.Trigger aria-label="Seleccionar opción"><Select.Value aria-label="Seleccionar opción" /><Select.Indicator aria-label="Seleccionar opción" /></Select.Trigger>
            <Select.Popover aria-label="Seleccionar opción">
              <ListBox>
                <ListBox.Item key="NORMAL" textValue="Cobro normal">Cobro normal</ListBox.Item>
                <ListBox.Item key="FREE" textValue="Sin cobro (exoneración)">Sin cobro (exoneración)</ListBox.Item>
                <ListBox.Item key="CUSTOM" textValue="Valor personalizado">Valor personalizado</ListBox.Item>
              </ListBox>
            </Select.Popover>
          </Select>

          {chargeMode === "CUSTOM" && (
            <Input
              label="Valor personalizado ($)"
              type="number"
              min={0}
              value={customAmount !== undefined ? String(customAmount) : ""}
              onChange={(e) =>
                setCustomAmount(e.target.value ? Number(e.target.value) : undefined)
              }
            />
          )}

          {chargeMode !== "FREE" && (
            <Select
              label="Medio de pago"
              value={[paymentMethod]}
              onChange={(keys: any) => setPaymentMethod(String(Array.from(keys)[0] ?? "CASH"))}
            >
              <Select.Trigger aria-label="Seleccionar opción"><Select.Value aria-label="Seleccionar opción" /><Select.Indicator aria-label="Seleccionar opción" /></Select.Trigger>
              <Select.Popover aria-label="Seleccionar opción">
                <ListBox>
                  {PAYMENT_METHODS.map((m) => (
                    <ListBox.Item key={m.code} textValue={m.label}>{m.label}</ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          )}
        </div>

        <Input
          label="Motivo de la operación"
          placeholder="Ej: Cierre de operación jornada nocturna"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          isRequired
          description="Obligatorio. Se registra en el log de auditoría."
          isInvalid={reason.length === 0}
        />
      </div>

      {previewError && (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {previewError}
        </div>
      )}

      <div className="flex justify-end">
        <Button
          color="primary"
          onPress={handlePreview}
          isLoading={isPreviewing}
          isDisabled={!canPreview || isPreviewing}
          startContent={!isPreviewing ? <Search className="w-4 h-4" /> : undefined}
        >
          {isPreviewing ? "Calculando..." : "Calcular candidatos"}
        </Button>
      </div>
    </div>
  );
}
