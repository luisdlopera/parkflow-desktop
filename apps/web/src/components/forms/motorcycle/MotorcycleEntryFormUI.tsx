"use client";

import React, { KeyboardEvent, useCallback, useEffect, useMemo, useState } from "react";
import { UseFormReturn, Controller, useFieldArray, useWatch } from "react-hook-form";
import { VehicleEntryFormValues } from "@/lib/schemas/vehicle.schema";
import { Input } from "@/components/bridge/Input";
import { Button } from "@/components/bridge/Button";
import { Tooltip } from "@/components/bridge/Tooltip";
import { useRuntimeConfig } from "@/lib/useRuntimeConfig";
import { motion, AnimatePresence } from "framer-motion";
import { User, CheckCircle2, AlertCircle } from "lucide-react";
import { MotorRacingHelmet } from "@/features/vehicle-entry/components/MotorRacingHelmet";
import { Autocomplete, ListBox, SearchField, useFilter, Label, FieldError } from "@heroui/react";
import { fetchAvailableLockers } from "@/lib/api/lockers-api";
import { useFeatureFlags } from "@/providers/FeatureFlagProvider";

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
  const flags = useFeatureFlags();
  const { isSubmitting } = form.formState;
  const showHelmetSection = flags.helmets;
  const usesLockers = flags.lockers;

  const [availableTokens, setAvailableTokens] = useState<{ id: string; code: string }[]>([]);
  const { contains } = useFilter({ sensitivity: "base" });

  useEffect(() => {
    if (showHelmetSection && usesLockers) {
      fetchAvailableLockers()
        .then((lockers) => setAvailableTokens(lockers.map((l) => ({ id: l.id, code: l.code }))))
        .catch(() => setAvailableTokens([]));
    }
  }, [showHelmetSection, usesLockers]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "custodiedItems",
  });

  const helmetDelivered = fields.length > 0;

  const custodiedValues = useWatch({
    control: form.control,
    name: "custodiedItems",
  });

  const selectedLockerCodes = useMemo(
    () => (custodiedValues || []).map((item) => item?.identifier).filter(Boolean),
    [custodiedValues],
  );

  const getFilteredTokens = useCallback(
    (currentIndex: number) => {
      if (!availableTokens.length) return [];
      return availableTokens.filter(
        (token) =>
          !selectedLockerCodes.some(
            (code, idx) => idx !== currentIndex && code === token.code,
          ),
      );
    },
    [availableTokens, selectedLockerCodes],
  );

  const handleClearHelmets = useCallback(() => {
    form.setValue("custodiedItems", [], { shouldValidate: true });
  }, [form]);

  const handleAddHelmets = useCallback(() => {
    if (!helmetDelivered) {
      form.setValue(
        "custodiedItems",
        [{ identifier: "", observations: "", photoUrl: "" }],
        { shouldValidate: true },
      );
    }
  }, [form, helmetDelivered]);

  const handleHelmetCount = useCallback(
    (num: number) => {
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
    },
    [fields.length, append, remove],
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Placa — Input nativo gigante */}
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-brand-500 to-brand-500 rounded-2xl blur opacity-30 group-focus-within:opacity-100 transition duration-500"></div>
        <div className="relative bg-default-50 dark:bg-default-100 dark:bg-default-900 rounded-2xl p-1">
          <Controller
            name="plate"
            control={form.control}
            render={({ field, fieldState }) => (
              <div className="flex flex-col">
                <label className="flex items-center justify-between w-full text-base font-semibold px-3 pt-2 pb-1">
                  <span className="text-default-600 dark:text-default-300">Placa de la moto</span>
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
                  className={`w-full text-5xl sm:text-6xl font-black uppercase tracking-[0.2em] text-center h-[200px] text-foreground dark:text-default-200 placeholder:text-default-200 dark:placeholder:text-default-600 bg-default-50/50 dark:bg-default-800/50 hover:bg-default-50 dark:hover:bg-default-800 focus:bg-default-50 dark:bg-default-100 dark:focus:bg-default-800 transition-all rounded-xl border-0 outline-none focus:outline-none focus:ring-0 ${
                    fieldState.error ? "border-2 border-danger" : ""
                  }`}
                  autoComplete="off"
                />
                {fieldState.error ? (
                  <p className="text-xs text-danger px-3 pt-1 pb-2">{fieldState.error.message}</p>
                ) : (
                  <p className="text-xs text-default-400 dark:text-default-500 px-3 pt-1 pb-2 text-center">
                    Formato esperado: 3 letras + 2 números + 1 letra · Ej: ABC12D
                  </p>
                )}
              </div>
            )}
          />
        </div>
      </div>

      {/* Sección de Casco Interactiva */}
      {showHelmetSection && (
        <div className="space-y-3 pt-2">
          <p className="text-sm font-semibold text-default-600 dark:text-default-300">Gestión de Cascos</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              aria-pressed={!helmetDelivered}
              onClick={handleClearHelmets}
              className={`relative overflow-hidden flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-300 ${
                !helmetDelivered
                  ? "border-brand-500 bg-brand-500 text-default-50 scale-[1.02]"
                  : "border-default-200 dark:border-default-700 bg-default-50 dark:bg-default-100 dark:bg-default-900 text-default-600 dark:text-default-400 hover:border-default-300 dark:hover:border-default-600 hover:bg-default-50 dark:hover:bg-default-800"
              }`}
            >
              <User
                className={`w-7 h-7 mb-2 ${!helmetDelivered ? "text-default-50" : "text-default-500 dark:text-default-400"}`}
              />
              <span className="font-bold text-sm sm:text-base">Lleva el Casco</span>
              {!helmetDelivered && (
                <>
                  <motion.div
                    layoutId="helmet-indicator"
                    className="absolute top-2 right-2 w-2 h-2 rounded-full bg-default-50 dark:bg-default-100"
                  />
                  <div className="absolute top-2 left-2">
                    <CheckCircle2 className="w-4 h-4 text-default-50" />
                  </div>
                </>
              )}
            </button>

            <button
              type="button"
              aria-pressed={helmetDelivered}
              onClick={handleAddHelmets}
              className={`relative overflow-hidden flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-300 ${
                helmetDelivered
                  ? "border-brand-500 bg-brand-500 text-default-50 scale-[1.02]"
                  : "border-default-200 dark:border-default-700 bg-default-50 dark:bg-default-100 dark:bg-default-900 text-default-600 dark:text-default-400 hover:border-brand-300 dark:hover:border-brand-600 hover:bg-brand-50 dark:hover:bg-default-800"
              }`}
            >
              <MotorRacingHelmet
                className={`w-7 h-7 mb-2 ${helmetDelivered ? "text-default-50" : "text-brand-500"}`}
              />
              <span className="font-bold text-sm sm:text-base">Deja Casco(s)</span>
              {helmetDelivered && (
                <>
                  <motion.div
                    layoutId="helmet-indicator"
                    className="absolute top-2 right-2 w-2 h-2 rounded-full bg-default-50 dark:bg-default-100"
                  />
                  <div className="absolute top-2 left-2">
                    <CheckCircle2 className="w-4 h-4 text-default-50" />
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
                <div className="bg-transparent border border-default-200 dark:border-default-700 rounded-2xl p-4 flex flex-col gap-4 mt-3">
                  {/* Selector rápido de cantidad */}
                  <div className="flex items-center justify-between bg-default-50 dark:bg-default-100 dark:bg-default-900 rounded-xl p-2 border border-default-200 dark:border-default-700">
                    <span className="text-sm font-medium text-default-600 dark:text-default-400 px-2">
                      Cantidad a guardar:
                    </span>
                    <div className="flex gap-2">
                      {[1, 2].map((num) => (
                        <button
                          key={num}
                          type="button"
                          aria-pressed={fields.length === num}
                          onClick={() => handleHelmetCount(num)}
                          className={`px-4 py-1.5 rounded-lg border text-sm font-bold transition-colors ${
                            fields.length === num
                              ? "bg-brand-100 border-brand-300 text-brand-800 dark:bg-brand-900/30 dark:border-brand-700 dark:text-brand-300"
                              : "border-default-200 dark:border-default-700 text-default-700 dark:text-default-400 hover:bg-brand-50 dark:hover:bg-default-800"
                          }`}
                        >
                          {num} {num === 1 ? "Casco" : "Cascos"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {fields.map((field, index) => {
                    const filteredTokens = getFilteredTokens(index);
                    const hasTokens = filteredTokens.length > 0;
                    return (
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
                              !hasTokens
                                ? "Sin lockers disponibles"
                                : "Seleccionar locker"
                            }
                            selectionMode="single"
                            value={cField.value || null}
                            onChange={(key: unknown) => {
                              const newVal = (key as string) || "";
                              if (newVal !== cField.value) {
                                cField.onChange(newVal);
                              }
                            }}
                            isDisabled={!hasTokens}
                            isInvalid={!!fieldState.error} aria-label="Campo Autocomplete"
                          >
                            <Label className="text-sm">Número de Locker</Label>
                            <Autocomplete.Trigger className="bg-default-50 dark:bg-default-100 dark:bg-default-900">
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
                                <SearchField autoFocus name="search" aria-label="Buscar locker" className="mb-2">
                                  <SearchField.Group>
                                    <SearchField.Input placeholder="Buscar locker..." />
                                    <SearchField.ClearButton />
                                  </SearchField.Group>
                                </SearchField>
                                <ListBox>
                                  {filteredTokens.map((token) => (
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
                              inputWrapper: "bg-default-50 dark:bg-default-100",
                            }}
                          />
                        )}
                      />
                    </div>
                    );
                  })}
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
              isLoading={isSubmitting}
              isDisabled={isSubmitDisabled}
              className={`w-full font-black text-xl border h-16 rounded-2xl group relative overflow-hidden transition-colors ${
                isSubmitDisabled
                  ? "bg-default-300 text-default-500 border-default-200 cursor-not-allowed"
                  : "bg-brand text-default-50 border-brand hover:bg-brand-600"
              }`}
              data-testid="register-entry"
              aria-describedby={isSubmitDisabled ? "entry-disabled-reason" : undefined}
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {isSubmitting ? "REGISTRANDO..." : "REGISTRAR INGRESO"}
                {!isSubmitting && !isSubmitDisabled && (
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
                <div className="absolute inset-0 bg-default-50 dark:bg-default-100/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out"></div>
              )}
            </Button>
          </div>
        </Tooltip>
      </div>
    </div>
  );
}
