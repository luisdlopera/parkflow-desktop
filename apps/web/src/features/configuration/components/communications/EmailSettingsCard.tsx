import React, { useState, useEffect } from 'react';
import { Input, Button, Switch } from "@heroui/react";
import { ProviderType, SecurityMode, EmailSettingsDto } from '../../types/communication';
import { useUpdateEmailSettings, useTestConnection } from '../../hooks/useCommunication';
import { SecretInput } from './SecretInput';
import { toast } from 'sonner';

export const EmailSettingsCard: React.FC<any> = ({ companyId, initialData }) => {
  const [formData, setFormData] = useState<EmailSettingsDto>({
    enabled: false,
    provider: 'SMTP',
    host: '',
    port: 587,
    username: '',
    password: '',
    securityMode: 'TLS',
    senderEmail: '',
    senderName: '',
    dailyLimit: 0,
  });

  const { mutate, isPending } = useUpdateEmailSettings(companyId);
  const testMutation = useTestConnection(companyId, 'email');

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        ...initialData,
      }));
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'port' ? parseInt(value, 10) : value }));
  };

  const handleSave = () => {
    mutate(formData, {
      onSuccess: () => toast.success('Configuración guardada exitosamente.'),
      onError: () => toast.error('Error al guardar la configuración.'),
    });
  };

  const handleTest = () => {
    testMutation.mutate(undefined, {
      onSuccess: () => toast.success('Conexión de prueba exitosa.'),
      onError: () => toast.error('Falló la conexión de prueba.'),
    });
  };

  return (
    <div className="w-full rounded-xl border border-default-200 overflow-hidden">
      <div className="flex justify-between items-start p-6 border-b border-default-200">
        <div className="flex flex-col">
          <p className="text-md font-bold">Email Transaccional (SMTP)</p>
          <p className="text-small text-default-500">Configura el servidor SMTP para envíos automáticos.</p>
        </div>
        <Switch
          isSelected={formData.enabled}
          onValueChange={(val) => setFormData(p => ({ ...p, enabled: val }))}
        >
          Habilitado
        </Switch>
      </div>
      <div className="p-6 gap-4 flex flex-col">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Servidor SMTP (Host)" name="host" value={formData.host} onChange={handleChange} />
          <Input type="number" label="Puerto" name="port" value={formData.port?.toString()} onChange={handleChange} />
          <Input label="Usuario SMTP" name="username" value={formData.username} onChange={handleChange} />
          <SecretInput label="Contraseña" name="password" value={formData.password} maskedValue={initialData?.passwordMasked} onChange={handleChange} />
          <select name="securityMode" value={formData.securityMode} onChange={handleChange} className="rounded-lg border border-default-300 px-3 py-2 text-sm">
            {['NONE', 'SSL', 'TLS', 'STARTTLS'].map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <Input label="Email Remitente" name="senderEmail" value={formData.senderEmail} onChange={handleChange} />
          <Input label="Nombre Remitente" name="senderName" value={formData.senderName} onChange={handleChange} />
          <Input type="number" label="Límite Diario" name="dailyLimit" value={formData.dailyLimit?.toString()} onChange={handleChange} />
        </div>
      </div>
      <div className="flex justify-between gap-2 p-6 border-t border-default-200">
        <Button variant="flat" color="warning" onPress={handleTest} isLoading={testMutation.isPending}>
          Probar Conexión
        </Button>
        <Button color="primary" onPress={handleSave} isLoading={isPending}>
          Guardar Configuración
        </Button>
      </div>
    </div>
  );
};
