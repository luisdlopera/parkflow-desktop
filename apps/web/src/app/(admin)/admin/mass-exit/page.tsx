"use client";

import { useEffect, useState } from "react";
import { hasPermission } from "@/lib/services/auth-domain.service";
import { ShieldAlert } from "lucide-react";
import { useMassExit } from "@/features/vehicle-exit/hooks/useMassExit";
import { MassExitFilters } from "@/features/vehicle-exit/components/MassExitFilters";
import { MassExitConfirmModal } from "@/features/vehicle-exit/components/MassExitConfirmModal";
import { MassExitResultModal } from "@/features/vehicle-exit/components/MassExitResultModal";

export default function MassExitPage() {
  const [canAccess, setCanAccess] = useState<boolean | null>(null);
  const massExit = useMassExit();

  useEffect(() => {
    hasPermission("parking:salida_masiva").then(setCanAccess);
  }, []);

  if (canAccess === null) return null;

  if (!canAccess) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="mb-4 rounded-full bg-rose-50 p-4">
          <ShieldAlert className="w-12 h-12 text-rose-400" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Sin acceso</h2>
        <p className="text-default-500 mt-2 max-w-sm">
          Necesitas el permiso <code className="text-xs bg-default-100 px-1.5 py-0.5 rounded">parking:salida_masiva</code> para usar esta función.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-violet-600 font-medium">
          Operación Administrativa
        </p>
        <h1 className="text-3xl font-bold text-foreground mt-1">Salida Masiva de Vehículos</h1>
        <p className="text-default-500 mt-1 max-w-2xl">
          Procesa la salida simultánea de múltiples vehículos activos con control de cobro, filtros avanzados y trazabilidad completa.
        </p>
      </div>

      <MassExitFilters
        filters={massExit.filters}
        setFilters={massExit.setFilters}
        chargeMode={massExit.chargeMode}
        setChargeMode={massExit.setChargeMode}
        customAmount={massExit.customAmount}
        setCustomAmount={massExit.setCustomAmount}
        reason={massExit.reason}
        setReason={massExit.setReason}
        paymentMethod={massExit.paymentMethod}
        setPaymentMethod={massExit.setPaymentMethod}
        isPreviewing={massExit.isPreviewing}
        previewError={massExit.previewError}
        handlePreview={massExit.handlePreview}
      />

      {massExit.step === "confirm" && massExit.preview && (
        <MassExitConfirmModal
          preview={massExit.preview}
          reason={massExit.reason}
          chargeMode={massExit.chargeMode}
          isProcessing={massExit.isProcessing}
          processError={massExit.processError}
          handleConfirm={massExit.handleConfirm}
          reset={massExit.reset}
        />
      )}

      {massExit.step === "result" && massExit.result && (
        <MassExitResultModal result={massExit.result} onClose={massExit.reset} />
      )}
    </div>
  );
}
