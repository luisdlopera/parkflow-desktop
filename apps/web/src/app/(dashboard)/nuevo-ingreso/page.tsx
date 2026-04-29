import VehicleEntryFormV2 from "@/components/forms/VehicleEntryFormV2";

export default function NuevoIngresoPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-brand-600/80 font-semibold">
          Nuevo ingreso
        </p>
        <h1 className="text-3xl font-bold text-slate-900">
          Registrar entrada de vehículo
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Modo experto disponible. Presione F1 en cualquier momento para volver a esta pantalla.
        </p>
      </div>
      <VehicleEntryFormV2 />
    </div>
  );
}
