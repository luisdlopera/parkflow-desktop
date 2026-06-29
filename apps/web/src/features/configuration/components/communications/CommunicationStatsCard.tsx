import React from 'react';
import { Card } from "@heroui/react";
import { useCommunicationStats } from '../../hooks/useCommunication';

interface Props {
  companyId: string;
}

export const CommunicationStatsCard: React.FC<Props> = ({ companyId }) => {
  const { data: stats, isLoading } = useCommunicationStats(companyId);

  if (isLoading) return <div>Cargando estadísticas...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="rounded-xl border border-default-200 p-4 text-center">
        <p className="text-sm text-default-500">Emails Enviados Hoy</p>
        <p className="text-3xl font-bold">{stats?.emailsSentToday || 0}</p>
      </div>
      <div className="rounded-xl border border-default-200 p-4 text-center">
        <p className="text-sm text-default-500">Emails Fallidos Hoy</p>
        <p className="text-3xl font-bold text-danger">{stats?.emailsFailedToday || 0}</p>
      </div>
      <div className="rounded-xl border border-default-200 p-4 text-center">
        <p className="text-sm text-default-500">SMS Enviados Hoy</p>
        <p className="text-3xl font-bold">{stats?.smsSentToday || 0}</p>
      </div>
      <div className="rounded-xl border border-default-200 p-4 text-center">
        <p className="text-sm text-default-500">SMS Fallidos Hoy</p>
        <p className="text-3xl font-bold text-danger">{stats?.smsFailedToday || 0}</p>
      </div>
      <div className="rounded-xl border border-default-200 p-4 text-center">
        <p className="text-sm text-default-500">Masivos Enviados Hoy</p>
        <p className="text-3xl font-bold">{stats?.bulkSentToday || 0}</p>
      </div>
    </div>
  );
};
