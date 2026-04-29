"use client";

import { useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  action: () => void;
  description: string;
}

/**
 * Hook para navegación por teclado en operación de parqueadero.
 * Optimizado para operadores que usan el sistema sin mouse.
 */
export function useParkingShortcuts() {
  const router = useRouter();

  const shortcuts: ShortcutConfig[] = useMemo(
    () => [
      {
        key: "F1",
        action: () => router.push("/nuevo-ingreso"),
        description: "Nuevo ingreso"
      },
      {
        key: "F2",
        action: () => router.push("/salida-cobro"),
        description: "Salida y cobro"
      },
      {
        key: "F3",
        action: () => router.push("/vehiculos-activos"),
        description: "Vehiculos activos"
      },
      {
        key: "F4",
        action: () => router.push("/caja"),
        description: "Caja"
      },
      {
        key: "F5",
        action: () => window.location.reload(),
        description: "Actualizar pagina"
      },
      {
        key: "Escape",
        action: () => router.push("/"),
        description: "Volver al dashboard"
      }
    ],
    [router]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Ignorar si el usuario está escribiendo en un input
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        // Permitir Escape incluso en inputs
        if (event.key !== "Escape") {
          return;
        }
      }

      const shortcut = shortcuts.find((s) => {
        const keyMatch = event.key === s.key;
        const ctrlMatch = s.ctrl ? event.ctrlKey : !event.ctrlKey;
        const altMatch = s.alt ? event.altKey : !event.altKey;
        const shiftMatch = s.shift ? event.shiftKey : !event.shiftKey;
        return keyMatch && ctrlMatch && altMatch && shiftMatch;
      });

      if (shortcut) {
        event.preventDefault();
        shortcut.action();
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return shortcuts;
}

/**
 * Hook para shortcuts específicos en pantalla de salida/cobro
 */
export function useExitShortcuts({
  onCashPayment,
  onCardPayment,
  onSearch,
  isActive
}: {
  onCashPayment: () => void;
  onCardPayment: () => void;
  onSearch: () => void;
  isActive: boolean;
}) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // 1 = Efectivo, 2 = Tarjeta (solo cuando hay sesión activa)
      if (isActive) {
        if (event.key === "1") {
          event.preventDefault();
          onCashPayment();
        } else if (event.key === "2") {
          event.preventDefault();
          onCardPayment();
        }
      }

      // Ctrl+Enter para buscar
      if (event.key === "Enter" && event.ctrlKey) {
        event.preventDefault();
        onSearch();
      }
    },
    [onCashPayment, onCardPayment, onSearch, isActive]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Hook para detectar input de scanner de códigos de barras/QR
 * Los scanners típicamente envían el código seguido de Enter rápidamente
 */
export function useScannerDetection({
  onScan,
  minLength = 5,
  maxTimeBetweenKeys = 50 // ms
}: {
  onScan: (code: string) => void;
  minLength?: number;
  maxTimeBetweenKeys?: number;
}) {
  useEffect(() => {
    let buffer = "";
    let lastKeyTime = 0;
    let timeoutId: NodeJS.Timeout;

    const handleKeyDown = (event: KeyboardEvent) => {
      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTime;

      // Si el tiempo entre teclas es muy corto, probablemente es un scanner
      if (timeDiff < maxTimeBetweenKeys || buffer.length === 0) {
        // Ignorar teclas de control excepto Enter
        if (event.key.length === 1) {
          buffer += event.key;
        } else if (event.key === "Enter" && buffer.length >= minLength) {
          // Scanner completó la lectura
          event.preventDefault();
          onScan(buffer);
          buffer = "";
        }
      } else {
        // Reset - fue tipeo manual
        buffer = event.key.length === 1 ? event.key : "";
      }

      lastKeyTime = currentTime;

      // Clear buffer after timeout
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        buffer = "";
      }, 100);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timeoutId);
    };
  }, [onScan, minLength, maxTimeBetweenKeys]);
}
