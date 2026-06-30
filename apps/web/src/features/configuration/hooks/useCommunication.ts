import useSWR, { mutate } from 'swr';
import { useState } from 'react';
import { communicationService } from '../services/communication.service';
import { EmailSettingsDto, SmsSettingsDto, BulkEmailSettingsDto } from '../types/communication';

export const useCommunicationSettings = (companyId: string) => {
  return useSWR(
    companyId ? ['communication-settings', companyId] : null,
    () => communicationService.getSettings(companyId)
  );
};

export const useUpdateEmailSettings = (companyId: string) => {
  const [isPending, setIsPending] = useState(false);

  const update = async (data: EmailSettingsDto, options?: { onSuccess?: () => void, onError?: (e: any) => void }) => {
    setIsPending(true);
    try {
      await communicationService.updateEmailSettings(companyId, data);
      await mutate(['communication-settings', companyId]);
      options?.onSuccess?.();
    } catch (e) {
      options?.onError?.(e);
    } finally {
      setIsPending(false);
    }
  };

  return { mutate: update, isPending };
};

export const useUpdateSmsSettings = (companyId: string) => {
  const [isPending, setIsPending] = useState(false);

  const update = async (data: SmsSettingsDto, options?: { onSuccess?: () => void, onError?: (e: any) => void }) => {
    setIsPending(true);
    try {
      await communicationService.updateSmsSettings(companyId, data);
      await mutate(['communication-settings', companyId]);
      options?.onSuccess?.();
    } catch (e) {
      options?.onError?.(e);
    } finally {
      setIsPending(false);
    }
  };

  return { mutate: update, isPending };
};

export const useUpdateBulkEmailSettings = (companyId: string) => {
  const [isPending, setIsPending] = useState(false);

  const update = async (data: BulkEmailSettingsDto, options?: { onSuccess?: () => void, onError?: (e: any) => void }) => {
    setIsPending(true);
    try {
      await communicationService.updateBulkEmailSettings(companyId, data);
      await mutate(['communication-settings', companyId]);
      options?.onSuccess?.();
    } catch (e) {
      options?.onError?.(e);
    } finally {
      setIsPending(false);
    }
  };

  return { mutate: update, isPending };
};

export const useTestConnection = (companyId: string, channel: 'email' | 'sms' | 'bulk-email') => {
  const [isPending, setIsPending] = useState(false);

  const test = async (data?: any, options?: { onSuccess?: () => void, onError?: (e: any) => void }) => {
    setIsPending(true);
    try {
      if (channel === 'email') await communicationService.testEmailConnection(companyId);
      else if (channel === 'sms') await communicationService.testSmsConnection(companyId);
      else await communicationService.testBulkEmailConnection(companyId);
      options?.onSuccess?.();
    } catch (e) {
      options?.onError?.(e);
    } finally {
      setIsPending(false);
    }
  };

  return { mutate: test, isPending };
};

export const useCommunicationStats = (companyId: string) => {
  return useSWR(
    companyId ? ['communication-stats', companyId] : null,
    () => communicationService.getStats(companyId)
  );
};

export const useCommunicationHistory = (companyId: string) => {
  return useSWR(
    companyId ? ['communication-history', companyId] : null,
    () => communicationService.getHistory(companyId)
  );
};

export const useCommunicationAudit = (companyId: string) => {
  return useSWR(
    companyId ? ['communication-audit', companyId] : null,
    () => communicationService.getAudit(companyId)
  );
};
