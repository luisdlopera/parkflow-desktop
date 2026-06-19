"use client";

import { ConfigPageHeader } from "@/features/configuration/components/ui/ConfigPageHeader";
import { useState, useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Separator, ListBox } from "@heroui/react";
import { Card } from "@/components/bridge/Card";
import { Select } from "@/components/bridge/Select";
import { Button } from "@/components/bridge/Button";
import { Switch } from "@/components/bridge/Switch";
import { Input } from "@/components/bridge/Input";
import { TextArea } from "@/components/bridge/TextArea";
import {
  fetchConfigurationSites,
  fetchConfigurationOperationalParameters,
  putConfigurationOperationalParameters,
} from "@/lib/settings-api";
import { operationalParameterSchema, type OperationalParameterSchema } from "@/modules/settings/schemas";
import type { ParkingSiteRow } from "@/modules/settings/types";
import { getUserFriendlyErrorMessage, FrontendActionError } from "@/lib/errors/error-messages";
import { useAsyncAction } from "@/lib/errors/use-async-action";

export default function OperacionPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sites, setSites] = useState<ParkingSiteRow[]>([]);

  const saveOp = useAsyncAction<unknown>({
    successMsg: "Parámetros guardados correctamente",
    errorContext: FrontendActionError.SAVE_DATA,
  });
  const [siteId, setSiteId] = useState("");
  const [catalogLoading, setCatalogLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<OperationalParameterSchema>({ resolver: zodResolver(operationalParameterSchema) });
  const selectedSiteLabel = useMemo(
    () => sites.find((site) => site.id === siteId)?.name ?? "Sin sede seleccionada",
    [sites, siteId]
  );

  useEffect(() => {
    const loadCatalog = async () => {
      setCatalogLoading(true);
      try {
        const sitePage = await fetchConfigurationSites({ active: true, page: 0, size: 200 });
        const activeSites = sitePage.content ?? [];
        setSites(activeSites);
        if (activeSites.length === 1) {
          setSiteId(activeSites[0].id);
        }
      } catch (e) {
        setError(getUserFriendlyErrorMessage(e, FrontendActionError.LOAD_DATA));
      } finally {
        setCatalogLoading(false);
      }
    };

    void loadCatalog();
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!siteId) {
        return;
      }
      setLoading(true);
      try {
        const row = await fetchConfigurationOperationalParameters(siteId);
        reset({
          allowEntryWithoutPrinter: row.allowEntryWithoutPrinter,
          allowExitWithoutPayment: row.allowExitWithoutPayment,
          allowReprint: row.allowReprint,
          allowVoid: row.allowVoid,
          requirePhotoEntry: row.requirePhotoEntry,
          requirePhotoExit: row.requirePhotoExit,
          toleranceMinutes: row.toleranceMinutes,
          maxTimeNoCharge: row.maxTimeNoCharge,
          legalMessage: row.legalMessage ?? "",
          offlineModeEnabled: row.offlineModeEnabled,
        });
      } catch (e) {
        setError(getUserFriendlyErrorMessage(e, FrontendActionError.LOAD_DATA));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [reset, siteId]);

  const onSubmit = async (values: OperationalParameterSchema) => {
    if (!siteId) {
      setError("Selecciona una sede para guardar los parámetros operativos");
      return;
    }
    setError(null);
    await saveOp.run(() =>
      putConfigurationOperationalParameters(siteId, { ...values } as Record<string, unknown>)
    );
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <ConfigPageHeader title="Parámetros Operativos" groupLabel="Operación" sectionLabel="Reglas y parámetros operativos" />
        <p className="mt-4 text-sm text-slate-500 italic">Cargando configuración...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <ConfigPageHeader 
        title="Parámetros Operativos" 
        description="Configuración global de la operación del parqueadero." 
        groupLabel="Operación" 
        sectionLabel="Reglas y parámetros operativos" 
      />

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <Select
          label="Sede"
          placeholder="Selecciona una sede"
          
          className="max-w-xl"
          value={siteId ? [siteId] : []}
          onChange={(keys) => setSiteId(Array.from(keys)[0] as string)}
          isDisabled={catalogLoading || sites.length <= 1}
        >
      <Select.Trigger aria-label="Seleccionar opción">
        <Select.Value aria-label="Seleccionar opción" />
        <Select.Indicator aria-label="Seleccionar opción" />
      </Select.Trigger>
      <Select.Popover aria-label="Seleccionar opción">
        <ListBox>

          {sites.map((site) => (
            <ListBox.Item key={site.id} textValue={`${site.code} - ${site.name}`}>
              {`${site.code} - ${site.name}`}
            </ListBox.Item>
          ))}
        
        </ListBox>
      </Select.Popover>
    </Select>
        <p className="mt-1 text-xs text-slate-500">
          Se editarán los parámetros de: <span className="font-medium text-slate-700">{selectedSiteLabel}</span>.
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-100">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit(onSubmit)}>
        <Card border border-default-200="sm" className="border border-slate-200">
          <Card.Content className="p-6 space-y-8">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Permisos y Funciones</h3>
                
                <Controller
                  name="allowEntryWithoutPrinter"
                  control={control}
                  render={({ field }) => (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-700">Entrada sin impresora</p>
                        <p className="text-xs text-slate-500">Permitir ingreso si falla la impresión</p>
                      </div>
                      <Switch isSelected={field.value} onChange={field.onChange} aria-label="Alternar opción" />
                    </div>
                  )}
                />

                <Controller
                  name="allowExitWithoutPayment"
                  control={control}
                  render={({ field }) => (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-700">Salida sin pago</p>
                        <p className="text-xs text-slate-500">Para cortesías o convenios especiales</p>
                      </div>
                      <Switch isSelected={field.value} onChange={field.onChange} aria-label="Alternar opción" />
                    </div>
                  )}
                />

                <Controller
                  name="allowReprint"
                  control={control}
                  render={({ field }) => (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-700">Permitir reimpresión</p>
                        <p className="text-xs text-slate-500">Habilitar botón de copia de ticket</p>
                      </div>
                      <Switch isSelected={field.value} onChange={field.onChange} aria-label="Alternar opción" />
                    </div>
                  )}
                />

                <Controller
                  name="allowVoid"
                  control={control}
                  render={({ field }) => (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-700">Permitir anulación</p>
                        <p className="text-xs text-slate-500">Anular servicios ya registrados</p>
                      </div>
                      <Switch isSelected={field.value} onChange={field.onChange} aria-label="Alternar opción" />
                    </div>
                  )}
                />
              </div>

              <div className="space-y-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Validaciones y Fotos</h3>
                
                <Controller
                  name="requirePhotoEntry"
                  control={control}
                  render={({ field }) => (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-700">Foto en entrada</p>
                        <p className="text-xs text-slate-500">Obligatorio capturar imagen al ingresar</p>
                      </div>
                      <Switch isSelected={field.value} onChange={field.onChange} aria-label="Alternar opción" />
                    </div>
                  )}
                />

                <Controller
                  name="requirePhotoExit"
                  control={control}
                  render={({ field }) => (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-700">Foto en salida</p>
                        <p className="text-xs text-slate-500">Obligatorio capturar imagen al salir</p>
                      </div>
                      <Switch isSelected={field.value} onChange={field.onChange} aria-label="Alternar opción" />
                    </div>
                  )}
                />

                <Controller
                  name="offlineModeEnabled"
                  control={control}
                  render={({ field }) => (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-700">Modo offline</p>
                        <p className="text-xs text-slate-500">Habilitar operación sin internet</p>
                      </div>
                      <Switch isSelected={field.value} onChange={field.onChange} aria-label="Alternar opción" />
                    </div>
                  )}
                />
              </div>
            </div>

            <Separator />

            <div className="grid gap-6 sm:grid-cols-2">
              <Input
                {...register("toleranceMinutes", { valueAsNumber: true })}
                label="Minutos de tolerancia"
                type="number"
                
                errorMessage={errors.toleranceMinutes?.message}
                isInvalid={!!errors.toleranceMinutes}
              />
              <Input
                {...register("maxTimeNoCharge", { valueAsNumber: true })}
                label="Tiempo máximo sin cobro (min)"
                type="number"
                
              />
              <div className="col-span-full">
                <TextArea
                  {...register("legalMessage")}
                  label="Mensaje legal en ticket"
                  placeholder="Este ticket es un contrato..."
                  
                  rows={4}
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button
                type="submit"
                color="success"
                size="lg"
                className="font-bold text-white"
                isLoading={saveOp.isLoading}
              >
                Guardar parámetros
              </Button>
            </div>
          </Card.Content>
        </Card>
      </form>
    </div>
  );
}
