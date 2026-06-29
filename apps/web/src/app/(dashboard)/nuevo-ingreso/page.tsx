"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Modal } from "@heroui/react";
import { Button } from "@/components/bridge/Button";
import { useTerminalCaja } from "@/features/cash-register/hooks/useTerminalCaja";
import { hasPermission } from "@/lib/services/auth-domain.service";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import Link from "next/link";
import VehicleEntryFormV2 from "@/components/forms/VehicleEntryFormV2";

export default function NuevoIngresoPage() {
  const searchParams = useSearchParams();
  const plate = searchParams?.get("plate")?.trim().toUpperCase() ?? "";
  const { caja, requireOpenForPayment } = useTerminalCaja();
  const [canEmit, setCanEmit] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    hasPermission("tickets:emitir").then((allowed) => {
      if (!cancelled) setCanEmit(allowed);
    });
    return () => { cancelled = true; };
  }, []);

  if (canEmit === false) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="w-20 h-20 rounded-full bg-rose-100 flex items-center justify-center mb-6">
          <ShieldAlert className="w-10 h-10 text-rose-600" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Acceso denegado</h1>
        <p className="text-default-600 max-w-md">
          No tienes permiso para registrar ingresos de vehículos. Contacta al administrador si crees que esto es un error.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      {caja.status === "closed" && requireOpenForPayment ? (
        <Modal.Backdrop
          isOpen={true}
          onOpenChange={() => {}}
          isDismissable={false}
          isKeyboardDismissDisabled
        >
          <Modal.Container size="full">
            <Modal.Dialog className="flex flex-col items-center justify-center text-center py-32">
              <Modal.Header className="flex-col items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-brand-100 flex items-center justify-center">
                  <AlertTriangle className="w-10 h-10 text-brand-600" />
                </div>
                <Modal.Heading className="text-3xl font-bold text-foreground">
                  Caja no abierta
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body className="max-w-md">
                <p className="text-lg text-default-600">
                  No hay una sesión de caja abierta en este terminal. Debes abrir caja antes de
                  procesar entradas o salidas de vehículos.
                </p>
              </Modal.Body>
              <Modal.Footer className="flex-col gap-3 w-full max-w-xs">
                <Link href="/caja" className="w-full">
                  <Button color="warning" size="lg" className="w-full h-14 text-lg font-bold">
                    Ir a Abrir Caja
                  </Button>
                </Link>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      ) : null}
      {caja.status === "error" ? (
        <Modal.Backdrop
          isOpen={true}
          onOpenChange={() => {}}
          isDismissable={false}
          isKeyboardDismissDisabled
        >
          <Modal.Container size="full">
            <Modal.Dialog className="flex flex-col items-center justify-center text-center py-32">
              <Modal.Header className="flex-col items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-rose-100 flex items-center justify-center">
                  <AlertTriangle className="w-10 h-10 text-rose-600" />
                </div>
                <Modal.Heading className="text-3xl font-bold text-foreground">
                  Error de conexión
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body className="max-w-md space-y-3">
                <p className="text-lg text-default-600">
                  {caja.reason === "network"
                    ? "No se puede conectar con el servidor de caja (puerto 6011). Verifica que el backend esté corriendo."
                    : caja.reason === "auth"
                      ? "Tu sesión expiró. Inicia sesión nuevamente para continuar."
                      : "Ocurrió un error al verificar el estado de la caja. Intenta recargar la página."}
                </p>
              </Modal.Body>
              <Modal.Footer className="flex-col gap-3 w-full max-w-xs">
                <Button color="primary" onPress={() => window.location.reload()}>
                  Recargar página
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      ) : null}

      {caja.status === "closed" && !requireOpenForPayment ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-semibold">Caja no abierta</p>
          <p className="mt-1">
            No hay una sesión de caja abierta en este terminal. Puedes operar igualmente, pero los
            cobros no quedarán asociados a una sesión de caja.{" "}
            <Link href="/caja" className="underline font-medium">Ir a caja</Link>.
          </p>
        </div>
      ) : null}

      <VehicleEntryFormV2 initialPlate={plate} disableRecovery={Boolean(plate)} />
    </div>
  );
}
