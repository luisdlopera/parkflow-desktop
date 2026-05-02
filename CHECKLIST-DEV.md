# Checklist de Preparación para Pruebas - ParkFlow Licensing

> **Nuevo:** Sistema completo de diagnóstico de bloqueos implementado
> - Auditoría de bloqueos con `license_block_events`
> - Dashboard de soporte con casos prioritarios
> - Scripts de diagnóstico automatizados
> - Runbook de soporte completo

## ✅ Pre-requisitos Instalados

- [ ] **Java 21** (verificar: `java -version`)
- [ ] **Node.js 20+** (verificar: `node -v`)
- [ ] **pnpm** (verificar: `pnpm -v`)
- [ ] **Rust** (verificar: `cargo -v`)
- [ ] **Docker** (opcional, verificar: `docker -v`)
- [ ] **OpenSSL** (para producción, verificar: `openssl version`)

## ✅ Configuración Inicial

- [ ] Clonar repositorio: `git clone https://github.com/luisdlopera/parkflow-desktop.git`
- [ ] Entrar al directorio: `cd parkflow-desktop`
- [ ] Instalar dependencias: `pnpm install`
- [ ] Crear archivo .env: `cp .env.example .env` (Windows: `copy .env.example .env`)
- [ ] Configurar JWT_SECRET en .env (generar nuevo valor para producción)
- [ ] Configurar API_KEY en .env

## ✅ Verificación de Instalación

- [ ] Ejecutar: `pnpm verify:install`
- [ ] Todos los checks deben mostrar ✅ (green)

## ✅ Base de Datos

- [ ] Iniciar PostgreSQL: `pnpm db:up`
- [ ] Verificar contenedor corriendo: `docker ps`
- [ ] Aplicar migraciones: `pnpm db:migrate`
- [ ] Verificar migraciones: `pnpm db:info`

## ✅ Backend (Java/Spring Boot)

- [ ] Compilar proyecto: `cd apps/api && ./gradlew build`
- [ ] Ejecutar tests: `./gradlew test`
- [ ] Todos los tests deben pasar ✅
- [ ] Iniciar servidor: `./gradlew bootRun` (o `pnpm dev:api`)
- [ ] Verificar health: `curl http://localhost:6011/actuator/health`

## ✅ Frontend Web (Next.js)

- [ ] Instalar dependencias: `pnpm install` (en root)
- [ ] Build: `pnpm build:web`
- [ ] Iniciar dev server: `pnpm dev:web`
- [ ] Verificar en navegador: http://localhost:6001

## ✅ Desktop (Tauri)

- [ ] Verificar Rust toolchain: `rustup show`
- [ ] Instalar dependencias Tauri: `cd apps/desktop && pnpm install`
- [ ] Compilar en modo dev: `pnpm tauri dev` (o `pnpm dev:desktop` desde root)
- [ ] Aplicación desktop debe iniciar sin errores

## ✅ Sistema de Licencias

### Prueba con Un Solo Equipo (Desarrollo)

- [ ] Backend corriendo (`pnpm dev:api`)
- [ ] Desktop corriendo (`pnpm dev:desktop`)
- [ ] Ir a Configuración > Licencia en el desktop
- [ ] Copiar el "Device Fingerprint" mostrado
- [ ] Abrir terminal y ejecutar:

```bash
curl -X POST http://localhost:6011/api/v1/licensing/licenses/generate \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dev-api-key-123" \
  -d '{
    "companyId": "00000000-0000-0000-0000-000000000001",
    "deviceFingerprint": "PEGA_TU_FINGERPRINT_AQUI",
    "hostname": "dev-pc"
  }'
```

- [ ] Copiar `licenseKey` de la respuesta JSON
- [ ] Copiar `signature` de la respuesta JSON
- [ ] En el desktop, pegar ambos valores
- [ ] Click en "Activar"
- [ ] Ver mensaje de éxito ✅
- [ ] Verificar días restantes mostrados

### Verificar Panel Admin

- [ ] Ir a: http://localhost:6001/admin/companies
- [ ] Debe mostrar lista con "ParkFlow Development"
- [ ] Click en "Generar licencia" para cualquier empresa
- [ ] Debe abrirse el diálogo correctamente

### Verificar Heartbeat

- [ ] Dejar desktop corriendo por 30+ minutos
- [ ] Verificar en logs que se envían heartbeats
- [ ] En panel admin, verificar último heartbeat recibido

## ✅ Tests y Build

- [ ] Ejecutar tests Java: `pnpm test:api` (o `./gradlew test`)
- [ ] Ejecutar lint web: `pnpm lint:web`
- [ ] Build producción web: `pnpm build:web`
- [ ] Build producción desktop: `pnpm build:desktop`
- [ ] Build API: `pnpm build:api`

## ✅ Seguridad (Antes de Producción)

- [ ] Cambiar JWT_SECRET de valor default
- [ ] Cambiar API_KEY de `dev-api-key-123`
- [ ] Generar claves RSA: `pnpm license:keys:generate`
- [ ] Configurar PARKFLOW_LICENSE_MODE=production
- [ ] Verificar .gitignore excluye infra/keys/
- [ ] Nunca commitear archivos .pem o .key

## ✅ Troubleshooting Común

### "No se puede conectar al backend"
```bash
# Verificar API corriendo
curl http://localhost:6011/actuator/health

# Verificar puertos
pnpm ports:check
```

### "Database connection failed"
```bash
# Reiniciar PostgreSQL
pnpm db:down
pnpm db:up
pnpm db:migrate
```

### "License validation failed"
- Verificar fingerprint correcto
- Verificar empresa existe en DB
- Verificar formato de JSON en curl

### "Desktop no compila"
```bash
cd apps/desktop/src-tauri
cargo clean
cargo build
```

## ✅ Listo para Pruebas

Cuando todo esté verificado, tendrás:

1. **Backend API** en http://localhost:6011
2. **Web App** en http://localhost:6001
3. **Desktop App** ejecutándose nativamente
4. **Base de datos** PostgreSQL con datos iniciales
5. **Sistema de licencias** funcionando en modo desarrollo
6. **Panel Super Admin** accesible para gestión

## 🚀 Siguientes Pasos

1. **Prueba el flujo completo:**
   - Crear empresa en panel admin
   - Generar licencia para tu fingerprint
   - Activar en desktop
   - Verificar heartbeat

2. **Prueba comandos remotos:**
   - Enviar comando desde panel admin
   - Verificar recepción en desktop

3. **Prueba anti-tampering:**
   - Cambiar fecha del sistema atrás
   - Verificar detección

4. **Prepara para producción:**
   - Generar claves RSA
   - Configurar modo production
   - Desplegar en servidor cloud

---

## 📚 Documentación Adicional

- [README-DEV.md](README-DEV.md) - Guía completa de desarrollo
- [docs/LICENSING_ARCHITECTURE.md](docs/LICENSING_ARCHITECTURE.md) - Arquitectura técnica
- [docs/QUICK_SETUP.md](docs/QUICK_SETUP.md) - Setup rápido
- [docs/SUPPORT_RUNBOOK.md](docs/SUPPORT_RUNBOOK.md) - **Runbook de soporte para bloqueos**

## 🆘 Soporte y Diagnóstico de Bloqueos (Nuevo)

### Endpoints de Soporte Disponibles

| Endpoint | Descripción | Uso |
|----------|-------------|-----|
| `GET /support/diagnose/company/{id}` | Diagnóstico completo de empresa | Identificar por qué está bloqueada |
| `GET /support/diagnose/device/{fp}` | Diagnóstico de dispositivo | Verificar estado de dispositivo específico |
| `GET /support/blocks/unresolved` | Eventos de bloqueo no resueltos | Ver todos los bloqueos activos |
| `GET /support/cases/priority` | Casos prioritarios (pagos post-bloqueo) | **Ver clientes que pagaron y siguen bloqueados** |
| `POST /support/company/{id}/unblock` | Desbloquear empresa | Resolver bloqueo y notificar cliente |
| `POST /support/blocks/{id}/resolve` | Marcar evento como resuelto | Documentar resolución |
| `POST /support/blocks/{id}/false-positive` | Marcar falso positivo | Mejorar algoritmo |

### Script de Diagnóstico

```powershell
# Casos prioritarios (pagos después de bloqueo)
.\infra\scripts\diagnose-license.ps1 -ApiKey "dev-api-key-123" -GetPriorityCases

# Diagnóstico de empresa específica
.\infra\scripts\diagnose-license.ps1 -ApiKey "dev-api-key-123" -CompanyId "uuid-aqui"

# Diagnóstico de dispositivo
.\infra\scripts\diagnose-license.ps1 -ApiKey "dev-api-key-123" -DeviceFingerprint "fp-xxx"

# Bloqueos no resueltos
.\infra\scripts\diagnose-license.ps1 -ApiKey "dev-api-key-123" -GetUnresolvedBlocks

# Estadísticas
.\infra\scripts\diagnose-license.ps1 -ApiKey "dev-api-key-123" -GetStatistics
```

### Caso: "Pagó pero sigue bloqueado"

```powershell
# 1. Verificar en casos prioritarios
.\infra\scripts\diagnose-license.ps1 -ApiKey "dev-api-key-123" -GetPriorityCases

# 2. Desbloquear empresa
$body = @{
    reason = "Pago verificado - Ref: PAY-2024-001"
    notifyCustomer = $true
} | ConvertTo-Json

Invoke-RestMethod `
    -Uri "http://localhost:6011/api/v1/licensing/support/company/{companyId}/unblock" `
    -Method POST `
    -Headers @{"X-API-Key"="dev-api-key-123"; "Content-Type"="application/json"} `
    -Body $body
```

### Tablas de Auditoría

| Tabla | Descripción | Consulta Útil |
|-------|-------------|---------------|
| `license_block_events` | Eventos de bloqueo con diagnóstico completo | `SELECT * FROM support_dashboard;` |
| `license_audit_log` | Log general de auditoría | Cambios de licencia, estados |
| `companies` | Estado actual de empresas | `status`, `expires_at`, `grace_until` |
| `licensed_devices` | Estado de dispositivos | `status`, `last_heartbeat_at` |

### Vista SQL: Support Dashboard

```sql
-- Ver todos los casos pendientes con prioridad
SELECT * FROM support_dashboard;

-- Ver casos donde pagaron después de bloqueo
SELECT * FROM get_priority_block_cases();

-- Estadísticas de falsos positivos
SELECT COUNT(*) FROM license_block_events
WHERE false_positive = TRUE
  AND created_at > NOW() - INTERVAL '30 days';
```

---

## 🆘 Soporte General

Si encuentras problemas:
1. Verificar logs del backend (console)
2. Verificar logs del desktop (DevTools: Ctrl+Shift+I)
3. Usar script de diagnóstico: `.\infra\scripts\diagnose-license.ps1`
4. Revisar [docs/SUPPORT_RUNBOOK.md](docs/SUPPORT_RUNBOOK.md) para casos de bloqueo
5. Revisar [README-DEV.md#troubleshooting](README-DEV.md#troubleshooting)
6. Crear issue en GitHub con logs y pasos para reproducir
