"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Input,
  Button,
  Textarea,
  Switch,
  Card,
  CardBody,
  Divider,
  Select,
  SelectItem,
} from "@heroui/react";
import {
  fetchConfigurationSites,
  fetchConfigurationOperationalParameters,
  putConfigurationOperationalParameters,
} from "@/lib/settings-api";
import { operationalParameterSchema, type OperationalParameterSchema } from "@/modules/settings/schemas";
import type { ParkingSiteRow } from "@/modules/settings/types";

export default function OperacionPage() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [sites, setSites] = useState<ParkingSiteRow[]>([]);
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
        setError(e instanceof Error ? e.message : "Error cargando sedes");
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
        setError(e instanceof Error ? e.message : "Error cargando parámetros");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [reset, siteId]);

  const onSubmit = async (values: OperationalParameterSchema) => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      if (!siteId) {
        setError("Selecciona una sede para guardar los parámetros operativos");
        return;
      }
      await putConfigurationOperationalParameters(siteId, { ...values } as Record<string, unknown>);
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error guardando");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <h1 className="text-2xl font-bold text-slate-900">Parámetros Operativos</h1>
        <p className="mt-4 text-sm text-slate-500 italic">Cargando configuración...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Parámetros Operativos</h1>
        <p className="text-sm text-slate-500 mt-1">Configuración global de la operación del parqueadero.</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <Select
          label="Sede"
          placeholder="Selecciona una sede"
          variant="flat"
          className="max-w-xl"
          selectedKeys={siteId ? [siteId] : []}
          onSelectionChange={(keys) => setSiteId(Array.from(keys)[0] as string)}
          isDisabled={catalogLoading || sites.length <= 1}
        >
          {sites.map((site) => (
            <SelectItem key={site.id} textValue={`${site.code} - ${site.name}`}>
              {`${site.code} - ${site.name}`}
            </SelectItem>
          ))}
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
      
      {success && (
        <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 border border-emerald-100">
          Parámetros guardados correctamente.
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card shadow="sm" className="border border-slate-200">
          <CardBody className="p-6 space-y-8">
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
                      <Switch isSelected={field.value} onValueChange={field.onChange} color="primary" />
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
                      <Switch isSelected={field.value} onValueChange={field.onChange} color="primary" />
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
                      <Switch isSelected={field.value} onValueChange={field.onChange} color="primary" />
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
                      <Switch isSelected={field.value} onValueChange={field.onChange} color="primary" />
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
                      <Switch isSelected={field.value} onValueChange={field.onChange} color="primary" />
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
                      <Switch isSelected={field.value} onValueChange={field.onChange} color="primary" />
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
                      <Switch isSelected={field.value} onValueChange={field.onChange} color="primary" />
                    </div>
                  )}
                />
              </div>
            </div>

            <Divider />

            <div className="grid gap-6 sm:grid-cols-2">
              <Input
                {...register("toleranceMinutes", { valueAsNumber: true })}
                label="Minutos de tolerancia"
                type="number"
                variant="flat"
                errorMessage={errors.toleranceMinutes?.message}
                isInvalid={!!errors.toleranceMinutes}
              />
              <Input
                {...register("maxTimeNoCharge", { valueAsNumber: true })}
                label="Tiempo máximo sin cobro (min)"
                type="number"
                variant="flat"
              />
              <div className="col-span-full">
                <Textarea
                  {...register("legalMessage")}
                  label="Mensaje legal en ticket"
                  placeholder="Este ticket es un contrato..."
                  variant="flat"
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
                isLoading={saving}
              >
                Guardar parámetros
              </Button>
            </div>
          </CardBody>
        </Card>
      </form>
    </div>
  );
}
