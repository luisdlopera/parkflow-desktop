#!/usr/bin/env node
/**
 * Script de verificación de instalación del sistema de licenciamiento
 * Verifica que todos los archivos necesarios estén presentes
 */

import { existsSync } from "fs";
import { resolve } from "path";

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function check(name, path) {
  const fullPath = resolve(process.cwd(), path);
  if (existsSync(fullPath)) {
    log(`  ✓ ${name}`, "green");
    return true;
  } else {
    log(`  ✗ ${name}`, "red");
    return false;
  }
}

function main() {
  log("\n========================================", "cyan");
  log("ParkFlow Licensing System Verification", "cyan");
  log("========================================\n", "cyan");

  let passed = 0;
  let failed = 0;

  // Database
  log("[CHECK] Database Migration", "cyan");
  if (check("Migration V2__licensing_tables.sql", "apps/api/src/main/resources/db/migration/V2__licensing_tables.sql")) {
    passed++;
  } else {
    failed++;
  }

  // Java Entities
  log("\n[CHECK] Java Entities", "cyan");
  const entities = [
    ["Company.java", "apps/api/src/main/java/com/parkflow/modules/licensing/entity/Company.java"],
    ["LicensedDevice.java", "apps/api/src/main/java/com/parkflow/modules/licensing/entity/LicensedDevice.java"],
    ["CompanyModule.java", "apps/api/src/main/java/com/parkflow/modules/licensing/entity/CompanyModule.java"],
    ["LicenseAuditLog.java", "apps/api/src/main/java/com/parkflow/modules/licensing/entity/LicenseAuditLog.java"],
  ];
  entities.forEach(([name, path]) => {
    if (check(name, path)) passed++; else failed++;
  });

  // Java Repositories
  log("\n[CHECK] Java Repositories", "cyan");
  const repos = [
    ["CompanyRepository.java", "apps/api/src/main/java/com/parkflow/modules/licensing/repository/CompanyRepository.java"],
    ["LicensedDeviceRepository.java", "apps/api/src/main/java/com/parkflow/modules/licensing/repository/LicensedDeviceRepository.java"],
  ];
  repos.forEach(([name, path]) => {
    if (check(name, path)) passed++; else failed++;
  });

  // Service & Controller
  log("\n[CHECK] Service & Controller", "cyan");
  if (check("LicenseService.java", "apps/api/src/main/java/com/parkflow/modules/licensing/service/LicenseService.java")) passed++; else failed++;
  if (check("LicensingController.java", "apps/api/src/main/java/com/parkflow/modules/licensing/controller/LicensingController.java")) passed++; else failed++;

  // Tauri Module
  log("\n[CHECK] Tauri Licensing Module", "cyan");
  const tauriFiles = [
    ["mod.rs", "apps/desktop/src-tauri/src/licensing/mod.rs"],
    ["types.rs", "apps/desktop/src-tauri/src/licensing/types.rs"],
    ["fingerprint.rs", "apps/desktop/src-tauri/src/licensing/fingerprint.rs"],
    ["storage.rs", "apps/desktop/src-tauri/src/licensing/storage.rs"],
    ["crypto.rs", "apps/desktop/src-tauri/src/licensing/crypto.rs"],
    ["tamper.rs", "apps/desktop/src-tauri/src/licensing/tamper.rs"],
  ];
  tauriFiles.forEach(([name, path]) => {
    if (check(name, path)) passed++; else failed++;
  });

  // Frontend
  log("\n[CHECK] Frontend Components", "cyan");
  if (check("hooks.ts", "apps/web/src/lib/licensing/hooks.ts")) passed++; else failed++;
  if (check("api.ts", "apps/web/src/lib/licensing/api.ts")) passed++; else failed++;
  if (check("types.ts", "apps/web/src/lib/licensing/types.ts")) passed++; else failed++;
  if (check("LicenseBanner.tsx", "apps/web/src/components/licensing/LicenseBanner.tsx")) passed++; else failed++;

  // Admin
  log("\n[CHECK] Admin Panel", "cyan");
  if (check("AdminSidebar.tsx", "apps/web/src/components/admin/AdminSidebar.tsx")) passed++; else failed++;
  if (check("CompanyForm.tsx", "apps/web/src/components/admin/CompanyForm.tsx")) passed++; else failed++;
  if (check("GenerateLicenseDialog.tsx", "apps/web/src/components/admin/GenerateLicenseDialog.tsx")) passed++; else failed++;
  if (check("Companies page", "apps/web/src/app/(dashboard)/admin/companies/page.tsx")) passed++; else failed++;

  // Scripts
  log("\n[CHECK] Utility Scripts", "cyan");
  if (check("generate-license-keys.ps1", "infra/scripts/generate-license-keys.ps1")) passed++; else failed++;
  if (check("generate-license-keys.sh", "infra/scripts/generate-license-keys.sh")) passed++; else failed++;
  if (check("setup-dev.mjs", "scripts/setup-dev.mjs")) passed++; else failed++;

  // Documentation
  log("\n[CHECK] Documentation", "cyan");
  if (check("LICENSING_ARCHITECTURE.md", "docs/LICENSING_ARCHITECTURE.md")) passed++; else failed++;
  if (check("QUICK_SETUP.md", "docs/QUICK_SETUP.md")) passed++; else failed++;
  if (check("README-DEV.md", "README-DEV.md")) passed++; else failed++;

  // Summary
  log("\n========================================", "cyan");
  log(`Summary: ${passed} passed, ${failed} failed`, failed > 0 ? "red" : "green");
  log("========================================\n", "cyan");

  if (failed === 0) {
    log("✓ All checks passed! Licensing system is properly installed.\n", "green");
    log("Next steps:", "bright");
    log("1. Generate RSA keys: pnpm license:keys:generate (for production)", "cyan");
    log("2. Apply database migration: pnpm db:migrate", "cyan");
    log("3. Start the application: pnpm dev:api (terminal 1), pnpm dev:desktop (terminal 2)", "cyan");
    process.exit(0);
  } else {
    log("✗ Some checks failed. Please review the errors above.\n", "red");
    process.exit(1);
  }
}

main();
