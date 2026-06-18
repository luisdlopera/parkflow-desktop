"use client";
import React from "react";
import { Controller } from "react-hook-form";

export default function PlateInput({ control, onSubmit, plateInputRef, noPlate, platePrefix }: any) {
  return (
    <div className="relative group">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-primary-500 to-primary-500 rounded-2xl blur opacity-30 group-focus-within:opacity-100 transition duration-500" />
      <div className="relative bg-white rounded-2xl p-1">
        <Controller
          name="plate"
          control={control as any}
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
                ref={(e: HTMLInputElement | null) => {
                  field.ref(e);
                  (plateInputRef as React.MutableRefObject<HTMLInputElement | null>).current = e;
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
                  Formato esperado: 3 letras + 3 números · Ej: ABC123
                </p>
              )}
            </div>
          )}
        />
      </div>
    </div>
  );
}
