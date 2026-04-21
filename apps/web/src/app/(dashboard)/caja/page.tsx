import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

export default function CajaPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-amber-700/80">Caja</p>
        <h1 className="text-3xl font-semibold text-slate-900">Cierre de caja</h1>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="surface rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-slate-900">Estado actual</h2>
          <div className="mt-4 flex items-center gap-3">
            <Badge label="Caja abierta" tone="success" />
            <p className="text-sm text-slate-600">Turno iniciado a las 07:00</p>
          </div>
        </div>
        <div className="surface rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-slate-900">Acciones</h2>
          <p className="mt-2 text-sm text-slate-600">Prepara el cierre del turno.</p>
          <div className="mt-6 space-y-3">
            <Button label="Registrar arqueo" tone="primary" />
            <Button label="Cerrar caja" tone="ghost" />
          </div>
        </div>
      </div>
    </div>
  );
}
