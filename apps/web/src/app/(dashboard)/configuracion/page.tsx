import Button from "@/components/ui/Button";

export default function ConfiguracionPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-amber-700/80">
          Configuracion
        </p>
        <h1 className="text-3xl font-semibold text-slate-900">Ajustes generales</h1>
      </div>
      <div className="surface rounded-2xl p-6">
        <p className="text-sm text-slate-600">
          Define tarifas, usuarios y parametros del parqueadero.
        </p>
        <div className="mt-6">
          <Button label="Guardar cambios" tone="primary" />
        </div>
      </div>
    </div>
  );
}
