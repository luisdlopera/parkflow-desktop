"use client";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@/components/bridge/Modal";
import { Button } from "@/components/bridge/Button";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

interface SessionExpiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRenew?: () => Promise<void>;
}

export function SessionExpiredModal({ isOpen, onClose, onRenew }: SessionExpiredModalProps) {
  const router = useRouter();
  const [isRenewing, setIsRenewing] = useState(false);
  const [countdown, setCountdown] = useState(30);

  const handleLoginRedirect = React.useCallback(() => {
    const currentPath = window.location.pathname;
    router.push(`/login?expired=1&next=${encodeURIComponent(currentPath)}`);
    onClose();
  }, [router, onClose]);

  // Cuenta regresiva para redirección automática
  useEffect(() => {
    if (!isOpen) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleLoginRedirect();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, handleLoginRedirect]);

  const handleRenew = async () => {
    if (!onRenew) {
      handleLoginRedirect();
      return;
    }

    setIsRenewing(true);
    try {
      await onRenew();
      setCountdown(30);
      close();
    } catch {
      // Si falla la renovación, ir al login
      handleLoginRedirect();
    } finally {
      setIsRenewing(false);
    }
  };

  return (
    <Modal state={ { isOpen: isOpen, setOpen: (v: boolean) => { if(!v) onClose(); }, open: () => {}, close: onClose, toggle: () => {} } } isDismissable={false} hideCloseButton>
      <Modal.Content>
        <Modal.Header className="flex flex-col gap-1 text-amber-700">
          <div className="flex items-center gap-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Sesión Expirada
          </div>
        </Modal.Header>
        <Modal.Body>
          <p className="text-slate-600">
            Tu sesión ha expirado por inactividad o el token ha caducado.
          </p>
          <p className="text-sm text-slate-500 mt-2">
            Serás redirigido al login en <span className="font-semibold text-amber-600">{countdown}</span> segundos.
          </p>
          <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-xs text-amber-800">
              <strong>Consejo:</strong> Para evitar esto, mantén la actividad o configura un tiempo de sesión más largo en los parámetros del sistema.
            </p>
          </div>
        </Modal.Body>
        <Modal.Footer className="flex gap-2">
          {onRenew && (
            <Button
              color="primary"
              variant="tertiary"
              onPress={handleRenew}
              isLoading={isRenewing}
              className="bg-amber-100 text-amber-800 hover:bg-amber-200"
            >
              {isRenewing ? "Renovando..." : "Mantener sesión"}
            </Button>
          )}
          <Button color="primary" onPress={handleLoginRedirect}>
            Ir al login ahora
          </Button>
        </Modal.Footer>
      </Modal.Content>
    </Modal>
  );
}
