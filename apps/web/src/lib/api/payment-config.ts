/**
 * Payment Configuration API
 *
 * Provides server-side payment configuration including API keys.
 * Keys are never exposed to the client - fetched on-demand from the server.
 */

import { apiBase } from './config';
import { safeFetch } from "./fetch";

export interface PaymentConfig {
  apiKey: string;
  stripePublicKey?: string;
  supportedMethods: string[];
  webhookUrl: string;
}

// Cache payment config with TTL
let cachedConfig: PaymentConfig | null = null;
let cachedConfigTime: number = 0;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Fetch payment configuration from server
 * This ensures API keys are only sent server-to-client, not exposed to the browser
 */
export async function getPaymentConfig(): Promise<PaymentConfig> {
  // Return cached config if still valid
  if (cachedConfig && Date.now() - cachedConfigTime < CACHE_TTL_MS) {
    return cachedConfig;
  }

  try {
    const config = await safeFetch<PaymentConfig>(`${apiBase}/keys/payment-config`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Cache the config
    cachedConfig = config;
    cachedConfigTime = Date.now();

    return config;
  } catch (error) {
    console.error('Failed to get payment configuration:', error);
    throw error;
  }
}

/**
 * Clear cached payment config (useful for logout or config reload)
 */
export function clearPaymentConfigCache(): void {
  cachedConfig = null;
  cachedConfigTime = 0;
}
