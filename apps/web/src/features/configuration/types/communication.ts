export type ChannelType = 'EMAIL' | 'SMS' | 'BULK_EMAIL';
export type ProviderType = 'SMTP' | 'SENDGRID' | 'TWILIO' | 'AWS_SNS' | 'MAILGUN' | 'OTHER' | 'INFOBIP' | 'MESSAGEBIRD' | 'CENTRALSMS' | 'AMAZON_SES';
export type SecurityMode = 'NONE' | 'SSL' | 'TLS' | 'STARTTLS';

export interface CommunicationSettingsResponseDto {
  id: string;
  companyId: string;
  channel: ChannelType;
  provider: ProviderType;
  enabled: boolean;
  host?: string;
  port?: number;
  username?: string;
  passwordMasked?: string;
  apiKeyMasked?: string;
  apiSecretMasked?: string;
  senderEmail?: string;
  senderName?: string;
  securityMode?: SecurityMode;
  baseUrl?: string;
  countryCode?: string;
  replyToEmail?: string;
  dailyLimit: number;
}

export interface EmailSettingsDto {
  enabled: boolean;
  provider: ProviderType;
  host: string;
  port: number;
  username: string;
  password?: string;
  securityMode: SecurityMode;
  senderEmail: string;
  senderName: string;
  dailyLimit: number;
}

export interface SmsSettingsDto {
  enabled: boolean;
  provider: ProviderType;
  username: string;
  password?: string;
  apiKey?: string;
  apiSecret?: string;
  senderName: string;
  countryCode: string;
  dailyLimit: number;
}

export interface BulkEmailSettingsDto {
  enabled: boolean;
  provider: ProviderType;
  baseUrl: string;
  apiKey?: string;
  username: string;
  senderEmail: string;
  senderName: string;
  replyToEmail: string;
  dailyLimit: number;
}
