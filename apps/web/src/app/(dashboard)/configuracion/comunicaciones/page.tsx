'use client';

import React from 'react';
import { Tabs, Spinner } from "@heroui/react";
import { useAuthStore } from '@/lib/stores/auth.store';
import { useCommunicationSettings } from '@/features/configuration/hooks/useCommunication';
import { EmailSettingsCard } from '@/features/configuration/components/communications/EmailSettingsCard';
import { SmsSettingsCard, BulkEmailSettingsCard } from '@/features/configuration/components/communications/OtherSettingsCards';
import { CommunicationStatsCard } from '@/features/configuration/components/communications/CommunicationStatsCard';
import { CommunicationHistoryTable } from '@/features/configuration/components/communications/CommunicationHistoryTable';
import { CommunicationAuditTable } from '@/features/configuration/components/communications/CommunicationAuditTable';
import { ConfigPageHeader } from '@/features/configuration/components/ui/ConfigPageHeader';

export default function CommunicationSettingsPage() {
  const { user } = useAuthStore();
  const companyId = user?.companyId || '';
  
  const { data: settings, isLoading } = useCommunicationSettings(companyId);

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Spinner /></div>;
  }

  const emailSettings = settings?.find((s: any) => s.channel === 'EMAIL');
  const smsSettings = settings?.find((s: any) => s.channel === 'SMS');
  const bulkEmailSettings = settings?.find((s: any) => s.channel === 'BULK_EMAIL');

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto p-6">
      <ConfigPageHeader
        title="Comunicaciones"
        description="Configura los servidores de envío de correos y SMS"
        groupId="administracion"
        groupLabel="Administración"
        sectionLabel="Comunicaciones"
      />

      <Tabs>
        <Tabs.ListContainer>
          <Tabs.List aria-label="Opciones de Comunicación">
            <Tabs.Tab id="email">Email Transaccional<Tabs.Indicator /></Tabs.Tab>
            <Tabs.Tab id="sms">SMS<Tabs.Indicator /></Tabs.Tab>
            <Tabs.Tab id="bulk">Emails Masivos<Tabs.Indicator /></Tabs.Tab>
            <Tabs.Tab id="stats">Estadísticas<Tabs.Indicator /></Tabs.Tab>
            <Tabs.Tab id="history">Historial<Tabs.Indicator /></Tabs.Tab>
            <Tabs.Tab id="audit">Auditoría<Tabs.Indicator /></Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>
        <Tabs.Panel id="email" className="mt-4">
          <EmailSettingsCard companyId={companyId} initialData={emailSettings} />
        </Tabs.Panel>
        <Tabs.Panel id="sms" className="mt-4">
          <SmsSettingsCard companyId={companyId} initialData={smsSettings} />
        </Tabs.Panel>
        <Tabs.Panel id="bulk" className="mt-4">
          <BulkEmailSettingsCard companyId={companyId} initialData={bulkEmailSettings} />
        </Tabs.Panel>
        <Tabs.Panel id="stats" className="mt-4">
          <CommunicationStatsCard companyId={companyId} />
        </Tabs.Panel>
        <Tabs.Panel id="history" className="mt-4">
          <CommunicationHistoryTable companyId={companyId} />
        </Tabs.Panel>
        <Tabs.Panel id="audit" className="mt-4">
          <CommunicationAuditTable companyId={companyId} />
        </Tabs.Panel>
      </Tabs>
    </div>
  );
}
