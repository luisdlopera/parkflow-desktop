"use client";

import {
  useDesktopLicense,
  useDeviceFingerprint,
  translatePlan,
  translateStatus,
} from "@/lib/licensing/hooks";
import { Skeleton, Separator } from "@heroui/react";
import { Chip } from "@/components/bridge/Chip";
import { Card } from "@/components/bridge/Card";
import { Button } from "@/components/bridge/Button";
import { useState } from "react";
import { FileBadge, Fingerprint, Building2, Clock } from "lucide-react";
import { LicenseActivationDialog } from "./LicenseActivationDialog";

/**
 * Tarjeta de estado de licencia para mostrar en configuración
 */
export function LicenseStatusCard() {
  const { status, loading, error, refresh } = useDesktopLicense();
  const { fingerprint, loading: fingerprintLoading } = useDeviceFingerprint();
  const [showActivation, setShowActivation] = useState(false);

  if (loading) {
    return (
      <Card>
        <Card.Header className="pb-0">
          <Skeleton className="h-6 w-48 rounded" />
        </Card.Header>
        <Card.Content>
          <Skeleton className="h-24 w-full rounded" />
        </Card.Content>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <Card.Header>
          <h3 className="text-lg font-semibold">Licencia</h3>
        </Card.Header>
        <Card.Content>
          <p className="text-danger">Error al cargar estado: {error}</p>
          <Button color="primary" onPress={refresh} className="mt-2">
            Reintentar
          </Button>
        </Card.Content>
      </Card>
    );
  }

  if (!status?.hasLicense) {
    return (
      <>
        <Card>
          <Card.Header>
            <h3 className="text-lg font-semibold">Licencia</h3>
          </Card.Header>
          <Card.Content className="space-y-4">
            <div className="flex items-center gap-3 text-warning">
              <FileBadge className="w-8 h-8" />
              <div>
                <p className="font-medium">Sin licencia activa</p>
                <p className="text-sm text-default-500">
                  Active una licencia para usar el sistema
                </p>
              </div>
            </div>
            <Button color="primary" onPress={() => setShowActivation(true)}>
              Activar licencia
            </Button>

            <Separator />

            <div className="space-y-2">
              <p className="text-sm font-medium text-default-600">
                <Fingerprint className="w-4 h-4 inline mr-1" />
                Fingerprint del dispositivo:
              </p>
              <code className="block p-2 bg-default-100 rounded text-xs break-all">
                {fingerprintLoading ? "Cargando..." : fingerprint}
              </code>
            </div>
          </Card.Content>
        </Card>

        <LicenseActivationDialog
          isOpen={showActivation}
          onClose={() => setShowActivation(false)}
        />
      </>
    );
  }

  const statusColor = status.isValid
    ? status.gracePeriodActive
      ? "warning"
      : "success"
    : "danger";

  return (
    <>
      <Card>
        <Card.Header className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Licencia</h3>
          <Chip color={statusColor} variant="soft">
            {translateStatus(status.isValid ? "ACTIVE" : "EXPIRED")}
          </Chip>
        </Card.Header>
        <Card.Content className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-default-500">
                <Building2 className="w-4 h-4 inline mr-1" />
                Empresa
              </p>
              <p className="font-medium">{status.companyName}</p>
            </div>

            <div className="space-y-1">
              <p className="text-sm text-default-500">Plan</p>
              <Chip size="sm" color="primary" variant="soft">
                {translatePlan(status.plan ?? "LOCAL")}
              </Chip>
            </div>

            <div className="space-y-1">
              <p className="text-sm text-default-500">
                <Clock className="w-4 h-4 inline mr-1" />
                Vencimiento
              </p>
              <p className="font-medium">
                {status.expiresAt
                  ? new Date(status.expiresAt).toLocaleDateString("es-CO")
                  : "N/A"}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-sm text-default-500">Días restantes</p>
              <p
                className={`font-medium ${
                  (status.daysRemaining ?? 0) <= 7 ? "text-danger" : ""
                }`}
              >
                {status.daysRemaining ?? 0}
              </p>
            </div>
          </div>

          {status.gracePeriodActive && (
            <div className="p-3 bg-warning-50 border border-warning-200 rounded-lg">
              <p className="text-warning-700 text-sm">
                <strong>Período de gracia activo:</strong> Su licencia está en
                período de gracia. Bloqueo en {status.daysUntilBlock ?? 0} días.
              </p>
            </div>
          )}

          <Separator />

          <div className="flex justify-between">
            <Button variant="tertiary" onPress={refresh}>
              Actualizar
            </Button>
            <Button color="primary" onPress={() => setShowActivation(true)}>
              Renovar licencia
            </Button>
          </div>

          <Separator />

          <div className="space-y-2">
            <p className="text-sm font-medium text-default-600">
              <Fingerprint className="w-4 h-4 inline mr-1" />
              Fingerprint del dispositivo:
            </p>
            <code className="block p-2 bg-default-100 rounded text-xs break-all">
              {fingerprintLoading ? "Cargando..." : fingerprint}
            </code>
          </div>
        </Card.Content>
      </Card>

      <LicenseActivationDialog
        isOpen={showActivation}
        onClose={() => setShowActivation(false)}
      />
    </>
  );
}
