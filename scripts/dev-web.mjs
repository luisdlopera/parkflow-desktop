#!/usr/bin/env node
/**
 * Parkflow Web Development Script
 * Inicia Next.js con resolución automática de puertos (con fallback).
 */

import { spawn } from 'child_process';
import { resolvePort, PORT_CONFIG } from './port-utils.mjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..');
const webDir = join(repoRoot, 'apps', 'web');

/**
 * Carga variables de entorno desde un archivo .env
 * @param {string} envPath - Ruta al archivo .env
 * @returns {Record<string, string>} - Variables cargadas
 */
function loadEnvFile(envPath) {
  const vars = {};
  if (!existsSync(envPath)) {
    return vars;
  }

  const content = readFileSync(envPath, 'utf8');
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    // Ignorar líneas vacías y comentarios
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;

    const key = trimmed.substring(0, eqIndex).trim();
    let value = trimmed.substring(eqIndex + 1).trim();

    // Quitar comillas si existen
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    // Expandir referencias a otras variables ${VAR}
    const varRefRegex = /\$\{([^}]+)\}/g;
    value = value.replace(varRefRegex, (match, varName) => {
      // Primero buscar en las variables ya cargadas, luego en process.env
      const refValue = vars[varName] ?? process.env[varName] ?? '';
      return refValue;
    });

    vars[key] = value;
  }

  return vars;
}

async function main() {
  const label = '[Parkflow Web]';

  try {
    // Load env files (root .env first, then web .env for overrides)
    const rootEnv = loadEnvFile(join(repoRoot, '.env'));
    const webEnv = loadEnvFile(join(webDir, '.env'));

    // Resolve port with fallback
    const { port, usedFallback } = await resolvePort({
      primary: PORT_CONFIG.web.primary,
      fallback: PORT_CONFIG.web.fallback,
      service: 'Web',
    });

    // Set environment variables for Next.js
    // Priority: calculated values > web .env > root .env > process.env
    const env = {
      ...process.env,
      ...rootEnv,
      ...webEnv,
      PORT: port.toString(),
      NEXT_PUBLIC_APP_PORT: port.toString(),
      // Rebuild API URLs with resolved port
      NEXT_PUBLIC_API_BASE_URL: `http://localhost:${PORT_CONFIG.api.primary}/api/v1/operations`,
      NEXT_PUBLIC_AUTH_BASE_URL: `http://localhost:${PORT_CONFIG.api.primary}/api/v1/auth`,
      NEXT_PUBLIC_WS_URL: `ws://localhost:${PORT_CONFIG.ws.primary}`,
    };

    console.log(`${label} Starting Next.js on port ${port}...`);
    console.log(`${label} URL: http://localhost:${port}`);
    if (usedFallback) {
      console.log(`${label} NOTE: Using fallback port because primary was busy.`);
    }
    console.log('');

    // Start Next.js
    const nextDev = spawn('pnpm', ['next', 'dev', '-p', port.toString()], {
      cwd: webDir,
      env,
      stdio: 'inherit',
      shell: true,
    });

    nextDev.on('error', (err) => {
      console.error(`${label} Failed to start Next.js:`, err.message);
      process.exit(1);
    });

    nextDev.on('exit', (code) => {
      process.exit(code ?? 0);
    });

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log(`\n${label} Shutting down...`);
      nextDev.kill('SIGINT');
    });

    process.on('SIGTERM', () => {
      nextDev.kill('SIGTERM');
    });

  } catch (error) {
    console.error(`[Parkflow Web] Error:`, error.message);
    process.exit(1);
  }
}

main();
