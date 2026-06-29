"use client";
import { Modal } from "@heroui/react";
import { Button } from "@/components/bridge/Button";

type Props = {
  ticketNumber: string;
  plate: string;
  previewLines: string[];
  onDownload: () => void;
  onReprint: () => void;
  onClose: () => void;
  reprintLoading?: boolean;
  allowTicketReprint?: boolean;
};

export default function TicketPrintWarning({
  ticketNumber,
  plate,
  previewLines,
  onDownload,
  onReprint,
  onClose,
  reprintLoading,
  allowTicketReprint = true
}: Props) {
  return (
    <Modal.Backdrop isOpen={true} onOpenChange={(open) => { if (!open) onClose(); }} isDismissable={false}>
      <Modal.Container size="cover">
        <Modal.Dialog className="sm:max-w-lg">
          <Modal.CloseTrigger onClick={onClose} />
          <Modal.Header>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                <svg className="h-5 w-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <Modal.Heading className="text-base font-semibold text-emerald-800">
                  Ingreso registrado correctamente
                </Modal.Heading>
                <p className="text-sm text-amber-700">No se pudo imprimir el ticket</p>
              </div>
            </div>
          </Modal.Header>

          <Modal.Body>
            <p className="text-xs text-default-600 dark:text-default-400">
              Ticket <strong>{ticketNumber}</strong> &middot; Placa <strong>{plate}</strong>
            </p>
            <p className="mt-1 text-xs text-default-500 dark:text-default-400">
              La sesión del vehículo está activa. Puedes descargar el ticket{allowTicketReprint ? " o reimprimirlo más tarde" : ""}.
            </p>

            {previewLines.length > 0 && (
              <pre className="mt-3 max-h-48 overflow-y-auto rounded-lg border border-default-200 dark:border-default-700 bg-default-50 dark:bg-default-100 dark:bg-default-900 p-2 text-[10px] leading-tight text-default-700 dark:text-default-300"
                   style={{ fontFamily: "ui-monospace, SFMono-Regular, monospace" }}>
                {previewLines.join("\n")}
              </pre>
            )}
          </Modal.Body>

          <Modal.Footer className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="tertiary"
              color="warning"
              onPress={onDownload}
              startContent={
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 11l5 5 5-5M12 4v12" />
                </svg>
              }
            >
              Descargar ticket
            </Button>
            {allowTicketReprint && (
              <Button
                size="sm"
                variant="tertiary"
                color="primary"
                onPress={onReprint}
                isLoading={reprintLoading}
                startContent={
                  !reprintLoading ? (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  ) : null
                }
              >
                Reimprimir
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              color="default"
              onPress={onClose}
            >
              Cerrar
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
