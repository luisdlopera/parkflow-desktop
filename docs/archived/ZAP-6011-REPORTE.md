# Reporte: Escaneo OWASP ZAP en Puerto 6011
## Diferencias entre ZAP Docker vs ZAP Local Desktop

**Fecha**: 2026-05-24  
**Proyecto**: Parkflow Monorepo  
**Documento**: docs/security/ZAP-6011-REPORTE.md  
**Elaborado por**: DevSecOps / QA Engineering  
**Estándar**: OWASP Testing Guide v4.2, ISO/IEC 25010

---

## 1. Contexto

El puerto **6011** no está dentro de la configuración estándar de Parkflow (3000 web, 8080 API, 6021 PostgreSQL, 6031 Redis). Este documento explica:
1. Cómo escanear una aplicación que corre en el puerto 6011 usando ZAP
2. Las diferencias técnicas entre ejecutar ZAP vía Docker vs instalar ZAP Desktop localmente

---

## 2. Métodos para Escanear el Puerto 6011

### Método A: Script Local Modificado (Recomendado para CI)

```bash
# Ejecutar directamente con target en puerto 6011
bash security/scripts/zap-baseline.sh http://localhost:6011

# O con Docker explícito
docker run --rm --network=host \
  -v "$(pwd)/security/zap/baseline.conf:/zap/wrk/baseline.conf:ro" \
  -v "$(pwd)/security/reports:/zap/wrk/reports:rw" \
  ghcr.io/zaproxy/zaproxy:stable \
  zap-baseline.py \
    -t http://localhost:6011 \
    -r reports/zap-6011-report.html \
    -J reports/zap-6011-report.json \
    -c /zap/wrk/baseline.conf \
    -a -j --auto
```

### Método B: ZAP Desktop GUI (Interactivo)

```bash
# Instalar en macOS
brew install --cask owasp-zap

# Abrir aplicación
open -a "OWASP ZAP"
```

Pasos en GUI:
1. Quick Start → Automated Scan
2. URL: `http://localhost:6011`
3. Click Attack

### Método C: ZAP Daemon / API (Headless Avanzado)

```bash
# Iniciar ZAP en modo daemon (sin GUI)
zap.sh -daemon -host 0.0.0.0 -port 8090

# Luego usar la API REST de ZAP para controlar el escaneo
curl "http://localhost:8090/JSON/spider/action/scan/?url=http://localhost:6011"
```

### Método D: Docker Compose Temporal

```bash
# Crear override para puerto 6011
cat > security/docker-compose.6011.yml <<'EOF'
services:
  zap-6011:
    image: ghcr.io/zaproxy/zaproxy:stable
    container_name: parkflow-zap-6011
    command: >
      zap-baseline.py
      -t http://host.docker.internal:6011
      -r reports/zap-6011-report.html
      -J reports/zap-6011-report.json
      -c /zap/wrk/baseline.conf
      -a -j --auto
    volumes:
      - ./zap/baseline.conf:/zap/wrk/baseline.conf:ro
      - ./reports:/zap/wrk/reports:rw
    extra_hosts:
      - "host.docker.internal:host-gateway"
EOF

docker compose -f security/docker-compose.6011.yml up
```

---

## 3. Diferencia Técnica: ZAP Docker vs ZAP Local Desktop

### Tabla Comparativa

| Aspecto | ZAP Docker (existente) | ZAP Local Desktop (instalado) |
|---------|------------------------|-------------------------------|
| **Interfaz** | CLI (línea de comandos) | GUI (ventanas, botones, menús) |
| **Modo** | Headless / automatizado | Interactivo / manual |
| **Uso principal** | CI/CD, pipelines, scripts | Pentesting manual, exploración |
| **Instalación** | `docker pull` (sin instalar nada en host) | Instalador .dmg/.exe (ocupa ~500MB) |
| **Java requerido** | Incluido en imagen | Requiere Java/JDK instalado |
| **Persistencia** | Volátil (se destruye al terminar) | Guarda sesiones, historial, configuración |
| **Proxy intercept** | No disponible (headless) | Sí — puede interceptar requests del navegador |
| **Spider manual** | No | Sí — navegas y ZAP aprende |
| **Active scan tuning** | Vía archivos de configuración | Vía sliders y checkboxes en GUI |
| **Reportes** | HTML/JSON/XML generados por script | HTML/XML/JSON/PDF desde menú File |
| **Velocidad** | Rápido (sin overhead gráfico) | Más lento (carga GUI) |
| **Escalabilidad** | Alta — paralelizable en CI | Baja — una instancia por usuario |
| **Curva de aprendizaje** | Media (requiere conocer flags) | Baja (intuitivo visualmente) |
| **Costo** | Gratuito | Gratuito |

### Analogía Práctica

| Herramienta | Analogía | Uso ideal |
|-------------|----------|-----------|
| **ZAP Docker** | Un robot de fábrica que inspecciona coches automáticamente | CI/CD que corre en GitHub Actions cada vez que haces push |
| **ZAP Desktop** | Un inspector de calidad que abre el capó, revisa manualmente y toma notas | Cuando desarrollas localmente y quieres entender QUÉ pasó y POR QUÉ |

### Diferencias Detalladas

#### 3.1 Arquitectura

```
ZAP Docker (Headless CLI)
━━━━━━━━━━━━━━━━━━━━━━━━━
GitHub Actions / Terminal
    │
    ▼
┌─────────────┐
│  docker run │  ← Contenedor efímero
│  zap:stable │
│  (sin GUI)  │
└──────┬──────┘
       │
       ▼
   [Target:6011]
       │
       ▼
  report.html (guardado en volumen)


ZAP Local Desktop (GUI)
━━━━━━━━━━━━━━━━━━━━━━━━━
Tu Mac
    │
    ▼
┌──────────────────┐
│  OWASP ZAP.app   │  ← Aplicación nativa
│  (con ventanas)  │
│  Proxy: 8080     │
└────────┬─────────┘
         │
    ┌────┴────┐
    ▼         ▼
[Navegador] [Target:6011]
 (vía proxy)
```

#### 3.2 Flujo de Trabajo Docker (Automatizado)

```bash
# Paso 1: ZAP lee configuración
security/zap/baseline.conf

# Paso 2: ZAP spider (rastrea URLs automáticamente)
→ Descubre: /, /login, /api/users, etc.

# Paso 3: ZAP passive scan (analiza sin atacar)
→ Revisa headers, cookies, formularios

# Paso 4: Genera reporte y termina
→ zap-6011-report.html
→ zap-6011-report.json
→ Container se destruye
```

**Ventaja**: Puede correr solo, sin supervisión, en GitHub Actions.

#### 3.3 Flujo de Trabajo Desktop (Manual)

```
Paso 1: Abres ZAP Desktop
→ Ves ventana con árbol de sitios, historial, alertas

Paso 2: Configuras proxy del navegador → localhost:8080
→ Navegas manualmente por tu app
→ ZAP intercepta y registra cada request

Paso 3: Exploras manualmente
→ Clic derecho en URL → "Attack" → "Active Scan"
→ Ajustas strength: LOW/MEDIUM/HIGH

Paso 4: Revisas alertas en tiempo real
→ Doble clic en alerta → ves request/response completos
→ Puedes "Replay" el ataque para verificar

Paso 5: Exportas reporte desde File → Generate Report
```

**Ventaja**: Puedes investigar a fondo un falso positivo o entender exactamente por qué falla algo.

#### 3.4 ¿Cuándo usar cada uno?

| Escenario | Usar Docker | Usar Desktop |
|-----------|-------------|--------------|
| Pipeline CI/CD cada PR | ✅ Sí | ❌ No |
| Nightly scan automatizado | ✅ Sí | ❌ No |
| Desarrollo local, quiero entender un error | ❌ No | ✅ Sí |
| Primer escaneo de una app nueva | ⚠️ Puede | ✅ Mejor |
| Demostración a stakeholders | ❌ No | ✅ Sí |
| Debugging de falso positivo | ❌ No | ✅ Sí |
| Escaneo de API con auth compleja | ⚠️ Con scripts | ✅ Más fácil |
| Integración con Jira/GitHub Issues | ✅ Sí | ⚠️ Manual |

---

## 4. Comparación Visual del Proceso

### Docker (Automático)

```
[Developer] → git push → [GitHub Actions] → [ZAP Docker] → [Reporte HTML]
                                                  │
                                                  ▼
                                           http://localhost:6011
```

**Tiempo**: 2-5 minutos sin intervención humana.

### Desktop (Manual)

```
[Developer] → Abre ZAP Desktop → Configura Proxy → Navega app
                                                   │
                                                   ▼
                                            [ZAP intercepta]
                                                   │
                                                   ▼
                                            [Active Scan]
                                                   │
                                                   ▼
                                            [Revisar alertas]
                                                   │
                                                   ▼
                                            [Exportar reporte]
```

**Tiempo**: 15-30 minutos de interacción manual.

---

## 5. ¿Qué tienes exactamente en tu proyecto?

### Lo que YA tienes (Docker ZAP — Configurado)

Ubicación: `security/docker-compose.zap.yml`

```yaml
services:
  zap-baseline:
    image: ghcr.io/zaproxy/zaproxy:${ZAP_VERSION:-stable}
    command: zap-baseline.py -t http://host.docker.internal:3000 ...
```

**Esto es**: ZAP corriendo en un contenedor Docker, sin interfaz gráfica, ejecutando scripts de Python (`zap-baseline.py`, `zap-api-scan.py`) de forma automatizada.

**Para usarlo con puerto 6011**:
```bash
# Modificar el target en docker-compose.zap.yml
# Cambiar host.docker.internal:3000 por host.docker.internal:6011
# O usar el docker-compose.6011.yml temporal que creamos arriba
```

### Lo que ACABAS de instalar (ZAP Desktop — Local)

Ubicación: `/Applications/OWASP ZAP.app` (macOS)

**Esto es**: Una aplicación de escritorio con ventanas, menús, botones, gráficos de árbol de sitios, panel de alertas, etc.

**Para usarlo con puerto 6011**:
1. Abre OWASP ZAP
2. Quick Start → Automated Scan
3. URL: `http://localhost:6011`
4. Click Attack

---

## 6. Recomendación para tu Workflow

### Opción A: Usar AMBOS (Recomendado Enterprise)

```
Desarrollo Local (Desktop)
    │
    ├── Usas ZAP Desktop para entender la app
    ├── Configuras autenticación manualmente
    ├── Exportas la sesión/configuración
    │
    ▼
CI/CD (Docker)
    │
    ├── Importas la configuración de Desktop
    ├── ZAP Docker ejecuta con tus reglas
    ├── Genera reportes automáticos
    └── Falla pipeline si encuentra HIGH
```

### Opción B: Solo Docker (Minimalista)

Si el escaneo básico es suficiente:
- Usa los scripts que ya creaste: `pnpm security:zap:baseline`
- Modifica el target a `6011` cuando necesites

### Opción C: Solo Desktop (Exploratorio)

Si necesitas entender a fondo:
- Usa ZAP Desktop para pentesting manual
- Documenta hallazgos en GitHub Issues
- No integra con CI (proceso manual)

---

## 7. Verificación Rápida

Antes de escanear el puerto 6011:

```bash
# 1. Verificar que el servicio responde
curl -I http://localhost:6011

# 2. Verificar qué servicio es
lsof -i :6011
# o
netstat -an | grep 6011

# 3. Si es un servicio Docker, usar docker network
# Si es local host, usar --network=host (Linux) o host.docker.internal (macOS)
```

---

## 8. Conclusión

| | Docker ZAP | Desktop ZAP |
|---|---|---|
| **Para** | Automatización, CI/CD, reportes programados | Investigación, pentesting manual, comprensión profunda |
| **En tu proyecto** | Ya configurado en `security/docker-compose.zap.yml` | Recién instalado vía `brew install --cask owasp-zap` |
| **En CI/CD** | ✅ GitHub Actions ejecuta esto | ❌ No aplica |
| **En desarrollo local** | ⚠️ Requiere comandos | ✅ Punto y click |

**Regla de oro**: Usa Docker para lo repetitivo y Desktop para lo que necesitas entender.

---

*Documento generado para reporte académico/profesional de calidad de software*  
*Estándares: OWASP, ISO/IEC 25010*
