import VehicleEntryForm from "@/components/forms/VehicleEntryForm";

export default function NuevoIngresoPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-amber-700/80">
          Nuevo ingreso
        </p>
        <h1 className="text-3xl font-semibold text-slate-900">
          Registrar entrada de vehiculo
        </h1>
      </div>
      <VehicleEntryForm />
    </div>
  );
}
