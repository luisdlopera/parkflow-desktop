"use client";
import React from "react";
import { Controller } from "react-hook-form";
import { TextField, Input as HeroInput } from "@heroui/react";
import { getPlatePlaceholder, getPlateFormatHint } from "@/lib/validation/plate-validator";

const DEFAULT_VEHICLE_TYPE = "CAR";

export default function PlateInput({ control, onSubmit, plateInputRef, noPlate, platePrefix, vehicleType }: any) {
  const type = vehicleType || DEFAULT_VEHICLE_TYPE;
  const placeholder = getPlatePlaceholder(type);
  const formatHint = getPlateFormatHint(type);

  return (
    <div className="relative group">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-primary-500 to-primary-500 rounded-2xl blur opacity-30 group-focus-within:opacity-100 transition duration-500" />
      <div className="relative bg-white rounded-2xl p-1">
        <Controller
          name="plate"
          control={control as any}
          render={({ field, fieldState }) => (
            <TextField isInvalid={!!fieldState.error} className="flex flex-col">
              <label className="flex items-center justify-between w-full text-base font-semibold px-3 pt-2 pb-1">
                <span className="text-slate-600">Placa del vehículo</span>
                {platePrefix && (
                  <span className="text-xs font-bold text-primary-700 bg-primary-100 px-2.5 py-0.5 rounded-md">
                    {platePrefix}
                  </span>
                )}
              </label>
              <HeroInput
                {...field}
                ref={(e: HTMLInputElement | null) => {
                  field.ref(e);
                  (plateInputRef as React.MutableRefObject<HTMLInputElement | null>).current = e;
                }}
                type="text"
                data-testid="plate"
                placeholder={placeholder}
                disabled={noPlate}
                autoFocus
                value={field.value || ""}
                onChange={(e: any) => field.onChange(e.target.value.toUpperCase())}
                onKeyDown={(e: any) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onSubmit?.();
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
                  Formato esperado: {formatHint} · Ej: {placeholder}
                </p>
              )}
            </TextField>
          )}
        />
      </div>
    </div>
  );
}
