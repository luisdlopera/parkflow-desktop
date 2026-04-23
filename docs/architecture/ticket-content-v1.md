# Contenido de tiquete v1

Plantilla lógica versionada en `TicketDocument.templateVersion` (valor actual: `ticket-layout-v1`).

## Campos obligatorios en impresión

| Campo | Uso |
|-------|-----|
| Parqueadero | `parkingName` |
| Fecha/hora | `issuedAtIso` |
| Placa | `plate` |
| Consecutivo | `ticketNumber` + `ticketId` |
| Operador | `operatorName` |
| QR / código | `qrPayload` (modelo 2 ESC/POS) o `barcodePayload` (texto) |
| Perfil térmica | `printerProfile` (slug v1 canónico en underscore, p. ej. `epson_tm_t20iii`, `generic_58mm_esc_pos`) — usado por la capa desktop para cortes/consultas de estado en certificación. Aliases legacy con guion se mantienen por compatibilidad de despliegues anteriores. |

## Anchos 58 mm y 80 mm

- `paperWidthMm`: `58` | `80`
- El formateador ESC/POS ajusta el ancho aproximado en caracteres (32 vs 48) para mantener líneas legibles.

## Versionado

Al cambiar campos, alineación o comandos ESC/POS, incrementar `TicketTemplateVersion` en `packages/types` y documentar el cambio aquí.
