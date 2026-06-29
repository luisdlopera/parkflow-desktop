import { httpRequest } from '@/lib/http-client';
import { 
  CommunicationSettingsResponseDto, 
  EmailSettingsDto,
  SmsSettingsDto,
  BulkEmailSettingsDto
} from '../types/communication';

export const communicationService = {
  getSettings: (companyId: string) => 
    httpRequest.get<CommunicationSettingsResponseDto[]>(`/api/v1/companies/${companyId}/communication-settings`),
    
  updateEmailSettings: (companyId: string, data: EmailSettingsDto) =>
    httpRequest.put<CommunicationSettingsResponseDto>(`/api/v1/companies/${companyId}/communication-settings/email`, data),
    
  updateSmsSettings: (companyId: string, data: SmsSettingsDto) =>
    httpRequest.put<CommunicationSettingsResponseDto>(`/api/v1/companies/${companyId}/communication-settings/sms`, data),
    
  updateBulkEmailSettings: (companyId: string, data: BulkEmailSettingsDto) =>
    httpRequest.put<CommunicationSettingsResponseDto>(`/api/v1/companies/${companyId}/communication-settings/bulk-email`, data),
    
  testEmailConnection: (companyId: string) =>
    httpRequest.post<void>(`/api/v1/companies/${companyId}/communication-settings/email/test-connection`, {}),
    
  testSmsConnection: (companyId: string) =>
    httpRequest.post<void>(`/api/v1/companies/${companyId}/communication-settings/sms/test-connection`, {}),
    
  testBulkEmailConnection: (companyId: string) =>
    httpRequest.post<void>(`/api/v1/companies/${companyId}/communication-settings/bulk-email/test-connection`, {}),

  getStats: (companyId: string) =>
    httpRequest.get<any>(`/api/v1/companies/${companyId}/communication-settings/stats`),
    
  getHistory: (companyId: string) =>
    httpRequest.get<any[]>(`/api/v1/companies/${companyId}/communication-settings/history`),
    
  getAudit: (companyId: string) =>
    httpRequest.get<any[]>(`/api/v1/companies/${companyId}/communication-settings/audit`),
};
