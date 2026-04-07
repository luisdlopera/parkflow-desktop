import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

export default function SalidaCobroPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-amber-700/80">
          Salida y cobro
        </p>
        <h1 className="text-3xl font-semibold text-slate-900">Finalizar servicio</h1>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="surface rounded-2xl p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-900">Resumen rapido</h2>
          <div className="mt-4 flex items-center gap-3">
            <Badge label="Activo" tone="warning" />
            <p className="text-sm text-slate-600">Sesion con placa ABC123</p>
          </div>
          <div className="mt-6 grid gap-3 text-sm text-slate-600">
            <p>Tiempo total: 2h 05m</p>
            <p>Tarifa aplicada: Hora carro</p>
            <p>Subtotal: $ 8.000</p>
          </div>
        </div>
        <div className="surface rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-slate-900">Cobro</h2>
          <p className="mt-2 text-sm text-slate-600">Selecciona metodo y confirma.</p>
          <div className="mt-6 space-y-3">
            <Button label="Cobrar en efectivo" tone="primary" />
            <Button label="Cobrar con tarjeta" tone="ghost" />
          </div>
        </div>
      </div>
    </div>
  );
}
