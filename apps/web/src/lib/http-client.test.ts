import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { httpRequest } from './http-client';

// Mock safeFetch
vi.mock('./api/fetch', () => ({
  default: vi.fn()
}));

import safeFetch from './api/fetch';

describe('http-client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('httpRequest()', () => {
    it.each([
      {
        label: 'makes GET request with URL string',
        input: '/api/health',
        init: undefined,
        expected: 'call with /api/health'
      },
      {
        label: 'makes GET request to absolute URL',
        input: 'https://api.example.com/users',
        init: undefined,
        expected: 'call with https://api.example.com/users'
      },
      {
        label: 'makes POST request with body',
        input: '/api/users',
        init: { method: 'POST', body: JSON.stringify({ name: 'John' }) },
        expected: 'call with POST'
      },
      {
        label: 'makes PATCH request',
        input: '/api/users/123',
        init: { method: 'PATCH', body: JSON.stringify({ name: 'Jane' }) },
        expected: 'call with PATCH'
      },
      {
        label: 'makes DELETE request',
        input: '/api/users/123',
        init: { method: 'DELETE' },
        expected: 'call with DELETE'
      },
      {
        label: 'includes headers in request',
        input: '/api/auth',
        init: {
          headers: {
            'Authorization': 'Bearer token123',
            'Content-Type': 'application/json'
          }
        },
        expected: 'call with headers'
      },
      {
        label: 'handles URL object',
        input: new URL('https://api.example.com/data'),
        init: undefined,
        expected: 'call with URL object'
      }
    ])('$label', async ({ input, init, expected }) => {
      const mockResponse = { ok: true, status: 200, data: 'test' };
      (safeFetch as any).mockResolvedValueOnce(mockResponse);

      const result = await httpRequest(input, init);

      expect(safeFetch).toHaveBeenCalled();
      expect(result).toEqual(mockResponse);
    });

    it('passes correct request info to safeFetch', async () => {
      (safeFetch as any).mockResolvedValueOnce({ ok: true });

      await httpRequest('/api/test');

      expect(safeFetch).toHaveBeenCalledWith('/api/test', undefined);
    });

    it('passes request init options to safeFetch', async () => {
      (safeFetch as any).mockResolvedValueOnce({ ok: true });

      const init: RequestInit = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true })
      };

      await httpRequest('/api/test', init);

      expect(safeFetch).toHaveBeenCalledWith('/api/test', init);
    });

    it('returns the response from safeFetch', async () => {
      const mockResponse = { ok: true, status: 200, data: { id: 1, name: 'Test' } };
      (safeFetch as any).mockResolvedValueOnce(mockResponse);

      const result = await httpRequest('/api/users');

      expect(result).toEqual(mockResponse);
    });

    it('handles successful GET request', async () => {
      const mockData = [{ id: 1, name: 'User 1' }, { id: 2, name: 'User 2' }];
      (safeFetch as any).mockResolvedValueOnce(mockData);

      const result = await httpRequest<typeof mockData>('/api/users');

      expect(result).toEqual(mockData);
      expect(Array.isArray(result)).toBe(true);
    });

    it('handles successful POST request', async () => {
      const requestBody = { name: 'New User', email: 'user@example.com' };
      const mockResponse = { id: 3, ...requestBody };
      (safeFetch as any).mockResolvedValueOnce(mockResponse);

      const result = await httpRequest('/api/users', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      expect(result).toEqual(mockResponse);
    });

    it('handles error responses from safeFetch', async () => {
      const error = new Error('Request failed');
      (safeFetch as any).mockRejectedValueOnce(error);

      await expect(httpRequest('/api/error')).rejects.toThrow('Request failed');
    });

    it('preserves response type from safeFetch', async () => {
      const mockResponse = { success: true, message: 'OK' };
      (safeFetch as any).mockResolvedValueOnce(mockResponse);

      const result = await httpRequest('/api/status');

      expect(typeof result).toBe('object');
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('message');
    });

    it('handles empty response', async () => {
      (safeFetch as any).mockResolvedValueOnce(null);

      const result = await httpRequest('/api/void');

      expect(result).toBeNull();
    });

    it('handles undefined response', async () => {
      (safeFetch as any).mockResolvedValueOnce(undefined);

      const result = await httpRequest('/api/void');

      expect(result).toBeUndefined();
    });

    it('is a generic function that accepts type parameter', async () => {
      interface UserResponse {
        id: number;
        name: string;
        email: string;
      }

      const mockUser: UserResponse = { id: 1, name: 'John', email: 'john@example.com' };
      (safeFetch as any).mockResolvedValueOnce(mockUser);

      const result = await httpRequest<UserResponse>('/api/users/1');

      expect(result.id).toBe(1);
      expect(result.name).toBe('John');
      expect(result.email).toBe('john@example.com');
    });

    it('handles array response with generic type', async () => {
      interface Item {
        id: number;
        name: string;
      }

      const mockItems: Item[] = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' }
      ];
      (safeFetch as any).mockResolvedValueOnce(mockItems);

      const result = await httpRequest<Item[]>('/api/items');

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
    });

    it('handles complex request initialization', async () => {
      const init: RequestInit = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token',
          'X-Request-Id': 'req-123'
        },
        body: JSON.stringify({ data: 'test' })
      };

      (safeFetch as any).mockResolvedValueOnce({ success: true });

      await httpRequest('/api/endpoint', init);

      expect(safeFetch).toHaveBeenCalledWith('/api/endpoint', expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': 'Bearer token'
        })
      }));
    });

    it('handles relative path URLs', async () => {
      (safeFetch as any).mockResolvedValueOnce({ ok: true });

      await httpRequest('/api/v1/users/123');

      expect(safeFetch).toHaveBeenCalledWith('/api/v1/users/123', undefined);
    });

    it('handles absolute URL strings', async () => {
      (safeFetch as any).mockResolvedValueOnce({ ok: true });

      await httpRequest('http://localhost:3000/api/test');

      expect(safeFetch).toHaveBeenCalledWith('http://localhost:3000/api/test', undefined);
    });

    it('handles HTTPS URLs', async () => {
      (safeFetch as any).mockResolvedValueOnce({ ok: true });

      await httpRequest('https://api.production.com/users');

      expect(safeFetch).toHaveBeenCalledWith('https://api.production.com/users', undefined);
    });

    it('supports URL with query parameters', async () => {
      (safeFetch as any).mockResolvedValueOnce({ ok: true });

      await httpRequest('/api/users?page=1&limit=10');

      expect(safeFetch).toHaveBeenCalledWith('/api/users?page=1&limit=10', undefined);
    });
  });

  describe('integration scenarios', () => {
    it('handles GET request for list of items', async () => {
      const mockUsers = [
        { id: 1, name: 'Alice', role: 'admin' },
        { id: 2, name: 'Bob', role: 'user' }
      ];
      (safeFetch as any).mockResolvedValueOnce(mockUsers);

      const result = await httpRequest('/api/users');

      expect(result).toEqual(mockUsers);
      expect(result).toHaveLength(2);
    });

    it('handles POST request with complex body', async () => {
      const requestBody = {
        name: 'New Company',
        settings: {
          timezone: 'UTC',
          language: 'en',
          features: ['reports', 'analytics']
        },
        maxUsers: 100
      };

      const mockResponse = { id: 'comp-123', ...requestBody, createdAt: '2024-01-15T10:00:00Z' };
      (safeFetch as any).mockResolvedValueOnce(mockResponse);

      const result = await httpRequest('/api/companies', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      expect(result.id).toBe('comp-123');
      expect(result.settings.timezone).toBe('UTC');
    });

    it('handles PATCH request to update resource', async () => {
      const updateBody = { name: 'Updated Name', status: 'ACTIVE' };
      const mockResponse = { id: 'comp-123', ...updateBody };
      (safeFetch as any).mockResolvedValueOnce(mockResponse);

      const result = await httpRequest('/api/companies/comp-123', {
        method: 'PATCH',
        body: JSON.stringify(updateBody)
      });

      expect(result.name).toBe('Updated Name');
      expect(result.status).toBe('ACTIVE');
    });

    it('handles DELETE request', async () => {
      (safeFetch as any).mockResolvedValueOnce({ success: true, message: 'Deleted' });

      const result = await httpRequest('/api/companies/comp-123', {
        method: 'DELETE'
      });

      expect(result.success).toBe(true);
    });

    it('handles authenticated request with token', async () => {
      (safeFetch as any).mockResolvedValueOnce({ data: 'protected' });

      await httpRequest('/api/protected', {
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'
        }
      });

      expect(safeFetch).toHaveBeenCalled();
      const callArgs = (safeFetch as any).mock.calls[0];
      expect(callArgs[1].headers['Authorization']).toContain('Bearer');
    });

    it('handles paginated list request', async () => {
      const mockPage = {
        items: [{ id: 1, name: 'Item 1' }],
        pageNumber: 1,
        pageSize: 10,
        totalItems: 100
      };
      (safeFetch as any).mockResolvedValueOnce(mockPage);

      const result = await httpRequest('/api/items?page=1&pageSize=10');

      expect(result.pageNumber).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.totalItems).toBe(100);
    });
  });
});
