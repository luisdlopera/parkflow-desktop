"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/bridge/Card";
import { Button } from "@/components/bridge/Button";
import { PageBackButton } from "@/components/layout/PageBackButton";
import { fetchDevices, revokeDevice, type DeviceInfo } from "@/lib/api/profile.api";
import { getUserFriendlyErrorMessage, FrontendActionError } from "@/lib/errors/error-messages";
import { useAsyncAction } from "@/lib/errors/use-async-action";
import { Smartphone, Laptop, ShieldAlert, CheckCircle2, XCircle } from "lucide-react";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("es-CO", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function DispositivosPage() {
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revokingDeviceId, setRevokingDeviceId] = useState<string | null>(null);

  const loadDevices = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const data = await fetchDevices();
      setDevices(data);
    } catch (e) {
      setError(getUserFriendlyErrorMessage(e, FrontendActionError.LOAD_DATA));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDevices(false);
  }, []);

  const revoke = useAsyncAction<DeviceInfo>({
    showErrorToast: true,
    errorContext: FrontendActionError.SAVE_DATA,
    onSuccess: () => {
      void loadDevices();
    }
  });

  const handleRevoke = async (deviceId: string) => {
    if (confirm("¿Estás seguro de que deseas revocar el acceso a este dispositivo? Las sesiones activas de este dispositivo serán cerradas inmediatamente.")) {
      setRevokingDeviceId(deviceId);
      try {
        await revoke.run(() => revokeDevice(deviceId));
      } finally {
        setRevokingDeviceId(null);
      }
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex flex-wrap items-center gap-3">
        <PageBackButton />
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-amber-700/80">Seguridad</p>
          <h1 className="text-2xl sm:text-3xl font-semibold text-foreground dark:text-neutral-100">
            Dispositivos y Sesiones
          </h1>
          <p className="mt-2 text-sm text-default-600 dark:text-neutral-400">
            Gestiona los dispositivos autorizados para acceder a tu cuenta y revoca sesiones activas si es necesario.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 text-rose-800 text-sm rounded-xl border border-rose-200 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Card className="border border-default-200">
        <Card.Header className="flex justify-between items-center pb-2">
          <div>
            <h2 className="text-lg font-semibold text-foreground dark:text-neutral-100">Dispositivos Autorizados</h2>
            <p className="text-xs text-default-500">Historial de equipos vinculados a tu empresa</p>
          </div>
          <Button size="sm" variant="ghost" onPress={loadDevices} isDisabled={loading}>
            Actualizar
          </Button>
        </Card.Header>

        <Card.Content>
          {loading ? (
            <div className="py-8 text-center text-default-500">Cargando dispositivos...</div>
          ) : devices.length === 0 ? (
            <div className="py-8 text-center text-default-500">No se encontraron dispositivos vinculados.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-default-100 text-default-400 font-medium">
                    <th className="py-3 px-4">Dispositivo</th>
                    <th className="py-3 px-4">Plataforma</th>
                    <th className="py-3 px-4">Estado</th>
                    <th className="py-3 px-4">Última Conexión</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-default-50">
                  {devices.map((device) => {
                    const isMobile = device.platform?.toLowerCase().includes("android") || device.platform?.toLowerCase().includes("ios");
                    return (
                      <tr key={device.id} className="hover:bg-default-50/50 transition-colors">
                        <td className="py-4 px-4 font-medium text-foreground dark:text-neutral-200">
                          <div className="flex items-center gap-2">
                            {isMobile ? (
                              <Smartphone className="w-4 h-4 text-default-400" />
                            ) : (
                              <Laptop className="w-4 h-4 text-default-400" />
                            )}
                            <div>
                              <p>{device.displayName || "Dispositivo Desconocido"}</p>
                              <p className="text-xs text-default-400 font-mono select-all">{device.deviceId}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-default-600 dark:text-neutral-400 capitalize">
                          {device.platform || "Desconocida"}
                        </td>
                        <td className="py-4 px-4">
                          {device.authorized ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Autorizado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-1 rounded-full">
                              <XCircle className="w-3.5 h-3.5" /> Revocado
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-default-600 dark:text-neutral-400">
                          {formatDate(device.lastSeenAt)}
                        </td>
                        <td className="py-4 px-4 text-right">
                          {device.authorized && (
                            <Button
                              size="sm"
                              color="danger"
                              variant="ghost"
                              onPress={() => void handleRevoke(device.deviceId)}
                              isLoading={revoke.isLoading && revokingDeviceId === device.deviceId}
                            >
                              Revocar acceso
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card.Content>
      </Card>
    </div>
  );
}
