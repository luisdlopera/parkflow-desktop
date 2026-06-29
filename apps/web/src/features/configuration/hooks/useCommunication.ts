import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { communicationService } from '../services/communication.service';
import { EmailSettingsDto, SmsSettingsDto, BulkEmailSettingsDto } from '../types/communication';

export const useCommunicationSettings = (companyId: string) => {
  return useQuery({
    queryKey: ['communication-settings', companyId],
    queryFn: () => communicationService.getSettings(companyId),
    enabled: !!companyId,
  });
};

export const useUpdateEmailSettings = (companyId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: EmailSettingsDto) => communicationService.updateEmailSettings(companyId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['communication-settings', companyId] }),
  });
};

export const useUpdateSmsSettings = (companyId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SmsSettingsDto) => communicationService.updateSmsSettings(companyId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['communication-settings', companyId] }),
  });
};

export const useUpdateBulkEmailSettings = (companyId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: BulkEmailSettingsDto) => communicationService.updateBulkEmailSettings(companyId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['communication-settings', companyId] }),
  });
};

export const useTestConnection = (companyId: string, channel: 'email' | 'sms' | 'bulk-email') => {
  return useMutation({
    mutationFn: () => {
      if (channel === 'email') return communicationService.testEmailConnection(companyId);
      if (channel === 'sms') return communicationService.testSmsConnection(companyId);
      return communicationService.testBulkEmailConnection(companyId);
    },
  });
};

export const useCommunicationStats = (companyId: string) => {
  return useQuery({
    queryKey: ['communication-stats', companyId],
    queryFn: () => communicationService.getStats(companyId),
    enabled: !!companyId,
  });
};

export const useCommunicationHistory = (companyId: string) => {
  return useQuery({
    queryKey: ['communication-history', companyId],
    queryFn: () => communicationService.getHistory(companyId),
    enabled: !!companyId,
  });
};

export const useCommunicationAudit = (companyId: string) => {
  return useQuery({
    queryKey: ['communication-audit', companyId],
    queryFn: () => communicationService.getAudit(companyId),
    enabled: !!companyId,
  });
};
