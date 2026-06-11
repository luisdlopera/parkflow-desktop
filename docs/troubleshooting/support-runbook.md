# Runbook de Soporte - Manejo de Bloqueos de Licencias

## Índice
1. [Escenarios de Bloqueo](#escenarios-de-bloqueo)
2. [Diagnóstico Rápido](#diagnóstico-rápido)
3. [Procedimientos de Desbloqueo](#procedimientos-de-desbloqueo)
4. [Herramientas de Diagnóstico](#herramientas-de-diagnóstico)
5. [Caso: Pagó pero sigue bloqueado](#caso-pagó-pero-sigue-bloqueado)
6. [Prevención y Monitoreo](#prevención-y-monitoreo)

---

## Escenarios de Bloqueo

### Tipos de Bloqueo

| Código | Descripción | Severidad | Resolución |
|--------|-------------|-----------|------------|
| `INVALID_SIGNATURE` | Firma de licencia inválida | CRÍTICA | Requiere regenerar licencia |
| `TIME_MANIPULATION` | Detección de cambio de fecha | CRÍTICA | Verificar integridad sistema |
| `DEVICE_MISMATCH` | Dispositivo no corresponde | ALTA | Generar nueva licencia |
| `LICENSE_EXPIRED` | Licencia vencida | MEDIA | Renovar licencia |
| `COMPANY_BLOCKED` | Bloqueo administrativo | ALTA | Revisar con administración |
| `GRACE_PERIOD_ENDED` | Gracia expirada | MEDIA | Renovar o extender gracia |
| `DEVICE_NOT_REGISTERED` | Dispositivo no registrado | BAJA | Registrar dispositivo |

---

## Diagnóstico Rápido

### Paso 1: Identificar la Empresa y Dispositivo

```bash
# Obtener diagnóstico completo de empresa
curl -X GET http://localhost:6011/api/v1/licensing/support/diagnose/company/{companyId} \
  -H "Authorization: Bearer {token}"
```

**Respuesta esperada:**
```json
{
  "companyId": "...",
  "companyName": "Parqueadero ABC",
  "currentStatus": "BLOCKED",
  "currentPlan": "PRO",
  "daysRemaining": -15,
  "graceDaysRemaining": -8,
  "totalBlockEvents": 3,
  "unresolvedBlockEvents": 2,
  "healthStatus": "CRITICAL",
  "warnings": [
    "Hay 2 eventos de bloqueo no resueltos",
    "Se detectó pago después de bloqueo pero empresa sigue bloqueada"
  ],
  "recommendations": [
    "Verificar que el pago fue aplicado correctamente y desbloquear empresa"
  ]
}
```

### Paso 2: Revisar Eventos de Bloqueo

```bash
# Ver eventos no resueltos
curl -X GET http://localhost:6011/api/v1/licensing/support/blocks/unresolved \
  -H "Authorization: Bearer {token}"
```

### Paso 3: Diagnóstico del Dispositivo

```bash
# Si tienes el fingerprint del dispositivo
curl -X GET http://localhost:6011/api/v1/licensing/support/diagnose/device/{fingerprint} \
  -H "Authorization: Bearer {token}"
```

---

## Procedimientos de Desbloqueo

### Caso A: Cliente Pagó, Sigue Bloqueado

```bash
# 1. Verificar casos prioritarios (pagos después de bloqueo)
curl -X GET http://localhost:6011/api/v1/licensing/support/cases/priority \
  -H "Authorization: Bearer {token}"

# 2. Desbloquear empresa
# (Este endpoint desbloquea y marca todos los eventos como resueltos)
curl -X POST http://localhost:6011/api/v1/licensing/support/company/{companyId}/unblock \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Pago recibido y verificado - Ref: PAY-2024-001",
    "notifyCustomer": true
  }'
```

### Caso B: Firma Inválida (INVALID_SIGNATURE)

**Síntomas:**
- Error "Firma de licencia inválida"
- Dispositivo bloqueado por seguridad

**Solución:**
```bash
# 1. Generar nueva licencia para el dispositivo
curl -X POST http://localhost:6011/api/v1/licensing/licenses/generate \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "{companyId}",
    "deviceFingerprint": "{fingerprint}",
    "hostname": "{hostname}",
    "notes": "Regeneración por firma inválida - Soporte Ticket #123"
  }'

# 2. Resolver el evento de bloqueo anterior
curl -X POST http://localhost:6011/api/v1/licensing/support/blocks/{blockEventId}/resolve \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "notes": "Licencia regenerada por firma inválida. Cliente proporcionó fingerprint correcto.",
    "correctiveAction": "LICENSE_REGENERATED"
  }'
```

### Caso C: Manipulación de Tiempo (TIME_MANIPULATION)

**Síntomas:**
- Error "Posible manipulación de fecha detectada"
- Contador de violaciones alto

**Solución:**
```bash
# 1. Verificar si es legítimo o falso positivo
# Preguntar al cliente:
# - ¿Cambió manualmente la fecha del sistema?
# - ¿El equipo se quedó sin batería CMOS?
# - ¿Hubo problemas de sincronización NTP?

# 2. Si es legítimo (cambio de hardware, etc.)
curl -X POST http://localhost:6011/api/v1/licensing/support/blocks/{blockEventId}/resolve \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "notes": "Cliente confirmó cambio de batería CMOS. Fecha corregida. Resetear contador de violaciones.",
    "correctiveAction": "TIME_ISSUE_RESOLVED"
  }'

# 3. Si es falso positivo (bug del sistema)
curl -X POST http://localhost:6011/api/v1/licensing/support/blocks/{blockEventId}/false-positive \
  -H "Authorization: Bearer {token}" \
  -d '"Detectado como falso positivo - Cliente no manipuló fecha. Investigar causa raíz."'
```

### Caso D: Empresa Bloqueada Administrativamente

**Síntomas:**
- Código `COMPANY_BLOCKED`
- No hay eventos de bloqueo automáticos recientes

**Solución:**
```bash
# 1. Cambiar estado de empresa a ACTIVE
# (Usar endpoint de actualización de empresa)
curl -X PUT http://localhost:6011/api/v1/licensing/companies/{companyId} \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "ACTIVE"
  }'

# 2. Resolver cualquier evento de bloqueo pendiente
curl -X POST http://localhost:6011/api/v1/licensing/support/company/{companyId}/unblock \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Desbloqueo administrativo - Verificado con dirección",
    "notifyCustomer": true
  }'
```

---

## Herramientas de Diagnóstico

### Dashboard de Soporte

```
http://localhost:6001/admin/support
```

**Vistas disponibles:**
- Casos prioritarios (pagos post-bloqueo)
- Eventos no resueltos
- Falsos positivos
- Estadísticas de bloqueos

### Estadísticas

```bash
# Estadísticas de los últimos 7 días
curl -X GET "http://localhost:6011/api/v1/licensing/support/statistics?days=7" \
  -H "Authorization: Bearer {token}"
```

**Respuesta:**
```json
{
  "periodStart": "2024-05-25T00:00:00Z",
  "periodEnd": "2024-06-01T23:59:59Z",
  "totalBlockEvents": 15,
  "resolvedEvents": 12,
  "unresolvedEvents": 3,
  "resolutionRate": 80.0,
  "blocksByReason": {
    "LICENSE_EXPIRED": 8,
    "INVALID_SIGNATURE": 2,
    "TIME_MANIPULATION": 5
  }
}
```

### Queries SQL Directos (para soporte avanzado)

```sql
-- Casos prioritarios: pagos después de bloqueo
SELECT * FROM support_dashboard
WHERE payment_received_after_block = TRUE;

-- Falsos positivos recientes
SELECT * FROM license_block_events
WHERE false_positive = TRUE
  AND created_at > NOW() - INTERVAL '7 days';

-- Estadísticas por razón
SELECT reason_code, COUNT(*) as count
FROM license_block_events
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY reason_code
ORDER BY count DESC;
```

---

## Caso: "Pagó pero sigue bloqueado"

### Checklist de Verificación

1. **Verificar pago en sistema**
   - ¿El pago aparece en el sistema de contabilidad?
   - ¿Tiene referencia de pago válida?
   - ¿Fecha del pago es posterior al bloqueo?

2. **Verificar en base de datos**
   ```sql
   SELECT * FROM license_block_events
   WHERE company_id = '{companyId}'
     AND payment_received_after_block = TRUE
     AND resolved = FALSE;
   ```

3. **Verificar estado de empresa**
   ```sql
   SELECT status, expires_at, grace_until
   FROM companies
   WHERE id = '{companyId}';
   ```

### Acciones Correctivas

```bash
# 1. Registrar el pago en el evento de bloqueo
# (Esto se hace automáticamente si el sistema de pagos está integrado)

# 2. Desbloquear empresa
curl -X POST http://localhost:6011/api/v1/licensing/support/company/{companyId}/unblock \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Pago verificado - Ref: {paymentReference} - Fecha: {paymentDate}",
    "notifyCustomer": true
  }'

# 3. Extender fecha de expiración si es necesario
curl -X PUT http://localhost:6011/api/v1/licensing/companies/{companyId} \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "ACTIVE",
    "expiresAt": "2025-05-01T00:00:00Z"
  }'
```

### Notificación al Cliente

El sistema envía notificación automática cuando `notifyCustomer: true`.

Template de email:
```
Asunto: Su licencia ha sido reactivada - ParkFlow

Estimado {customerName},

Su licencia ha sido reactivada exitosamente.

Detalles:
- Empresa: {companyName}
- Plan: {plan}
- Fecha de reactivación: {unblockedAt}
- Referencia: {reason}

Puede continuar usando el sistema normalmente.

Si tiene alguna pregunta, contáctenos al soporte.

Gracias,
Equipo ParkFlow
```

---

## Prevención y Monitoreo

### Alertas Automáticas

El sistema genera logs cuando:
1. Cliente paga pero sigue bloqueado
2. Múltiples dispositivos de una empresa se bloquean
3. Falsos positivos detectados
4. Bloqueos de Enterprise/PRO (alta prioridad)

### Métricas a Monitorear

| Métrica | Umbral de Alerta | Acción |
|---------|------------------|--------|
| Casos prioritarios sin resolver | > 3 | Escalar a manager |
| Falsos positivos / semana | > 5 | Revisar algoritmo |
| Tiempo promedio de resolución | > 24h | Optimizar proceso |
| Bloqueos por firma inválida | > 10% | Revisar proceso de generación |

### Mejores Prácticas

1. **Siempre documentar**
   - Notas en cada resolución
   - Causa raíz
   - Acción correctiva

2. **Marcar falsos positivos**
   - Ayuda a mejorar el algoritmo
   - Prioridad para equipo de desarrollo

3. **Comunicación proactiva**
   - Notificar clientes Enterprise inmediatamente
   - Ofrecer extensión de gracia temporal

4. **Escalamiento**
   - Enterprise/PRO: Resolver en < 4 horas
   - SYNC: Resolver en < 24 horas
   - LOCAL: Resolver en < 72 horas

---

## Contacto y Escalamiento

### Niveles de Soporte

| Nivel | Casos | Tiempo Respuesta |
|-------|-------|------------------|
| L1 | Consultas básicas, documentación | < 4 horas |
| L2 | Bloqueos, diagnóstico, resolución | < 1 hora |
| L3 | Falsos positivos, bugs, mejoras | < 24 horas |
| Manager | Enterprise crítico, escalaciones | < 30 min |

### Contactos

- **Soporte L2:** soporte@parkflow.com
- **Emergencias Enterprise:** +57-300-XXX-XXXX
- **Equipo Desarrollo:** dev@parkflow.com

---

## Actualizaciones del Runbook

Última actualización: Mayo 2026
Versión: 1.0

Para sugerencias o correcciones, crear PR en el repositorio.
