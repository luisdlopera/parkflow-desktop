"use client";
import { useState } from "react";
import { Card } from "@/components/bridge/Card";
import { Button } from "@/components/bridge/Button";
import { useDialog } from "@/providers/DialogProvider";
import { resetOnboarding } from "@/lib/api/onboarding.api";
import { errorService } from "@/lib/errors/error-service";
import { backupOnboardingConfig, restoreOnboardingConfig } from "@/lib/config/config-merge";
import { useAuthStore } from "@/lib/stores/auth.store";

export default function OnboardingSection({
  onNotify
}: {
  onNotify: (n: { kind: "ok" | "err" | "info"; text: string } | null) => void;
}) {
  const [loading, setLoading] = useState(false);
  const { confirm } = useDialog();
  const { user } = useAuthStore();

  return (
    <div className="space-y-6">
      <Card>
        <Card.Header>
          <h2 className="text-lg font-semibold text-foreground">Parametrización Automática</h2>
        </Card.Header>
        <Card.Content className="space-y-4">
          <p className="text-sm text-default-600">
            Puedes re-ejecutar el asistente inicial para configurar rápidamente los aspectos básicos de la operación de la empresa (Tipos de vehículo, métodos de pago, módulos, etc.).
          </p>
          <p className="text-sm text-default-600">
            Al confirmar, se reiniciará el progreso y serás redirigido al asistente inicial.
            Las configuraciones críticas del onboarding serán preservadas automáticamente.
          </p>
          <div>
            <Button
              color="primary"
              isLoading={loading}
              onPress={async () => {
                if (!(await confirm("¿Seguro que deseas re-ejecutar la parametrización inicial? Las configuraciones manuales se preservarán."))) return;
                setLoading(true);
                try {
                  const compId = user?.companyId;
                  if (!compId) {
                    setLoading(false);
                    onNotify({ kind: "err", text: "No se pudo identificar la empresa actual" });
                    return;
                  }
                  backupOnboardingConfig();
                  await resetOnboarding(compId, "Reinicio desde configuración");
                  restoreOnboardingConfig();
                  
                  // Forzar la actualización de la sesión
                  const { createAuthProvider } = await import("@/auth/runtime/createAuthProvider");
                  await (await createAuthProvider()).refresh();
                  
                  window.dispatchEvent(new CustomEvent("parkflow-refresh-runtime-config"));
                  window.location.reload();
                } catch (e) {
                  setLoading(false);
                  onNotify({ kind: "err", text: errorService.normalize(e).message });
                }
              }}
            >
              Ejecutar Parametrización Automática
            </Button>
          </div>
        </Card.Content>
      </Card>
    </div>
  );
}
