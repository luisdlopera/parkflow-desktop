# Operaciones Parqueadero E2E (Bruno + SQL)

Esta suite cubre de punta a punta los 10 flujos solicitados sobre el modulo de operaciones.

## 1) Estructura de carpetas

- qa/operations-e2e/bruno/operations-module-e2e/bruno.json
- qa/operations-e2e/bruno/operations-module-e2e/environments/local.bru
- qa/operations-e2e/bruno/operations-module-e2e/requests/01_happy_path
- qa/operations-e2e/bruno/operations-module-e2e/requests/02_lost_ticket
- qa/operations-e2e/bruno/operations-module-e2e/requests/03_mismatch
- qa/operations-e2e/bruno/operations-module-e2e/requests/04_negative
- qa/operations-e2e/curl/operations-e2e-curl.md

## 2) Variables de entorno (Bruno)

Archivo: qa/operations-e2e/bruno/operations-module-e2e/environments/local.bru

Variables mock reemplazables:
- adminOperatorId: 00000000-0000-0000-0000-000000000001
- cashierOperatorId: 00000000-0000-0000-0000-000000000002
- rateCarId: 10000000-0000-0000-0000-000000000001
- rateMotorcycleId: 10000000-0000-0000-0000-000000000002

Variables dinamicas capturadas por la suite:
- ticketMain
- ticketLost
- ticketMismatch
- ticketNegative

## 3) Secuencia exacta recomendada

Ejecutar en este orden:
1. 01_create_entry_main
2. 02_get_active_by_ticket_or_plate
3. 03_get_active_list
4. 04_simulate_exit_quote
5. 05_register_exit_paid
6. 06_reprint_ticket_and_validate_counter
7. 07_get_ticket_final_and_assert_fields
8. 09_create_entry_lost_flow
9. 10_process_lost_ticket_authorized
10. 11_get_lost_ticket_final
11. 12_create_entry_for_mismatch
12. 13_register_exit_with_mismatch
13. 14_get_mismatch_ticket_final
14. 15_create_entry_for_negative_cases
15. 16_duplicate_entry_same_plate_should_conflict
16. 17_active_lookup_without_locator_should_fail
17. 18_exit_without_locator_should_fail
18. 19_lost_ticket_cashier_should_forbidden
19. 20_exit_before_entry_should_fail
20. 21_reprint_without_reason_should_fail
21. 22_close_negative_session_cleanup

## 4) Cobertura contra flujos solicitados

1. Crear ingreso exitoso: request 01.
2. Consultar sesion activa por ticket o placa: requests 02 y 04.
3. Consultar listado de activas: request 03.
4. Simular salida con calculo/cobro: request 04.
5. Registrar salida pagada y validar cierre: request 05.
6. Reimprimir y validar reprintCount: request 06.
7. Ticket perdido con rol autorizado: request 10.
8. Consultar ticket final y validar consistencia: requests 07 y 11.
9. Probar mismatch: requests 12, 13, 14 + validacion SQL en session_event.
10. Casos negativos importantes: requests 16 a 21.

## 5) Expectativa HTTP por request

Positivos:
- 01: 201
- 02: 200
- 03: 200
- 04: 200
- 05: 200
- 06: 200
- 07: 200
- 09: 201
- 10: 200
- 11: 200
- 12: 201
- 13: 200
- 14: 200
- 15: 201
- 22: 200

Negativos:
- 16: 409 (vehiculo ya activo)
- 17: 400 (falta ticketNumber o plate)
- 18: 400 (validacion locator)
- 19: 403 (cashier no autorizado en lost)
- 20: 400 (exitAt < entryAt)
- 21: 400 (reason obligatorio)

## 6) Validaciones SQL recomendadas por flujo

Usar PostgreSQL sobre tabla real del modulo.

A. Despues de 01 (ingreso principal)
- Debe existir parking_session ACTIVE para plateMain.
- Debe existir session_event ENTRY_RECORDED.
- Debe existir vehicle_condition_report stage ENTRY.

SQL:

select ps.id, ps.ticket_number, ps.status, ps.entry_at, ps.entry_operator_id
from parking_session ps
join vehicle v on v.id = ps.vehicle_id
where v.plate = 'QA100A'
order by ps.created_at desc
limit 1;

select type, created_at
from session_event se
join parking_session ps on ps.id = se.session_id
join vehicle v on v.id = ps.vehicle_id
where v.plate = 'QA100A'
order by created_at asc;

B. Despues de 05 (salida pagada)
- parking_session.status = CLOSED
- total_amount no nulo
- payment insertado
- session_event EXIT_RECORDED

SQL:

select ps.ticket_number, ps.status, ps.total_amount, ps.exit_operator_id, ps.exit_at
from parking_session ps
where ps.ticket_number = '<ticketMain>';

select p.method, p.amount, p.paid_at
from payment p
join parking_session ps on ps.id = p.session_id
where ps.ticket_number = '<ticketMain>';

C. Despues de 06 (reimpresion)
- reprint_count incrementado
- session_event TICKET_REPRINTED con metadata

SQL:

select reprint_count
from parking_session
where ticket_number = '<ticketMain>';

select type, metadata, created_at
from session_event se
join parking_session ps on ps.id = se.session_id
where ps.ticket_number = '<ticketMain>'
order by created_at;

D. Despues de 10 (ticket perdido)
- lost_ticket = true
- lost_ticket_reason no nulo
- status CLOSED
- session_event LOST_TICKET_MARKED

SQL:

select ticket_number, status, lost_ticket, lost_ticket_reason, total_amount
from parking_session
where ticket_number = '<ticketLost>';

select type, metadata
from session_event se
join parking_session ps on ps.id = se.session_id
where ps.ticket_number = '<ticketLost>'
order by created_at;

E. Despues de 13 (mismatch)
- Debe existir evento VEHICLE_CONDITION_MISMATCH
- Debe existir condition report ENTRY y EXIT

SQL:

select stage, observations, checklist_json, photo_urls_json
from vehicle_condition_report vcr
join parking_session ps on ps.id = vcr.session_id
where ps.ticket_number = '<ticketMismatch>'
order by vcr.created_at;

select type, metadata, created_at
from session_event se
join parking_session ps on ps.id = se.session_id
where ps.ticket_number = '<ticketMismatch>'
order by created_at;

F. Despues de negativos
- 16 no crea nueva sesion para misma placa
- 19 no debe cerrar sesion ni marcar lost
- 20 no debe cerrar sesion

SQL:

select count(*) as active_count
from parking_session ps
join vehicle v on v.id = ps.vehicle_id
where v.plate = 'QA900N' and ps.status = 'ACTIVE';

## 7) Datos de prueba coherentes usados

Placas:
- QA100A: happy path + reprint.
- QA200B: lost ticket autorizado.
- QA300C: mismatch.
- QA900N: negativos y cleanup.

Usuarios seeded:
- Admin: 00000000-0000-0000-0000-000000000001
- Cashier: 00000000-0000-0000-0000-000000000002

Tarifa seeded carro:
- 10000000-0000-0000-0000-000000000001

## 8) Recomendaciones para QA y regresion

- Ejecutar primero migraciones limpias en un schema de test.
- Correr suite completa en orden numerico.
- Registrar artifacts: response body por request + extracto SQL de verificacion.
- Agregar en CI una etapa smoke con requests 01, 05, 06, 10, 13, 16, 19.
- Mantener placas de test reservadas para evitar choques con datos reales.

## 9) Riesgos o pendientes detectados

- El endpoint GET /tickets/{ticketNumber} no expone lista de session_event ni condition reports; para auditoria fina sigue siendo necesario consultar base de datos.
- No hay autenticacion HTTP activa en este modulo, el control es por operatorUserId/rol en dominio. Para QA de seguridad real falta integrar auth.
- En evidencia de fotos se guardan URLs declaradas por cliente; falta storage/upload validado si se requiere cadena de custodia fuerte.
