# Guía Rápida de Instalación - Sistema de Licenciamiento ParkFlow

## 1. Configuración del Backend

### 1.1 Generar Claves RSA para Firmas

```bash
# Crear directorio para claves
mkdir -p infra/keys
cd infra/keys

# Generar clave privada RSA 2048
openssl genrsa -out parkflow_license_private.pem 2048

# Extraer clave pública
openssl rsa -in parkflow_license_private.pem -pubout -out parkflow_license_public.pem

# Convertir a base64 para variables de entorno
echo "PARKFLOW_LICENSE_PRIVATE_KEY=$(cat parkflow_license_private.pem | base64 -w 0)"
echo "PARKFLOW_LICENSE_PUBLIC_KEY=$(cat parkflow_license_public.pem | base64 -w 0)"
```

### 1.2 Configurar Variables de Entorno

```bash
# .env del backend
PARKFLOW_LICENSE_PRIVATE_KEY=<base64_private_key>
PARKFLOW_LICENSE_PUBLIC_KEY=<base64_public_key>
```

### 1.3 Ejecutar Migraciones

```bash
# Flyway ejecutará automáticamente V2__licensing_tables.sql
./gradlew flywayMigrate

# O con Docker
docker compose up flyway
```

## 2. Compilar Desktop App con Licensing

### 2.1 Verificar dependencias de Rust

```bash
cd apps/desktop/src-tauri
cargo check
```

### 2.2 Compilar

```bash
# Desarrollo
pnpm dev:desktop

# Producción
pnpm build:desktop
```

## 3. Flujo de Activación

### 3.1 Para Plan LOCAL (Offline)

1. **En el desktop**, obtener fingerprint:
   - Ir a Configuración > Licencia
   - Copiar el fingerprint del dispositivo

2. **En el panel Super Admin**:
   - Crear empresa con plan LOCAL
   - Generar licencia con el fingerprint
   - Copiar licenseKey y signature

3. **En el desktop**:
   - Pegar licenseKey y signature
   - Activar

### 3.2 Para Plan SYNC/PRO (Online)

1. Crear empresa en panel admin con plan SYNC/PRO
2. Desktop se conecta y auto-registra
3. Heartbeat automático cada 30 minutos

## 4. Endpoints de API

### Heartbeat
```bash
curl -X POST http://localhost:6011/api/v1/licensing/heartbeat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "companyId": "uuid",
    "deviceFingerprint": "fp-abc123",
    "appVersion": "1.0.0"
  }'
```

### Validar Licencia
```bash
curl -X POST http://localhost:6011/api/v1/licensing/validate \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "companyId": "uuid",
    "deviceFingerprint": "fp-abc123",
    "licenseKey": "key-here",
    "signature": "sig-here"
  }'
```

## 5. Comandos Útiles

### Resetear Licencia (Desktop)
```bash
# En consola de la app desktop (DevTools)
await window.__TAURI__.invoke("clear_license")
```

### Verificar Estado
```bash
await window.__TAURI__.invoke("get_license_status")
```

## 6. Troubleshooting

### "Invalid signature"
- Verificar que las claves RSA están configuradas correctamente
- En desarrollo, usar hash simple (no requiere RSA)

### "Device mismatch"
- El fingerprint cambió (hardware modificado)
- Regenerar licencia con nuevo fingerprint

### "Time manipulation detected"
- Verificar fecha/hora del sistema
- Contactar soporte para resetear contador

### Licencia no aparece
- Verificar permisos de escritura en `%LOCALAPPDATA%\com.parkflow.desktop`
- Reinstalar aplicación

## 7. Estructura de Archivos Desktop

```
%LOCALAPPDATA%\com.parkflow.desktop/
├── parkflow_desktop_local.db       # Base de datos SQLite
├── parkflow_license.enc            # Licencia cifrada
├── parkflow_license.bak            # Backup de licencia
├── license_timestamps.dat          # Registro anti-tampering
└── settings/
    └── ...
```
