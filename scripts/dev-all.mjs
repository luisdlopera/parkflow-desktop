#!/usr/bin/env node
/**
 * Parkflow full development stack.
 * Starts PostgreSQL, then launches API and Web together.
 * The API runs the seed step on startup via AuthSeedService.
 */

import { spawn } from 'child_process';
import { createConnection } from 'net';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { setTimeout as delay } from 'timers/promises';
import { resolvePort, PORT_CONFIG, killProcessOnPort } from './port-utils.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..');

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    // nosemgrep: javascript.lang.security.detect-child-process.detect-child-process, javascript.lang.security.audit.spawn-shell-true.spawn-shell-true
    const child = spawn(command, args, {
      cwd: repoRoot,
      stdio: 'inherit',
      shell: process.platform === 'win32',
      ...options,
    });

    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(' ')} exited with ${signal ? `signal ${signal}` : `code ${code}`}`));
    });
  });
}

function waitForTcpPort(port, host = '127.0.0.1', timeoutMs = 60000) {
  const start = Date.now();

  return new Promise((resolve, reject) => {
    const attempt = () => {
      const socket = createConnection({ port, host });

      socket.once('connect', () => {
        socket.end();
        resolve();
      });

      socket.once('error', async () => {
        socket.destroy();
        if (Date.now() - start >= timeoutMs) {
          reject(new Error(`Timeout waiting for ${host}:${port}`));
          return;
        }
        await delay(1000);
        attempt();
      });
    };

    attempt();
  });
}

async function main() {
  const label = '[Parkflow Dev All]';
  const children = new Set();

  const shutdown = (code = 0) => {
    for (const child of children) {
      child.kill('SIGINT');
    }
    process.exit(code);
  };

  process.on('SIGINT', () => shutdown(0));
  process.on('SIGTERM', () => shutdown(0));

  try {
    // Kill any existing processes on the ports we need
    console.log(`${label} Checking for existing processes on API port ${PORT_CONFIG.api.primary}...`);
    await killProcessOnPort(PORT_CONFIG.api.primary);
    console.log(`${label} Checking for existing processes on Web port ${PORT_CONFIG.web.primary}...`);
    await killProcessOnPort(PORT_CONFIG.web.primary);

    console.log(`${label} Starting database...`);
    await run('pnpm', ['db:up']);
    console.log(`${label} Waiting for PostgreSQL on port ${PORT_CONFIG.db.host}...`);
    await waitForTcpPort(PORT_CONFIG.db.host);

    const apiPort = await resolvePort({
      primary: PORT_CONFIG.api.primary,
      fallback: PORT_CONFIG.api.fallback,
      service: 'API',
    }).then(({ port }) => port);

    const webPort = await resolvePort({
      primary: PORT_CONFIG.web.primary,
      fallback: PORT_CONFIG.web.fallback,
      service: 'Web',
    }).then(({ port }) => port);

    console.log(`${label} Starting API on ${apiPort} (waiting for it to be ready before starting Web)...`);
    console.log(`${label} Seed runs automatically during API startup.`);

    const sharedEnv = {
      ...process.env,
      PARKFLOW_API_PORT: apiPort.toString(),
      PARKFLOW_WEB_PORT: webPort.toString(),
      PARKFLOW_DEV_ALL: 'true',
    };

    // Start API first and wait for it to be ready
    // nosemgrep: javascript.lang.security.audit.spawn-shell-true.spawn-shell-true
    const api = spawn('pnpm', ['dev:api'], {
      cwd: repoRoot,
      env: sharedEnv,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });

    children.add(api);

    api.on('error', (err) => {
      console.error(`${label} API failed to start: ${err.message}`);
      shutdown(1);
    });

    // Wait for the API to be listening before starting Web
    console.log(`${label} Waiting for API to be ready on port ${apiPort}...`);
    try {
      await waitForTcpPort(apiPort);
    } catch (err) {
      console.error(`${label} Timeout waiting for API: ${err.message}`);
      shutdown(1);
      return;
    }

    console.log(`${label} API is ready. Starting Web on ${webPort}...`);

    // nosemgrep: javascript.lang.security.audit.spawn-shell-true.spawn-shell-true
    const web = spawn('pnpm', ['dev:web'], {
      cwd: repoRoot,
      env: sharedEnv,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });

    children.add(web);

    web.on('error', (err) => {
      console.error(`${label} Web failed to start: ${err.message}`);
      shutdown(1);
    });

    api.on('exit', (code) => {
      console.log(`${label} API exited (code: ${code}). Shutting down...`);
      shutdown(code ?? 0);
    });
    web.on('exit', (code) => {
      console.log(`${label} Web exited (code: ${code}). Shutting down...`);
      shutdown(code ?? 0);
    });
  } catch (error) {
    console.error(`${label} Error:`, error.message);
    shutdown(1);
  }
}

main();
