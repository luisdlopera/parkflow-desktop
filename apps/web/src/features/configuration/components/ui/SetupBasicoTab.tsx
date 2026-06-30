'use client';

import { useState, useEffect, useCallback } from 'react';
import { Tabs, ListBox, Spinner } from '@heroui/react';
import { Time } from "@internationalized/date";
import { TimeInput } from '@/components/bridge/TimeInput';
import { Card } from '@/components/bridge/Card';
import { Button } from '@/components/bridge/Button';
import { Input } from '@/components/bridge/Input';
import { Select } from '@/components/bridge/Select';
import { Checkbox } from '@/components/bridge/Checkbox';
import { useConfigurationApi } from '@/features/configuration/hooks/useConfigurationApi';
import { errorService } from '@/lib/errors/error-service';

interface SetupBasicoTabProps {
  companyId: string;
}

function safeParseInt(val: string, fallback: number): number {
  const n = parseInt(val, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function toTimeInput(h: number, m: number): string {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const parseTimeString = (timeStr?: string | unknown) => {
  if (typeof timeStr !== "string") return new Time(0, 0);
  const [hours, minutes] = timeStr.split(":").map(Number);
  if (isNaN(hours) || isNaN(minutes)) return new Time(0, 0);
  return new Time(hours, minutes);
};

const formatTime = (time: any) => {
  if (!time) return "00:00";
  if (time.target && typeof time.target.value === "string") return time.target.value;
  if (time.hour !== undefined && time.minute !== undefined) {
    return `${time.hour.toString().padStart(2, '0')}:${time.minute.toString().padStart(2, '0')}`;
  }
  return "00:00";
};

export function SetupBasicoTab({ companyId }: SetupBasicoTabProps) {
  const api = useConfigurationApi();
  const [activeSection, setActiveSection] = useState<string>('capacity');

  // Capacity state
  const [capacity, setCapacity] = useState(20);
  const [capacityInput, setCapacityInput] = useState('20');
  const [controlSlots, setControlSlots] = useState(false);
  const [allowLowerCapacity, setAllowLowerCapacity] = useState(false);

  // Shifts state
  const [shiftsEnabled, setShiftsEnabled] = useState(false);
  const [dayShiftStart, setDayShiftStart] = useState('06:00');
  const [dayShiftEnd, setDayShiftEnd] = useState('18:00');

  // Region state
  const [countryCode, setCountryCode] = useState('CO');

  // Helmet state
  const [helmetMode, setHelmetMode] = useState('NONE');
  const [lockerCount, setLockerCount] = useState('0');

  // UI state
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const showSuccess = useCallback((msg: string) => {
    setSaveSuccess(msg);
    setError(null);
    setTimeout(() => setSaveSuccess(null), 3000);
  }, []);

  const showError = useCallback((msg: string) => {
    setError(msg);
    setSaveSuccess(null);
  }, []);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [capacityData, shiftsData, regionData, helmetData] = await Promise.all([
          api.getCapacity(companyId).catch(() => null),
          api.getShifts(companyId).catch(() => null),
          api.getRegion(companyId).catch(() => null),
          api.getHelmetHandling(companyId).catch(() => null),
        ]);

        if (capacityData?.totalCapacity != null) {
          const cap = capacityData.totalCapacity;
          setCapacity(cap);
          setCapacityInput(String(cap));
          setControlSlots(capacityData.controlSlots || false);
          setAllowLowerCapacity(capacityData.allowLowerCapacity || false);
        }
        if (shiftsData) {
          setShiftsEnabled(shiftsData.shiftsEnabled || false);
          setDayShiftStart(shiftsData.dayShiftStart || '06:00');
          setDayShiftEnd(shiftsData.dayShiftEnd || '18:00');
        }
        if (regionData) {
          setCountryCode(regionData.countryCode || 'CO');
        }
        if (helmetData) {
          setHelmetMode(helmetData.currentMode || 'NONE');
          setLockerCount(String(helmetData.activeLockerCount || helmetData.inactiveLockerCount || 0));
        }
      } catch (err) {
        showError('Error al cargar configuración inicial');
      } finally {
        setInitialLoading(false);
      }
    };

    loadData();
  }, [companyId, api, showError]);

  const handleSaveCapacity = async () => {
    const total = safeParseInt(capacityInput, -1);
    if (total < 0) {
      showError('La capacidad debe ser un número válido mayor o igual a 0');
      return;
    }
    setLoading(true);
    try {
      await api.updateCapacity(companyId, { totalCapacity: total, controlSlots, allowLowerCapacity });
      setCapacity(total);
      showSuccess('Capacidad guardada exitosamente');
    } catch (err) {
      showError(errorService.normalize(err).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveShifts = async () => {
    setLoading(true);
    try {
      await api.updateShifts(companyId, {
        shiftsEnabled,
        dayShiftStart,
        dayShiftEnd,
        nightShiftStart: '18:00',
        nightShiftEnd: '06:00',
      });
      showSuccess('Turnos guardados exitosamente');
    } catch (err) {
      showError(errorService.normalize(err).message);
    } finally {
      setLoading(false);
    }
  };

  const getPlatePatternForCountry = (code: string): string => {
    const patterns: Record<string, string> = {
      CO: '^[A-Z]{3}[0-9]{3}$',
      MX: '^[A-Z]{3}[0-9]{4}$',
      AR: '^[A-Z]{2}[0-9]{3}[A-Z]{2}$',
      CL: '^[A-Z]{4}[0-9]{2}$',
      PE: '^[A-Z]{3}[0-9]{3}$',
      US: '^[A-Z0-9]{1,8}$',
    };
    return patterns[code] || '^[A-Z0-9]{3,12}$';
  };

  const handleSaveRegion = async () => {
    setLoading(true);
    try {
      await api.updateRegion(companyId, {
        countryCode,
        platePattern: getPlatePatternForCountry(countryCode),
        timezone: 'America/Bogota',
      });
      showSuccess('Región guardada exitosamente');
    } catch (err) {
      showError(errorService.normalize(err).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveHelmet = async () => {
    setLoading(true);
    try {
      await api.updateHelmetHandling(companyId, { 
        mode: helmetMode,
        lockerCount: helmetMode === 'LOCKERS' ? safeParseInt(lockerCount, 0) : undefined 
      });
      showSuccess('Configuración de cascos guardada exitosamente');
    } catch (err) {
      showError(errorService.normalize(err).message);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3">
          <Spinner size="lg" />
          <span className="text-sm text-default-500">Cargando configuración...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {saveSuccess && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {saveSuccess}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {error}
        </div>
      )}

      <Tabs
        selectedKey={activeSection}
        onSelectionChange={(key) => setActiveSection(key as string)}
        className="w-full"
      >
        <Tabs.ListContainer>
          <Tabs.List aria-label="Configuración básica">
            <Tabs.Tab id="capacity">Capacidad<Tabs.Indicator /></Tabs.Tab>
            <Tabs.Tab id="shifts">Turnos<Tabs.Indicator /></Tabs.Tab>
            <Tabs.Tab id="region">Región<Tabs.Indicator /></Tabs.Tab>
            <Tabs.Tab id="helmet">Cascos<Tabs.Indicator /></Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>

        <Tabs.Panel className="pt-6" id="capacity">
          <Card className="border border-default-200 p-6 space-y-4 rounded-xl">
            <h3 className="text-lg font-semibold text-foreground">Capacidad del Parqueadero</h3>
            <Input
              label="Espacios totales"
              type="number"
              min={0}
              value={capacityInput}
              onChange={(e) => setCapacityInput(e.target.value)}
              disabled={loading}
            />
            <p className="text-sm text-default-500">
              {capacity} espacios configurados
            </p>
            <div className="flex flex-col gap-3 py-2">
              <Checkbox isSelected={controlSlots} onValueChange={setControlSlots} isDisabled={loading}>
                Habilitar control de cupos por tipo de vehículo
              </Checkbox>
              <Checkbox isSelected={allowLowerCapacity} onValueChange={setAllowLowerCapacity} isDisabled={loading || !controlSlots}>
                Permitir que la suma de cupos sea menor a la capacidad total
              </Checkbox>
            </div>
            <Button onPress={handleSaveCapacity} isDisabled={loading}>
              Guardar Capacidad
            </Button>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel className="pt-6" id="shifts">
          <Card className="border border-default-200 p-6 space-y-4 rounded-xl">
            <h3 className="text-lg font-semibold text-foreground">Configuración de Turnos</h3>
            <Checkbox
              isSelected={shiftsEnabled}
              onValueChange={setShiftsEnabled}
              isDisabled={loading}
            >
              Habilitar control de turnos
            </Checkbox>

            {shiftsEnabled && (
              <div className="grid grid-cols-2 gap-4">
                <TimeInput
                  label="Turno Día - Inicio"
                  // @ts-expect-error type version mismatch between HeroUI and app
                  value={parseTimeString(dayShiftStart)}
                  onChange={(v) => v && setDayShiftStart(formatTime(v))}
                  isDisabled={loading}
                />
                <TimeInput
                  label="Turno Día - Fin"
                  // @ts-expect-error type version mismatch between HeroUI and app
                  value={parseTimeString(dayShiftEnd)}
                  onChange={(v) => v && setDayShiftEnd(formatTime(v))}
                  isDisabled={loading}
                />
              </div>
            )}

            <Button onPress={handleSaveShifts} isDisabled={loading}>
              Guardar Turnos
            </Button>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel className="pt-6" id="region">
          <Card className="border border-default-200 p-6 space-y-4 rounded-xl">
            <h3 className="text-lg font-semibold text-foreground">Región y Localización</h3>
            <Select
              label="País"
              value={[countryCode]}
              onChange={(keys: Set<string | number | boolean | null | undefined>) => {
                const val = Array.from(keys)[0] as string | undefined;
                if (val) setCountryCode(val);
              }}
              isDisabled={loading}
              className="w-full max-w-xs"
            >
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  <ListBox.Item key="CO" textValue="Colombia">Colombia<ListBox.ItemIndicator /></ListBox.Item>
                  <ListBox.Item key="MX" textValue="México">México<ListBox.ItemIndicator /></ListBox.Item>
                  <ListBox.Item key="PE" textValue="Perú">Perú<ListBox.ItemIndicator /></ListBox.Item>
                  <ListBox.Item key="AR" textValue="Argentina">Argentina<ListBox.ItemIndicator /></ListBox.Item>
                </ListBox>
              </Select.Popover>
            </Select>

            <Button onPress={handleSaveRegion} isDisabled={loading}>
              Guardar Región
            </Button>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel className="pt-6" id="helmet">
          <Card className="border border-default-200 p-6 space-y-4 rounded-xl">
            <h3 className="text-lg font-semibold text-foreground">Manejo de Cascos</h3>
            <Select
              label="Modo actual"
              value={[helmetMode]}
              onChange={(keys: Set<string | number | boolean | null | undefined>) => {
                const val = Array.from(keys)[0] as string | undefined;
                if (val) setHelmetMode(val);
              }}
              isDisabled={loading}
              className="w-full max-w-xs"
            >
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  <ListBox.Item key="NONE" textValue="No se requiere">No se requiere<ListBox.ItemIndicator /></ListBox.Item>
                  <ListBox.Item key="MANUAL" textValue="Manual">Manual<ListBox.ItemIndicator /></ListBox.Item>
                  <ListBox.Item key="LOCKERS" textValue="Casilleros">Casilleros<ListBox.ItemIndicator /></ListBox.Item>
                </ListBox>
              </Select.Popover>
            </Select>

            {helmetMode === 'LOCKERS' && (
              <Input
                label="Cantidad de casilleros / tokens"
                type="number"
                min={1}
                max={9999}
                value={lockerCount}
                onChange={(e) => setLockerCount(e.target.value)}
                isDisabled={loading}
              />
            )}

            <Button onPress={handleSaveHelmet} isDisabled={loading}>
              Guardar Configuración
            </Button>
          </Card>
        </Tabs.Panel>
      </Tabs>
    </div>
  );
}
