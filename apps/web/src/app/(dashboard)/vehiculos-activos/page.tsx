import DataTable from "@/components/ui/DataTable";

const rows = [
  { plate: "ABC123", type: "Carro", time: "01:24", rate: "Hora carro" },
  { plate: "MTR908", type: "Moto", time: "00:40", rate: "Hora moto" },
  { plate: "TRK554", type: "Camion", time: "02:10", rate: "Hora camion" }
];

export default function VehiculosActivosPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-amber-700/80">
          Control diario
        </p>
        <h1 className="text-3xl font-semibold text-slate-900">Vehiculos activos</h1>
      </div>
      <DataTable
        columns={[
          { key: "plate", label: "Placa" },
          { key: "type", label: "Tipo" },
          { key: "time", label: "Tiempo" },
          { key: "rate", label: "Tarifa" }
        ]}
        rows={rows}
      />
    </div>
  );
}
