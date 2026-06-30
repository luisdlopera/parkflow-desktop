import React from 'react';
import { Card, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from "@heroui/react";
import { useCommunicationAudit } from '../../hooks/useCommunication';

export const CommunicationAuditTable: React.FC<{ companyId: string }> = ({ companyId }) => {
  const { data: audit = [], isLoading } = useCommunicationAudit(companyId);

  return (
    <div className="w-full">
        <Table aria-label="Auditoría de Comunicaciones">
          <TableHeader>
            <TableColumn>FECHA</TableColumn>
            <TableColumn>CANAL</TableColumn>
            <TableColumn>ACCIÓN</TableColumn>
            <TableColumn>CAMPO</TableColumn>
            <TableColumn>VALOR ANTERIOR</TableColumn>
            <TableColumn>VALOR NUEVO</TableColumn>
          </TableHeader>
          <TableBody items={audit}>
            {(item: any) => (
              <TableRow key={item.id}>
                <TableCell>{new Date(item.createdAt).toLocaleString()}</TableCell>
                <TableCell>{item.channel}</TableCell>
                <TableCell>{item.action}</TableCell>
                <TableCell>{item.fieldName || '-'}</TableCell>
                <TableCell>{item.oldValueMasked || '-'}</TableCell>
                <TableCell>{item.newValueMasked || '-'}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
    </div>
  );
};
