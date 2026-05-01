#!/usr/bin/env node
/**
 * Parkflow Port Checker
 * Verifica el estado de todos los puertos usados por Parkflow.
 */

import { checkAllPorts, PORT_CONFIG, printPortConfig } from './port-utils.mjs';

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║           PARKFLOW PORT AVAILABILITY CHECKER                   ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log('');

  // Print current configuration
  printPortConfig();

  console.log('Checking port availability...\n');

  const results = await checkAllPorts();

  // Group results by service
  const services = {};
  for (const r of results) {
    const baseService = r.service.replace(' (fallback)', '');
    if (!services[baseService]) {
      services[baseService] = { primary: null, fallback: null };
    }
    if (r.service.includes('fallback')) {
      services[baseService].fallback = r;
    } else {
      services[baseService].primary = r;
    }
  }

  // Print results
  let hasConflicts = false;

  for (const [name, { primary, fallback }] of Object.entries(services)) {
    const statusIcon = primary.free ? '✓' : fallback?.free ? '~' : '✗';
    const statusText = primary.free
      ? 'AVAILABLE'
      : fallback?.free
        ? 'FALLBACK AVAILABLE'
        : 'BUSY';

    console.log(`${statusIcon} ${name.padEnd(18)} ${statusText.padEnd(20)} Port: ${primary.port}${fallback ? ` (fallback: ${fallback.port})` : ''}`);

    if (!primary.free && !fallback?.free) {
      hasConflicts = true;
      if (primary.process) {
        console.log(`    └─ Primary used by: ${primary.process}`);
      }
      if (fallback?.process) {
        console.log(`    └─ Fallback used by: ${fallback.process}`);
      }
    } else if (!primary.free && primary.process) {
      console.log(`    └─ Used by: ${primary.process}`);
    }
  }

  console.log('');

  if (hasConflicts) {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║  ⚠️  WARNING: Some services have no available ports!          ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('To resolve conflicts:');
    console.log('');
    console.log('  Windows (PowerShell):');
    console.log('    # Find process using port 6001');
    console.log('    netstat -ano | findstr :6001');
    console.log('    # Kill process by PID');
    console.log('    taskkill /PID <PID> /F');
    console.log('');
    console.log('  macOS/Linux:');
    console.log('    # Find process using port 6001');
    console.log('    lsof -i :6001');
    console.log('    # Kill process');
    console.log('    kill -9 <PID>');
    console.log('');
    console.log('Or modify .env to use different ports:');
    console.log('  PARKFLOW_WEB_PORT=7001');
    console.log('  PARKFLOW_WEB_FALLBACK_PORT=7002');
    console.log('');
    process.exit(1);
  } else {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║  ✓ All ports are available or have fallback options          ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('You can start Parkflow with:');
    console.log('  pnpm dev:web    - Start Next.js frontend');
    console.log('  pnpm dev:api    - Start Spring Boot API');
    console.log('  pnpm dev        - Start Tauri desktop');
    console.log('  pnpm db:up      - Start PostgreSQL in Docker');
    console.log('');
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Error checking ports:', err.message);
  process.exit(1);
});
