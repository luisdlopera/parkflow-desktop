import React from 'react';
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Chip } from "@heroui/react";
import { useCommunicationHistory } from '../../hooks/useCommunication';

export const CommunicationHistoryTable: React.FC<{ companyId: string }> = ({ companyId }) => {
  const { data: history = [], isLoading } = useCommunicationHistory(companyId);

  return (
    <div className="w-full">
        <Table aria-label="Historial de Comunicaciones">
          <TableHeader>
            <TableColumn>FECHA</TableColumn>
            <TableColumn>CANAL</TableColumn>
            <TableColumn>PROVEEDOR</TableColumn>
            <TableColumn>DESTINATARIO</TableColumn>
            <TableColumn>ESTADO</TableColumn>
          </TableHeader>
          <TableBody emptyContent={isLoading ? "Cargando..." : "No hay historial disponible."} items={history}>
            {(item: any) => (
              <TableRow key={item.id}>
                <TableCell>{new Date(item.sentAt).toLocaleString()}</TableCell>
                <TableCell>{item.channel}</TableCell>
                <TableCell>{item.provider}</TableCell>
                <TableCell>{item.recipient}</TableCell>
                <TableCell>
                  <Chip color={item.status === 'SENT' ? 'success' : item.status === 'FAILED' ? 'danger' : 'warning'} variant="flat">
                    {item.status}
                  </Chip>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
    </div>
  );
};
