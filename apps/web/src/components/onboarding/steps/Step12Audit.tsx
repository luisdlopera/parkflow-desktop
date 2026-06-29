import { memo, useMemo } from "react";
import { useOnboarding, profileLabel } from "../OnboardingContext";
import { Button } from "@/components/bridge/Button";
import { AlertTriangle, Car, Banknote, Monitor, Ticket, ArrowRight, LucideIcon } from "lucide-react";
import { PAYMENT_METHOD_CATALOG } from "@/lib/payment-method-catalog";

const Step12Audit = memo(function Step12Audit() {
  const { allProgressData, vehicleTypes, detectedProfile, persistStep } = useOnboarding();

  const step1Data = allProgressData?.step_1 as Record<string, unknown> | undefined;
  const step2Data = allProgressData?.step_2 as Record<string, unknown> | undefined;
  const step3Data = allProgressData?.step_3 as Record<string, unknown> | undefined;
  const step4Data = allProgressData?.step_4 as Record<string, unknown> | undefined;
  const step5Data = allProgressData?.step_5 as Record<string, unknown> | undefined;
  const step6Data = allProgressData?.step_6 as Record<string, unknown> | undefined;
  const step7Data = allProgressData?.step_7 as Record<string, unknown> | undefined;

  // Validation logic
  const warnings = useMemo(() => {
    const warns: string[] = [];
    if (step1Data?.helmetHandling === "LOCKERS" && (!step1Data?.helmetTokenCount || Number(step1Data.helmetTokenCount) <= 0)) {
      warns.push("Tienes cascos habilitados (Lockers) pero la cantidad es 0.");
    }
    if (step4Data?.enabled && !step4Data?.cashRequireOpenForPayment) {
      warns.push("Tienes múltiples cajas por operador, pero cobrar no exige caja abierta.");
    }
    if (vehicleTypes.length > 0 && !step2Data?.totalCapacity) {
      warns.push("Has configurado vehículos pero la capacidad total no está definida o es 0.");
    }
    if (!step3Data?.baseValue || Number(step3Data.baseValue) <= 0) {
      warns.push("La tarifa base está en 0. Asegúrate de configurar correctamente los valores de cobro.");
    }
    return warns;
  }, [step1Data, step4Data, step2Data, step3Data, vehicleTypes]);

  // UI mapping
  const vehicleLabels: Record<string, string> = {
    CAR: "Carros",
    MOTORCYCLE: "Motos",
    BICYCLE: "Bicicletas",
    VAN: "Vans",
    TRUCK: "Camiones",
    BUS: "Buses",
  };
  const vehiclesLabel = vehicleTypes.length > 0 ? vehicleTypes.map(t => vehicleLabels[t] || t).join(", ") : "no configurados";
  const capacity = step2Data?.totalCapacity ? String(step2Data.totalCapacity) : "0";
  
  const billingModel = step3Data?.billingModel === "FLAT" ? "Tarifa Plana" : 
                       step3Data?.billingModel === "FRACTION" ? "Por Fracciones" : 
                       step3Data?.billingModel === "MIXED" ? "Fracciones y Plana" : "No configurado";
                       
  const paymentMethods = Array.isArray(step6Data?.paymentMethods) && step6Data.paymentMethods.length > 0
    ? step6Data.paymentMethods
        .map((code: string) => {
          const method = PAYMENT_METHOD_CATALOG.find(m => m.code === code);
          return method?.label || code;
        })
        .join(", ")
    : "Efectivo";

  return (
    <div className="space-y-6 pb-2">
      {/* Resumen Ejecutivo */}
      <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 p-4 rounded-xl">
        <h3 className="text-sm font-semibold text-primary-700 dark:text-primary-400 mb-2">Resumen Ejecutivo</h3>
        <p className="text-sm text-primary-800 dark:text-primary-300 leading-relaxed">
          Tu parqueadero está configurado para <strong>{vehiclesLabel}</strong>,
          con capacidad para <strong>{capacity}</strong> vehículos.
          Cobrarás desde <strong>${String(step3Data?.baseValue ?? 0)}</strong> usando <strong>{Array.isArray(step6Data?.paymentMethods) ? String(step6Data.paymentMethods.length) : "1"}</strong> método(s) de pago
          y gestionarás la operación con <strong>{String(step4Data?.numTerminals ?? 1)}</strong> caja(s)
          mediante turnos <strong>{step5Data?.enabled ? "habilitados" : "deshabilitados"}</strong>.
        </p>
      </div>

      {warnings.length > 0 && (
        <div className="bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 p-4 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-warning-600 dark:text-warning-500">
            <AlertTriangle className="w-5 h-5" />
            <h4 className="font-semibold text-sm">Advertencias de configuración</h4>
          </div>
          <ul className="list-disc list-inside text-sm text-warning-700 dark:text-warning-400 space-y-1">
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Vehículos y Capacidad */}
      <SectionCard 
        title="Vehículos y Capacidad" 
        icon={Car} 
        onEdit={() => persistStep(1)} 
      >
        <Item label="Perfil" value={profileLabel(detectedProfile)} />
        <Item label="Capacidad Total" value={capacity} />
        <Item label="Vehículos" value={vehiclesLabel} />
        <Item label="Cascos" value={step1Data?.helmetHandling === "LOCKERS" ? `Lockers (${step1Data.helmetTokenCount})` : step1Data?.helmetHandling === "NONE" ? "No se guardan" : "No configurado"} />
      </SectionCard>

      {/* Tarifas y Operación */}
      <SectionCard 
        title="Tarifas y Operación" 
        icon={Banknote} 
        onEdit={() => persistStep(3)}
      >
        <Item label="Modelo" value={billingModel} />
        <Item label="Tarifa Base" value={`$${step3Data?.baseValue ?? 0}`} />
        <Item label="Turnos" value={step5Data?.enabled ? "Habilitados" : "Deshabilitados"} />
        <Item label="Tiempo de gracia" value={step3Data?.gracePeriodMinutes ? `${step3Data.gracePeriodMinutes} min` : "No configurado"} />
      </SectionCard>

      {/* Terminales y Caja */}
      <SectionCard 
        title="Terminales y Caja" 
        icon={Monitor} 
        onEdit={() => persistStep(4)}
      >
        <Item label="Terminales" value={String(step4Data?.numTerminals ?? 1)} />
        <Item label="Caja por Operador" value={step4Data?.enabled ? "Sí" : "No"} />
        <Item label="Exige caja abierta" value={step4Data?.cashRequireOpenForPayment ? "Sí" : "No"} />
        <Item label="Pagos" value={paymentMethods} />
      </SectionCard>

      {/* Tickets y Placas */}
      <SectionCard 
        title="Tickets y Placas" 
        icon={Ticket} 
        onEdit={() => persistStep(7)}
      >
        <Item label="País / Formato" value={String(step4Data?.countryCode ?? "CO")} />
        <Item label="Prefijo ticket" value={String(step7Data?.ticketPrefix ?? "T-")} />
        <Item label="Impresora" value={String(step7Data?.printerType ?? "THERMAL")} />
        <Item label="Reimpresiones" value={step7Data?.allowReprint ? "Permitidas" : "No permitidas"} />
      </SectionCard>

      <div className="text-center pt-2">
        <p className="text-sm text-default-500">
          Revisa la configuración antes de finalizar. Podrás modificar cualquiera de estos valores posteriormente desde Configuración.
        </p>
      </div>
    </div>
  );
});

function SectionCard({ title, icon: Icon, onEdit, children }: { title: string, icon: LucideIcon, onEdit: () => void, children: React.ReactNode }) {
  return (
    <div className="bg-default-50 dark:bg-default-100/50 dark:bg-zinc-900 border border-default-200 dark:border-default-800 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between p-3 bg-default-100/50 dark:bg-zinc-800/50 border-b border-default-200 dark:border-default-800">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-default-500" />
          <h4 className="font-semibold text-sm text-default-700">{title}</h4>
        </div>
        <Button size="sm" variant="light" className="text-primary h-7 px-2" endContent={<ArrowRight className="w-3 h-3" />} onPress={onEdit}>
          Editar
        </Button>
      </div>
      <div className="p-4 grid gap-4 sm:grid-cols-2">
        {children}
      </div>
    </div>
  );
}

function Item({ label, value }: { label: string, value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-default-500 uppercase tracking-wider">{label}</span>
      <span className="text-sm font-medium text-default-900">{value}</span>
    </div>
  );
}

export default Step12Audit;
