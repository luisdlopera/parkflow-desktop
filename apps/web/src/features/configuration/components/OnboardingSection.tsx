"use client";
import { useState } from "react";
import { Card } from "@/components/bridge/Card";
import { Button } from "@/components/bridge/Button";
import { useDialog } from "@/components/ui/DialogProvider";
import { resetOnboarding } from "@/lib/onboarding-api";
import { refreshIfNeeded } from "@/features/auth/api/auth.api";
import { loadSession, saveSession } from "@/features/auth/services/auth-storage.service";
import { currentUser } from "@/features/auth/services/auth-domain.service";
import { getUserFriendlyErrorMessage, FrontendActionError } from "@/lib/errors/error-messages";
import { backupOnboardingConfig, restoreOnboardingConfig } from "@/lib/config/config-merge";

export default function OnboardingSection({
  onNotify
}: {
  onNotify: (n: { kind: "ok" | "err" | "info"; text: string } | null) => void;
}) {
  const [loading, setLoading] = useState(false);
  const { confirm } = useDialog();

  return (
    <div className="space-y-6">
      <Card>
        <Card.Header>
          <h2 className="text-lg font-semibold text-slate-900">Parametrización Automática</h2>
        </Card.Header>
        <Card.Content className="space-y-4">
          <p className="text-sm text-slate-600">
            Puedes re-ejecutar el asistente inicial para configurar rápidamente los aspectos básicos de la operación de la empresa (Tipos de vehículo, métodos de pago, módulos, etc.).
          </p>
          <p className="text-sm text-slate-600">
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
                  const user = await currentUser();
                  const compId = user?.companyId;
                  if (!compId) {
                    setLoading(false);
                    onNotify({ kind: "err", text: "No se pudo identificar la empresa actual" });
                    return;
                  }
                  backupOnboardingConfig();
                  await resetOnboarding(compId, "Reinicio desde configuración");
                  restoreOnboardingConfig();
                  const session = await loadSession();
                  if (session) {
                    const refreshed = await refreshIfNeeded(session);
                    await saveSession({
                      ...refreshed,
                      user: { ...refreshed.user, onboardingCompleted: false }
                    });
                  }
                  window.dispatchEvent(new CustomEvent("parkflow-refresh-runtime-config"));
                  window.location.reload();
                } catch (e) {
                  setLoading(false);
                  onNotify({ kind: "err", text: getUserFriendlyErrorMessage(e, FrontendActionError.SAVE_DATA) });
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
