"use client";

import React, { ReactNode } from "react";
import { Modal, Input, AlertDialog } from "@heroui/react";
import { Button } from "@/components/bridge/Button";
import { useDialogStore } from "./dialog-store";

export function useDialog() {
  const store = useDialogStore();
  return {
    confirm: store.confirm,
    prompt: store.prompt,
  };
}

export function DialogProvider({ children }: { children: ReactNode }) {
  const { dialog, setDialog, close, confirmAction } = useDialogStore();

  return (
    <>
      {children}

      <AlertDialog.Backdrop
        className="z-[200]"
        isOpen={dialog.isOpen && dialog.type === "confirm"}
        onOpenChange={(open) => !open && close()}
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
              <Button color="danger" variant="ghost" onPress={close}>
                {dialog.cancelLabel || "Cancelar"}
              </Button>
              <Button color="primary" onPress={confirmAction}>
                {dialog.confirmLabel || "Aceptar"}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>

      <Modal.Backdrop
        className="z-[200]"
        isOpen={dialog.isOpen && dialog.type === "prompt"}
        onOpenChange={(open) => !open && close()}
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
                onChange={(e) => setDialog({ inputValue: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") confirmAction();
                }}
              />
            </Modal.Body>
            <Modal.Footer>
              <Button color="danger" variant="ghost" onPress={close}>
                {dialog.cancelLabel || "Cancelar"}
              </Button>
              <Button color="primary" onPress={confirmAction}>
                {dialog.confirmLabel || "Aceptar"}
              </Button>
            </Modal.Footer>
            <Modal.CloseTrigger onPress={close} />
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </>
  );
}
