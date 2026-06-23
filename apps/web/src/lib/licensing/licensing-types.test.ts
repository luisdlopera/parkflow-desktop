import { describe, it, expect } from 'vitest';
import type {
  CompanyStatus,
  PlanType,
  LicenseStatus,
  ModuleType,
  RemoteCommand,
  Company,
  CompanyModule,
  LicensedDevice,
  HeartbeatRequest,
  HeartbeatResponse,
  LicenseValidationRequest,
  LicenseValidationResponse,
  CreateCompanyRequest,
  UpdateCompanyRequest,
  GenerateLicenseRequest,
  GenerateLicenseResponse,
  LicenseAuditLog,
  DesktopLicenseStatus,
  SaveLicenseRequest,
  ProcessedCommand,
  TamperStatus
} from './types';

describe('licensing/types', () => {
  describe('CompanyStatus', () => {
    const validStatuses: CompanyStatus[] = [
      'ACTIVE',
      'PAST_DUE',
      'SUSPENDED',
      'BLOCKED',
      'EXPIRED',
      'TRIAL',
      'CANCELLED'
    ];

    it.each(validStatuses)('includes status: %s', (status) => {
      expect(['ACTIVE', 'PAST_DUE', 'SUSPENDED', 'BLOCKED', 'EXPIRED', 'TRIAL', 'CANCELLED']).toContain(status);
    });

    it('has 7 valid statuses', () => {
      expect(validStatuses).toHaveLength(7);
    });
  });

  describe('PlanType', () => {
    const validPlanTypes: PlanType[] = ['LOCAL', 'SYNC', 'PRO', 'ENTERPRISE'];

    it.each(validPlanTypes)('includes plan type: %s', (plan) => {
      expect(['LOCAL', 'SYNC', 'PRO', 'ENTERPRISE']).toContain(plan);
    });

    it('has 4 valid plan types', () => {
      expect(validPlanTypes).toHaveLength(4);
    });
  });

  describe('LicenseStatus', () => {
    const validStatuses: LicenseStatus[] = [
      'ACTIVE',
      'EXPIRED',
      'REVOKED',
      'SUSPENDED',
      'BLOCKED',
      'GRACE_PERIOD'
    ];

    it.each(validStatuses)('includes status: %s', (status) => {
      expect(['ACTIVE', 'EXPIRED', 'REVOKED', 'SUSPENDED', 'BLOCKED', 'GRACE_PERIOD']).toContain(status);
    });

    it('has 6 valid statuses', () => {
      expect(validStatuses).toHaveLength(6);
    });
  });

  describe('ModuleType', () => {
    const validModules: ModuleType[] = [
      'CLOUD_SYNC',
      'DASHBOARD',
      'MULTI_LOCATION',
      'WHATSAPP_NOTIFICATIONS',
      'ELECTRONIC_INVOICING',
      'ADVANCED_AUDIT',
      'REALTIME_MONITORING',
      'CUSTOM_REPORTS',
      'API_ACCESS',
      'LOCAL_PRINTING',
      'CLOUD_BACKUP',
      'ACCESS_CONTROL'
    ];

    it.each(validModules)('includes module: %s', (module) => {
      expect([
        'CLOUD_SYNC',
        'DASHBOARD',
        'MULTI_LOCATION',
        'WHATSAPP_NOTIFICATIONS',
        'ELECTRONIC_INVOICING',
        'ADVANCED_AUDIT',
        'REALTIME_MONITORING',
        'CUSTOM_REPORTS',
        'API_ACCESS',
        'LOCAL_PRINTING',
        'CLOUD_BACKUP',
        'ACCESS_CONTROL'
      ]).toContain(module);
    });

    it('has 12 valid modules', () => {
      expect(validModules).toHaveLength(12);
    });
  });

  describe('RemoteCommand', () => {
    const validCommands: RemoteCommand[] = [
      'BLOCK_SYSTEM',
      'DISABLE_SYNC',
      'DISABLE_MODULE',
      'SHOW_ADMIN_MESSAGE',
      'FORCE_UPDATE',
      'REQUEST_RENEWAL',
      'PAYMENT_REMINDER',
      'CLEAR_LICENSE_CACHE',
      'REVOKE_LICENSE'
    ];

    it.each(validCommands)('includes command: %s', (cmd) => {
      expect([
        'BLOCK_SYSTEM',
        'DISABLE_SYNC',
        'DISABLE_MODULE',
        'SHOW_ADMIN_MESSAGE',
        'FORCE_UPDATE',
        'REQUEST_RENEWAL',
        'PAYMENT_REMINDER',
        'CLEAR_LICENSE_CACHE',
        'REVOKE_LICENSE'
      ]).toContain(cmd);
    });

    it('has 9 valid commands', () => {
      expect(validCommands).toHaveLength(9);
    });
  });

  describe('Company interface', () => {
    const validCompany: Company = {
      id: 'comp-001',
      name: 'Test Company',
      nit: '123456789',
      address: '123 Main St',
      city: 'Springfield',
      phone: '555-1234',
      email: 'test@company.com',
      contactName: 'John Doe',
      plan: 'PRO',
      status: 'ACTIVE',
      expiresAt: '2025-12-31T23:59:59Z',
      graceUntil: '2026-01-15T23:59:59Z',
      maxDevices: 10,
      adminPassword: 'secret',
      maxLocations: 5,
      maxUsers: 50,
      trialDays: 30,
      offlineModeAllowed: true,
      offlineLeaseHours: 72,
      onboardingCompleted: true,
      modules: [],
      devices: [],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-15T00:00:00Z',
      customerMessage: 'Welcome!'
    };

    it.each([
      { prop: 'id', type: 'string' },
      { prop: 'name', type: 'string' },
      { prop: 'plan', type: 'string' },
      { prop: 'status', type: 'string' },
      { prop: 'maxDevices', type: 'number' },
      { prop: 'maxLocations', type: 'number' },
      { prop: 'maxUsers', type: 'number' },
      { prop: 'offlineModeAllowed', type: 'boolean' },
      { prop: 'offlineLeaseHours', type: 'number' },
      { prop: 'modules', type: 'object' },
      { prop: 'devices', type: 'object' },
      { prop: 'createdAt', type: 'string' }
    ])('has property $prop of type $type', ({ prop, type }) => {
      expect(validCompany).toHaveProperty(prop);
      if (type !== 'object') {
        expect(typeof validCompany[prop as keyof Company]).toBe(type);
      }
    });

    it('has all required properties', () => {
      const requiredProps = ['id', 'name', 'plan', 'status', 'maxDevices', 'maxLocations', 'maxUsers', 'offlineModeAllowed', 'offlineLeaseHours', 'modules', 'devices', 'createdAt'];
      requiredProps.forEach(prop => {
        expect(validCompany).toHaveProperty(prop);
      });
    });

    it('supports optional properties', () => {
      const minimalCompany: Company = {
        id: 'comp-002',
        name: 'Minimal Company',
        plan: 'LOCAL',
        status: 'TRIAL',
        maxDevices: 1,
        maxLocations: 1,
        maxUsers: 1,
        offlineModeAllowed: false,
        offlineLeaseHours: 0,
        modules: [],
        devices: [],
        createdAt: '2024-01-01T00:00:00Z'
      };

      expect(minimalCompany.nit).toBeUndefined();
      expect(minimalCompany.address).toBeUndefined();
      expect(minimalCompany.city).toBeUndefined();
    });
  });

  describe('CompanyModule interface', () => {
    const validModule: CompanyModule = {
      id: 'mod-001',
      moduleType: 'CLOUD_SYNC',
      enabled: true,
      enabledAt: '2024-01-01T00:00:00Z',
      expiresAt: '2025-12-31T23:59:59Z',
      active: true
    };

    it.each([
      { prop: 'id', type: 'string' },
      { prop: 'moduleType', type: 'string' },
      { prop: 'enabled', type: 'boolean' },
      { prop: 'active', type: 'boolean' }
    ])('has property $prop of type $type', ({ prop, type }) => {
      expect(validModule).toHaveProperty(prop);
      expect(typeof validModule[prop as keyof CompanyModule]).toBe(type);
    });
  });

  describe('LicensedDevice interface', () => {
    const validDevice: LicensedDevice = {
      id: 'dev-001',
      deviceFingerprint: 'fingerprint-abc123',
      hostname: 'parkflow-terminal-1',
      operatingSystem: 'Windows 10',
      appVersion: '2.0.0',
      status: 'ACTIVE',
      expiresAt: '2025-12-31T23:59:59Z',
      lastHeartbeatAt: '2024-01-15T10:00:00Z',
      lastSeenAt: '2024-01-15T10:05:00Z',
      isCurrentlyOnline: true,
      heartbeatCount: 1440,
      pendingSyncEvents: 0,
      syncedEvents: 15234,
      createdAt: '2024-01-01T00:00:00Z'
    };

    it.each([
      { prop: 'id', type: 'string' },
      { prop: 'deviceFingerprint', type: 'string' },
      { prop: 'status', type: 'string' },
      { prop: 'heartbeatCount', type: 'number' },
      { prop: 'pendingSyncEvents', type: 'number' },
      { prop: 'syncedEvents', type: 'number' },
      { prop: 'createdAt', type: 'string' }
    ])('has property $prop of type $type', ({ prop, type }) => {
      expect(validDevice).toHaveProperty(prop);
      expect(typeof validDevice[prop as keyof LicensedDevice]).toBe(type);
    });
  });

  describe('HeartbeatRequest interface', () => {
    const validRequest: HeartbeatRequest = {
      companyId: 'comp-001',
      deviceFingerprint: 'fingerprint-abc123',
      appVersion: '2.0.0',
      currentLicenseKey: 'key-xyz123',
      lastSyncAt: '2024-01-15T10:00:00Z',
      pendingSyncCount: 5,
      syncedCount: 100,
      failedSyncCount: 1,
      printerHealthJson: '{}',
      errorReport: 'No errors',
      commandAcknowledged: true,
      acknowledgedCommand: 'FORCE_UPDATE'
    };

    it('has required properties: companyId, deviceFingerprint, appVersion', () => {
      expect(validRequest).toHaveProperty('companyId');
      expect(validRequest).toHaveProperty('deviceFingerprint');
      expect(validRequest).toHaveProperty('appVersion');
    });

    it('supports optional properties', () => {
      const minimalRequest: HeartbeatRequest = {
        companyId: 'comp-001',
        deviceFingerprint: 'fingerprint-abc123',
        appVersion: '2.0.0'
      };

      expect(minimalRequest.currentLicenseKey).toBeUndefined();
      expect(minimalRequest.lastSyncAt).toBeUndefined();
      expect(minimalRequest.printerHealthJson).toBeUndefined();
    });
  });

  describe('HeartbeatResponse interface', () => {
    const validResponse: HeartbeatResponse = {
      companyId: 'comp-001',
      status: 'ACTIVE',
      plan: 'PRO',
      expiresAt: '2025-12-31T23:59:59Z',
      graceUntil: '2026-01-15T23:59:59Z',
      enabledModules: ['CLOUD_SYNC', 'DASHBOARD'],
      command: 'REQUEST_RENEWAL',
      commandPayload: '{}',
      message: 'License valid',
      allowOperations: true,
      allowSync: true,
      nextHeartbeatMinutes: 60,
      licenseSignature: 'sig-abc123'
    };

    it('has required properties', () => {
      expect(validResponse).toHaveProperty('companyId');
      expect(validResponse).toHaveProperty('status');
      expect(validResponse).toHaveProperty('plan');
      expect(validResponse).toHaveProperty('allowOperations');
      expect(validResponse).toHaveProperty('allowSync');
      expect(validResponse).toHaveProperty('nextHeartbeatMinutes');
    });

    it('enabledModules is an array of strings', () => {
      expect(Array.isArray(validResponse.enabledModules)).toBe(true);
      validResponse.enabledModules.forEach(module => {
        expect(typeof module).toBe('string');
      });
    });
  });

  describe('LicenseValidationRequest interface', () => {
    const validRequest: LicenseValidationRequest = {
      companyId: 'comp-001',
      deviceFingerprint: 'fingerprint-abc123',
      licenseKey: 'key-xyz123',
      signature: 'sig-abc123',
      hostname: 'parkflow-term',
      operatingSystem: 'Windows 10',
      cpuInfo: 'Intel i5',
      macAddress: '00:11:22:33:44:55',
      appVersion: '2.0.0'
    };

    it('has required properties', () => {
      expect(validRequest).toHaveProperty('companyId');
      expect(validRequest).toHaveProperty('deviceFingerprint');
      expect(validRequest).toHaveProperty('licenseKey');
      expect(validRequest).toHaveProperty('signature');
    });

    it('supports optional hardware info', () => {
      const minimalRequest: LicenseValidationRequest = {
        companyId: 'comp-001',
        deviceFingerprint: 'fingerprint-abc123',
        licenseKey: 'key-xyz123',
        signature: 'sig-abc123'
      };

      expect(minimalRequest.hostname).toBeUndefined();
      expect(minimalRequest.cpuInfo).toBeUndefined();
      expect(minimalRequest.macAddress).toBeUndefined();
    });
  });

  describe('LicenseValidationResponse interface', () => {
    const validResponse: LicenseValidationResponse = {
      valid: true,
      message: 'License is valid',
      companyId: 'comp-001',
      companyName: 'Test Company',
      status: 'ACTIVE',
      plan: 'PRO',
      expiresAt: '2025-12-31T23:59:59Z',
      graceUntil: '2026-01-15T23:59:59Z',
      enabledModules: ['CLOUD_SYNC'],
      allowOperations: true,
      newSignature: 'sig-new123',
      serverTime: '2024-01-15T10:00:00Z'
    };

    const invalidResponse: LicenseValidationResponse = {
      valid: false,
      errorCode: 'LICENSE_EXPIRED',
      message: 'License has expired',
      allowOperations: false
    };

    it('has required message property', () => {
      expect(validResponse).toHaveProperty('message');
      expect(invalidResponse).toHaveProperty('message');
    });

    it('includes errorCode when license is invalid', () => {
      expect(invalidResponse).toHaveProperty('errorCode');
      expect(invalidResponse.errorCode).toBeDefined();
    });

    it('includes validation details when valid', () => {
      expect(validResponse.valid).toBe(true);
      expect(validResponse.companyId).toBeDefined();
      expect(validResponse.status).toBeDefined();
    });
  });

  describe('CreateCompanyRequest interface', () => {
    const validRequest: CreateCompanyRequest = {
      name: 'New Company',
      nit: '123456789',
      address: '456 Oak Ave',
      city: 'Shelbyville',
      phone: '555-5678',
      email: 'new@company.com',
      contactName: 'Jane Smith',
      plan: 'SYNC',
      maxDevices: 5,
      maxLocations: 2,
      maxUsers: 25,
      trialDays: 14,
      offlineModeAllowed: true
    };

    it('has required name and plan properties', () => {
      expect(validRequest).toHaveProperty('name');
      expect(validRequest).toHaveProperty('plan');
    });

    it('supports optional company details', () => {
      const minimalRequest: CreateCompanyRequest = {
        name: 'Minimal Company',
        plan: 'LOCAL'
      };

      expect(minimalRequest.nit).toBeUndefined();
      expect(minimalRequest.maxDevices).toBeUndefined();
      expect(minimalRequest.trialDays).toBeUndefined();
    });
  });

  describe('UpdateCompanyRequest interface', () => {
    const validRequest: UpdateCompanyRequest = {
      name: 'Updated Company',
      plan: 'ENTERPRISE',
      status: 'ACTIVE',
      maxDevices: 20,
      offlineLeaseHours: 96,
      customerMessage: 'Updated successfully'
    };

    it('allows partial updates (all optional)', () => {
      expect(validRequest).toHaveProperty('name');
      expect(validRequest).toHaveProperty('plan');
      expect(validRequest).toHaveProperty('status');
    });

    it('supports minimal update with single field', () => {
      const singleUpdate: UpdateCompanyRequest = {
        name: 'New Name'
      };

      expect(singleUpdate.name).toBe('New Name');
      expect(singleUpdate.plan).toBeUndefined();
    });
  });

  describe('GenerateLicenseRequest interface', () => {
    const validRequest: GenerateLicenseRequest = {
      companyId: 'comp-001',
      deviceFingerprint: 'fingerprint-abc123',
      hostname: 'parkflow-1',
      operatingSystem: 'Windows 10',
      cpuInfo: 'Intel i7',
      macAddress: '00:11:22:33:44:55',
      expiresAt: '2025-12-31T23:59:59Z',
      notes: 'Terminal 1 license'
    };

    it('has required properties: companyId and deviceFingerprint', () => {
      expect(validRequest).toHaveProperty('companyId');
      expect(validRequest).toHaveProperty('deviceFingerprint');
    });

    it('supports optional hardware info', () => {
      const minimalRequest: GenerateLicenseRequest = {
        companyId: 'comp-001',
        deviceFingerprint: 'fingerprint-abc123'
      };

      expect(minimalRequest.hostname).toBeUndefined();
      expect(minimalRequest.cpuInfo).toBeUndefined();
    });
  });

  describe('GenerateLicenseResponse interface', () => {
    const validResponse: GenerateLicenseResponse = {
      deviceId: 'dev-001',
      licenseKey: 'key-xyz123-abc456',
      signature: 'sig-abc123',
      expiresAt: '2025-12-31T23:59:59Z',
      publicKey: 'pub-key-xyz',
      qrCodeData: 'data:image/png;base64,...'
    };

    it('has required properties', () => {
      expect(validResponse).toHaveProperty('deviceId');
      expect(validResponse).toHaveProperty('licenseKey');
      expect(validResponse).toHaveProperty('signature');
      expect(validResponse).toHaveProperty('publicKey');
    });

    it('supports optional QR code data', () => {
      const minimalResponse: GenerateLicenseResponse = {
        deviceId: 'dev-001',
        licenseKey: 'key-xyz123',
        signature: 'sig-abc123',
        publicKey: 'pub-key-xyz'
      };

      expect(minimalResponse.qrCodeData).toBeUndefined();
    });
  });

  describe('LicenseAuditLog interface', () => {
    const validLog: LicenseAuditLog = {
      id: 'log-001',
      companyId: 'comp-001',
      deviceId: 'dev-001',
      action: 'LICENSE_GENERATED',
      description: 'New license generated',
      oldValue: null as any,
      newValue: 'key-xyz123',
      performedBy: 'admin@company.com',
      ipAddress: '192.168.1.100',
      sessionId: 'sess-abc123',
      createdAt: '2024-01-15T10:00:00Z'
    };

    it('has required properties', () => {
      expect(validLog).toHaveProperty('id');
      expect(validLog).toHaveProperty('companyId');
      expect(validLog).toHaveProperty('action');
      expect(validLog).toHaveProperty('createdAt');
    });

    it('supports optional audit details', () => {
      const minimalLog: LicenseAuditLog = {
        id: 'log-002',
        companyId: 'comp-002',
        action: 'LICENSE_VALIDATION',
        createdAt: '2024-01-15T11:00:00Z'
      };

      expect(minimalLog.deviceId).toBeUndefined();
      expect(minimalLog.performedBy).toBeUndefined();
      expect(minimalLog.ipAddress).toBeUndefined();
    });
  });

  describe('DesktopLicenseStatus interface', () => {
    const validStatus: DesktopLicenseStatus = {
      hasLicense: true,
      isValid: true,
      statusMessage: 'License valid until 2025-12-31',
      companyName: 'Test Company',
      plan: 'PRO',
      expiresAt: '2025-12-31T23:59:59Z',
      daysRemaining: 365,
      gracePeriodActive: false,
      installedAt: '2024-01-01T00:00:00Z',
      showRenewalBanner: false,
      daysUntilBlock: null as any
    };

    it('has required properties', () => {
      expect(validStatus).toHaveProperty('hasLicense');
      expect(validStatus).toHaveProperty('isValid');
      expect(validStatus).toHaveProperty('statusMessage');
      expect(validStatus).toHaveProperty('gracePeriodActive');
      expect(validStatus).toHaveProperty('showRenewalBanner');
    });

    it('includes optional license details when licensed', () => {
      expect(validStatus.companyName).toBeDefined();
      expect(validStatus.plan).toBeDefined();
      expect(validStatus.expiresAt).toBeDefined();
    });
  });

  describe('SaveLicenseRequest interface', () => {
    const validRequest: SaveLicenseRequest = {
      companyId: 'comp-001',
      companyName: 'Test Company',
      deviceFingerprint: 'fingerprint-abc123',
      licenseKey: 'key-xyz123',
      plan: 'PRO',
      status: 'ACTIVE',
      expiresAt: '2025-12-31T23:59:59Z',
      graceUntil: '2026-01-15T23:59:59Z',
      enabledModules: ['CLOUD_SYNC', 'DASHBOARD'],
      signature: 'sig-abc123',
      publicKey: 'pub-key-xyz'
    };

    it('has all required properties', () => {
      const requiredProps = ['companyId', 'companyName', 'deviceFingerprint', 'licenseKey', 'plan', 'status', 'expiresAt', 'enabledModules', 'signature', 'publicKey'];
      requiredProps.forEach(prop => {
        expect(validRequest).toHaveProperty(prop);
      });
    });
  });

  describe('ProcessedCommand interface', () => {
    const validCommand: ProcessedCommand = {
      command: 'BLOCK_SYSTEM',
      requiresAction: true,
      blockOperations: true,
      showMessage: 'Your license has expired',
      payload: '{"reason":"expired"}'
    };

    it('has required properties', () => {
      expect(validCommand).toHaveProperty('command');
      expect(validCommand).toHaveProperty('requiresAction');
      expect(validCommand).toHaveProperty('blockOperations');
    });

    it('supports optional message and payload', () => {
      const minimalCommand: ProcessedCommand = {
        command: 'FORCE_UPDATE',
        requiresAction: false,
        blockOperations: false
      };

      expect(minimalCommand.showMessage).toBeUndefined();
      expect(minimalCommand.payload).toBeUndefined();
    });
  });

  describe('TamperStatus interface', () => {
    const validStatus: TamperStatus = {
      suspicious: true,
      reason: 'Device fingerprint mismatch',
      violationCount: 3,
      maxViolationsBeforeBlock: 5,
      recommendedAction: 'WARN'
    };

    it('has all required properties', () => {
      expect(validStatus).toHaveProperty('suspicious');
      expect(validStatus).toHaveProperty('reason');
      expect(validStatus).toHaveProperty('violationCount');
      expect(validStatus).toHaveProperty('maxViolationsBeforeBlock');
      expect(validStatus).toHaveProperty('recommendedAction');
    });

    it.each(['BLOCK', 'WARN', 'NONE'])('supports recommendedAction: %s', (action) => {
      const status: TamperStatus = {
        suspicious: false,
        reason: 'Clean',
        violationCount: 0,
        maxViolationsBeforeBlock: 5,
        recommendedAction: action as any
      };

      expect(['BLOCK', 'WARN', 'NONE']).toContain(status.recommendedAction);
    });
  });
});
