"use client";

import React, { KeyboardEvent, useEffect, useState } from "react";
import { UseFormReturn, Controller, useFieldArray } from "react-hook-form";
import { VehicleEntryFormValues } from "@/modules/parking/vehicle.schema";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Tooltip } from "@/components/ui/Tooltip";
import { useTenantConfig } from "@/lib/hooks/useTenantConfig";
import { motion, AnimatePresence } from "framer-motion";
import { User, CheckCircle2, AlertCircle } from "lucide-react";
import { MotorRacingHelmet } from "@/components/ui/MotorRacingHelmet";
import { Autocomplete, ListBox, SearchField, useFilter, Label, FieldError } from "@heroui/react";
import { fetchAvailableLockers } from "@/services/lockers.service";

interface MotorcycleEntryFormUIProps {
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

export function MotorcycleEntryFormUI({
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
}: MotorcycleEntryFormUIProps) {
  const { getOperationConfigValue } = useTenantConfig();
  const enableCustodiedItem = getOperationConfigValue<boolean>("enableCustodiedItem", true);

  const [availableTokens, setAvailableTokens] = useState<{ id: string; code: string }[]>([]);
  const { contains } = useFilter({ sensitivity: "base" });

  useEffect(() => {
    if (enableCustodiedItem) {
      fetchAvailableLockers()
        .then((lockers) => setAvailableTokens(lockers.map((l) => ({ id: l.id, code: l.code }))))
        .catch(() => setAvailableTokens([]));
    }
  }, [enableCustodiedItem]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "custodiedItems",
  });

  const helmetDelivered = fields.length > 0;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Placa — Input nativo gigante */}
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-brand-500 to-brand-500 rounded-2xl blur opacity-30 group-focus-within:opacity-100 transition duration-500"></div>
        <div className="relative bg-white rounded-2xl p-1">
          <Controller
            name="plate"
            control={form.control}
            render={({ field, fieldState }) => (
              <div className="flex flex-col">
                <label className="flex items-center justify-between w-full text-base font-semibold px-3 pt-2 pb-1">
                  <span className="text-slate-600">Placa de la moto</span>
                  {platePrefix && (
                    <span className="text-xs font-bold text-brand-700 bg-brand-100 px-2.5 py-0.5 rounded-md">
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
                  placeholder="ABC12D"
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
                    Formato esperado: 3 letras + 2 números + 1 letra · Ej: ABC12D
                  </p>
                )}
              </div>
            )}
          />
        </div>
      </div>

      {/* Sección de Casco Interactiva */}
      {enableCustodiedItem && (
        <div className="space-y-3 pt-2">
          <p className="text-sm font-semibold text-slate-600">Gestión de Cascos</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => form.setValue("custodiedItems", [], { shouldValidate: true })}
              className={`relative overflow-hidden flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-300 ${
                !helmetDelivered
                  ? "border-brand-500 bg-brand-500 text-white scale-[1.02] shadow-md"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm"
              }`}
            >
              <User
                className={`w-7 h-7 mb-2 ${!helmetDelivered ? "text-white" : "text-slate-500"}`}
              />
              <span className="font-bold text-sm sm:text-base">Lleva el Casco</span>
              {!helmetDelivered && (
                <>
                  <motion.div
                    layoutId="helmet-indicator"
                    className="absolute top-2 right-2 w-2 h-2 rounded-full bg-white"
                  />
                  <div className="absolute top-2 left-2">
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  </div>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                if (!helmetDelivered) {
                  form.setValue(
                    "custodiedItems",
                    [{ identifier: "", observations: "", photoUrl: "" }],
                    { shouldValidate: true },
                  );
                }
              }}
              className={`relative overflow-hidden flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-300 ${
                helmetDelivered
                  ? "border-brand-500 bg-brand-500 text-white scale-[1.02] shadow-md"
                  : "border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:bg-brand-50 hover:shadow-sm"
              }`}
            >
              <MotorRacingHelmet
                className={`w-7 h-7 mb-2 ${helmetDelivered ? "text-white" : "text-brand-500"}`}
              />
              <span className="font-bold text-sm sm:text-base">Deja Casco(s)</span>
              {helmetDelivered && (
                <>
                  <motion.div
                    layoutId="helmet-indicator"
                    className="absolute top-2 right-2 w-2 h-2 rounded-full bg-white"
                  />
                  <div className="absolute top-2 left-2">
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  </div>
                </>
              )}
            </button>
          </div>

          <AnimatePresence>
            {helmetDelivered && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={{ opacity: 0, height: 0, y: -10 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="overflow-hidden"
              >
                <div className="bg-transparent border border-slate-200 rounded-2xl p-4 flex flex-col gap-4 mt-3">
                  {/* Selector rápido de cantidad */}
                  <div className="flex items-center justify-between bg-white rounded-xl p-2 border border-slate-200">
                    <span className="text-sm font-medium text-slate-600 px-2">
                      Cantidad a guardar:
                    </span>
                    <div className="flex gap-2">
                      {[1, 2].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => {
                            const currentLen = fields.length;
                            if (num > currentLen) {
                              for (let i = 0; i < num - currentLen; i++) {
                                append({ identifier: "", observations: "", photoUrl: "" });
                              }
                            } else if (num < currentLen) {
                              for (let i = currentLen - 1; i >= num; i--) {
                                remove(i);
                              }
                            }
                          }}
                          className={`px-4 py-1.5 rounded-lg border text-sm font-bold transition-colors ${
                            fields.length === num
                              ? "bg-brand-100 border-brand-300 text-brand-800"
                              : "border-slate-200 text-slate-700 hover:bg-brand-50"
                          }`}
                        >
                          {num} {num === 1 ? "Casco" : "Cascos"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-brand-100/50 first:border-0 first:pt-0"
                    >
                      <div className="col-span-1 sm:col-span-2">
                        <span className="text-xs font-bold text-brand-600 uppercase">
                          Datos Casco #{index + 1}
                        </span>
                      </div>
                      <Controller
                        name={`custodiedItems.${index}.identifier`}
                        control={form.control}
                        render={({ field: cField, fieldState }) => (
                          <Autocomplete
                            className="w-full"
                            placeholder={
                              availableTokens.length === 0
                                ? "Sin lockers disponibles"
                                : "Seleccionar locker"
                            }
                            selectionMode="single"
                            value={cField.value || null}
                            onChange={(key: unknown) => cField.onChange(key || "")}
                            isDisabled={availableTokens.length === 0}
                            isInvalid={!!fieldState.error}
                          >
                            <Label className="text-sm">Número de Locker</Label>
                            <Autocomplete.Trigger className="bg-white">
                              <Autocomplete.Value />
                              <Autocomplete.ClearButton />
                              <Autocomplete.Indicator />
                            </Autocomplete.Trigger>
                            {fieldState.error?.message && (
                              <FieldError className="text-xs">
                                {fieldState.error.message}
                              </FieldError>
                            )}
                            <Autocomplete.Popover>
                              <Autocomplete.Filter filter={contains}>
                                <SearchField autoFocus name="search" className="mb-2">
                                  <SearchField.Group>
                                    <SearchField.Input placeholder="Buscar locker..." />
                                    <SearchField.ClearButton />
                                  </SearchField.Group>
                                </SearchField>
                                <ListBox>
                                  {availableTokens.map((token) => (
                                    <ListBox.Item
                                      key={token.code}
                                      id={token.code}
                                      textValue={token.code}
                                    >
                                      {token.code}
                                    </ListBox.Item>
                                  ))}
                                </ListBox>
                              </Autocomplete.Filter>
                            </Autocomplete.Popover>
                          </Autocomplete>
                        )}
                      />
                      <Controller
                        name={`custodiedItems.${index}.observations`}
                        control={form.control}
                        render={({ field: cField, fieldState }) => (
                          <Input
                            {...cField}
                            label="Color/Marca"
                            placeholder="Negro Mate, SHAFT..."
                            size="sm"
                            isInvalid={!!fieldState.error}
                            errorMessage={fieldState.error?.message}
                            classNames={{
                              inputWrapper: "bg-white",
                            }}
                          />
                        )}
                      />
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

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
