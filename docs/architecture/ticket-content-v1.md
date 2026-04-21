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

## Anchos 58 mm y 80 mm

- `paperWidthMm`: `58` | `80`
- El formateador ESC/POS ajusta el ancho aproximado en caracteres (32 vs 48) para mantener líneas legibles.

## Versionado

Al cambiar campos, alineación o comandos ESC/POS, incrementar `TicketTemplateVersion` en `packages/types` y documentar el cambio aquí.
