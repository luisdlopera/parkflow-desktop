"use client";

import { useDesktopLicense, getLicenseStatusColor } from "@/lib/licensing/hooks";
import { Alert, Button } from "@heroui/react";
import { useState } from "react";
import { LicenseActivationDialog } from "./LicenseActivationDialog";

/**
 * Banner de licencia que aparece cuando:
 * - La licencia está por expirar (< 14 días)
 * - La licencia está en período de gracia
 * - La licencia está expirada
 */
export function LicenseBanner() {
  const { status, loading } = useDesktopLicense();
  const [showActivation, setShowActivation] = useState(false);

  if (loading || !status) return null;

  // No mostrar si no hay licencia o es válida sin advertencias
  if (!status.hasLicense || (!status.showRenewalBanner && !status.gracePeriodActive)) {
    return null;
  }

  const { color, label } = getLicenseStatusColor(
    status.daysRemaining ?? 0,
    status.gracePeriodActive
  );

  // Mensaje según estado
  let message = status.statusMessage;
  let description = "";

  if (status.gracePeriodActive) {
    description = `Su período de gracia termina en ${status.daysUntilBlock ?? 0} días. Renueve ahora para evitar el bloqueo.`;
  } else if (status.daysRemaining && status.daysRemaining <= 7) {
    description = "Renuebe su licencia pronto para evitar interrupciones.";
  } else if (status.daysRemaining && status.daysRemaining <= 14) {
    description = "Su licencia vence pronto. Considere renovarla.";
  }

  return (
    <>
      <Alert
        color={color}
        variant="solid"
        className="rounded-none"
        hideIcon
        description={description}
        endContent={
          <div className="flex gap-2">
            {status.gracePeriodActive && (
              <Button
                size="sm"
                color="danger"
                variant="flat"
                onPress={() => setShowActivation(true)}
              >
                Renovar ahora
              </Button>
            )}
            {!status.isValid && (
              <Button
                size="sm"
                color="primary"
                variant="flat"
                onPress={() => setShowActivation(true)}
              >
                Activar licencia
              </Button>
            )}
          </div>
        }
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold">{message}</span>
          <span className="text-sm opacity-80">({label})</span>
        </div>
      </Alert>

      <LicenseActivationDialog
        isOpen={showActivation}
        onClose={() => setShowActivation(false)}
      />
    </>
  );
}
