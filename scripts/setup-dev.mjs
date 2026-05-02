#!/usr/bin/env node
/**
 * Script de setup para desarrollo de ParkFlow
 * Verifica requisitos, crea .env si no existe, y guía al usuario
 */

import { execSync } from "child_process";
import { existsSync, writeFileSync, copyFileSync } from "fs";
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

function checkCommand(command, name) {
  try {
    execSync(`${command} --version`, { stdio: "ignore" });
    log(`✓ ${name} instalado`, "green");
    return true;
  } catch {
    log(`✗ ${name} NO instalado`, "red");
    return false;
  }
}

function checkJavaVersion() {
  try {
    const output = execSync("java -version 2>&1", { encoding: "utf-8" });
    const versionMatch = output.match(/version "(\d+)/);
    if (versionMatch) {
      const version = parseInt(versionMatch[1]);
      if (version >= 21) {
        log(`✓ Java ${version} (requerido: 21+)`, "green");
        return true;
      } else {
        log(`✗ Java ${version} (requerido: 21+)`, "red");
        return false;
      }
    }
  } catch {
    log(`✗ Java no encontrado`, "red");
    return false;
  }
}

async function main() {
  log("\n========================================", "cyan");
  log("ParkFlow Development Setup", "cyan");
  log("========================================\n", "cyan");

  // 1. Verificar herramientas
  log("Verificando herramientas requeridas...\n", "bright");

  const checks = {
    java: checkJavaVersion(),
    node: checkCommand("node", "Node.js"),
    pnpm: checkCommand("pnpm", "pnpm"),
    cargo: checkCommand("cargo", "Rust/Cargo"),
    docker: checkCommand("docker", "Docker (opcional)"),
  };

  const requiredMissing = Object.entries(checks)
    .filter(([k, v]) => !v && k !== "docker")
    .map(([k]) => k);

  if (requiredMissing.length > 0) {
    log("\n⚠ Faltan herramientas requeridas:", "yellow");
    requiredMissing.forEach((tool) => {
      log(`  - ${tool}: ${getInstallInstructions(tool)}`, "yellow");
    });
    process.exit(1);
  }

  // 2. Verificar .env
  log("\nVerificando configuración de entorno...\n", "bright");

  const envPath = resolve(process.cwd(), ".env");
  const envExamplePath = resolve(process.cwd(), ".env.example");

  if (!existsSync(envPath)) {
    if (existsSync(envExamplePath)) {
      copyFileSync(envExamplePath, envPath);
      log("✓ Archivo .env creado desde .env.example", "green");
      log("⚠ Por favor edita .env con tus valores antes de continuar", "yellow");
    } else {
      log("✗ No se encontró .env.example", "red");
      process.exit(1);
    }
  } else {
    log("✓ Archivo .env ya existe", "green");
  }

  // 3. Instalar dependencias
  log("\nInstalando dependencias...\n", "bright");

  try {
    execSync("pnpm install", { stdio: "inherit" });
    log("✓ Dependencias de Node instaladas", "green");
  } catch {
    log("✗ Error instalando dependencias", "red");
    process.exit(1);
  }

  // 4. Verificar Docker/PostgreSQL
  log("\nVerificando base de datos...\n", "bright");

  if (checks.docker) {
    log("✓ Docker detectado", "green");
    log("  Iniciar con: pnpm db:up", "cyan");
  } else {
    log("⚠ Docker no detectado", "yellow");
    log("  Configura PostgreSQL manualmente en .env", "yellow");
  }

  // 5. Resumen
  log("\n========================================", "cyan");
  log("Setup completado exitosamente!", "green");
  log("========================================\n", "cyan");

  log("Próximos pasos:", "bright");
  log("1. Edita .env con tus configuraciones", "cyan");
  log("2. Inicia PostgreSQL: pnpm db:up", "cyan");
  log("3. Migra la DB: pnpm db:migrate", "cyan");
  log("4. Inicia desarrollo:", "cyan");
  log("   - Terminal 1: pnpm dev:api", "cyan");
  log("   - Terminal 2: pnpm dev:desktop\n", "cyan");

  log("Documentación:", "bright");
  log("- README-DEV.md (guía completa)", "cyan");
  log("- docs/LICENSING_ARCHITECTURE.md", "cyan");
  log("- docs/QUICK_SETUP.md\n", "cyan");
}

function getInstallInstructions(tool) {
  const instructions = {
    java: "https://adoptium.net/ (descargar Eclipse Temurin 21 LTS)",
    node: "https://nodejs.org/ (descargar LTS)",
    pnpm: "npm install -g pnpm",
    cargo: "https://rustup.rs/ (ejecutar: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh)",
  };
  return instructions[tool] || "Buscar en Google";
}

main().catch((err) => {
  console.error("Error inesperado:", err);
  process.exit(1);
});
