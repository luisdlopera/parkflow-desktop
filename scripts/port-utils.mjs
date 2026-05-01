#!/usr/bin/env node
/**
 * Parkflow Port Utilities
 * Módulo de utilidades para detectar puertos libres y resolver puertos con fallback.
 */

import { createServer } from 'net';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Verifica si un puerto está libre.
 * @param {number} port - Puerto a verificar
 * @returns {Promise<boolean>} - true si está libre, false si está ocupado
 */
export async function isPortFree(port) {
  return new Promise((resolve) => {
    const server = createServer();

    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        resolve(false);
      }
    });

    server.once('listening', () => {
      server.close(() => {
        resolve(true);
      });
    });

    server.listen(port, '127.0.0.1');
  });
}

/**
 * Encuentra el proceso que está usando un puerto (cross-platform).
 * @param {number} port - Puerto a investigar
 * @returns {Promise<string|null>} - Información del proceso o null
 */
export async function findProcessOnPort(port) {
  const platform = process.platform;

  try {
    if (platform === 'win32') {
      // Windows: usar netstat y findstr
      const { stdout } = await execAsync(
        `netstat -ano | findstr :${port} | findstr LISTENING`
      );
      if (stdout) {
        const lines = stdout.trim().split('\n');
        const pids = [...new Set(lines.map(line => line.trim().split(/\s+/).pop()))];
        if (pids.length > 0) {
          try {
            const { stdout: procStdout } = await execAsync(
              `tasklist /FI "PID eq ${pids[0]}" /FO CSV /NH`
            );
            return procStdout.trim().replace(/"/g, '');
          } catch {
            return `PID ${pids[0]} (unknown process)`;
          }
        }
      }
    } else {
      // macOS/Linux: usar lsof
      const { stdout } = await execAsync(
        `lsof -i :${port} -sTCP:LISTEN -t 2>/dev/null || echo ""`
      );
      const pid = stdout.trim();
      if (pid) {
        try {
          const { stdout: procStdout } = await execAsync(
            `ps -p ${pid} -o comm= 2>/dev/null || echo "unknown"`
          );
          return `${procStdout.trim()} (PID: ${pid})`;
        } catch {
          return `PID ${pid} (unknown process)`;
        }
      }
    }
  } catch {
    // Silently fail - port might be free or command not available
  }

  return null;
}

/**
 * Resuelve un puerto con fallback automático.
 * @param {Object} options
 * @param {number} options.primary - Puerto principal
 * @param {number} options.fallback - Puerto fallback
 * @param {string} options.service - Nombre del servicio para logs
 * @returns {Promise<{port: number, usedFallback: boolean}>} - Puerto resuelto y flag de fallback
 * @throws {Error} - Si ambos puertos están ocupados
 */
export async function resolvePort({ primary, fallback, service }) {
  const label = `[Parkflow Ports]`;

  // Check primary port
  const primaryFree = await isPortFree(primary);

  if (primaryFree) {
    console.log(`${label} ${service} primary port ${primary} is available.`);
    return { port: primary, usedFallback: false };
  }

  // Primary is busy, show info
  const processInfo = await findProcessOnPort(primary);
  console.log(`${label} ${service} primary port ${primary} is busy.${processInfo ? ` (used by: ${processInfo})` : ''}`);

  // Check fallback port
  const fallbackFree = await isPortFree(fallback);

  if (fallbackFree) {
    console.log(`${label} Using fallback port ${fallback} for ${service}.`);
    return { port: fallback, usedFallback: true };
  }

  // Both ports are busy
  const fallbackProcessInfo = await findProcessOnPort(fallback);
  throw new Error(
    `${label} Error: ${service} ports ${primary} and ${fallback} are both busy.\n` +
    `  Port ${primary}: ${processInfo || 'unknown process'}\n` +
    `  Port ${fallback}: ${fallbackProcessInfo || 'unknown process'}\n` +
    `  Please free one port or change the environment variables.`
  );
}

/**
 * Obtiene variables de entorno con valores por defecto.
 * @param {string} name - Nombre de la variable
 * @param {number} defaultValue - Valor por defecto
 * @returns {number} - Valor como número
 */
export function getEnvPort(name, defaultValue) {
  const value = process.env[name];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    console.warn(`[Parkflow Ports] Warning: ${name}="${value}" is not a valid number, using default ${defaultValue}`);
    return defaultValue;
  }
  return parsed;
}

/**
 * Configuración de puertos de Parkflow.
 * Lee de las variables de entorno o usa valores por defecto.
 */
export const PORT_CONFIG = {
  web: {
    primary: getEnvPort('PARKFLOW_WEB_PORT', 6001),
    fallback: getEnvPort('PARKFLOW_WEB_FALLBACK_PORT', 6002),
  },
  api: {
    primary: getEnvPort('PARKFLOW_API_PORT', 6011),
    fallback: getEnvPort('PARKFLOW_API_FALLBACK_PORT', 6012),
  },
  db: {
    host: getEnvPort('PARKFLOW_DB_PORT', 6021),
    internal: 5432,
  },
  redis: {
    host: getEnvPort('PARKFLOW_REDIS_PORT', 6031),
    internal: 6379,
  },
  desktopBridge: {
    primary: getEnvPort('PARKFLOW_DESKTOP_BRIDGE_PORT', 6041),
    fallback: getEnvPort('PARKFLOW_DESKTOP_BRIDGE_FALLBACK_PORT', 6042),
  },
  printer: {
    primary: getEnvPort('PARKFLOW_PRINTER_PORT', 6051),
    fallback: getEnvPort('PARKFLOW_PRINTER_FALLBACK_PORT', 6052),
  },
  ws: {
    primary: getEnvPort('PARKFLOW_WS_PORT', 6061),
    fallback: getEnvPort('PARKFLOW_WS_FALLBACK_PORT', 6062),
  },
};

/**
 * Imprime un resumen de la configuración de puertos.
 */
export function printPortConfig() {
  console.log('\n[Parkflow Ports] Current configuration:');
  console.log('  Web:           primary=' + PORT_CONFIG.web.primary + ', fallback=' + PORT_CONFIG.web.fallback);
  console.log('  API:           primary=' + PORT_CONFIG.api.primary + ', fallback=' + PORT_CONFIG.api.fallback);
  console.log('  PostgreSQL:    host=' + PORT_CONFIG.db.host + ', internal=' + PORT_CONFIG.db.internal);
  console.log('  Redis:         host=' + PORT_CONFIG.redis.host + ', internal=' + PORT_CONFIG.redis.internal);
  console.log('  Desktop Bridge: primary=' + PORT_CONFIG.desktopBridge.primary + ', fallback=' + PORT_CONFIG.desktopBridge.fallback);
  console.log('  Printer:       primary=' + PORT_CONFIG.printer.primary + ', fallback=' + PORT_CONFIG.printer.fallback);
  console.log('  WebSocket:     primary=' + PORT_CONFIG.ws.primary + ', fallback=' + PORT_CONFIG.ws.fallback);
  console.log('');
}

/**
 * Verifica todos los puertos principales y reporta su estado.
 * @returns {Promise<Array<{service: string, port: number, free: boolean, process: string|null}>>}
 */
export async function checkAllPorts() {
  const checks = [
    { service: 'Web', port: PORT_CONFIG.web.primary },
    { service: 'Web (fallback)', port: PORT_CONFIG.web.fallback },
    { service: 'API', port: PORT_CONFIG.api.primary },
    { service: 'API (fallback)', port: PORT_CONFIG.api.fallback },
    { service: 'PostgreSQL', port: PORT_CONFIG.db.host },
    { service: 'Redis', port: PORT_CONFIG.redis.host },
    { service: 'Desktop Bridge', port: PORT_CONFIG.desktopBridge.primary },
    { service: 'Desktop Bridge (fallback)', port: PORT_CONFIG.desktopBridge.fallback },
    { service: 'Printer Service', port: PORT_CONFIG.printer.primary },
    { service: 'Printer Service (fallback)', port: PORT_CONFIG.printer.fallback },
    { service: 'WebSocket', port: PORT_CONFIG.ws.primary },
    { service: 'WebSocket (fallback)', port: PORT_CONFIG.ws.fallback },
  ];

  const results = [];
  for (const check of checks) {
    const free = await isPortFree(check.port);
    const process = free ? null : await findProcessOnPort(check.port);
    results.push({ ...check, free, process });
  }

  return results;
}
