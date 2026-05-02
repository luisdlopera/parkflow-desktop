"use client";

import {
  useDesktopLicense,
  useDeviceFingerprint,
  translatePlan,
  translateStatus,
} from "@/lib/licensing/hooks";
import {
  Card,
  CardBody,
  CardHeader,
  Chip,
  Button,
  Divider,
  Skeleton,
} from "@heroui/react";
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
        <CardHeader className="pb-0">
          <Skeleton className="h-6 w-48 rounded" />
        </CardHeader>
        <CardBody>
          <Skeleton className="h-24 w-full rounded" />
        </CardBody>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Licencia</h3>
        </CardHeader>
        <CardBody>
          <p className="text-danger">Error al cargar estado: {error}</p>
          <Button color="primary" onPress={refresh} className="mt-2">
            Reintentar
          </Button>
        </CardBody>
      </Card>
    );
  }

  if (!status?.hasLicense) {
    return (
      <>
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Licencia</h3>
          </CardHeader>
          <CardBody className="space-y-4">
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

            <Divider />

            <div className="space-y-2">
              <p className="text-sm font-medium text-default-600">
                <Fingerprint className="w-4 h-4 inline mr-1" />
                Fingerprint del dispositivo:
              </p>
              <code className="block p-2 bg-default-100 rounded text-xs break-all">
                {fingerprintLoading ? "Cargando..." : fingerprint}
              </code>
            </div>
          </CardBody>
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
        <CardHeader className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Licencia</h3>
          <Chip color={statusColor} variant="flat">
            {translateStatus(status.isValid ? "ACTIVE" : "EXPIRED")}
          </Chip>
        </CardHeader>
        <CardBody className="space-y-4">
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
              <Chip size="sm" color="primary" variant="flat">
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

          <Divider />

          <div className="flex justify-between">
            <Button variant="flat" onPress={refresh}>
              Actualizar
            </Button>
            <Button color="primary" onPress={() => setShowActivation(true)}>
              Renovar licencia
            </Button>
          </div>

          <Divider />

          <div className="space-y-2">
            <p className="text-sm font-medium text-default-600">
              <Fingerprint className="w-4 h-4 inline mr-1" />
              Fingerprint del dispositivo:
            </p>
            <code className="block p-2 bg-default-100 rounded text-xs break-all">
              {fingerprintLoading ? "Cargando..." : fingerprint}
            </code>
          </div>
        </CardBody>
      </Card>

      <LicenseActivationDialog
        isOpen={showActivation}
        onClose={() => setShowActivation(false)}
      />
    </>
  );
}
