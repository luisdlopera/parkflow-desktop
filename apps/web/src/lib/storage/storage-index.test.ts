import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getStorage, resetStorage } from './index';
import type { StorageBackend } from './types';

describe('storage/index', () => {
  beforeEach(() => {
    resetStorage();
    vi.resetAllMocks();
  });

  afterEach(() => {
    resetStorage();
  });

  describe('getStorage()', () => {
    it.each([
      {
        label: 'returns same instance on consecutive calls',
        calls: 2,
        shouldBeIdentical: true
      },
      {
        label: 'returns same instance across multiple calls',
        calls: 5,
        shouldBeIdentical: true
      },
      {
        label: 'returns singleton instance',
        calls: 3,
        shouldBeIdentical: true
      }
    ])('$label', ({ calls, shouldBeIdentical }) => {
      const instances: StorageBackend[] = [];
      for (let i = 0; i < calls; i++) {
        instances.push(getStorage());
      }

      if (shouldBeIdentical) {
        const first = instances[0];
        instances.forEach(instance => {
          expect(instance).toBe(first);
        });
      }
    });

    it('returns a StorageBackend instance', () => {
      const storage = getStorage();
      expect(storage).toBeDefined();
      expect(typeof storage).toBe('object');
    });

    it('returns non-null storage instance', () => {
      const storage = getStorage();
      expect(storage).not.toBeNull();
    });
  });

  describe('resetStorage()', () => {
    it('clears the storage singleton', () => {
      const storage1 = getStorage();
      resetStorage();
      const storage2 = getStorage();
      expect(storage1).not.toBe(storage2);
    });

    it('allows creating new instance after reset', () => {
      getStorage();
      resetStorage();
      expect(getStorage()).toBeDefined();
    });
  });
});
