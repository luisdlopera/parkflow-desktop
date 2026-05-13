"use client";

import { Button } from "@heroui/button";
import { Card, CardBody, CardFooter, CardHeader } from "@heroui/card";

type Props = {
  ticketNumber: string;
  plate: string;
  previewLines: string[];
  onDownload: () => void;
  onReprint: () => void;
  onClose: () => void;
  reprintLoading?: boolean;
};

export default function TicketPrintWarning({
  ticketNumber,
  plate,
  previewLines,
  onDownload,
  onReprint,
  onClose,
  reprintLoading
}: Props) {
  return (
    <Card className="border-2 border-amber-300 bg-amber-50/80 shadow-lg">
      <CardHeader className="flex items-center gap-3 pb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
          <svg className="h-5 w-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h3 className="text-base font-semibold text-emerald-800">Ingreso registrado correctamente</h3>
          <p className="text-sm text-amber-700">No se pudo imprimir el ticket</p>
        </div>
      </CardHeader>

      <CardBody className="pb-2 pt-0">
        <p className="text-xs text-slate-600">
          Ticket <strong>{ticketNumber}</strong> &middot; Placa <strong>{plate}</strong>
        </p>
        <p className="mt-1 text-xs text-slate-500">
          La sesión del vehículo está activa. Puedes descargar el ticket o reimprimirlo más tarde.
        </p>

        {previewLines.length > 0 && (
          <pre className="mt-3 max-h-32 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 text-[10px] leading-tight text-slate-700"
               style={{ fontFamily: "ui-monospace, SFMono-Regular, monospace" }}>
            {previewLines.join("\n")}
          </pre>
        )}
      </CardBody>

      <CardFooter className="flex flex-wrap gap-2 border-t border-amber-200 pt-3">
        <Button
          size="sm"
          variant="flat"
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
        <Button
          size="sm"
          variant="flat"
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
        <Button
          size="sm"
          variant="light"
          color="default"
          onPress={onClose}
        >
          Cerrar
        </Button>
      </CardFooter>
    </Card>
  );
}
