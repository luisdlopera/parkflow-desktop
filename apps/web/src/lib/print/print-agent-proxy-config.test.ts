import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  isPrintAgentProxyPath,
  directPrintAgentBaseUrl,
  printAgentPath,
  directPrintAgentApiKey
} from './print-agent-proxy-config';

describe('print/print-agent-proxy-config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('isPrintAgentProxyPath()', () => {
    it.each([
      {
        label: 'returns true when NEXT_PUBLIC_PRINT_AGENT_DIRECT is not set',
        envValue: undefined,
        expected: true
      },
      {
        label: 'returns true when NEXT_PUBLIC_PRINT_AGENT_DIRECT is empty string',
        envValue: '',
        expected: true
      },
      {
        label: 'returns true when NEXT_PUBLIC_PRINT_AGENT_DIRECT is whitespace',
        envValue: '   ',
        expected: true
      },
      {
        label: 'returns false when NEXT_PUBLIC_PRINT_AGENT_DIRECT is "true"',
        envValue: 'true',
        expected: false
      },
      {
        label: 'returns false when NEXT_PUBLIC_PRINT_AGENT_DIRECT is "true" with whitespace',
        envValue: '  true  ',
        expected: false
      },
      {
        label: 'returns true when NEXT_PUBLIC_PRINT_AGENT_DIRECT is "false"',
        envValue: 'false',
        expected: true
      },
      {
        label: 'returns true when NEXT_PUBLIC_PRINT_AGENT_DIRECT is any other value',
        envValue: 'yes',
        expected: true
      },
      {
        label: 'returns true when NEXT_PUBLIC_PRINT_AGENT_DIRECT is "True" (case sensitive)',
        envValue: 'True',
        expected: true
      }
    ])('$label', ({ envValue, expected }) => {
      if (envValue === undefined) {
        delete process.env.NEXT_PUBLIC_PRINT_AGENT_DIRECT;
      } else {
        process.env.NEXT_PUBLIC_PRINT_AGENT_DIRECT = envValue;
      }

      const result = isPrintAgentProxyPath();

      expect(result).toBe(expected);
    });
  });

  describe('directPrintAgentBaseUrl()', () => {
    it.each([
      {
        label: 'returns null when NEXT_PUBLIC_PRINT_AGENT_URL is not set',
        envValue: undefined,
        expected: null
      },
      {
        label: 'returns null when NEXT_PUBLIC_PRINT_AGENT_URL is empty string',
        envValue: '',
        expected: null
      },
      {
        label: 'returns null when NEXT_PUBLIC_PRINT_AGENT_URL is whitespace',
        envValue: '   ',
        expected: null
      },
      {
        label: 'returns trimmed URL',
        envValue: '  http://localhost:3000  ',
        expected: 'http://localhost:3000'
      },
      {
        label: 'returns URL with trailing slash',
        envValue: 'http://print-agent.local/',
        expected: 'http://print-agent.local/'
      },
      {
        label: 'returns URL without modification',
        envValue: 'https://api.parkflow.io',
        expected: 'https://api.parkflow.io'
      }
    ])('$label', ({ envValue, expected }) => {
      if (envValue === undefined) {
        delete process.env.NEXT_PUBLIC_PRINT_AGENT_URL;
      } else {
        process.env.NEXT_PUBLIC_PRINT_AGENT_URL = envValue;
      }

      const result = directPrintAgentBaseUrl();

      expect(result).toBe(expected);
    });
  });

  describe('printAgentPath()', () => {
    it.each([
      {
        label: 'uses proxy path when isPrintAgentProxyPath is true',
        proxyPath: true,
        baseUrl: null,
        inputPath: '/health',
        expected: '/api/print-agent/health'
      },
      {
        label: 'adds leading slash to path when missing',
        proxyPath: true,
        baseUrl: null,
        inputPath: 'health',
        expected: '/api/print-agent/health'
      },
      {
        label: 'uses base URL when direct mode enabled',
        proxyPath: false,
        baseUrl: 'http://localhost:3000',
        inputPath: '/health',
        expected: 'http://localhost:3000/health'
      },
      {
        label: 'removes trailing slash from base URL',
        proxyPath: false,
        baseUrl: 'http://localhost:3000/',
        inputPath: '/health',
        expected: 'http://localhost:3000/health'
      },
      {
        label: 'handles paths without leading slash in direct mode',
        proxyPath: false,
        baseUrl: 'http://localhost:3000',
        inputPath: 'health',
        expected: 'http://localhost:3000/health'
      },
      {
        label: 'returns empty string when direct mode without base URL',
        proxyPath: false,
        baseUrl: null,
        inputPath: '/health',
        expected: ''
      },
      {
        label: 'handles complex paths',
        proxyPath: true,
        baseUrl: null,
        inputPath: '/api/v1/print/health',
        expected: '/api/print-agent/api/v1/print/health'
      },
      {
        label: 'handles empty path',
        proxyPath: true,
        baseUrl: null,
        inputPath: '',
        expected: '/api/print-agent/'
      },
      {
        label: 'handles trailing slash in base URL',
        proxyPath: false,
        baseUrl: 'http://localhost:3000/',
        inputPath: 'health',
        expected: 'http://localhost:3000/health'
      }
    ])('$label', ({ proxyPath, baseUrl, inputPath, expected }) => {
      process.env.NEXT_PUBLIC_PRINT_AGENT_DIRECT = proxyPath ? '' : 'true';
      process.env.NEXT_PUBLIC_PRINT_AGENT_URL = baseUrl ?? '';

      const result = printAgentPath(inputPath);

      expect(result).toBe(expected);
    });

    it('uses proxy path by default', () => {
      delete process.env.NEXT_PUBLIC_PRINT_AGENT_DIRECT;
      delete process.env.NEXT_PUBLIC_PRINT_AGENT_URL;

      const result = printAgentPath('/status');

      expect(result).toBe('/api/print-agent/status');
    });
  });

  describe('directPrintAgentApiKey()', () => {
    it.each([
      {
        label: 'returns null when using proxy path',
        proxyPath: true,
        apiKeyValue: 'secret-key-123',
        expected: null
      },
      {
        label: 'returns null when not direct mode',
        proxyPath: true,
        apiKeyValue: 'secret',
        expected: null
      },
      {
        label: 'returns API key when in direct mode',
        proxyPath: false,
        apiKeyValue: 'secret-key-123',
        expected: 'secret-key-123'
      },
      {
        label: 'returns trimmed API key',
        proxyPath: false,
        apiKeyValue: '  secret-key-123  ',
        expected: 'secret-key-123'
      },
      {
        label: 'returns null when direct mode but no API key',
        proxyPath: false,
        apiKeyValue: undefined,
        expected: null
      },
      {
        label: 'returns null when direct mode but empty API key',
        proxyPath: false,
        apiKeyValue: '',
        expected: null
      },
      {
        label: 'returns null when direct mode but whitespace API key',
        proxyPath: false,
        apiKeyValue: '   ',
        expected: null
      }
    ])('$label', ({ proxyPath, apiKeyValue, expected }) => {
      process.env.NEXT_PUBLIC_PRINT_AGENT_DIRECT = proxyPath ? '' : 'true';
      if (apiKeyValue === undefined) {
        delete process.env.NEXT_PUBLIC_PRINT_AGENT_API_KEY;
      } else {
        process.env.NEXT_PUBLIC_PRINT_AGENT_API_KEY = apiKeyValue;
      }

      const result = directPrintAgentApiKey();

      expect(result).toBe(expected);
    });

    it('always returns null when proxy is used', () => {
      process.env.NEXT_PUBLIC_PRINT_AGENT_DIRECT = ''; // proxy mode
      process.env.NEXT_PUBLIC_PRINT_AGENT_API_KEY = 'should-be-hidden';

      const result = directPrintAgentApiKey();

      expect(result).toBeNull();
    });
  });

  describe('integration scenarios', () => {
    it('proxy mode configuration', () => {
      process.env.NEXT_PUBLIC_PRINT_AGENT_DIRECT = '';
      delete process.env.NEXT_PUBLIC_PRINT_AGENT_URL;
      delete process.env.NEXT_PUBLIC_PRINT_AGENT_API_KEY;

      expect(isPrintAgentProxyPath()).toBe(true);
      expect(directPrintAgentBaseUrl()).toBeNull();
      expect(directPrintAgentApiKey()).toBeNull();
      expect(printAgentPath('/health')).toBe('/api/print-agent/health');
    });

    it('direct mode configuration', () => {
      process.env.NEXT_PUBLIC_PRINT_AGENT_DIRECT = 'true';
      process.env.NEXT_PUBLIC_PRINT_AGENT_URL = 'https://print-agent.parkflow.io';
      process.env.NEXT_PUBLIC_PRINT_AGENT_API_KEY = 'secure-api-key-xyz';

      expect(isPrintAgentProxyPath()).toBe(false);
      expect(directPrintAgentBaseUrl()).toBe('https://print-agent.parkflow.io');
      expect(directPrintAgentApiKey()).toBe('secure-api-key-xyz');
      expect(printAgentPath('/print')).toBe('https://print-agent.parkflow.io/print');
    });

    it('handles incomplete direct mode configuration gracefully', () => {
      process.env.NEXT_PUBLIC_PRINT_AGENT_DIRECT = 'true';
      delete process.env.NEXT_PUBLIC_PRINT_AGENT_URL;
      process.env.NEXT_PUBLIC_PRINT_AGENT_API_KEY = 'key';

      expect(isPrintAgentProxyPath()).toBe(false);
      expect(directPrintAgentBaseUrl()).toBeNull();
      expect(directPrintAgentApiKey()).toBe('key');
      expect(printAgentPath('/health')).toBe('');
    });
  });
});
