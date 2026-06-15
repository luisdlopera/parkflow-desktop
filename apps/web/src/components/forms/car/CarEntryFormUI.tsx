"use client";

import React, { KeyboardEvent } from "react";
import { UseFormReturn, Controller } from "react-hook-form";
import { VehicleEntryFormValues } from "@/modules/parking/vehicle.schema";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Tooltip } from "@/components/ui/Tooltip";
import { CheckCircle2, AlertCircle } from "lucide-react";

interface CarEntryFormUIProps {
  form: UseFormReturn<VehicleEntryFormValues>;
  onSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
  onKeyDown: (e: KeyboardEvent<HTMLFormElement>) => void;
  plateInputRef: React.MutableRefObject<HTMLInputElement | null>;
  occupancy: { availableSpaces: number; activeSpaces: number } | null;
  stats: { today: number; session: number };
  isSubmitDisabled: boolean;
  submitDisabledReason?: string;
  platePrefix?: string;
  noPlate: boolean;
}

export function CarEntryFormUI({
  form,
  onSubmit,
  onKeyDown,
  plateInputRef,
  occupancy,
  stats,
  isSubmitDisabled,
  submitDisabledReason,
  platePrefix,
  noPlate,
}: CarEntryFormUIProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Placa — Input nativo gigante */}
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary-500 to-primary-500 rounded-2xl blur opacity-30 group-focus-within:opacity-100 transition duration-500"></div>
        <div className="relative bg-white rounded-2xl p-1">
          <Controller
            name="plate"
            control={form.control}
            render={({ field, fieldState }) => (
              <div className="flex flex-col">
                <label className="flex items-center justify-between w-full text-base font-semibold px-3 pt-2 pb-1">
                  <span className="text-slate-600">Placa del vehículo</span>
                  {platePrefix && (
                    <span className="text-xs font-bold text-primary-700 bg-primary-100 px-2.5 py-0.5 rounded-md">
                      {platePrefix}
                    </span>
                  )}
                </label>
                <input
                  {...field}
                  ref={(e) => {
                    field.ref(e);
                    plateInputRef.current = e;
                  }}
                  type="text"
                  data-testid="plate"
                  placeholder="ABC123"
                  disabled={noPlate}
                  autoFocus
                  value={field.value || ""}
                  onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      onSubmit();
                    }
                  }}
                  className={`w-full text-5xl sm:text-6xl font-black uppercase tracking-[0.2em] text-center h-[200px] text-slate-800 placeholder:text-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:bg-white transition-all rounded-xl border-0 outline-none focus:outline-none focus:ring-0 ${
                    fieldState.error ? "border-2 border-danger" : ""
                  }`}
                  autoComplete="off"
                />
                {fieldState.error ? (
                  <p className="text-xs text-danger px-3 pt-1 pb-2">{fieldState.error.message}</p>
                ) : (
                  <p className="text-xs text-slate-400 px-3 pt-1 pb-2 text-center">
                    Formato esperado: 3 letras + 3 números · Ej: ABC123
                  </p>
                )}
              </div>
            )}
          />
        </div>
      </div>

      {/* Stats rápidos */}
      <div className="flex items-center gap-3">
        <div className="bg-primary-50 rounded-xl px-3 py-2">
          <span className="text-xs text-primary-600 font-medium">Hoy: {stats.today}</span>
        </div>
        <div className="bg-slate-100 rounded-xl px-3 py-2">
          <span className="text-xs text-slate-600 font-medium">Sesión: {stats.session}</span>
        </div>
        {occupancy && (
          <div className={`${occupancy.availableSpaces <= 0 ? "bg-rose-50 border border-rose-100" : "bg-emerald-50 border border-emerald-100"} rounded-xl px-3 py-2`}>
            <span className={`text-xs ${occupancy.availableSpaces <= 0 ? "text-rose-700 font-bold" : "text-emerald-700 font-medium"}`}>
              {occupancy.availableSpaces} / {occupancy.activeSpaces}
            </span>
          </div>
        )}
      </div>

      {/* Estado del formulario */}
      <div
        className={`flex items-center gap-2 text-sm rounded-xl px-4 py-3 ${
          isSubmitDisabled
            ? "bg-amber-50 text-amber-800 border border-amber-100"
            : "bg-emerald-50 text-emerald-700 border border-emerald-100"
        }`}
        data-testid="entry-status-banner"
      >
        {isSubmitDisabled ? (
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
        ) : (
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
        )}
        <span>
          {isSubmitDisabled
            ? submitDisabledReason || "Completa los datos requeridos"
            : "Listo para registrar el ingreso"}
        </span>
      </div>

      {/* Botón de ingreso — Masivo */}
      <div className="pt-2">
        <Tooltip
          content={submitDisabledReason || "Completa los datos requeridos"}
          isDisabled={!isSubmitDisabled}
        >
          <div className="w-full">
            <Button
              type="button"
              onClick={() => onSubmit()}
              size="lg"
              isLoading={form.formState.isSubmitting}
              isDisabled={isSubmitDisabled}
              className={`w-full font-black text-xl border h-16 rounded-2xl group relative overflow-hidden transition-colors ${
                isSubmitDisabled
                  ? "bg-slate-300 text-slate-500 border-slate-200 cursor-not-allowed"
                  : "bg-orange-500 text-white border-default-200 hover:bg-orange-600"
              }`}
              data-testid="register-entry"
              aria-describedby={isSubmitDisabled ? "entry-disabled-reason" : undefined}
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {form.formState.isSubmitting ? "REGISTRANDO..." : "REGISTRAR INGRESO"}
                {!form.formState.isSubmitting && !isSubmitDisabled && (
                  <svg
                    className="w-6 h-6 group-hover:translate-x-1 transition-transform"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M14 5l7 7m0 0l-7 7m7-7H3"
                    />
                  </svg>
                )}
              </span>
              {!isSubmitDisabled && (
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out"></div>
              )}
            </Button>
          </div>
        </Tooltip>
      </div>
    </div>
  );
}
