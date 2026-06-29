'use client';

import React from 'react';
import { Tabs, Tab, Spinner } from "@heroui/react";
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

  const emailSettings = settings?.find(s => s.channel === 'EMAIL');
  const smsSettings = settings?.find(s => s.channel === 'SMS');
  const bulkEmailSettings = settings?.find(s => s.channel === 'BULK_EMAIL');

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto p-6">
      <ConfigPageHeader 
        title="Comunicaciones" 
        description="Configura los servidores de envío de correos y SMS" 
        groupId="administracion" 
        groupLabel="Administración" 
      />

      <Tabs aria-label="Opciones de Comunicación" color="primary" variant="underlined">
        <Tab key="email" title="Email Transaccional">
          <div className="mt-4">
            <EmailSettingsCard companyId={companyId} initialData={emailSettings} />
          </div>
        </Tab>
        <Tab key="sms" title="SMS">
          <div className="mt-4">
            <SmsSettingsCard companyId={companyId} initialData={smsSettings} />
          </div>
        </Tab>
        <Tab key="bulk" title="Emails Masivos">
          <div className="mt-4">
            <BulkEmailSettingsCard companyId={companyId} initialData={bulkEmailSettings} />
          </div>
        </Tab>
        <Tab key="stats" title="Estadísticas">
          <div className="mt-4">
            <CommunicationStatsCard companyId={companyId} />
          </div>
        </Tab>
        <Tab key="history" title="Historial">
          <div className="mt-4">
            <CommunicationHistoryTable companyId={companyId} />
          </div>
        </Tab>
        <Tab key="audit" title="Auditoría">
          <div className="mt-4">
            <CommunicationAuditTable companyId={companyId} />
          </div>
        </Tab>
      </Tabs>
    </div>
  );
}
