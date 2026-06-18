"use client";

import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from "react";
import { Modal, Input, AlertDialog } from "@heroui/react";
import { Button } from "@/components/ui/Button";

type DialogType = "confirm" | "prompt";

type AlertDialogStatus = "default" | "accent" | "success" | "warning" | "danger";

interface DialogOptions {
  title?: string;
  message: string;
  defaultValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Estado/color del icono del AlertDialog de confirmación. Default: "danger". */
  status?: AlertDialogStatus;
}

interface DialogState extends DialogOptions {
  type: DialogType;
  isOpen: boolean;
  resolve: (value: boolean | string | null) => void;
  inputValue: string;
}

interface DialogContextValue {
  confirm: (message: string, options?: Omit<DialogOptions, "message">) => Promise<boolean>;
  prompt: (message: string, options?: Omit<DialogOptions, "message">) => Promise<string | null>;
}

const DialogContext = createContext<DialogContextValue | undefined>(undefined);

export function useDialog() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error("useDialog must be used within a DialogProvider");
  }
  return context;
}

export function DialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogState>({
    type: "confirm",
    isOpen: false,
    message: "",
    resolve: () => {},
    inputValue: "",
  });

  const confirm = useCallback((message: string, options?: Omit<DialogOptions, "message">) => {
    return new Promise<boolean>((resolve) => {
      setDialog({
        type: "confirm",
        isOpen: true,
        message,
        ...options,
        inputValue: "",
        resolve: (val) => resolve(val as boolean),
      });
    });
  }, []);

  const prompt = useCallback((message: string, options?: Omit<DialogOptions, "message">) => {
    return new Promise<string | null>((resolve) => {
      setDialog({
        type: "prompt",
        isOpen: true,
        message,
        ...options,
        inputValue: options?.defaultValue ?? "",
        resolve: (val) => resolve(val as string | null),
      });
    });
  }, []);

  const handleClose = useCallback(() => {
    setDialog((prev) => {
      if (prev.isOpen) {
        prev.resolve(prev.type === "confirm" ? false : null);
      }
      return { ...prev, isOpen: false };
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setDialog((prev) => {
      if (prev.isOpen) {
        prev.resolve(prev.type === "confirm" ? true : prev.inputValue);
      }
      return { ...prev, isOpen: false };
    });
  }, []);

  const contextValue = useMemo(() => ({ confirm, prompt }), [confirm, prompt]);

  return (
    <DialogContext.Provider value={contextValue}>
      {children}

      {/* Confirmación: AlertDialog dedicado de HeroUI (icono de estado, acción explícita).
          z-[200] para quedar por encima de cualquier overlay a pantalla completa (p. ej. el
          wizard de onboarding en z-[120]). */}
      <AlertDialog>
        <AlertDialog.Backdrop
          className="z-[200]"
          isOpen={dialog.isOpen && dialog.type === "confirm"}
          onOpenChange={(open) => !open && handleClose()}
        >
          <AlertDialog.Container>
            <AlertDialog.Dialog className="sm:max-w-[400px]">
              <AlertDialog.Header>
                <AlertDialog.Icon status={dialog.status ?? "danger"} />
                <AlertDialog.Heading>{dialog.title || "Confirmación"}</AlertDialog.Heading>
              </AlertDialog.Header>
              <AlertDialog.Body>
                <p className="text-sm">{dialog.message}</p>
              </AlertDialog.Body>
              <AlertDialog.Footer>
                <Button color="danger" variant="ghost" onPress={handleClose}>
                  {dialog.cancelLabel || "Cancelar"}
                </Button>
                <Button color="primary" onPress={handleConfirm}>
                  {dialog.confirmLabel || "Aceptar"}
                </Button>
              </AlertDialog.Footer>
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>

      {/* Prompt: Modal con Input (AlertDialog no es para captura de texto). */}
      <Modal.Backdrop
        className="z-[200]"
        isOpen={dialog.isOpen && dialog.type === "prompt"}
        onOpenChange={(open) => !open && handleClose()}
      >
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[400px]">
            <Modal.Header>
              <Modal.Heading>{dialog.title || "Ingresar valor"}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <p className="text-sm">{dialog.message}</p>
              <Input
                autoFocus
                aria-label={dialog.message}
                value={dialog.inputValue}
                onChange={(e) => setDialog((prev) => ({ ...prev, inputValue: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleConfirm();
                }}
              />
            </Modal.Body>
            <Modal.Footer>
              <Button color="danger" variant="ghost" onPress={handleClose}>
                {dialog.cancelLabel || "Cancelar"}
              </Button>
              <Button color="primary" onPress={handleConfirm}>
                {dialog.confirmLabel || "Aceptar"}
              </Button>
            </Modal.Footer>
            <Modal.CloseTrigger onPress={handleClose} />
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </DialogContext.Provider>
  );
}
