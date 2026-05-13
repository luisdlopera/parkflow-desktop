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
import { resolvePort, PORT_CONFIG } from './port-utils.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..');

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
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

    console.log(`${label} Starting API on ${apiPort} and Web on ${webPort}...`);
    console.log(`${label} Seed runs automatically during API startup.`);

    const sharedEnv = {
      ...process.env,
      PARKFLOW_API_PORT: apiPort.toString(),
      PARKFLOW_WEB_PORT: webPort.toString(),
    };

    const api = spawn('pnpm', ['dev:api'], {
      cwd: repoRoot,
      env: sharedEnv,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });

    const web = spawn('pnpm', ['dev:web'], {
      cwd: repoRoot,
      env: sharedEnv,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });

    children.add(api);
    children.add(web);

    const terminateOthers = (source, code) => {
      children.delete(source);
      for (const child of children) {
        child.kill('SIGINT');
      }
      process.exit(code ?? 0);
    };

    api.on('error', (err) => {
      console.error(`${label} API failed to start:`, err.message);
      terminateOthers(api, 1);
    });

    web.on('error', (err) => {
      console.error(`${label} Web failed to start:`, err.message);
      terminateOthers(web, 1);
    });

    api.on('exit', (code) => terminateOthers(api, code ?? 0));
    web.on('exit', (code) => terminateOthers(web, code ?? 0));
  } catch (error) {
    console.error(`${label} Error:`, error.message);
    shutdown(1);
  }
}

main();
