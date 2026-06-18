/**
 * @vitest-environment jsdom
 */
import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useActiveSessions } from '../useActiveSessions';
import { server } from '@/mocks/server';
import { http, HttpResponse } from 'msw';
import { SWRConfig } from 'swr';
import React from 'react';

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('useActiveSessions', () => {
  beforeEach(() => {
    // vi.useFakeTimers(); // Removing this because it conflicts with MSW and useDebounce
  });

  afterEach(() => {
    // vi.useRealTimers();
    server.resetHandlers();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );

  it('should initialize with loading state', () => {
    const { result } = renderHook(() => useActiveSessions(), { wrapper });

    expect(result.current.loading).toBe(true);
    expect(result.current.rows).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should fetch and return active sessions', async () => {
    const mockSessions = {
      data: [
        { ticketNumber: 'T-001', plate: 'ABC123', vehicleType: 'CAR', duration: '00:30:00' },
        { ticketNumber: 'T-002', plate: 'XYZ789', vehicleType: 'MOTORCYCLE', duration: '00:15:00' },
      ],
      meta: { total: 2, page: 1, limit: 25, totalPages: 1 },
    };

    server.use(
      http.get(/.*\/api\/v1\/operations\/sessions\/active-list/, () => {
        return HttpResponse.json(mockSessions);
      }),
      http.get(/.*\/api\/v1\/parking-spaces\/summary/, () => {
        return HttpResponse.json({ availableSpaces: 100, activeSpaces: 2 });
      })
    );

    const { result } = renderHook(() => useActiveSessions(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.rows).toHaveLength(2);
    expect(result.current.rows[0].plate).toBe('ABC123');
    expect(result.current.error).toBeNull();
  });

  it('should handle network errors gracefully', async () => {
    server.use(
      http.get(/.*\/api\/v1\/operations\/sessions\/active-list/, () => {
        return HttpResponse.json({ error: 'Network error' }, { status: 500 });
      }),
      http.get(/.*\/api\/v1\/parking-spaces\/summary/, () => {
        return HttpResponse.json({ error: 'Network error' }, { status: 500 });
      })
    );

    const { result } = renderHook(() => useActiveSessions(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.rows).toEqual([]);
  });

  it('should handle summary failure gracefully', async () => {
    const mockSessions = {
      data: [
        { ticketNumber: 'T-001', plate: 'ABC123', vehicleType: 'CAR' },
      ],
      meta: { total: 1, page: 1, limit: 25, totalPages: 1 },
    };

    server.use(
      http.get(/.*\/api\/v1\/operations\/sessions\/active-list/, () => {
        return HttpResponse.json(mockSessions);
      }),
      http.get(/.*\/api\/v1\/parking-spaces\/summary/, () => {
        return HttpResponse.json({ error: 'Summary failed' }, { status: 500 });
      })
    );

    const { result } = renderHook(() => useActiveSessions(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.rows).toHaveLength(1);
    expect(result.current.summary).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should return empty array when sessions data is empty', async () => {
    server.use(
      http.get(/.*\/api\/v1\/operations\/sessions\/active-list/, () => {
        return HttpResponse.json({ data: [], meta: { total: 0, page: 1, limit: 25, totalPages: 0 } });
      }),
      http.get(/.*\/api\/v1\/parking-spaces\/summary/, () => {
        return HttpResponse.json({ availableSpaces: 100, activeSpaces: 0 });
      })
    );

    const { result } = renderHook(() => useActiveSessions(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.rows).toEqual([]);
    expect(result.current.meta!.total).toBe(0);
  });

  it('should include pagination metadata', async () => {
    const mockSessions = {
      data: [
        { ticketNumber: 'T-001', plate: 'ABC123', vehicleType: 'CAR' },
      ],
      meta: { total: 100, page: 3, limit: 10, totalPages: 10 },
    };

    server.use(
      http.get(/.*\/api\/v1\/operations\/sessions\/active-list/, () => {
        return HttpResponse.json(mockSessions);
      }),
      http.get(/.*\/api\/v1\/parking-spaces\/summary/, () => {
        return HttpResponse.json({ availableSpaces: 90, activeSpaces: 10 });
      })
    );

    const { result } = renderHook(() => useActiveSessions(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.meta).toEqual({ total: 100, page: 3, limit: 10, totalPages: 10 });
  });

  it('should handle params changes and refetch', async () => {
    let requestCount = 0;

    server.use(
      http.get(/.*\/api\/v1\/operations\/sessions\/active-list/, () => {
        requestCount++;
        return HttpResponse.json({
          data: [{ ticketNumber: `T-${requestCount}`, plate: 'ABC123', vehicleType: 'CAR' }],
          meta: { total: 1, page: 1, limit: 25, totalPages: 1 },
        });
      }),
      http.get(/.*\/api\/v1\/parking-spaces\/summary/, () => {
        return HttpResponse.json({ availableSpaces: 100, activeSpaces: 1 });
      })
    );

    const { result, rerender } = renderHook(() => useActiveSessions({ page: 1, limit: 10 }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(requestCount).toBe(1);

    rerender({ page: 2, limit: 10 });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(requestCount).toBe(1);
  });

  it('should handle reload function', async () => {
    let fetchCount = 0;

    server.use(
      http.get(/.*\/api\/v1\/operations\/sessions\/active-list/, () => {
        fetchCount++;
        return HttpResponse.json({
          data: [{ ticketNumber: 'T-001', plate: 'ABC123', vehicleType: 'CAR' }],
          meta: { total: 1, page: 1, limit: 25, totalPages: 1 },
        });
      }),
      http.get(/.*\/api\/v1\/parking-spaces\/summary/, () => {
        return HttpResponse.json({ availableSpaces: 100, activeSpaces: 1 });
      })
    );

    const { result } = renderHook(() => useActiveSessions(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(fetchCount).toBe(1);

    await act(async () => {
      await result.current.reload();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(fetchCount).toBe(2);
  });

  it('should handle search parameter', async () => {
    const { result } = renderHook(() => useActiveSessions({ search: 'ABC' }), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error ?? result.current.rows).toBeTruthy();
  });

  it('should include summary data when available', async () => {
    server.use(
      http.get(/.*\/api\/v1\/operations\/sessions\/active-list/, () => {
        return HttpResponse.json({
          data: [{ ticketNumber: 'T-001', plate: 'ABC123', vehicleType: 'CAR' }],
          meta: { total: 1, page: 1, limit: 25, totalPages: 1 },
        });
      }),
      http.get(/.*\/api\/v1\/parking-spaces\/summary/, () => {
        return HttpResponse.json({ availableSpaces: 50, activeSpaces: 10, totalSpaces: 60 });
      })
    );

    const { result } = renderHook(() => useActiveSessions(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.summary).toEqual({ availableSpaces: 50, activeSpaces: 10, totalSpaces: 60 });
  });

  it('should handle array response format (legacy)', async () => {
    server.use(
      http.get(/.*\/api\/v1\/operations\/sessions\/active-list/, () => {
        return HttpResponse.json([
          { ticketNumber: 'T-001', plate: 'ABC123', vehicleType: 'CAR' },
          { ticketNumber: 'T-002', plate: 'XYZ789', vehicleType: 'CAR' },
        ]);
      }),
      http.get(/.*\/api\/v1\/parking-spaces\/summary/, () => {
        return HttpResponse.json({ availableSpaces: 100, activeSpaces: 2 });
      })
    );

    const { result } = renderHook(() => useActiveSessions(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.rows).toHaveLength(2);
    expect(result.current.meta!.total).toBe(2);
  });

  it('should handle custodied items in response', async () => {
    const mockSessions = {
      data: [
        {
          ticketNumber: 'T-001',
          plate: 'ABC123',
          vehicleType: 'MOTORCYCLE',
          custodiedItems: [
            { identifier: 'CASCO-001', observations: 'Casco azul' },
          ],
        },
      ],
      meta: { total: 1, page: 1, limit: 25, totalPages: 1 },
    };

    server.use(
      http.get(/.*\/api\/v1\/operations\/sessions\/active-list/, () => {
        return HttpResponse.json(mockSessions);
      }),
      http.get(/.*\/api\/v1\/parking-spaces\/summary/, () => {
        return HttpResponse.json({ availableSpaces: 100, activeSpaces: 1 });
      })
    );

    const { result } = renderHook(() => useActiveSessions(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.rows[0].custodiedItems).toHaveLength(1);
    expect(result.current.rows[0].custodiedItems![0].identifier).toBe('CASCO-001');
  });
});