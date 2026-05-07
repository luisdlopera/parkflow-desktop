# Validation Alignment Matrix

Estado de referencia para alinear validaciones entre frontend y backend.

## Legend

- `aligned`: front y back aplican la misma regla.
- `missing-front`: el backend valida, pero el frontend todavia no bloquea.
- `missing-back`: el frontend valida, pero falta regla en backend.
- `mismatch`: ambos validan, pero con reglas distintas.

## Operations

| Endpoint | Campo | Front | Back | Estado |
|---|---|---|---|---|
| `POST /api/v1/operations/entries` | `plate` | min/max + regex | `@NotBlank @Size @Pattern` | aligned |
| `POST /api/v1/operations/entries` | `type` | required | `@NotNull` | aligned |
| `POST /api/v1/operations/entries` | `operatorUserId` | uuid + required | `@NotNull UUID` | aligned |
| `POST /api/v1/operations/exits` | `ticketNumber/plate` locator | refine cross-field | `@AssertTrue hasLocator()` | aligned |
| `POST /api/v1/operations/exits` | `operatorUserId` | uuid + required | `@NotNull UUID` | aligned |
| `POST /api/v1/operations/tickets/reprint` | `operatorUserId` | uuid + required | `@NotNull UUID` | aligned |
| `POST /api/v1/operations/tickets/lost` | `operatorUserId` | uuid + required | `@NotNull UUID` | aligned |

## Cash

| Endpoint | Campo | Front | Back | Estado |
|---|---|---|---|---|
| `POST /api/v1/cash/open` | `site` | required + max | `@NotBlank @Size(max=80)` | aligned |
| `POST /api/v1/cash/open` | `terminal` | required + max | `@NotBlank @Size(max=80)` | aligned |
| `POST /api/v1/cash/open` | `openingAmount` | min `0` | `@NotNull @DecimalMin(0.00)` | aligned |
| `POST /api/v1/cash/open` | `operatorUserId` | uuid + required | `@NotNull UUID` | aligned |
| `POST /api/v1/cash/sessions/:id/movements` | `amount` | min `0.01` | `@DecimalMin(0.01)` | aligned |
| `POST /api/v1/cash/sessions/:id/movements/:movementId/void` | `reason` | required + max | `@NotBlank @Size(max=2000)` | aligned |

## Print jobs / Sync

| Endpoint | Campo | Front | Back | Estado |
|---|---|---|---|---|
| `POST /api/v1/print-jobs` | `sessionId` | uuid + required | `@NotNull UUID` | aligned |
| `POST /api/v1/print-jobs` | `operatorUserId` | uuid + required | `@NotNull UUID` | aligned |
| `POST /api/v1/sync/push` | core fields | required strings | `@NotBlank` | aligned |

## Pending full coverage

Los dominios `settings`, `auth` y `licensing` ya tienen validaciones parciales en front/back, pero faltan contratos canónicos por endpoint para llevarlos a `aligned` bajo el mismo guard estricto.

