"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Button from "@/components/ui/Button";
import { vehicleEntrySchema, VehicleEntryFormValues } from "@/modules/parking/vehicle.schema";

export default function VehicleEntryForm() {
  const form = useForm<VehicleEntryFormValues>({
    resolver: zodResolver(vehicleEntrySchema),
    defaultValues: {
      plate: "",
      type: "CAR",
      rateId: ""
    }
  });

  const onSubmit = (values: VehicleEntryFormValues) => {
    console.log("submit", values);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="surface space-y-4 rounded-2xl p-6">
      <div>
        <label className="text-sm font-medium text-slate-700">Placa</label>
        <input
          {...form.register("plate")}
          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
          placeholder="ABC123"
        />
        {form.formState.errors.plate && (
          <p className="mt-1 text-xs text-rose-600">{form.formState.errors.plate.message}</p>
        )}
      </div>

      <div>
        <label className="text-sm font-medium text-slate-700">Tipo</label>
        <select
          {...form.register("type")}
          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
        >
          <option value="CAR">Carro</option>
          <option value="MOTORCYCLE">Moto</option>
          <option value="VAN">Van</option>
          <option value="TRUCK">Camion</option>
          <option value="OTHER">Otro</option>
        </select>
      </div>

      <div>
        <label className="text-sm font-medium text-slate-700">Tarifa</label>
        <input
          {...form.register("rateId")}
          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
          placeholder="Tarifa por defecto"
        />
      </div>

      <div className="pt-2">
        <Button label="Registrar ingreso" tone="primary" />
      </div>
    </form>
  );
}
