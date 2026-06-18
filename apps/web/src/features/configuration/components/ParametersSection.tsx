"use client";
import { ListBox } from "@heroui/react";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { useState, useEffect, useCallback } from "react";
import {
  fetchParameters,
  putParameters,
  resetParameters,
  validateParameters,
  type ParkingParametersPayload
} from "@/lib/settings-api";
import { getUserFriendlyErrorMessage, FrontendActionError } from "@/lib/errors/error-messages";
import { useDialog } from "@/components/ui/DialogProvider";
import { LOST_TICKET_POLICIES } from "@/features/configuration/constants";

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Input
      label={label}
      size="sm"
      value={value}
      onChange={(e) => onChange(e.target.value)}
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
      setError(getUserFriendlyErrorMessage(e, FrontendActionError.SAVE_DATA));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [paramSite]);

  useEffect(() => { load().catch(console.error); }, [load]);

  if (loading && !data) return <p className="text-sm text-slate-500">Cargando parametros...</p>;
  if (error && !data) return <p className="text-sm text-rose-700">{error}</p>;
  if (!data) return <p className="text-sm text-slate-600">Sin datos.</p>;

  const setField = (k: keyof ParkingParametersPayload, v: string | number | boolean | undefined) => {
    setData((d) => ({ ...(d ?? {}), [k]: v }));
  };
  const setOptionalNumber = (k: keyof ParkingParametersPayload, v: string) => {
    setField(k, v.trim() === "" ? undefined : Number(v.replace(",", ".")));
  };

  return (
    <div className="space-y-4">
      <div className="surface rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Parametros del parqueadero</h2>
        <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 pb-4">
          <Input
            label="Codigo de sede (persistencia)"
            size="sm"
            className="max-w-xs"
            value={paramSite}
            onChange={(e) => setParamSite(e.target.value)}
            placeholder="DEFAULT"
          />
          <Button variant="outline" color="primary" size="md" className="font-semibold" onPress={() => { load().catch(console.error); }} isLoading={loading}>
            Cargar sede
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Field label="Nombre comercial" value={data.parkingName ?? ""} onChange={(v: any) => setField("parkingName", v)} />
          <Field label="NIT" value={data.taxId ?? ""} onChange={(v: any) => setField("taxId", v)} />
          <Field label="DV NIT" value={data.taxIdCheckDigit ?? ""} onChange={(v: any) => setField("taxIdCheckDigit", v)} />
          <Field label="Razon social (FE / tributario)" value={data.businessLegalName ?? ""} onChange={(v: any) => setField("businessLegalName", v)} />
          <Field label="Direccion" value={data.address ?? ""} onChange={(v: any) => setField("address", v)} />
          <Field label="Moneda" value={data.currency ?? ""} onChange={(v: any) => setField("currency", v)} />
          <Field label="Zona horaria" value={data.timeZone ?? ""} onChange={(v: any) => setField("timeZone", v)} />
          <Field label="Logo / URL marca" value={data.logoUrl ?? ""} onChange={(v: any) => setField("logoUrl", v)} />
          <Field label="Color marca" value={data.brandColor ?? ""} onChange={(v: any) => setField("brandColor", v)} />
          <Field label="Impuesto" value={data.taxName ?? ""} onChange={(v: any) => setField("taxName", v)} />
          <Field
            label="Impuesto (%)"
            value={data.taxRatePercent != null ? String(data.taxRatePercent) : ""}
            onChange={(v: any) => setOptionalNumber("taxRatePercent", v)}
          />
          <div className="flex items-center py-2">
            <Checkbox isSelected={data.pricesIncludeTax ?? true} onChange={(v: any) => setField("pricesIncludeTax", v)}>
              Tarifas incluyen impuesto
            </Checkbox>
          </div>
          <Field
            label="Minutos de gracia (defecto)"
            value={String(data.graceMinutesDefault ?? "")}
            onChange={(v: any) => setOptionalNumber("graceMinutesDefault", v)}
          />
          <Select
            label="Politica ticket perdido"
            value={[data.lostTicketPolicy ?? "SURCHARGE_RATE"]}
            onChange={(keys) => setField("lostTicketPolicy", Array.from(keys)[0] as string)}
          >
            <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
            <Select.Popover>
              <ListBox>
                {LOST_TICKET_POLICIES.map((p) => (
                  <ListBox.Item key={p.value} textValue={p.label}>{p.label}</ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
          <div className="flex flex-col gap-4 py-2">
            <Checkbox isSelected={Boolean(data.allowReprint)} onChange={(v: any) => setField("allowReprint", v)}>
              Permitir reimpresion
            </Checkbox>
            <Checkbox isSelected={Boolean(data.offlineModeEnabled)} onChange={(v: any) => setField("offlineModeEnabled", v)}>
              Modo offline habilitado
            </Checkbox>
          </div>
          <Field label="Max reimpresiones" value={String(data.maxReprints ?? "")} onChange={(v: any) => setOptionalNumber("maxReprints", v)} />
          <Field label="Prefijo ticket" value={data.ticketPrefix ?? ""} onChange={(v: any) => setField("ticketPrefix", v)} />
          <Field label="Formato ticket" value={data.ticketFormat ?? ""} onChange={(v: any) => setField("ticketFormat", v)} />
          <Field label="Ancho papel (mm)" value={String(data.defaultPaperWidthMm ?? "")} onChange={(v: any) => setOptionalNumber("defaultPaperWidthMm", v)} />
          <Field label="Impresora por defecto" value={data.defaultPrinterName ?? ""} onChange={(v: any) => setField("defaultPrinterName", v)} />
          <Field label="Intervalo sync (seg)" value={String(data.syncIntervalSeconds ?? "")} onChange={(v: any) => setOptionalNumber("syncIntervalSeconds", v)} />
          <Field label="Timeout impresion (seg)" value={String(data.printTimeoutSeconds ?? "")} onChange={(v: any) => setOptionalNumber("printTimeoutSeconds", v)} />
          <Field label="QR / codigo" value={data.qrConfig ?? ""} onChange={(v: any) => setField("qrConfig", v)} />

          <div className="col-span-full grid gap-4 border-t border-slate-100 pt-6 md:grid-cols-2">
            <TextArea label="Mensaje encabezado ticket" size="sm" minRows={2} value={data.ticketHeaderMessage ?? ""} onChange={(v: any) => setField("ticketHeaderMessage", v.target.value)} />
            <TextArea label="Mensaje pie ticket" size="sm" minRows={2} value={data.ticketFooterMessage ?? ""} onChange={(v: any) => setField("ticketFooterMessage", v.target.value)} />
            <TextArea label="Mensaje legal ticket" size="sm" minRows={3} value={data.ticketLegalMessage ?? ""} onChange={(v: any) => setField("ticketLegalMessage", v.target.value)} />
            <TextArea label="Reglas de operacion" size="sm" minRows={3} value={data.operationRulesMessage ?? ""} onChange={(v: any) => setField("operationRulesMessage", v.target.value)} />
          </div>

          <div className="flex flex-col gap-4 py-2">
            <Checkbox isSelected={Boolean(data.manualExitAllowed)} onChange={(v: any) => setField("manualExitAllowed", v)}>Salida manual permitida</Checkbox>
            <Checkbox isSelected={Boolean(data.allowOfflineEntryExit)} onChange={(v: any) => setField("allowOfflineEntryExit", v)}>Operacion offline ingreso/salida</Checkbox>
            <Checkbox isSelected={Boolean(data.printExitTicket ?? true)} onChange={(v: any) => setField("printExitTicket", v)}>Imprimir tiquete de salida</Checkbox>
          </div>

          <div className="col-span-full pt-6 border-t border-slate-100 mt-2">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Facturacion electronica Colombia (DIAN)</p>
            <p className="text-xs text-slate-500 mb-4 max-w-3xl leading-relaxed">
              Estos datos aparecen en el comprobante de cierre tipo Z termico y documentacion soporte. CUFE, firma XAdES y envio XML a la DIAN requieren PSC certificado; aqui solo se guardan parametros de autorizacion y numeracion por sede.
            </p>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Field label="Prefijo autorizado (ej. SETP)" value={data.dianInvoicePrefix ?? ""} onChange={(v: any) => setField("dianInvoicePrefix", v)} />
              <Field label="No. resolucion DIAN" value={data.dianResolutionNumber ?? ""} onChange={(v: any) => setField("dianResolutionNumber", v)} />
              <Field label="Fecha resolucion (YYYY-MM-DD)" value={data.dianResolutionDate ?? ""} onChange={(v: any) => setField("dianResolutionDate", v)} />
              <Field label="Rango desde (consecutivo)" value={data.dianRangeFrom ?? ""} onChange={(v: any) => setField("dianRangeFrom", v)} />
              <Field label="Rango hasta (consecutivo)" value={data.dianRangeTo ?? ""} onChange={(v: any) => setField("dianRangeTo", v)} />
              <div className="sm:col-span-2 lg:col-span-3">
                <TextArea label="Clave tecnica (opcional)" size="sm" minRows={2} placeholder="Si su PSC solicita persistirla en sede..." value={data.dianTechnicalKey ?? ""} onChange={(v: any) => setField("dianTechnicalKey", v.target.value)} />
              </div>
            </div>
          </div>

          <div className="col-span-full pt-6 border-t border-slate-100 mt-2">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Integracion PSC (cierre caja)</p>
            <p className="text-xs text-slate-500 mb-4 max-w-3xl leading-relaxed">
              Consecutivos y webhook se aplican cuando se ejecuta cerrar caja (commit). El servidor envia POST JSON con evento parkflow.cash.closed.v1; el PSC debe responder 2xx sin bloquear al cajero.
            </p>
            <div className="flex flex-wrap gap-x-10 gap-y-3 py-1">
              <Checkbox isSelected={Boolean(data.cashFeSequentialEnabled)} onChange={(v: any) => setData((d) => ({ ...(d ?? {}), cashFeSequentialEnabled: v }))}>
                Consecutivo soporte al cierre
              </Checkbox>
              <Checkbox isSelected={Boolean(data.cashFeSequencePerTerminal)} onChange={(v: any) => setData((d) => ({ ...(d ?? {}), cashFeSequencePerTerminal: v }))}>
                Llave correlativa por terminal
              </Checkbox>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-4">
              <Field
                label="Digitos consecutivo (6–13)"
                value={data.cashFeSequenceDigits != null ? String(data.cashFeSequenceDigits) : ""}
                onChange={(v: any) =>
                  setData((d) => ({
                    ...(d ?? {}),
                    cashFeSequenceDigits: v.trim() === "" ? undefined : Number(v.replace(",", "."))
                  }))
                }
              />
              <div className="lg:col-span-2">
                <Field label="Webhook URL PSC" value={data.cashFeOutboundWebhookUrl ?? ""} onChange={(v: any) => setField("cashFeOutboundWebhookUrl", v)} />
              </div>
            </div>
            <div className="mt-4">
              <TextArea label="Webhook Authorization (Bearer opcional)" size="sm" minRows={2} placeholder="Ej. Bearer eyJ..." value={data.cashFeOutboundWebhookBearer ?? ""} onChange={(v: any) => setField("cashFeOutboundWebhookBearer", v.target.value)} />
            </div>
          </div>

          <div className="col-span-full pt-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">Politica de caja (override por sede)</p>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Select
                label="Cobro exige caja abierta"
                value={[data.cashRequireOpenForPayment === undefined ? "" : String(data.cashRequireOpenForPayment)]}
                onChange={(keys) => {
                  const v = Array.from(keys)[0] as string;
                  setData((d) => ({ ...(d ?? {}), cashRequireOpenForPayment: v === "" ? undefined : v === "true" }));
                }}
              >
                <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                <Select.Popover>
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
                onChange={(keys) => {
                  const v = Array.from(keys)[0] as string;
                  setData((d) => ({ ...(d ?? {}), cashOfflineCloseAllowed: v === "" ? undefined : v === "true" }));
                }}
              >
                <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                <Select.Popover>
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
                onChange={(v: any) =>
                  setData((d) => ({
                    ...(d ?? {}),
                    cashOfflineMaxManualMovement: v.trim() === "" ? undefined : Number(v.replace(",", "."))
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
                    onNotify({ kind: "err", text: getUserFriendlyErrorMessage(e, FrontendActionError.SAVE_DATA) });
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
                  onNotify({ kind: "err", text: getUserFriendlyErrorMessage(e, FrontendActionError.SAVE_DATA) });
                }
              }}
            >
              Restaurar valores por defecto
            </Button>
          </div>
        ) : (
          <p className="text-xs text-slate-500">Solo lectura: no tiene permiso de edicion.</p>
        )}
      </div>
    </div>
  );
}
