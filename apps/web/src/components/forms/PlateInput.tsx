"use client";
import React from "react";
import { Controller, Control, FieldValues } from "react-hook-form";
import { getPlatePlaceholder, getPlateFormatHint } from "@/lib/validation/plate-validator";

const DEFAULT_VEHICLE_TYPE = "CAR";

interface PlateInputProps<T extends FieldValues = any> {
  control: Control<T>;
  onSubmit?: () => void;
  plateInputRef: React.MutableRefObject<HTMLInputElement | null>;
  noPlate?: boolean;
  platePrefix?: string;
  vehicleType?: string;
}

export default function PlateInput({ control, onSubmit, plateInputRef, noPlate, platePrefix, vehicleType }: PlateInputProps) {
  const type = vehicleType || DEFAULT_VEHICLE_TYPE;
  const placeholder = getPlatePlaceholder(type);
  const formatHint = getPlateFormatHint(type);

  return (
    <div className="relative group">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-brand-500 to-brand-500 rounded-2xl opacity-30 group-focus-within:opacity-100 transition duration-500" />
      <div className="relative bg-default-50 dark:bg-default-100 dark:bg-default-900 rounded-2xl p-1">
        <Controller
          name="plate"
          control={control}
          render={({ field, fieldState }) => (
            <div className="flex flex-col">
              <label className="flex items-center justify-between w-full text-base font-semibold px-3 pt-2 pb-1">
                <span className="text-brand-600 dark:text-brand-400">Placa del vehículo</span>
                {platePrefix && (
                  <span className="text-xs font-bold text-brand-700 dark:text-brand-200 bg-brand-200 dark:bg-brand-900/40 px-2.5 py-0.5 rounded-md">
                    {platePrefix}
                  </span>
                )}
              </label>
              <input
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
                maxLength={17}
                value={field.value || ""}
                onChange={(e: any) => field.onChange(e.target.value.toUpperCase())}
                onKeyDown={(e: any) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onSubmit?.();
                  }
                }}
                className={`w-full text-5xl sm:text-6xl font-black uppercase tracking-[0.2em] text-center h-[200px] text-foreground dark:text-default-200 placeholder:text-default-200 dark:placeholder:text-default-600 bg-default-50/50 dark:bg-default-800/50 hover:bg-default-50/50 dark:hover:bg-default-800/50 focus:bg-default-50/50 dark:focus:bg-default-800/50 transition-all rounded-xl border-0 outline-none focus:outline-none focus:ring-0 ${
                  fieldState.error ? "border-2 border-red-600 dark:border-red-500" : ""
                }`}
                autoComplete="off"
              />
              {fieldState.error ? (
                <p className="text-xs text-red-600 dark:text-red-400 font-semibold bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-lg mt-1">{fieldState.error.message}</p>
              ) : (
                <p className="text-xs text-default-400 dark:text-default-500 px-3 pt-1 pb-2 text-center">
                  Formato esperado: {formatHint} · Ej: {placeholder}
                </p>
              )}
            </div>
          )}
        />
      </div>
    </div>
  );
}
