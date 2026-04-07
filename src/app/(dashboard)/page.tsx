import KpiCard from "@/components/ui/KpiCard";
import DataTable from "@/components/ui/DataTable";
import Badge from "@/components/ui/Badge";

const kpis = [
  { title: "Vehiculos activos", value: "18", trend: "+3" },
  { title: "Ingresos hoy", value: "$ 420.000", trend: "+12%" },
  { title: "Ocupacion", value: "72%", trend: "+6%" },
  { title: "Tiempo promedio", value: "1h 42m", trend: "-4%" }
];

const sessions = [
  {
    plate: "ABC123",
    type: "Carro",
    started: "08:20",
    status: "Activo",
    amount: "$ 8.000"
  },
  {
    plate: "MTR908",
    type: "Moto",
    started: "08:45",
    status: "Activo",
    amount: "$ 4.000"
  },
  {
    plate: "TRK554",
    type: "Camion",
    started: "07:50",
    status: "Activo",
    amount: "$ 18.000"
  }
];

export default function DashboardPage() {
  return (
    <div className="space-y-10">
      <section className="space-y-2">
        <p className="text-sm uppercase tracking-[0.3em] text-amber-700/80">
          Panel principal
        </p>
        <h1 className="text-3xl font-semibold text-slate-900">
          Vision general del parqueadero
        </h1>
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.title} {...kpi} />
        ))}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">Movimientos activos</h2>
          <Badge label="En tiempo real" tone="success" />
        </div>
        <DataTable
          columns={[
            { key: "plate", label: "Placa" },
            { key: "type", label: "Tipo" },
            { key: "started", label: "Ingreso" },
            { key: "status", label: "Estado" },
            { key: "amount", label: "Acumulado" }
          ]}
          rows={sessions}
        />
      </section>
    </div>
  );
}
