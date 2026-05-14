"use client";

import { useState, useEffect } from "react";
import { useCrashRecovery } from "@/lib/hooks/useAutoSave";
import { Button } from "@heroui/button";

interface CrashRecoveryDialogProps {
  formKey: string;
  onRestore: (data: unknown) => void;
  onDismiss: () => void;
}

export function CrashRecoveryDialog({ formKey, onRestore, onDismiss }: CrashRecoveryDialogProps) {
  const { checkForRecovery, clearRecovery } = useCrashRecovery();
  const [show, setShow] = useState(false);
  const [recoveryInfo, setRecoveryInfo] = useState<{ data?: unknown; timestamp?: Date }>({});

  useEffect(() => {
    const result = checkForRecovery(formKey);
    if (result.recovered) {
      setRecoveryInfo({ data: result.data, timestamp: result.timestamp });
      setShow(true);
    }
  }, [formKey, checkForRecovery]);

  const handleRestore = () => {
    if (recoveryInfo.data) {
      onRestore(recoveryInfo.data);
    }
    setShow(false);
  };

  const handleDismiss = () => {
    clearRecovery(formKey);
    setShow(false);
    onDismiss();
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 animate-in zoom-in-95 duration-200 dark:bg-gray-800 dark:shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Recuperar datos</h3>
            <p className="text-sm text-slate-500 dark:text-gray-300">Se detectó información no guardada</p>
          </div>
        </div>

        <div className="bg-slate-50 rounded-xl p-4 mb-4 dark:bg-gray-700">
          <p className="text-sm text-slate-600">
            Se encontraron datos de una sesión anterior que no se completó:
          </p>
          <ul className="mt-2 space-y-1 text-sm text-slate-700 dark:text-gray-200">
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Guardado: {recoveryInfo.timestamp?.toLocaleString("es-CO")}
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Estado: Pendiente de sincronización
            </li>
          </ul>
        </div>

        <div className="flex gap-3">
          <Button
            color="primary"
            className="flex-1 font-semibold h-12 rounded-xl"
            onPress={handleRestore}
            startContent={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            }
          >
            Recuperar datos
          </Button>
          <Button
            variant="flat"
            className="flex-1 font-semibold h-12 rounded-xl"
            onPress={handleDismiss}
          >
            Descartar
          </Button>
        </div>

        <p className="mt-3 text-xs text-slate-400 text-center">
          Los datos se guardan automáticamente cada 3 segundos para prevenir pérdidas.
        </p>
      </div>
    </div>
  );
}
