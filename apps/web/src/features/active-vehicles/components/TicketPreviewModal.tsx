"use client";
import { Modal } from "@heroui/react";
import { Button } from "@/components/ui/Button";
import type { ActiveSessionDto } from "@/lib/api/sessions-api";

export function TicketPreviewModal({ ticket, onClose }: { ticket: ActiveSessionDto; onClose: () => void }) {
  return (
    <Modal.Backdrop isOpen onOpenChange={(open) => { if (!open) onClose(); }}>
      <Modal.Container size="sm">
        <Modal.Dialog className="sm:max-w-sm">
          <Modal.CloseTrigger onClick={onClose} />
          <Modal.Header>
            <Modal.Heading>Ticket {ticket.ticketNumber}</Modal.Heading>
          </Modal.Header>
          <Modal.Body className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-slate-500 font-medium">Ticket:</span>
              <span className="font-semibold">{ticket.ticketNumber}</span>
              <span className="text-slate-500 font-medium">Placa:</span>
              <span className="font-semibold uppercase">{ticket.plate}</span>
              <span className="text-slate-500 font-medium">Tipo:</span>
              <span className="font-semibold">{ticket.vehicleType}</span>
              <span className="text-slate-500 font-medium">Tiempo:</span>
              <span className="font-semibold">{ticket.duration}</span>
              <span className="text-slate-500 font-medium">Celda:</span>
              <span className="font-semibold">{ticket.parkingSpaceCode ?? "Sin asignar"}</span>
              <span className="text-slate-500 font-medium">Tarifa:</span>
              <span className="font-semibold">{ticket.rateName ?? "Sin tarifa"}</span>
              {ticket.custodiedItems && ticket.custodiedItems.length > 0 && (
                <>
                  <span className="text-slate-500 font-medium">Cascos:</span>
                  <span className="font-semibold">{ticket.custodiedItems.map((i: any) => i.identifier).join(", ")}</span>
                </>
              )}
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button size="sm" variant="ghost" color="default" onPress={onClose}>Cerrar</Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
