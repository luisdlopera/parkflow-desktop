# Auditoria de preparacion para produccion (main vs develop)

Fecha de referencia: alineada con el estado del repositorio en rama `develop`. `main` permanece en el commit inicial (Tauri + Next en layout monolitico).

## 1. Estado actual por rama

### main

- Layout de app unico: `src/` (Next), `src-tauri/`, `docker-compose.yml` en raiz.
- Sin `apps/api` Spring Boot, sin modulo de operaciones Java, sin print jobs/sync Flyway dedicados en backend propio.
- Sin paquete `packages/types` ni documentacion `offline-printing-v1` en el arbol esperado del monorepo.

### develop

- Monorepo: `apps/desktop`, `apps/web`, `apps/api`, `packages/types`, `infra/docker-compose.yml`, docs de arquitectura y runbooks.
- Backend Spring Boot 3 + Java 21: operaciones de parqueo, print jobs, sync, Flyway, seguridad por API key (`X-API-Key`).
- Desktop Tauri: SQLite local, outbox, worker de heartbeat, comandos ESC/POS (TCP + serial).
- Web Next.js: flujos de ingreso/salida/reimpresion/ticket perdido; impresion vía Tauri cuando la UI corre embebida en desktop.
- CI: lint/build web, build/test API, `cargo test` desktop.

## 2. Cambios arquitectonicos (main → develop)

- Separacion clara **UI web** / **shell desktop** / **API central**.
- **Contratos** centralizados en `packages/types` (TypeScript) con paridad documentada hacia DTOs Java.
- **Impresion fisica** solo en el proceso desktop (Rust); la API orquesta **print jobs** y auditoria server-side.
- **Offline**: SQLite + outbox en desktop; sync push/pull/reconcile en API (reconcile marca `syncedAt`, no reemplaza reconciliacion de negocio completa sin definicion de cursor de cliente).

## 3. Funcionalidades migradas vs perdidas

### Migradas (en develop)

- UI de operaciones (ingreso, salida, listados) en `apps/web` con paths equivalentes a las paginas que estaban bajo `src/` en main.

### Perdidas / riesgo de regresion

- **Ruta raiz del repo**: scripts y paths cambiaron (`pnpm dev:web`). Documentacion antigua que apunte solo a `main` queda obsoleta.
- **main no recibe** automaticamente las capacidades de develop hasta merge explicito.

## 4. Implementacion y cableado real (develop)

| Area | Estado | Notas |
|------|--------|--------|
| Contratos TS (`TicketDocument`, `PrintJob`, …) | Implementado en `packages/types` | Incluye `printerProfile` y layout de preview (`ticket-layout.ts`). |
| Endpoints operaciones / print-jobs / sync | Implementado (Java) | Protegidos por API key salvo health/swagger/docs publicos. |
| Outbox SQLite + reintentos + dead-letter | Implementado (Rust) | Backoff en `lib.rs`; tope `OUTBOX_MAX_RETRIES`. |
| Heartbeat online/offline | Implementado | Worker + `PARKFLOW_API_HEALTH_URL`; estado en tabla `connectivity_state`. |
| Comandos Tauri impresion + health | Implementado | Perfiles ESC/POS + confirmacion mas estricta post-job (ver runbook). |
| Web → Desktop → Impresora | Parcial | Solo cuando la web corre **dentro de Tauri** (`__TAURI_INTERNALS__`). Navegador solo no imprime. |
| CI | Parcial | No ejecuta `tauri build` ni E2E Bruno en CI; `cargo test` desktop si. |

## 5. Gaps criticos restantes (produccion real)

- **Prometheus/metrics** tras API key: revisar si scrape debe usar API key o ruta publica dedicada.
- **USB raw** sin COM: no hay capa nativa USB Win32; en campo suele resolverse como puerto COM del driver.
- **STAR_PRNT / BXL / WINDOWS_DRIVER**: enumerados en contrato/API, **no** implementados en desktop.
- **Reconciliacion sync**: servidor persiste eventos; el cliente debe politica clara de re-push y deduplicacion en caida prolongada.
- **Preview vs bytes ESC/POS**: el preview es texto monoespacio alineado al mismo algoritmo de lineas que el raster logico del ticket; el **QR grafico** en preview es representado como marcador de texto (el papel si lleva QR ESC/POS).
- **Auth operadores**: la UI usa UUIDs de operador; no hay login OIDC/JWT en la web contra el API en este repo.

## 6. Riesgos de produccion

- Falsos positivos de impresion mitigados: `hardware_confirmed` exige byte de estado **y** que no se reporte fin de papel duro (bit comun GS r tipo Epson). Sigue siendo subset de modelos; Bixolon/Star pueden necesitar matriz de certificacion.
- **Doble click**: mitigado en formulario de ingreso y en salida/ticket perdido con candados de envio; reimpresion aun puede beneficiarse de debounce adicional.
- **Rotacion de API keys** y secretos en desktop (variables `NEXT_PUBLIC_*` son visibles en el cliente).

## 7. Estrategia de merge recomendada

1. **No reemplazar `main` por fast-forward ciego**: `main` y `develop` divergen fuerte; usar **merge commit** o **PR** con checklist de validacion (ver runbook `production-validation-checklist.md`).
2. Mantener `main` como **linea estable minima** solo si el negocio aun depende del layout antiguo; de lo contrario, **promover `develop` a default** tras estabilizacion.
3. Crear rama `release/x` desde `develop` para hardening (hardware, seguridad, observabilidad) antes de etiquetar version desktop.

## 8. Lista priorizada de tareas

### P0 — Bloqueantes para “go live” multi-sitio

- Certificar **matriz impresora + perfil** por modelo (corte, QR, GS r) en sitio.
- Definir **despliegue API** con TLS, rotacion de `PARKFLOW_API_KEY`, y CORS de produccion.
- Completar **flujo de impresion** cuando la UI no es Tauri (agente dedicado o cola local obligatoria).

### P1 — Importantes

- Auth real (JWT/session) y autorizacion alineada a roles ya presentes en operaciones Java.
- Exponer **panel de salud** impresora/outbox en UI para caja/supervisor.
- Integrar E2E (Bruno/curl) en CI con API key en secretos.

### P2 — Mejoras

- Perfiles con **comandos de corte/estado** distintos por firmware real (no solo placeholders).
- Drivers/protocolos Star/Bixolon nativos si la cartera lo exige.
- Métricas RED/USE y alertas basadas en `print_attempts` y outbox `dead_letter`.
