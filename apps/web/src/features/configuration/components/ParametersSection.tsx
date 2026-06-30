"use client";
import { ListBox } from "@heroui/react";
import { Select } from "@/components/bridge/Select";
import { Button } from "@/components/bridge/Button";
import { Checkbox } from "@/components/bridge/Checkbox";
import { Input } from "@/components/bridge/Input";
import { TextArea } from "@/components/bridge/TextArea";
import { useState, useEffect, useCallback, ChangeEvent as ReactChangeEvent } from "react";
import {
  fetchParameters,
  putParameters,
  resetParameters,
  validateParameters,
  type ParkingParametersPayload
} from "@/lib/api/parameters-api";
import { errorService } from "@/lib/errors/error-service";
import { useDialog } from "@/providers/DialogProvider";
import { LOST_TICKET_POLICIES } from "@/features/configuration/constants";

interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function Field({ label, value, onChange }: FieldProps) {
  return (
    <Input
      label={label}
      size="sm"
      value={value}
      onChange={(e: ReactChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
    />
  );
}

export default function ParametersSection({
  canEdit,
  onNotify,
  auditReason
}: {
  canEdit: boolean;
  onNotify: (n: { kind: "ok" | "err" | "info"; text: string } | null) => void;
  auditReason: string;
}) {
  const [paramSite, setParamSite] = useState("DEFAULT");
  const { confirm } = useDialog();
  const [data, setData] = useState<ParkingParametersPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await fetchParameters(paramSite.trim() || "DEFAULT"));
    } catch (e) {
      setError(errorService.normalize(e).message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [paramSite]);

  useEffect(() => { load().catch(() => {}); }, [load]);

  if (loading && !data) return <p className="text-sm text-default-500">Cargando parametros...</p>;
  if (error && !data) return <p className="text-sm text-rose-700">{error}</p>;
  if (!data) return <p className="text-sm text-default-600">Sin datos.</p>;

  const setField = (k: keyof ParkingParametersPayload, v: string | number | boolean | undefined) => {
    setData((d) => ({ ...(d ?? {}) as ParkingParametersPayload, [k]: v }));
  };
  const setOptionalNumber = (k: keyof ParkingParametersPayload, v: string) => {
    setField(k, v.trim() === "" ? undefined : Number(v.replace(",", ".")));
  };

  return (
    <div className="space-y-4">
      <div className="surface rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Parametros del parqueadero</h2>
        <div className="flex flex-wrap items-end gap-3 border-b border-default-100 pb-4">
          <Input
            label="Codigo de sede (persistencia)"
            size="sm"
            className="max-w-xs"
            value={paramSite}
            onChange={(e) => setParamSite(e.target.value)}
            placeholder="DEFAULT"
          />
          <Button variant="outline" color="primary" size="md" className="font-semibold" onPress={() => { load().catch(() => {}); }} isLoading={loading}>
            Cargar sede
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Field label="Nombre comercial" value={data.parkingName ?? ""} onChange={(v: string) => setField("parkingName", v)} />
          <Field label="NIT" value={data.taxId ?? ""} onChange={(v: string) => setField("taxId", v)} />
          <Field label="DV NIT" value={data.taxIdCheckDigit ?? ""} onChange={(v: string) => setField("taxIdCheckDigit", v)} />
          <Field label="Razon social (FE / tributario)" value={data.businessLegalName ?? ""} onChange={(v: string) => setField("businessLegalName", v)} />
          <Field label="Direccion" value={data.address ?? ""} onChange={(v: string) => setField("address", v)} />
          <Field label="Moneda" value={data.currency ?? ""} onChange={(v: string) => setField("currency", v)} />
          <Field label="Zona horaria" value={data.timeZone ?? ""} onChange={(v: string) => setField("timeZone", v)} />
          <Field label="Impuesto" value={data.taxName ?? ""} onChange={(v: string) => setField("taxName", v)} />
          <Field
            label="Impuesto (%)"
            value={data.taxRatePercent != null ? String(data.taxRatePercent) : ""}
            onChange={(v: string) => setOptionalNumber("taxRatePercent", v)}
          />
          <div className="flex items-center py-2">
            <Checkbox isSelected={data.pricesIncludeTax ?? true} onChange={(v: boolean) => setField("pricesIncludeTax", v)}>
              Tarifas incluyen impuesto
            </Checkbox>
          </div>
          <Field
            label="Minutos de gracia (defecto)"
            value={String(data.graceMinutesDefault ?? "")}
            onChange={(v: string) => setOptionalNumber("graceMinutesDefault", v)}
          />
          <Select
            label="Politica ticket perdido"
            value={[data.lostTicketPolicy ?? "SURCHARGE_RATE"]}
            onChange={(keys: Set<string | number | boolean | null | undefined>) => setField("lostTicketPolicy", Array.from(keys)[0] as string)}
          >
            <Select.Trigger aria-label="Seleccionar opción"><Select.Value aria-label="Seleccionar opción" /><Select.Indicator aria-label="Seleccionar opción" /></Select.Trigger>
            <Select.Popover aria-label="Seleccionar opción">
              <ListBox>
                {LOST_TICKET_POLICIES.map((p) => (
                  <ListBox.Item key={p.value} textValue={p.label}>{p.label}</ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
          <div className="flex flex-col gap-4 py-2">
            <Checkbox isSelected={Boolean(data.allowReprint)} onChange={(v: boolean) => setField("allowReprint", v)}>
              Permitir reimpresion
            </Checkbox>
            <Checkbox isSelected={Boolean(data.offlineModeEnabled)} onChange={(v: boolean) => setField("offlineModeEnabled", v)}>
              Modo offline habilitado
            </Checkbox>
          </div>
          <Field label="Max reimpresiones" value={String(data.maxReprints ?? "")} onChange={(v: string) => setOptionalNumber("maxReprints", v)} />
          <Field label="Prefijo ticket" value={data.ticketPrefix ?? ""} onChange={(v: string) => setField("ticketPrefix", v)} />
          <Field label="Formato ticket" value={data.ticketFormat ?? ""} onChange={(v: string) => setField("ticketFormat", v)} />
          <Field label="Ancho papel (mm)" value={String(data.defaultPaperWidthMm ?? "")} onChange={(v: string) => setOptionalNumber("defaultPaperWidthMm", v)} />
          <Field label="Impresora por defecto" value={data.defaultPrinterName ?? ""} onChange={(v: string) => setField("defaultPrinterName", v)} />
          <Field label="Intervalo sync (seg)" value={String(data.syncIntervalSeconds ?? "")} onChange={(v: string) => setOptionalNumber("syncIntervalSeconds", v)} />
          <Field label="Timeout impresion (seg)" value={String(data.printTimeoutSeconds ?? "")} onChange={(v: string) => setOptionalNumber("printTimeoutSeconds", v)} />
          <Field label="QR / codigo" value={data.qrConfig ?? ""} onChange={(v: string) => setField("qrConfig", v)} />

          <div className="col-span-full grid gap-4 border-t border-default-100 pt-6 md:grid-cols-2">
            <TextArea label="Mensaje encabezado ticket" size="sm" minRows={2} value={data.ticketHeaderMessage ?? ""} onChange={(e: ReactChangeEvent<HTMLTextAreaElement>) => setField("ticketHeaderMessage", e.target.value)} />
            <TextArea label="Mensaje pie ticket" size="sm" minRows={2} value={data.ticketFooterMessage ?? ""} onChange={(e: ReactChangeEvent<HTMLTextAreaElement>) => setField("ticketFooterMessage", e.target.value)} />
            <TextArea label="Mensaje legal ticket" size="sm" minRows={3} value={data.ticketLegalMessage ?? ""} onChange={(e: ReactChangeEvent<HTMLTextAreaElement>) => setField("ticketLegalMessage", e.target.value)} />
            <TextArea label="Reglas de operacion" size="sm" minRows={3} value={data.operationRulesMessage ?? ""} onChange={(e: ReactChangeEvent<HTMLTextAreaElement>) => setField("operationRulesMessage", e.target.value)} />
          </div>

          <div className="flex flex-col gap-4 py-2">
            <Checkbox isSelected={Boolean(data.manualExitAllowed)} onChange={(v: boolean) => setField("manualExitAllowed", v)}>Salida manual permitida</Checkbox>
            <Checkbox isSelected={Boolean(data.allowOfflineEntryExit)} onChange={(v: boolean) => setField("allowOfflineEntryExit", v)}>Operacion offline ingreso/salida</Checkbox>
            <Checkbox isSelected={Boolean(data.printExitTicket ?? true)} onChange={(v: boolean) => setField("printExitTicket", v)}>Imprimir tiquete de salida</Checkbox>
          </div>

          <div className="col-span-full pt-6 border-t border-default-100 mt-2">
            <p className="text-xs font-bold uppercase tracking-wider text-default-600 mb-1">Facturacion electronica Colombia (DIAN)</p>
            <p className="text-xs text-default-500 mb-4 max-w-3xl leading-relaxed">
              Estos datos aparecen en el comprobante de cierre tipo Z termico y documentacion soporte. CUFE, firma XAdES y envio XML a la DIAN requieren PSC certificado; aqui solo se guardan parametros de autorizacion y numeracion por sede.
            </p>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Field label="Prefijo autorizado (ej. SETP)" value={data.dianInvoicePrefix ?? ""} onChange={(v: string) => setField("dianInvoicePrefix", v)} />
              <Field label="No. resolucion DIAN" value={data.dianResolutionNumber ?? ""} onChange={(v: string) => setField("dianResolutionNumber", v)} />
              <Field label="Fecha resolucion (YYYY-MM-DD)" value={data.dianResolutionDate ?? ""} onChange={(v: string) => setField("dianResolutionDate", v)} />
              <Field label="Rango desde (consecutivo)" value={data.dianRangeFrom ?? ""} onChange={(v: string) => setField("dianRangeFrom", v)} />
              <Field label="Rango hasta (consecutivo)" value={data.dianRangeTo ?? ""} onChange={(v: string) => setField("dianRangeTo", v)} />
              <div className="sm:col-span-2 lg:col-span-3">
                <TextArea label="Clave tecnica (opcional)" size="sm" minRows={2} placeholder="Si su PSC solicita persistirla en sede..." value={data.dianTechnicalKey ?? ""} onChange={(e: ReactChangeEvent<HTMLTextAreaElement>) => setField("dianTechnicalKey", e.target.value)} />
              </div>
            </div>
          </div>

          <div className="col-span-full pt-6 border-t border-default-100 mt-2">
            <p className="text-xs font-bold uppercase tracking-wider text-default-600 mb-1">Integracion PSC (cierre caja)</p>
            <p className="text-xs text-default-500 mb-4 max-w-3xl leading-relaxed">
              Consecutivos y webhook se aplican cuando se ejecuta cerrar caja (commit). El servidor envia POST JSON con evento parkflow.cash.closed.v1; el PSC debe responder 2xx sin bloquear al cajero.
            </p>
            <div className="flex flex-wrap gap-x-10 gap-y-3 py-1">
              <Checkbox isSelected={Boolean(data.cashFeSequentialEnabled)} onChange={(v: boolean) => setData((d) => ({ ...(d ?? {}) as ParkingParametersPayload, cashFeSequentialEnabled: v }))}>
                Consecutivo soporte al cierre
              </Checkbox>
              <Checkbox isSelected={Boolean(data.cashFeSequencePerTerminal)} onChange={(v: boolean) => setData((d) => ({ ...(d ?? {}) as ParkingParametersPayload, cashFeSequencePerTerminal: v }))}>
                Llave correlativa por terminal
              </Checkbox>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-4">
              <Field
                label="Digitos consecutivo (6–13)"
                value={data.cashFeSequenceDigits != null ? String(data.cashFeSequenceDigits) : ""}
                onChange={(v: string) =>
                  setData((d) => ({
                    ...(d ?? {}) as ParkingParametersPayload,
                    cashFeSequenceDigits: v.trim() === "" ? undefined : Number(v.replace(",", "."))
                  }))
                }
              />
              <div className="lg:col-span-2">
                <Field label="Webhook URL PSC" value={data.cashFeOutboundWebhookUrl ?? ""} onChange={(v: string) => setField("cashFeOutboundWebhookUrl", v)} />
              </div>
            </div>
            <div className="mt-4">
              <TextArea label="Webhook Authorization (Bearer opcional)" size="sm" minRows={2} placeholder="Ej. Bearer eyJ..." value={data.cashFeOutboundWebhookBearer ?? ""} onChange={(e: ReactChangeEvent<HTMLTextAreaElement>) => setField("cashFeOutboundWebhookBearer", e.target.value)} />
            </div>
          </div>

          <div className="col-span-full pt-4">
            <p className="text-xs font-bold uppercase tracking-wider text-default-500 mb-4">Politica de caja (override por sede)</p>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Select
                label="Cobro exige caja abierta"
                value={[data.cashRequireOpenForPayment === undefined ? "" : String(data.cashRequireOpenForPayment)]}
                onChange={(keys: Set<string | number | boolean | null | undefined>) => {
                  const v = Array.from(keys)[0] as string;
                  setData((d) => ({ ...(d ?? {}) as ParkingParametersPayload, cashRequireOpenForPayment: v === "" ? null : v === "true" }));
                }}
              >
                <Select.Trigger aria-label="Seleccionar opción"><Select.Value aria-label="Seleccionar opción" /><Select.Indicator aria-label="Seleccionar opción" /></Select.Trigger>
                <Select.Popover aria-label="Seleccionar opción">
                  <ListBox>
                    <ListBox.Item key="" textValue="Heredar servidor (app.cash)">Heredar servidor (app.cash)</ListBox.Item>
                    <ListBox.Item key="true" textValue="Si, exigir">Si, exigir</ListBox.Item>
                    <ListBox.Item key="false" textValue="No exigir">No exigir</ListBox.Item>
                  </ListBox>
                </Select.Popover>
              </Select>
              <Select
                label="Permitir cierre de caja offline"
                value={[data.cashOfflineCloseAllowed === undefined ? "" : String(data.cashOfflineCloseAllowed)]}
                onChange={(keys: Set<string | number | boolean | null | undefined>) => {
                  const v = Array.from(keys)[0] as string;
                  setData((d) => ({ ...(d ?? {}) as ParkingParametersPayload, cashOfflineCloseAllowed: v === "" ? null : v === "true" }));
                }}
              >
                <Select.Trigger aria-label="Seleccionar opción"><Select.Value aria-label="Seleccionar opción" /><Select.Indicator aria-label="Seleccionar opción" /></Select.Trigger>
                <Select.Popover aria-label="Seleccionar opción">
                  <ListBox>
                    <ListBox.Item key="" textValue="Heredar servidor">Heredar servidor</ListBox.Item>
                    <ListBox.Item key="true" textValue="Permitir">Permitir</ListBox.Item>
                    <ListBox.Item key="false" textValue="No permitir">No permitir</ListBox.Item>
                  </ListBox>
                </Select.Popover>
              </Select>
              <Field
                label="Tope manual offline (COP)"
                value={data.cashOfflineMaxManualMovement != null && !Number.isNaN(data.cashOfflineMaxManualMovement) ? String(data.cashOfflineMaxManualMovement) : ""}
                onChange={(v: string) =>
                  setData((d) => ({
                    ...(d ?? {}) as ParkingParametersPayload,
                    cashOfflineMaxManualMovement: v.trim() === "" ? null : Number(v.replace(",", "."))
                  }))
                }
              />
              <Select
                label="Múltiples cajas abiertas"
                value={[data.cashAllowMultipleOpenSessions === undefined ? "" : String(data.cashAllowMultipleOpenSessions)]}
                onChange={(keys: Set<React.Key>) => {
                  const v = Array.from(keys)[0] as string;
                  setData((d) => ({ ...(d ?? {}) as ParkingParametersPayload, cashAllowMultipleOpenSessions: v === "" ? null : v === "true" }));
                }}
              >
                <Select.Trigger aria-label="Seleccionar opción"><Select.Value aria-label="Seleccionar opción" /><Select.Indicator aria-label="Seleccionar opción" /></Select.Trigger>
                <Select.Popover aria-label="Seleccionar opción">
                  <ListBox>
                    <ListBox.Item key="" textValue="Heredar servidor">Heredar servidor</ListBox.Item>
                    <ListBox.Item key="true" textValue="Permitir">Permitir</ListBox.Item>
                    <ListBox.Item key="false" textValue="No permitir">No permitir</ListBox.Item>
                  </ListBox>
                </Select.Popover>
              </Select>
              <Select
                label="Más de una caja por usuario"
                value={[data.cashAllowMultipleSessionsPerUser === undefined ? "" : String(data.cashAllowMultipleSessionsPerUser)]}
                onChange={(keys: Set<React.Key>) => {
                  const v = Array.from(keys)[0] as string;
                  setData((d) => ({ ...(d ?? {}) as ParkingParametersPayload, cashAllowMultipleSessionsPerUser: v === "" ? null : v === "true" }));
                }}
              >
                <Select.Trigger aria-label="Seleccionar opción"><Select.Value aria-label="Seleccionar opción" /><Select.Indicator aria-label="Seleccionar opción" /></Select.Trigger>
                <Select.Popover aria-label="Seleccionar opción">
                  <ListBox>
                    <ListBox.Item key="" textValue="Heredar servidor">Heredar servidor</ListBox.Item>
                    <ListBox.Item key="true" textValue="Permitir">Permitir</ListBox.Item>
                    <ListBox.Item key="false" textValue="No permitir">No permitir</ListBox.Item>
                  </ListBox>
                </Select.Popover>
              </Select>
              <Field
                label="Límite ajuste manual (COP)"
                value={data.cashMaxManualAdjustment != null && !Number.isNaN(data.cashMaxManualAdjustment) ? String(data.cashMaxManualAdjustment) : ""}
                onChange={(v: string) =>
                  setData((d) => ({
                    ...(d ?? {}) as ParkingParametersPayload,
                    cashMaxManualAdjustment: v.trim() === "" ? null : Number(v.replace(",", "."))
                  }))
                }
              />
              <Field
                label="Horas máx auto-cierre"
                value={data.cashMaxSessionHours != null && !Number.isNaN(data.cashMaxSessionHours) ? String(data.cashMaxSessionHours) : ""}
                onChange={(v: string) =>
                  setData((d) => ({
                    ...(d ?? {}) as ParkingParametersPayload,
                    cashMaxSessionHours: v.trim() === "" ? null : parseInt(v.trim(), 10)
                  }))
                }
              />
            </div>
          </div>
        </div>

        {canEdit ? (
          <div className="flex flex-wrap gap-3 pt-4">
            <Button
              color="primary"
              className="font-semibold"
              onPress={() =>
                void (async () => {
                  try {
                    const v = await validateParameters(data);
                    if (!v.ok) {
                      onNotify({ kind: "err", text: v.errors.join("; ") });
                      return;
                    }
                    const saved = await putParameters(data, paramSite.trim() || "DEFAULT", auditReason);
                    setData(saved);
                    onNotify({ kind: "ok", text: "Parametros guardados." });
                  } catch (e) {
                    onNotify({ kind: "err", text: errorService.normalize(e).message });
                  }
                })()
              }
            >
              Guardar parametros
            </Button>
            <Button
              variant="outline"
              color="primary"
              className="font-semibold"
              onPress={async () => {
                if (!(await confirm("Restaurar parametros por defecto en el servidor?"))) return;
                try {
                  const saved = await resetParameters(paramSite.trim() || "DEFAULT", auditReason);
                  setData(saved);
                  onNotify({ kind: "ok", text: "Parametros restaurados." });
                } catch (e) {
                  onNotify({ kind: "err", text: errorService.normalize(e).message });
                }
              }}
            >
              Restaurar valores por defecto
            </Button>
          </div>
        ) : (
          <p className="text-xs text-default-500">Solo lectura: no tiene permiso de edicion.</p>
        )}
      </div>
    </div>
  );
}
