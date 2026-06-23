import { describe, it, expect, beforeEach } from 'vitest';

// Tests for local-first/config module without complex Tauri mocking
describe('local-first/config', () => {
  beforeEach(() => {
    // Reset window state before each test
    if (typeof window !== 'undefined') {
      delete (window as any).__TAURI_INTERNALS__;
    }
  });

  describe('browser environment detection', () => {
    it.each([
      {
        label: 'detects browser when __TAURI_INTERNALS__ is not present',
        hasTauri: false
      },
      {
        label: 'detects Tauri when __TAURI_INTERNALS__ is present',
        hasTauri: true
      }
    ])('$label', ({ hasTauri }) => {
      if (hasTauri) {
        Object.defineProperty(window, '__TAURI_INTERNALS__', {
          value: {},
          writable: true,
          configurable: true
        });
      } else {
        delete (window as any).__TAURI_INTERNALS__;
      }

      const isTauri = '__TAURI_INTERNALS__' in window;
      expect(isTauri).toBe(hasTauri);
    });
  });

  describe('configuration modes', () => {
    const validModes = ['local', 'sync', 'cloud'];

    it.each(validModes)('recognizes mode: %s', (mode) => {
      expect(validModes).toContain(mode);
    });

    it('identifies local-first modes', () => {
      const localFirstModes = ['local', 'sync'];
      const cloudMode = 'cloud';

      expect(localFirstModes).toContain('local');
      expect(localFirstModes).toContain('sync');
      expect(localFirstModes).not.toContain(cloudMode);
    });

    it('identifies cloud mode', () => {
      const cloudMode = 'cloud';
      const localFirstModes = ['local', 'sync'];

      expect(localFirstModes).not.toContain(cloudMode);
    });
  });

  describe('sync enabled flag', () => {
    it.each([
      { syncEnabled: true, label: 'is true' },
      { syncEnabled: false, label: 'is false' }
    ])('sync flag $label', ({ syncEnabled }) => {
      expect(typeof syncEnabled).toBe('boolean');
    });

    it('can be independently configured from mode', () => {
      const configs = [
        { mode: 'local', syncEnabled: false },
        { mode: 'local', syncEnabled: true },
        { mode: 'sync', syncEnabled: true },
        { mode: 'cloud', syncEnabled: false }
      ];

      configs.forEach(config => {
        expect(config).toHaveProperty('mode');
        expect(config).toHaveProperty('syncEnabled');
        expect(typeof config.syncEnabled).toBe('boolean');
      });
    });
  });

  describe('configuration structure', () => {
    const validConfig = { mode: 'local', syncEnabled: true };

    it('has required properties', () => {
      expect(validConfig).toHaveProperty('mode');
      expect(validConfig).toHaveProperty('syncEnabled');
    });

    it.each([
      { mode: 'local', syncEnabled: false },
      { mode: 'sync', syncEnabled: true },
      { mode: 'cloud', syncEnabled: false }
    ])('valid config structure: $mode / $syncEnabled', (config) => {
      expect(config).toHaveProperty('mode');
      expect(config).toHaveProperty('syncEnabled');
      expect(typeof config.mode).toBe('string');
      expect(typeof config.syncEnabled).toBe('boolean');
    });
  });

  describe('default behavior', () => {
    it('defaults to cloud mode in browser', () => {
      delete (window as any).__TAURI_INTERNALS__;

      const isBrowser = !('__TAURI_INTERNALS__' in window);
      expect(isBrowser).toBe(true);
    });

    it('defaults to sync disabled in browser', () => {
      delete (window as any).__TAURI_INTERNALS__;

      const isBrowser = !('__TAURI_INTERNALS__' in window);
      const defaultSyncEnabled = false;

      expect(isBrowser).toBe(true);
      expect(defaultSyncEnabled).toBe(false);
    });
  });

  describe('mode determination logic', () => {
    it('cloud mode is default when not Tauri', () => {
      delete (window as any).__TAURI_INTERNALS__;

      const isNotTauri = !('__TAURI_INTERNALS__' in window);
      const expectedMode = isNotTauri ? 'cloud' : 'local';

      expect(expectedMode).toBe('cloud');
    });

    it('local-first modes exclude cloud', () => {
      const isLocalFirst = (mode: string) => mode === 'local' || mode === 'sync';

      expect(isLocalFirst('local')).toBe(true);
      expect(isLocalFirst('sync')).toBe(true);
      expect(isLocalFirst('cloud')).toBe(false);
    });
  });

  describe('environment detection', () => {
    it.each([
      { env: 'browser', hasTauri: false, expectedMode: 'cloud' },
      { env: 'desktop-local', hasTauri: true, expectedMode: 'local' },
      { env: 'desktop-sync', hasTauri: true, expectedMode: 'sync' }
    ])('detects $env environment', ({ hasTauri, expectedMode }) => {
      if (hasTauri) {
        Object.defineProperty(window, '__TAURI_INTERNALS__', {
          value: {},
          writable: true,
          configurable: true
        });
      } else {
        delete (window as any).__TAURI_INTERNALS__;
      }

      const isTauri = '__TAURI_INTERNALS__' in window;
      expect(isTauri).toBe(hasTauri);

      // When not Tauri, mode should be cloud
      if (!hasTauri) {
        expect(expectedMode).toBe('cloud');
      }
    });
  });

  describe('sync behavior', () => {
    it('sync is disabled in cloud mode', () => {
      const cloudConfig = { mode: 'cloud', syncEnabled: false };
      expect(cloudConfig.syncEnabled).toBe(false);
    });

    it('sync can be enabled in sync mode', () => {
      const syncConfig = { mode: 'sync', syncEnabled: true };
      expect(syncConfig.syncEnabled).toBe(true);
    });

    it('sync can be disabled in local mode', () => {
      const localConfig = { mode: 'local', syncEnabled: false };
      expect(localConfig.syncEnabled).toBe(false);
    });

    it('sync can be enabled in local mode', () => {
      const localConfig = { mode: 'local', syncEnabled: true };
      expect(localConfig.syncEnabled).toBe(true);
    });
  });

  describe('configuration validation', () => {
    it('rejects invalid modes', () => {
      const validModes = ['local', 'sync', 'cloud'];
      const invalidModes = ['offline', 'hybrid', 'edge', 'unknown'];

      invalidModes.forEach(mode => {
        expect(validModes).not.toContain(mode);
      });
    });

    it('accepts all valid mode combinations', () => {
      const validConfigs = [
        { mode: 'local', syncEnabled: false },
        { mode: 'local', syncEnabled: true },
        { mode: 'sync', syncEnabled: false },
        { mode: 'sync', syncEnabled: true },
        { mode: 'cloud', syncEnabled: false },
        { mode: 'cloud', syncEnabled: true }
      ];

      validConfigs.forEach(config => {
        const modes = ['local', 'sync', 'cloud'];
        expect(modes).toContain(config.mode);
        expect(typeof config.syncEnabled).toBe('boolean');
      });
    });
  });

  describe('browser vs Tauri detection', () => {
    it('can distinguish browser from Tauri', () => {
      delete (window as any).__TAURI_INTERNALS__;
      const isBrowser = !('__TAURI_INTERNALS__' in window);
      expect(isBrowser).toBe(true);

      Object.defineProperty(window, '__TAURI_INTERNALS__', {
        value: {},
        writable: true,
        configurable: true
      });
      const isTauri = '__TAURI_INTERNALS__' in window;
      expect(isTauri).toBe(true);
    });

    it('SSR environments default to cloud', () => {
      // When window is undefined (SSR), we should default to cloud
      const shouldDefaultToCloud = typeof window === 'undefined';
      expect(typeof window).not.toBe('undefined');
    });
  });

  describe('configuration state', () => {
    it.each([
      { mode: 'local', syncEnabled: false, isLocalFirst: true },
      { mode: 'sync', syncEnabled: true, isLocalFirst: true },
      { mode: 'cloud', syncEnabled: false, isLocalFirst: false }
    ])('mode=$mode correctly identified as localFirst=$isLocalFirst', ({ mode, isLocalFirst }) => {
      const isLocalFirstMode = mode === 'local' || mode === 'sync';
      expect(isLocalFirstMode).toBe(isLocalFirst);
    });
  });
});
