import React, { useState, useEffect } from 'react';
import { Card, Switch, Separator } from "@heroui/react";
import { Input } from "@/components/bridge/Input";
import { Button } from "@/components/bridge/Button";
import { SmsSettingsDto, BulkEmailSettingsDto } from '../../types/communication';
import { useUpdateSmsSettings, useUpdateBulkEmailSettings, useTestConnection } from '../../hooks/useCommunication';
import { SecretInput } from './SecretInput';
import { toast } from 'sonner';

export const SmsSettingsCard: React.FC<any> = ({ companyId, initialData }) => {
  const [formData, setFormData] = useState<SmsSettingsDto>({
    enabled: false,
    provider: 'TWILIO',
    username: '',
    password: '',
    apiKey: '',
    apiSecret: '',
    senderName: '',
    countryCode: '+1',
    dailyLimit: 0,
  });

  const { mutate, isPending } = useUpdateSmsSettings(companyId);
  const testMutation = useTestConnection(companyId, 'sms');

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({ ...prev, ...initialData }));
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<any>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = () => {
    mutate(formData, {
      onSuccess: () => toast.success('Configuración SMS guardada.'),
      onError: () => toast.error('Error al guardar SMS.'),
    });
  };

  return (
    <Card className="w-full">
      <Card.Header className="flex justify-between p-6">
        <div className="flex flex-col">
          <p className="text-md font-bold">SMS Transaccional</p>
          <p className="text-small text-default-500">Configura el envío de mensajes SMS.</p>
        </div>
        <Switch isSelected={formData.enabled} onChange={(val: any) => setFormData(p => ({ ...p, enabled: typeof val === 'boolean' ? val : val?.target?.checked }))}>Habilitado</Switch>
      </Card.Header>
      <Separator />
      <Card.Content className="p-6 gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select name="provider" value={formData.provider} onChange={handleChange} className="rounded-lg border border-default-300 px-3 py-2 text-sm bg-default-100">
            {['TWILIO', 'AWS_SNS', 'INFOBIP', 'MESSAGEBIRD', 'CENTRALSMS'].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <Input label="Indicativo País" name="countryCode" value={formData.countryCode} onChange={handleChange} />
          <Input label="Usuario (SID)" name="username" value={formData.username} onChange={handleChange} />
          <SecretInput label="Contraseña (Auth Token)" name="password" value={formData.password} maskedValue={initialData?.passwordMasked} onChange={handleChange} />
          <Input label="Sender ID" name="senderName" value={formData.senderName} onChange={handleChange} />
          <Input type="number" label="Límite Diario" name="dailyLimit" value={formData.dailyLimit?.toString()} onChange={handleChange} />
        </div>
      </Card.Content>
      <Separator />
      <Card.Footer className="flex justify-between gap-2 p-6">
        <Button variant="flat" color="warning" onPress={() => testMutation.mutate()} isLoading={testMutation.isPending}>Probar Conexión</Button>
        <Button color="primary" onPress={handleSave} isLoading={isPending}>Guardar Configuración</Button>
      </Card.Footer>
    </Card>
  );
};

export const BulkEmailSettingsCard: React.FC<any> = ({ companyId, initialData }) => {
  const [formData, setFormData] = useState<BulkEmailSettingsDto>({
    enabled: false,
    provider: 'SENDGRID',
    baseUrl: '',
    apiKey: '',
    username: '',
    senderEmail: '',
    senderName: '',
    replyToEmail: '',
    dailyLimit: 0,
  });

  const { mutate, isPending } = useUpdateBulkEmailSettings(companyId);
  const testMutation = useTestConnection(companyId, 'bulk-email');

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({ ...prev, ...initialData }));
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<any>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = () => {
    mutate(formData, {
      onSuccess: () => toast.success('Configuración Masiva guardada.'),
      onError: () => toast.error('Error al guardar masivos.'),
    });
  };

  return (
    <Card className="w-full">
      <Card.Header className="flex justify-between p-6">
        <div className="flex flex-col">
          <p className="text-md font-bold">Emails Masivos</p>
          <p className="text-small text-default-500">Configura el envío masivo.</p>
        </div>
        <Switch isSelected={formData.enabled} onChange={(val: any) => setFormData(p => ({ ...p, enabled: typeof val === 'boolean' ? val : val?.target?.checked }))}>Habilitado</Switch>
      </Card.Header>
      <Separator />
      <Card.Content className="p-6 gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select name="provider" value={formData.provider} onChange={handleChange} className="rounded-lg border border-default-300 px-3 py-2 text-sm bg-default-100">
            {['SENDGRID', 'MAILGUN', 'AMAZON_SES', 'OTHER'].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <SecretInput label="API Key" name="apiKey" value={formData.apiKey} maskedValue={initialData?.apiKeyMasked} onChange={handleChange} />
          <Input label="Email Remitente" name="senderEmail" value={formData.senderEmail} onChange={handleChange} />
          <Input label="Nombre Remitente" name="senderName" value={formData.senderName} onChange={handleChange} />
          <Input label="Email Reply-To" name="replyToEmail" value={formData.replyToEmail} onChange={handleChange} />
          <Input type="number" label="Límite Diario" name="dailyLimit" value={formData.dailyLimit?.toString()} onChange={handleChange} />
        </div>
      </Card.Content>
      <Separator />
      <Card.Footer className="flex justify-between gap-2 p-6">
        <Button variant="flat" color="warning" onPress={() => testMutation.mutate()} isLoading={testMutation.isPending}>Probar Conexión</Button>
        <Button color="primary" onPress={handleSave} isLoading={isPending}>Guardar Configuración</Button>
      </Card.Footer>
    </Card>
  );
};
