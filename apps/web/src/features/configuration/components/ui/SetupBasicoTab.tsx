'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/bridge/Card';
import { Button } from '@/components/bridge/Button';
import { Input } from '@/components/bridge/Input';
import { Select } from '@/components/bridge/Select';
import { ListBox } from '@heroui/react';
import { Checkbox } from '@/components/bridge/Checkbox';
import { useConfigurationApi } from '@/features/configuration/hooks/useConfigurationApi';

interface SetupBasicoTabProps {
  companyId: string;
}

export function SetupBasicoTab({ companyId }: SetupBasicoTabProps) {
  const api = useConfigurationApi();
  const [activeSection, setActiveSection] = useState<'capacity' | 'shifts' | 'region' | 'helmet'>(
    'capacity'
  );
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Capacity state
  const [capacity, setCapacity] = useState(20);

  // Shifts state
  const [shiftsEnabled, setShiftsEnabled] = useState(false);
  const [dayShiftStart, setDayShiftStart] = useState('06:00');
  const [dayShiftEnd, setDayShiftEnd] = useState('18:00');

  // Region state
  const [countryCode, setCountryCode] = useState('CO');

  // Helmet state
  const [helmetMode, setHelmetMode] = useState('NONE');

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

        if (capacityData) setCapacity(capacityData.totalCapacity || 20);
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
        }
      } catch (err) {
        console.error('Failed to load configuration', err);
      }
    };

    loadData();
  }, [companyId, api]);

  const handleSaveCapacity = async () => {
    setLoading(true);
    try {
      await api.updateCapacity(companyId, { totalCapacity: parseInt(capacity.toString()) });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save capacity', err);
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
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save shifts', err);
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
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save region', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveHelmet = async () => {
    setLoading(true);
    try {
      await api.updateHelmetHandling(companyId, {
        mode: helmetMode,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save helmet handling', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {saveSuccess && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
          ✓ Guardado exitosamente
        </div>
      )}

      {api.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          ✗ Error: {api.error}
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex gap-2 border-b border-slate-200">
        {['capacity', 'shifts', 'region', 'helmet'].map((section) => (
          <button
            key={section}
            onClick={() => setActiveSection(section as any)}
            className={`px-4 py-2 font-medium capitalize transition-colors ${
              activeSection === section
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {section === 'helmet' ? 'Cascos' : section === 'capacity' ? 'Capacidad' : section === 'shifts' ? 'Turnos' : 'Región'}
          </button>
        ))}
      </div>

      {/* Capacity Section */}
      {activeSection === 'capacity' && (
        <Card className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">Capacidad de Parqueadero</h3>
          <div className="space-y-2">
            <label className="block text-sm font-medium">Espacios Totales</label>
            <Input
              type="number"
              value={capacity.toString()}
              onChange={(e) => setCapacity(parseInt(e.target.value))}
              disabled={loading} aria-label="Entrada de texto"
            />
          </div>
          <p className="text-sm text-slate-500">Tienes {capacity} espacios activos, 0 inactivos</p>
          <Button onClick={handleSaveCapacity} disabled={loading}>
            Guardar Capacidad
          </Button>
        </Card>
      )}

      {/* Shifts Section */}
      {activeSection === 'shifts' && (
        <Card className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">Configuración de Turnos</h3>
          <div className="space-y-2">
            <Checkbox
              isSelected={shiftsEnabled}
              onValueChange={setShiftsEnabled}
              isDisabled={loading}
              size="sm"
            >
              Habilitar control de turnos
            </Checkbox>
          </div>

          {shiftsEnabled && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Turno Día - Inicio</label>
                  <Input
                    type="time"
                    value={dayShiftStart}
                    onChange={(e) => setDayShiftStart(e.target.value)}
                    disabled={loading} aria-label="Entrada de texto"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Turno Día - Fin</label>
                  <Input
                    type="time"
                    value={dayShiftEnd}
                    onChange={(e) => setDayShiftEnd(e.target.value)}
                    disabled={loading} aria-label="Entrada de texto"
                  />
                </div>
              </div>
            </>
          )}

          <Button onClick={handleSaveShifts} disabled={loading}>
            Guardar Turnos
          </Button>
        </Card>
      )}

      {/* Region Section */}
      {activeSection === 'region' && (
        <Card className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">Región y Localización</h3>
          <div className="space-y-2">
            <label className="block text-sm font-medium">País</label>
            <Select
              aria-label="País"
              value={[countryCode]}
              onChange={(keys) => {
                const val = Array.from(keys)[0] as string | undefined;
                if (val) setCountryCode(val);
              }}
              isDisabled={loading}
              className="w-full"
            >
              <Select.Trigger aria-label="País">
                <Select.Value aria-label="País" />
                <Select.Indicator aria-label="País" />
              </Select.Trigger>
              <Select.Popover aria-label="País">
                <ListBox>
                  <ListBox.Item key="CO" textValue="Colombia">Colombia</ListBox.Item>
                  <ListBox.Item key="MX" textValue="México">México</ListBox.Item>
                  <ListBox.Item key="PE" textValue="Perú">Perú</ListBox.Item>
                  <ListBox.Item key="AR" textValue="Argentina">Argentina</ListBox.Item>
                </ListBox>
              </Select.Popover>
            </Select>
          </div>
          <Button onClick={handleSaveRegion} disabled={loading}>
            Guardar Región
          </Button>
        </Card>
      )}

      {/* Helmet Section */}
      {activeSection === 'helmet' && (
        <Card className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">Manejo de Cascos</h3>
          <div className="space-y-2">
            <label className="block text-sm font-medium">Modo Actual</label>
            <Select
              aria-label="Modo Actual"
              value={[helmetMode]}
              onChange={(keys) => {
                const val = Array.from(keys)[0] as string | undefined;
                if (val) setHelmetMode(val);
              }}
              isDisabled={loading}
              className="w-full"
            >
              <Select.Trigger aria-label="Modo Actual">
                <Select.Value aria-label="Modo Actual" />
                <Select.Indicator aria-label="Modo Actual" />
              </Select.Trigger>
              <Select.Popover aria-label="Modo Actual">
                <ListBox>
                  <ListBox.Item key="NONE" textValue="No se requiere">No se requiere</ListBox.Item>
                  <ListBox.Item key="MANUAL" textValue="Manual">Manual</ListBox.Item>
                  <ListBox.Item key="LOCKERS" textValue="Casilleros">Casilleros</ListBox.Item>
                 </ListBox>
              </Select.Popover>
            </Select>
          </div>

          <Button onClick={handleSaveHelmet} disabled={loading}>
            Guardar Configuración
          </Button>
        </Card>
      )}
    </div>
  );
}
