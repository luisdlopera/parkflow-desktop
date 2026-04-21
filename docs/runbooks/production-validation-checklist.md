# Checklist de validacion antes de produccion (Parkflow desktop-first)

Use esta lista en laboratorio y en piloto en sitio. Marque cada item con evidencia (log, captura, ID de ticket).

## Configuracion

- [ ] `PARKFLOW_API_KEY` definido en API y `NEXT_PUBLIC_API_KEY` coincide en build web embebido.
- [ ] CORS / origenes de produccion configurados en API.
- [ ] `NEXT_PUBLIC_PRINTER_PAPER_MM` = `58` o `80` segun hardware.
- [ ] `NEXT_PUBLIC_PRINTER_PROFILE` coincide con modelo certificado (`generic_58mm_esc_pos`, `epson_tm_t20iii`, etc.).
- [ ] Conexion impresora: TCP (host/puerto) o serial (COM/baud) verificada con `printer_health_esc_pos`.

## Operacion y deduplicacion

- [ ] Doble ingreso misma placa activa rechazado (409).
- [ ] Salida sobre sesion ya cerrada rechazada.
- [ ] Reimpresion exige `reason` no vacio; limite por rol aplicado.
- [ ] Ticket perdido bloqueado para rol `CASHIER` si asi esta definido en datos semilla.

## Impresion fisica

- [ ] Sin impresora / sin Tauri: la UI no falla el registro de negocio; solo muestra advertencia de impresion.
- [ ] Impresora apagada o TCP cerrado: error controlado; mensaje claro al operador.
- [ ] Timeout de red: no se marca `hardware_confirmed` sin respuesta de estado coherente.
- [ ] Sin papel (bit fin de papel): `hardware_confirmed` = false y mensaje operativo.
- [ ] Con papel y respuesta OK: ticket legible; QR escaneable en campo.
- [ ] Cambio 58 mm ↔ 80 mm: lineas no se desbordan; preview en UI coherente con papel.

## Offline / sync

- [ ] Corte de red: eventos permanecen en outbox SQLite hasta backoff.
- [ ] Tras reinicio del cliente: outbox reanuda sin duplicar eventos (misma `idempotency_key`).
- [ ] Eventos en `dead_letter` visibles para soporte y proceso manual definido.

## Seguridad

- [ ] Endpoints de negocio rechazan llamadas sin `X-API-Key` (401).
- [ ] Swagger en produccion deshabilitado o protegido segun politica.

## Observabilidad

- [ ] Health API accesible para balanceador.
- [ ] Logs con trazas `audit print_job` / `audit sync_` en flujos criticos.

## Riesgos que solo hardware real puede cerrar

- Interpretacion exacta de bytes `GS r` por marca/firmware.
- Comportamiento del cortador con papel parcial, etiqueta, o rodillo desgastado.
- Interferencia USB/hub en Windows con varias impresoras.
