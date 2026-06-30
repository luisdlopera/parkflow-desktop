import { httpRequest } from '@/lib/http-client';
import { 
  CommunicationSettingsResponseDto, 
  EmailSettingsDto,
  SmsSettingsDto,
  BulkEmailSettingsDto
} from '../types/communication';

export const communicationService = {
  getSettings: (companyId: string) => 
    httpRequest<CommunicationSettingsResponseDto[]>(`/api/v1/companies/${companyId}/communication-settings`, { method: 'GET' }),
    
  updateEmailSettings: (companyId: string, data: EmailSettingsDto) =>
    httpRequest<CommunicationSettingsResponseDto>(`/api/v1/companies/${companyId}/communication-settings/email`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
    
  updateSmsSettings: (companyId: string, data: SmsSettingsDto) =>
    httpRequest<CommunicationSettingsResponseDto>(`/api/v1/companies/${companyId}/communication-settings/sms`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
    
  updateBulkEmailSettings: (companyId: string, data: BulkEmailSettingsDto) =>
    httpRequest<CommunicationSettingsResponseDto>(`/api/v1/companies/${companyId}/communication-settings/bulk-email`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
    
  testEmailConnection: (companyId: string) =>
    httpRequest<void>(`/api/v1/companies/${companyId}/communication-settings/email/test-connection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }),
    
  testSmsConnection: (companyId: string) =>
    httpRequest<void>(`/api/v1/companies/${companyId}/communication-settings/sms/test-connection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }),
    
  testBulkEmailConnection: (companyId: string) =>
    httpRequest<void>(`/api/v1/companies/${companyId}/communication-settings/bulk-email/test-connection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }),

  getStats: (companyId: string) =>
    httpRequest<any>(`/api/v1/companies/${companyId}/communication-settings/stats`, { method: 'GET' }),
    
  getHistory: (companyId: string) =>
    httpRequest<any[]>(`/api/v1/companies/${companyId}/communication-settings/history`, { method: 'GET' }),
    
  getAudit: (companyId: string) =>
    httpRequest<any[]>(`/api/v1/companies/${companyId}/communication-settings/audit`, { method: 'GET' }),
};
