'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { useConfigurationApi } from '@/hooks/useConfigurationApi';

interface ModulesTabProps {
  companyId: string;
}

interface ModuleConfig {
  clientsEnabled: boolean;
  agreementsEnabled: boolean;
  monthlyEnabled: boolean;
  shiftsEnabled: boolean;
  cashEnabled: boolean;
  advancedAuditEnabled: boolean;
  licensePlan: string;
}

const MODULE_RESTRICTIONS: Record<string, string[]> = {
  SYNC: ['clients', 'agreements', 'monthly', 'shifts', 'advancedAudit'],
  PRO: ['advancedAudit'],
  ENTERPRISE: [],
};

const modules = [
  { key: 'clientsEnabled', label: 'Clientes', icon: '👥', desc: 'Gestionar perfiles de clientes y acceso' },
  { key: 'agreementsEnabled', label: 'Convenios', icon: '📋', desc: 'Crear y administrar convenios de parqueo' },
  { key: 'monthlyEnabled', label: 'Contratos Mensuales', icon: '📅', desc: 'Gestión de contratos mensuales' },
  { key: 'shiftsEnabled', label: 'Turnos', icon: '⏰', desc: 'Seguimiento de turnos de operadores' },
  { key: 'cashEnabled', label: 'Caja', icon: '💰', desc: 'Movimientos de caja y registro de cajas' },
  { key: 'advancedAuditEnabled', label: 'Auditoría Avanzada', icon: '🔐', desc: 'Logs de auditoría avanzada' },
];

export function ModulesTab({ companyId }: ModulesTabProps) {
  const api = useConfigurationApi();
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [config, setConfig] = useState<ModuleConfig | null>(null);

  useEffect(() => {
    const loadModules = async () => {
      try {
        const data = await api.getModules(companyId);
        setConfig(data);
      } catch (err) {
        console.error('Failed to load modules', err);
      }
    };

    loadModules();
  }, [companyId, api]);

  if (!config) {
    return <p className="text-sm text-slate-600">Cargando módulos...</p>;
  }

  const handleModuleToggle = async (module: keyof Omit<ModuleConfig, 'licensePlan'>, value: boolean) => {
    setLoading(true);
    try {
      const updatedConfig = { ...config, [module]: value };
      await api.updateModules(companyId, updatedConfig);
      setConfig(updatedConfig);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to update modules', err);
    } finally {
      setLoading(false);
    }
  };

  const isModuleRestricted = (module: string): boolean => {
    const restrictions = MODULE_RESTRICTIONS[config!.licensePlan] || [];
    return restrictions.includes(module);
  };

  const getPlanLabel = (): string => {
    const plan = config!.licensePlan;
    switch (plan) {
      case 'SYNC':
        return 'SYNC (Básico)';
      case 'PRO':
        return 'PRO';
      case 'ENTERPRISE':
        return 'ENTERPRISE';
      default:
        return plan;
    }
  };

  return (
    <div className="space-y-6">
      {saveSuccess && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
          ✓ Módulos actualizados exitosamente
        </div>
      )}

      {api.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          ✗ Error: {api.error}
        </div>
      )}

      <Card className="p-6">
        <div className="space-y-4 mb-6">
          <h3 className="text-lg font-semibold">Plan y Módulos Disponibles</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm">Plan actual:</span>
            <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
              {getPlanLabel()}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          {modules.map((module) => {
            const isRestricted = isModuleRestricted(module.key.replace('Enabled', '').toLowerCase());
            const isEnabled = config[module.key as keyof Omit<ModuleConfig, 'licensePlan'>];

            return (
              <div
                key={module.key}
                className={`p-4 border rounded-lg transition-opacity ${
                  isRestricted && !isEnabled ? 'opacity-60 bg-slate-50' : 'border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-xl">{module.icon}</span>
                    <div>
                      <p className="font-medium">{module.label}</p>
                      <p className="text-xs text-slate-500">{module.desc}</p>
                    </div>
                  </div>

                  {isRestricted && !isEnabled ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">🔒</span>
                    </div>
                  ) : (
                    <input
                      type="checkbox"
                      aria-label={`Habilitar ${module.label}`}
                      checked={isEnabled}
                      onChange={(e) =>
                        handleModuleToggle(
                          module.key as keyof Omit<ModuleConfig, 'licensePlan'>,
                          e.target.checked
                        )
                      }
                      disabled={loading}
                      className="rounded"
                    />
                  )}
                </div>

                {isRestricted && !isEnabled && (
                  <p className="text-xs text-blue-600 mt-2">
                    Actualiza a PRO para habilitar este módulo
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-6 border-blue-200 bg-blue-50">
        <p className="text-sm text-slate-700">
          <strong>Nota:</strong> Los cambios en módulos se aplican inmediatamente. Algunos requieren configuración adicional.
        </p>
      </Card>
    </div>
  );
}
