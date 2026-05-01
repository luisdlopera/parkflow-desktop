#!/usr/bin/env node
/**
 * Parkflow API Development Script
 * Inicia Spring Boot con resolución automática de puertos (con fallback).
 */

import { spawn } from 'child_process';
import { resolvePort, PORT_CONFIG } from './port-utils.mjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFileSync, existsSync } from 'fs';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..');
const apiDir = join(repoRoot, 'apps', 'api');

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

async function resolveJavaHome() {
  // Check JAVA_HOME first
  if (process.env.JAVA_HOME) {
    const javaExe = join(process.env.JAVA_HOME, 'bin', 'java.exe');
    try {
      await execAsync(`"${javaExe}" -version`, { windowsHide: true });
      return process.env.JAVA_HOME;
    } catch {
      // Continue to search
    }
  }

  // Common Windows paths
  const candidates = [
    'C:\\Program Files\\Eclipse Adoptium\\jdk-21.0.10.7-hotspot',
    'C:\\Program Files\\Java\\jdk-21',
  ];

  for (const candidate of candidates) {
    const javaExe = join(candidate, 'bin', 'java.exe');
    try {
      await execAsync(`"${javaExe}" -version`, { windowsHide: true });
      return candidate;
    } catch {
      // Try next
    }
  }

  // Try wildcard patterns
  const patterns = [
    'C:\\Program Files\\Eclipse Adoptium\\jdk-21*',
    'C:\\Program Files\\Java\\jdk-21*',
  ];

  for (const pattern of patterns) {
    try {
      const { stdout } = await execAsync(
        `powershell -NoProfile -Command "Get-ChildItem -Path '${pattern}' -Directory | Sort-Object Name -Descending | Select-Object -First 1 -ExpandProperty FullName"`,
        { windowsHide: true }
      );
      const match = stdout.trim();
      if (match) {
        const javaExe = join(match, 'bin', 'java.exe');
        try {
          await execAsync(`"${javaExe}" -version`, { windowsHide: true });
          return match;
        } catch {
          // Try next pattern
        }
      }
    } catch {
      // Continue
    }
  }

  throw new Error(
    'No se encontró Java 21.\n' +
    'Instala JDK 21 o define la variable de entorno JAVA_HOME.'
  );
}

async function main() {
  const label = '[Parkflow API]';

  try {
    // Load .env from root project
    const rootEnvPath = join(repoRoot, '.env');
    const rootEnv = loadEnvFile(rootEnvPath);

    // Resolve port with fallback
    const { port, usedFallback } = await resolvePort({
      primary: PORT_CONFIG.api.primary,
      fallback: PORT_CONFIG.api.fallback,
      service: 'API',
    });

    // Resolve Java
    const javaHome = await resolveJavaHome();
    console.log(`${label} Using JAVA_HOME=${javaHome}`);

    // Set environment variables for Spring Boot
    // Priority: calculated values > root .env > process.env
    const env = {
      ...process.env,
      ...rootEnv,
      JAVA_HOME: javaHome,
      PORT: port.toString(),
      PARKFLOW_API_PORT: port.toString(),
      // Ensure path includes Java bin
      Path: `${join(javaHome, 'bin')};${process.env.Path || process.env.PATH}`,
    };

    console.log(`${label} Starting Spring Boot on port ${port}...`);
    console.log(`${label} URL: http://localhost:${port}`);
    console.log(`${label} Swagger: http://localhost:${port}/swagger-ui.html`);
    console.log(`${label} Health: http://localhost:${port}/actuator/health`);
    if (usedFallback) {
      console.log(`${label} NOTE: Using fallback port because primary was busy.`);
    }
    console.log('');

    // Start Gradle bootRun
    const gradlew = join(apiDir, 'gradlew.bat');
    const gradle = spawn(
      gradlew,
      ['bootRun', `--args=--server.port=${port}`],
      {
        cwd: apiDir,
        env,
        stdio: 'inherit',
        shell: true,
      }
    );

    gradle.on('error', (err) => {
      console.error(`${label} Failed to start Spring Boot:`, err.message);
      process.exit(1);
    });

    gradle.on('exit', (code) => {
      process.exit(code ?? 0);
    });

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log(`\n${label} Shutting down...`);
      gradle.kill('SIGINT');
    });

    process.on('SIGTERM', () => {
      gradle.kill('SIGTERM');
    });

  } catch (error) {
    console.error(`[Parkflow API] Error:`, error.message);
    process.exit(1);
  }
}

main();
