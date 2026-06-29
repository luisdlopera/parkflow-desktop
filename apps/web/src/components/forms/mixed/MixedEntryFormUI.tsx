import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Controller, useFieldArray, useWatch } from "react-hook-form";
import { ListBox, Autocomplete, SearchField, Label, FieldError, useFilter } from "@heroui/react";
import { Input } from "@/components/bridge/Input";
import { Select } from "@/components/bridge/Select";
import { Button } from "@/components/bridge/Button";
import { Checkbox } from "@/components/bridge/Checkbox";
import PlateInput from "@/components/forms/PlateInput";
import VehicleTypeSelector from "@/components/forms/VehicleTypeSelector";
import type { VehicleType } from "@parkflow/types";
import { WhatsAppPhoneInput } from "@/components/forms/WhatsAppPhoneInput";
import { MotorRacingHelmet } from "@/features/vehicle-entry/components/MotorRacingHelmet";
import { User, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchAvailableLockers } from "@/lib/api/lockers-api";
import { useFormErrorHandling } from "@/hooks/useFormErrorHandling";

interface MixedEntryFormUIProps {
  form: any;
  onSubmit: (e?: React.BaseSyntheticEvent) => void;
  plateInputRef: React.MutableRefObject<HTMLInputElement | null>;
  noPlate: boolean;
  platePrefix?: string;
  flags: any;
  vehicleTypes: any;
  loadingTypes: boolean;
  isExpert: boolean;
  isSpeed: boolean;
  visibleQuickTypes: any;
  selectedTypeCode: string;
  isSubmitting: boolean;
  printWarning: any;
}

export function MixedEntryFormUI({
  form,
  onSubmit,
  plateInputRef,
  noPlate,
  platePrefix,
  flags,
  vehicleTypes,
  loadingTypes,
  isExpert,
  isSpeed,
  visibleQuickTypes,
  selectedTypeCode,
  isSubmitting,
  printWarning,
}: MixedEntryFormUIProps) {
  // Helmet management logic
  const showHelmetSection = flags.helmets;
  const usesLockers = flags.lockers;
  const [availableTokens, setAvailableTokens] = useState<{ id: string; code: string }[]>([]);
  const { contains } = useFilter({ sensitivity: "base" });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "custodiedItems",
  });

  const custodiedValues = useWatch({
    control: form.control,
    name: "custodiedItems",
  });

  const helmetDelivered = fields.length > 0;
  const isMotorcycleSelected = selectedTypeCode === "MOTORCYCLE";

  const selectedLockerCodes = useMemo(
    () => (custodiedValues || []).map((item: any) => item?.identifier).filter(Boolean),
    [custodiedValues],
  );

  const getFilteredTokens = useCallback(
    (currentIndex: number) => {
      if (!availableTokens.length) return [];
      return availableTokens.filter(
        (token) =>
          !selectedLockerCodes.some(
            (code: string, idx: number) => idx !== currentIndex && code === token.code,
          ),
      );
    },
    [availableTokens, selectedLockerCodes],
  );

  useEffect(() => {
    if (showHelmetSection && usesLockers && isMotorcycleSelected) {
      fetchAvailableLockers()
        .then((lockers) => setAvailableTokens(lockers.map((l) => ({ id: l.id, code: l.code }))))
        .catch(() => setAvailableTokens([]));
    } else {
      setAvailableTokens([]);
    }
  }, [showHelmetSection, usesLockers, isMotorcycleSelected]);

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

  const { translatedErrors } = useFormErrorHandling(form);

  return (
    <div className="space-y-4">
      {/* Opciones de Placa */}
      <div className="flex gap-4 px-1">
        <Controller
          name="foreignPlate"
          control={form.control}
          render={({ field }) => (
            <Checkbox
              isSelected={field.value || false}
              onChange={field.onChange}
              className="cursor-pointer"
            >
              Placa extranjera
            </Checkbox>
          )}
        />
        <Controller
          name="noPlate"
          control={form.control}
          render={({ field }) => (
            <Checkbox
              isSelected={field.value || false}
              onChange={field.onChange}
              className="cursor-pointer"
            >
              No tiene placa
            </Checkbox>
          )}
        />
      </div>

      {/* Placa */}
      {!noPlate && (
        <PlateInput
          control={form.control}
          onSubmit={() => onSubmit()}
          plateInputRef={plateInputRef}
          noPlate={noPlate}
          platePrefix={platePrefix}
          vehicleType={selectedTypeCode}
        />
      )}

      {noPlate && (
        <Controller
          name="noPlateReason"
          control={form.control}
          render={({ field, fieldState }) => (
            <Input
              {...field}
              label="Justificación sin placa"
              placeholder="Caso especial autorizado"
              size="sm"
              isInvalid={!!fieldState.error}
              errorMessage={fieldState.error?.message}
            />
          )}
        />
      )}

      <Controller
        name="entryMode"
        control={form.control}
        render={({ field }) => {
          const opts = [
            { key: "VISITOR", label: "Visitante" },
            { key: "EMPLOYEE", label: "Empleado" },
          ];
          if (flags.agreements) opts.push({ key: "AGREEMENT", label: "Convenio" });
          if (flags.memberships) opts.push({ key: "SUBSCRIBER", label: "Abonado" });
          if (opts.length <= 2 && !flags.agreements && !flags.memberships) return <></>;
          return (
            <Select
              aria-label="Tipo de ingreso"
              value={[field.value]}
              onChange={(keys: Set<string | number | boolean | null | undefined>) => field.onChange(Array.from(keys)[0] as string)}
            >
              <Select.Trigger aria-label="Seleccionar opción">
                <Select.Value aria-label="Seleccionar opción" />
                <Select.Indicator aria-label="Seleccionar opción" />
              </Select.Trigger>
              <Select.Popover aria-label="Seleccionar opción">
                <ListBox>
                  {opts.map((o) => (
                    <ListBox.Item key={o.key} textValue={o.label}>
                      {o.label}
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          );
        }}
      />

      {/* Tipo de vehículo */}
      <div className={vehicleTypes.length === 1 ? "hidden" : "block"}>
        <label className="text-sm font-semibold text-default-700 mb-2 block">Tipo de Vehículo</label>
        <VehicleTypeSelector
          vehicleTypes={vehicleTypes}
          loadingTypes={loadingTypes}
          isExpert={isExpert}
          visibleQuickTypes={visibleQuickTypes}
          selectedTypeCode={selectedTypeCode}
          control={form.control}
          setValue={form.setValue}
          trigger={form.trigger}
        />
        {vehicleTypes.length === 0 && !loadingTypes && (
          <div className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mt-2">
            No hay tipos de vehículo disponibles. Verifique la conexión con el servidor.
          </div>
        )}
      </div>

      {/* Sección de Casco Interactiva — Solo para motocicletas */}
      {showHelmetSection && isMotorcycleSelected && (
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
                  : "border-default-200 dark:border-default-700 bg-default-50 dark:bg-default-900 text-default-600 dark:text-default-400 hover:border-default-300 dark:hover:border-default-600 hover:bg-default-50 dark:hover:bg-default-800"
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
                  : "border-default-200 dark:border-default-700 bg-default-50 dark:bg-default-900 text-default-600 dark:text-default-400 hover:border-brand-300 dark:hover:border-brand-600 hover:bg-brand-50 dark:hover:bg-default-800"
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
                  <div className="flex items-center justify-between bg-default-50 dark:bg-default-900 rounded-xl p-2 border border-default-200 dark:border-default-700">
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
                            <Autocomplete.Trigger className="bg-default-50 dark:bg-default-900">
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
                              inputWrapper: "bg-default-50 dark:bg-default-900",
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

      <WhatsAppPhoneInput control={form.control} />
      {/* Botón principal */}
      <div className="pt-2">
        <Button
          type="submit"
          size={isSpeed ? "lg" : "md"}
          isLoading={isSubmitting}
          isDisabled={!!printWarning}
          className={`w-full font-bold bg-brand text-default-50 hover:bg-brand-600 ${isSpeed ? "text-lg border border-brand" : ""}`}
          data-testid="register-entry"
        >
          {isSubmitting ? "Registrando..." : isSpeed ? "REGISTRAR INGRESO (Enter)" : "Registrar Ingreso"}
        </Button>
      </div>
    </div>
  );
}
