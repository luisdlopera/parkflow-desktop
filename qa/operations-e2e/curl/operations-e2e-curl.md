# Coleccion equivalente en curl

Esta guia replica la coleccion Bruno usando curl.

## 1) Variables base

Para bash:

~~~sh
export API_BASE_URL="http://localhost:8080/api/v1/operations"
export API_KEY="${API_KEY:-parkflow-dev-key}"
export ADMIN_OPERATOR_ID="00000000-0000-0000-0000-000000000001"
export CASHIER_OPERATOR_ID="00000000-0000-0000-0000-000000000002"
export RATE_CAR_ID="10000000-0000-0000-0000-000000000001"

export PLATE_MAIN="QA100A"
export PLATE_LOST="QA200B"
export PLATE_MISMATCH="QA300C"
export PLATE_NEGATIVE="QA900N"
~~~

Todas las peticiones al API deben incluir la cabecera de autenticacion:

`-H "X-API-Key: $API_KEY"`

(En los fragmentos siguientes se omite por brevedad; anexela a cada `curl`.)

## 2) Happy path

01. Crear ingreso exitoso

~~~sh
curl -i -X POST "$API_BASE_URL/entries" \
  -H "Content-Type: application/json" \
  -d '{
    "plate": "'"$PLATE_MAIN"'",
    "type": "CAR",
    "rateId": "'"$RATE_CAR_ID"'",
    "operatorUserId": "'"$CASHIER_OPERATOR_ID"'",
    "entryAt": "2026-04-14T08:00:00-05:00",
    "site": "Sede Norte",
    "lane": "Carril 1",
    "booth": "Caja 1",
    "terminal": "TERM-01",
    "observations": "Ingreso QA happy path",
    "vehicleCondition": "Sin novedades al ingreso",
    "conditionChecklist": ["carroceria_ok","luces_ok","espejos_ok"],
    "conditionPhotoUrls": ["https://example.test/photos/qa100a-entry-1.jpg"]
  }'
~~~

Esperado: HTTP 201.
Guardar ticketMain desde response.receipt.ticketNumber.

02. Consultar sesion activa por ticket

~~~sh
curl -i "$API_BASE_URL/sessions/active?ticketNumber=<ticketMain>"
~~~

Esperado: HTTP 200 y status ACTIVE.

03. Listado de activas

~~~sh
curl -i "$API_BASE_URL/sessions/active-list"
~~~

Esperado: HTTP 200 y presencia de PLATE_MAIN.

04. Simular salida con calculo/cobro

~~~sh
curl -i "$API_BASE_URL/sessions/active?plate=$PLATE_MAIN"
~~~

Esperado: HTTP 200 con receipt.duration y total.

05. Registrar salida pagada

~~~sh
curl -i -X POST "$API_BASE_URL/exits" \
  -H "Content-Type: application/json" \
  -d '{
    "ticketNumber": "<ticketMain>",
    "operatorUserId": "'"$CASHIER_OPERATOR_ID"'",
    "paymentMethod": "CASH",
    "exitAt": "2026-04-14T10:00:00-05:00",
    "observations": "Salida QA happy path",
    "vehicleCondition": "Sin novedades a la salida",
    "conditionChecklist": ["carroceria_ok","luces_ok","espejos_ok"],
    "conditionPhotoUrls": ["https://example.test/photos/qa100a-exit-1.jpg"]
  }'
~~~

Esperado: HTTP 200, receipt.status CLOSED, total no nulo.

06. Reimprimir ticket

~~~sh
curl -i -X POST "$API_BASE_URL/tickets/reprint" \
  -H "Content-Type: application/json" \
  -d '{
    "ticketNumber": "<ticketMain>",
    "operatorUserId": "'"$CASHIER_OPERATOR_ID"'",
    "reason": "Cliente solicita copia para soporte"
  }'
~~~

Esperado: HTTP 200 y receipt.reprintCount = 1.

07. Consultar ticket final

~~~sh
curl -i "$API_BASE_URL/tickets/<ticketMain>"
~~~

Esperado: HTTP 200, status CLOSED, totalAmount no nulo.

## 3) Ticket perdido

08. Crear ingreso para lost flow

~~~sh
curl -i -X POST "$API_BASE_URL/entries" \
  -H "Content-Type: application/json" \
  -d '{
    "plate": "'"$PLATE_LOST"'",
    "type": "CAR",
    "rateId": "'"$RATE_CAR_ID"'",
    "operatorUserId": "'"$CASHIER_OPERATOR_ID"'",
    "entryAt": "2026-04-14T11:00:00-05:00",
    "site": "Sede Norte",
    "lane": "Carril 2",
    "booth": "Caja 2",
    "terminal": "TERM-02",
    "observations": "Ingreso QA ticket perdido",
    "vehicleCondition": "Sin novedades ingreso ticket perdido",
    "conditionChecklist": ["carroceria_ok"],
    "conditionPhotoUrls": ["https://example.test/photos/qa200b-entry-1.jpg"]
  }'
~~~

Esperado: HTTP 201. Guardar ticketLost.

09. Procesar lost ticket con rol autorizado

~~~sh
curl -i -X POST "$API_BASE_URL/tickets/lost" \
  -H "Content-Type: application/json" \
  -d '{
    "ticketNumber": "<ticketLost>",
    "operatorUserId": "'"$ADMIN_OPERATOR_ID"'",
    "paymentMethod": "CASH",
    "reason": "Ticket perdido validado por administrador"
  }'
~~~

Esperado: HTTP 200, lostTicket true, status CLOSED.

10. Consultar ticket perdido final

~~~sh
curl -i "$API_BASE_URL/tickets/<ticketLost>"
~~~

Esperado: HTTP 200, lostTicket true.

## 4) Mismatch estado vehicular

11. Crear ingreso mismatch

~~~sh
curl -i -X POST "$API_BASE_URL/entries" \
  -H "Content-Type: application/json" \
  -d '{
    "plate": "'"$PLATE_MISMATCH"'",
    "type": "CAR",
    "rateId": "'"$RATE_CAR_ID"'",
    "operatorUserId": "'"$CASHIER_OPERATOR_ID"'",
    "entryAt": "2026-04-14T12:00:00-05:00",
    "site": "Sede Norte",
    "lane": "Carril 3",
    "booth": "Caja 3",
    "terminal": "TERM-03",
    "observations": "Ingreso QA mismatch",
    "vehicleCondition": "Sin rayones",
    "conditionChecklist": ["carroceria_ok","parabrisas_ok"],
    "conditionPhotoUrls": ["https://example.test/photos/qa300c-entry-1.jpg"]
  }'
~~~

Guardar ticketMismatch.

12. Salida con diferencia de estado

~~~sh
curl -i -X POST "$API_BASE_URL/exits" \
  -H "Content-Type: application/json" \
  -d '{
    "ticketNumber": "<ticketMismatch>",
    "operatorUserId": "'"$CASHIER_OPERATOR_ID"'",
    "paymentMethod": "CARD",
    "exitAt": "2026-04-14T13:10:00-05:00",
    "observations": "Salida QA mismatch",
    "vehicleCondition": "Rayon nuevo en puerta derecha",
    "conditionChecklist": ["carroceria_rayon_puerta_derecha","parabrisas_ok"],
    "conditionPhotoUrls": ["https://example.test/photos/qa300c-exit-1.jpg"]
  }'
~~~

Esperado: HTTP 200. El evento mismatch se valida por SQL en session_event.

## 5) Negativos importantes

13. Duplicar ingreso misma placa activa

~~~sh
curl -i -X POST "$API_BASE_URL/entries" \
  -H "Content-Type: application/json" \
  -d '{
    "plate": "'"$PLATE_NEGATIVE"'",
    "type": "CAR",
    "rateId": "'"$RATE_CAR_ID"'",
    "operatorUserId": "'"$CASHIER_OPERATOR_ID"'",
    "entryAt": "2026-04-14T16:00:00-05:00",
    "site": "Sede Norte",
    "lane": "Carril 9",
    "booth": "Caja 9",
    "terminal": "TERM-09",
    "observations": "Base negativos",
    "vehicleCondition": "Sin novedades",
    "conditionChecklist": ["carroceria_ok"],
    "conditionPhotoUrls": ["https://example.test/photos/qa900n-entry-1.jpg"]
  }'
~~~

Guardar ticketNegative. Luego repetir con la misma placa y entryAt 16:05.
Esperado del segundo: HTTP 409.

14. Buscar activa sin locator

~~~sh
curl -i "$API_BASE_URL/sessions/active"
~~~

Esperado: HTTP 400.

15. Salida sin locator

~~~sh
curl -i -X POST "$API_BASE_URL/exits" \
  -H "Content-Type: application/json" \
  -d '{
    "operatorUserId": "'"$CASHIER_OPERATOR_ID"'",
    "paymentMethod": "CASH",
    "vehicleCondition": "Sin novedades",
    "conditionChecklist": ["carroceria_ok"],
    "conditionPhotoUrls": []
  }'
~~~

Esperado: HTTP 400.

16. Lost ticket con cashier (no autorizado)

~~~sh
curl -i -X POST "$API_BASE_URL/tickets/lost" \
  -H "Content-Type: application/json" \
  -d '{
    "ticketNumber": "<ticketNegative>",
    "operatorUserId": "'"$CASHIER_OPERATOR_ID"'",
    "paymentMethod": "CASH",
    "reason": "Intento no autorizado"
  }'
~~~

Esperado: HTTP 403.

17. Salida con fecha anterior al ingreso

~~~sh
curl -i -X POST "$API_BASE_URL/exits" \
  -H "Content-Type: application/json" \
  -d '{
    "ticketNumber": "<ticketNegative>",
    "operatorUserId": "'"$CASHIER_OPERATOR_ID"'",
    "paymentMethod": "CASH",
    "exitAt": "2026-04-14T15:00:00-05:00",
    "vehicleCondition": "Sin novedades",
    "conditionChecklist": ["carroceria_ok"],
    "conditionPhotoUrls": []
  }'
~~~

Esperado: HTTP 400.

18. Reimpresion sin reason

~~~sh
curl -i -X POST "$API_BASE_URL/tickets/reprint" \
  -H "Content-Type: application/json" \
  -d '{
    "ticketNumber": "<ticketMain>",
    "operatorUserId": "'"$CASHIER_OPERATOR_ID"'",
    "reason": ""
  }'
~~~

Esperado: HTTP 400.
