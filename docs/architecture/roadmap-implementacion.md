# Roadmap: priorizar `develop` y cerrar brechas post-integracion

**Contexto:** `main` ya incorpora todo el historial de `develop` (merge de integracion). Ambas ramas apuntan al mismo contenido; el flujo de trabajo diario debe ser **`develop` como rama base** (features, fixes, PRs). `main` queda como **linea estable** tras validacion (tags / release).

**Priorizar `develop` en GitHub:** en *Settings → General → Default branch*, elegir `develop`. (En este entorno no hubo `gh auth`; hacerlo manualmente o `gh repo edit --default-branch develop` tras `gh auth login`.)

---

## Fase 0 — Operativa de ramas (inmediato)

| Accion | Proposito |
|--------|-----------|
| Default branch = `develop` | PRs y clones nuevos parten del producto real. |
| Proteger `main` | Require review/CI antes de merge; solo desde `develop` o `release/*`. |
| Tags en `main` | Ej. `v0.2.0` cuando checklist de sitio este verde. |

---

## Fase 1 — Estabilizacion tecnica (1–2 semanas)

| Prioridad | Tarea | Criterio de hecho |
|-----------|--------|-------------------|
| P0 | CI: job opcional `tauri build` en Linux o Windows runner | Artefacto o fallo claro en PR criticos. |
| P0 | E2E Bruno/curl en CI con `API_KEY` en secretos | Pipeline verde en cada push a `develop`. |
| P1 | `/actuator/prometheus` sin romper scrape (ruta publica o bearer dedicado) | Dashboards basicos alertables. |
| P1 | Documentar variables obligatorias por entorno (web + api + desktop) | Tabla en README o `docs/setup`. |

---

## Fase 2 — Impresion y hardware (paralelo a Fase 1)

| Prioridad | Tarea | Criterio de hecho |
|-----------|--------|-------------------|
| P0 | Matriz certificada por modelo (TM-T20, Xprinter 80, Bixolon…) | Documento + perfiles Rust ajustados (corte/estado si difiere). |
| P1 | Agente de impresion si la UI no es siempre Tauri | Cola local o servicio que consuma print-jobs y llame a ESC/POS. |
| P2 | Protocolos `STAR_PRNT` / driver Windows | Solo si contrato comercial lo exige. |

---

## Fase 3 — Offline y sync

| Prioridad | Tarea | Criterio de hecho |
|-----------|--------|-------------------|
| P1 | Politica de re-push outbox tras caida larga (deduplicacion + idempotencia) | Runbook + pruebas de chaos (corte red 30+ min). |
| P1 | UI supervisor: estado outbox / ultimo error / dead-letter | Pantalla o panel minimo. |
| P2 | Reconciliacion de negocio mas alla de `syncedAt` | Definicion de conflictos y resolucion. |

---

## Fase 4 — Seguridad y producto

| Prioridad | Tarea | Criterio de hecho |
|-----------|--------|-------------------|
| P0 | Sustituir API key monolitica por auth por entorno (JWT/mTLS segun despliegue) | Operadores auditables sin exponer clave en web. |
| P1 | Login en web + roles alineados al API | Fin de UUIDs manuales en formularios para usuarios finales. |
| P2 | Rate limiting y hardening CORS en produccion | Revision OWASP basica. |

---

## Fase 5 — QA regresion (continuo)

Usar [production-validation-checklist.md](../runbooks/production-validation-checklist.md) antes de cada release.

Escenarios minimos: sin impresora, impresora apagada, sin papel, timeout, crash mid-print, cambio 58↔80 mm, sync diferido.

---

## Orden recomendado (resumen)

1. **Default `develop` + proteccion de ramas** (Fase 0).  
2. **CI con E2E + opcional build desktop** (Fase 1).  
3. **Certificacion hardware + matriz** (Fase 2 P0).  
4. **Auth real** (Fase 4 P0) cuando haya exposicion a red no confiable.  
5. **Sync/outbox UI + politicas** (Fase 3) para operacion 24/7.

Referencias: [production-readiness-audit.md](./production-readiness-audit.md), [offline-printing-v1.md](./offline-printing-v1.md).
