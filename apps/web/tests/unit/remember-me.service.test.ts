import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  saveRememberMeEmail,
  loadRememberMeEmail,
  clearRememberMeEmail,
  type RememberMeData,
} from '@/lib/services/remember-me.service';

describe('remember-me.service', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('saveRememberMeEmail', () => {
    it('should save email to localStorage', () => {
      const email = 'user@example.com';
      saveRememberMeEmail(email);

      const stored = localStorage.getItem('parkflow.auth.rememberMe');
      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored!) as RememberMeData;
      expect(parsed.email).toBe(email);
      expect(parsed.rememberMe).toBe(true);
    });

    it('should trim email before saving', () => {
      const email = '  user@example.com  ';
      saveRememberMeEmail(email);

      const loaded = loadRememberMeEmail();
      expect(loaded?.email).toBe('user@example.com');
    });

    it('should handle localStorage errors gracefully', () => {
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = vi.fn(() => {
        throw new Error('QuotaExceededError');
      });

      expect(() => {
        saveRememberMeEmail('user@example.com');
      }).not.toThrow();

      Storage.prototype.setItem = originalSetItem;
    });
  });

  describe('loadRememberMeEmail', () => {
    it('should return null when nothing is saved', () => {
      const loaded = loadRememberMeEmail();
      expect(loaded).toBeNull();
    });

    it('should load previously saved email', () => {
      const email = 'user@example.com';
      saveRememberMeEmail(email);

      const loaded = loadRememberMeEmail();
      expect(loaded).toEqual({ email, rememberMe: true });
    });

    it('should return null for corrupted data', () => {
      localStorage.setItem('parkflow.auth.rememberMe', 'invalid json');
      const loaded = loadRememberMeEmail();
      expect(loaded).toBeNull();
    });

    it('should return null for missing email field', () => {
      localStorage.setItem('parkflow.auth.rememberMe', JSON.stringify({ rememberMe: true }));
      const loaded = loadRememberMeEmail();
      expect(loaded).toBeNull();
    });

    it('should return null for empty email', () => {
      localStorage.setItem('parkflow.auth.rememberMe', JSON.stringify({ email: '   ', rememberMe: true }));
      const loaded = loadRememberMeEmail();
      expect(loaded).toBeNull();
    });

    it('should handle localStorage errors gracefully', () => {
      const originalGetItem = Storage.prototype.getItem;
      Storage.prototype.getItem = vi.fn(() => {
        throw new Error('SecurityError');
      });

      expect(() => {
        loadRememberMeEmail();
      }).not.toThrow();

      expect(loadRememberMeEmail()).toBeNull();

      Storage.prototype.getItem = originalGetItem;
    });
  });

  describe('clearRememberMeEmail', () => {
    it('should remove email from localStorage', () => {
      saveRememberMeEmail('user@example.com');
      expect(loadRememberMeEmail()).not.toBeNull();

      clearRememberMeEmail();
      expect(loadRememberMeEmail()).toBeNull();
    });

    it('should handle localStorage errors gracefully', () => {
      saveRememberMeEmail('user@example.com');

      const originalRemoveItem = Storage.prototype.removeItem;
      Storage.prototype.removeItem = vi.fn(() => {
        throw new Error('QuotaExceededError');
      });

      expect(() => {
        clearRememberMeEmail();
      }).not.toThrow();

      Storage.prototype.removeItem = originalRemoveItem;
    });

    it('should be idempotent (safe to call multiple times)', () => {
      clearRememberMeEmail();
      clearRememberMeEmail(); // Should not throw
      expect(loadRememberMeEmail()).toBeNull();
    });
  });
});
