import { test, expect } from '@playwright/test';

test.describe('Core API', () => {
  let authToken: string;

  test.beforeAll(async ({ request }) => {
    // Login to get token
    const response = await request.post('http://localhost:6011/api/v1/auth/login', {
      data: {
        email: 'admin@parkflow.local',
        password: 'Qwert.12345',
        deviceId: 'api-test-device',
        deviceName: 'API Tester',
        platform: 'script',
        fingerprint: 'api-test-fp'
      }
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    authToken = body.accessToken;
  });

  test('should list active sessions via API', async ({ request }) => {
    const response = await request.get('http://localhost:6011/api/v1/operations/sessions/active-list', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    expect(response.ok()).toBeTruthy();
    const list = await response.json();
    expect(Array.isArray(list)).toBeTruthy();
  });

  test('should fail to create entry without authorization', async ({ request }) => {
    const response = await request.post('http://localhost:6011/api/v1/operations/entries', {
      data: {
        plate: 'FAKE-123',
        vehicleTypeId: '10000000-0000-0000-0000-000000000001'
      }
    });

    expect(response.status()).toBe(401);
  });
});
