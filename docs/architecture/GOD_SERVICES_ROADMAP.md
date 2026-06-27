# God Services: Inventario y Roadmap de Descomposición

**Estado:** Documented but deferred (2026-06-27)  
**Total Services >200 lines:** 10+  
**Blockers:** None (low priority, not impacting new features)

---

## 📚 Introducción

Un **"God Service"** es una clase que hace demasiado (>5 métodos públicos, >200 líneas). Violaría Single Responsibility Principle.

**En ParkFlow:** 10+ servicios fueron identificados como candidatos a descomposición. **NO es urgente** porque:
- ✅ Módulos aún funcionan
- ✅ Nuevas features pueden agregar servicios adicionales sin toque
- ✅ Refactor de god services = esfuerzo sin ROI inmediato

**Estrategia:** Documentar aquí. Cuando se agregue feature a un god service, aprovechar para split.

---

## 📊 Inventario Completo

### P0 (Critical — descomponer ahora si se modifica)

#### 1. **CashSessionManagementService** (475 líneas)
**Ubicación:** `modules/cash/application/service/`

**Métodos públicos (7 — EXCEDE LÍMITE):**
1. `openSession(OpenCashRequest)`
2. `closeSession(UUID, CashCloseRequest)`
3. `submitCount(UUID, CashCountRequest)`
4. `getCurrentSession(String site, String terminal)`
5. `getSummary(UUID sessionId)`
6. `getAuditTrail(UUID sessionId)`
7. `reconcile(UUID sessionId, ReconcileRequest)`

**Problema:** Mezcla abrir, cerrar, contar y reconciliar.

**Propuesta de Split:**
```
✅ OpenCashSessionService (1 método: open)
✅ CloseCashSessionService (1 método: close)
✅ CashSessionQueryService (3 métodos: getCurrent, getSummary, getAuditTrail)
✅ CashReconciliationService (2 métodos: submitCount, reconcile)
```

**Impact:** 475 lines → 4 servicios × 120 líneas (mejor mantenibilidad)  
**Trigger:** Si se agregan features a cash (probabilidad: 60%)  
**Effort:** 4 horas (relocación, inyección, tests)

---

#### 2. **RegisterExitService** (465 líneas)
**Ubicación:** `modules/parking/operation/application/service/`

**Métodos públicos (6 — EXCEDE LÍMITE):**
1. `registerExit(ExitRequest)`
2. `calculatePrice(CalculationParams)`
3. `validateVehicle(String licensePlate)`
4. `generateReceipt(ParkingSession)`
5. `printTicket(Receipt)`
6. `recordPayment(Receipt, PaymentDetails)`

**Problema:** Validación, cálculo, recibo y pago en UNO.

**Propuesta de Split:**
```
✅ RegisterExitUseCase (1 método: execute)
   └─ coordina:
      - VehicleValidationService
      - PricingCalculationService
      - ReceiptGenerationService
      - PaymentRecordingService
```

**Impact:** 465 lines → 4 servicios (cada uno <150 líneas)  
**Trigger:** Si se agregan features a parking (probabilidad: 80%)  
**Effort:** 6 horas (cambios a interfaz de entrada)

---

#### 3. **LicenseAuditService** (402 líneas)
**Ubicación:** `modules/licensing/application/service/`

**Métodos públicos (6 — EXCEDE LÍMITE):**
1. `validateLicense(UUID companyId)`
2. `checkActivation(String deviceFingerprint)`
3. `logEvent(LicenseEvent)`
4. `generateReport(DateRange)`
5. `detectTamperingAttempts()`
6. `syncStatus(SyncRequest)`

**Problema:** Validación, auditoría, detección y sync mezclados.

**Propuesta de Split:**
```
✅ LicenseValidationService (2 métodos: validate, checkActivation)
✅ LicenseAuditService (2 métodos: logEvent, generateReport)
✅ LicenseTamperDetectionService (1 método: detectAttempts)
```

**Impact:** 402 lines → 3 servicios  
**Trigger:** Cuando se implemente "advanced tamper detection" (probabilidad: 40%)  
**Effort:** 3 horas

---

### P1 (Important — descomponer cuando haya oportunidad)

#### 4. **RatePricingService** (320 líneas)
**Ubicación:** `modules/parking/operation/application/service/`

**Métodos públicos (5 — EN LÍMITE):**
1. `calculatePrice(PricingContext)`
2. `applyDiscount(Rate, Discount)`
3. `calculateTax(BigDecimal amount)`
4. `roundPrice(BigDecimal price)`
5. `validatePrice(BigDecimal price)`

**Propuesta:** Si se agregan promo codes, split en:
```
✅ PricingCalculationService (1 método: calculate)
✅ PromoCodeService (2 métodos: apply, validate)
✅ TaxCalculationService (1 método: calculate)
```

**Trigger:** Cuando se implementen promociones (probabilidad: 70%)  
**Effort:** 2 horas

---

#### 5. **InvoiceGenerationService** (315 líneas)
**Ubicación:** `modules/billing/application/service/`

**Métodos públicos (4):**
1. `generateInvoice(InvoiceGenerationRequest)`
2. `updateInvoiceStatus(UUID, InvoiceStatus)`
3. `calculateTotals(InvoiceDto)`
4. `sendToExternalBilling(UUID invoiceId)`

**Propuesta:** Si se agregan múltiples formatos (PDF, XML, EDI):
```
✅ InvoiceGenerationService (1 método: generate)
✅ InvoiceFormattingService (3 métodos: asPdf, asXml, asEdi)
✅ BillingIntegrationService (1 método: sendExternal)
```

**Trigger:** Cuando se requieran formatos múltiples (probabilidad: 50%)  
**Effort:** 3 horas

---

#### 6. **PaymentProcessingService** (305 líneas)
**Ubicación:** `modules/parking/operation/application/service/`

**Métodos públicos (5):**
1. `processPayment(PaymentRequest)`
2. `validatePaymentMethod(PaymentMethod)`
3. `checkFraudSignals(Payment)`
4. `refund(UUID paymentId)`
5. `reconcileWithGateway(String transactionId)`

**Propuesta:** Si se agregan múltiples gateways:
```
✅ PaymentProcessingService (1 método: process)
✅ FraudDetectionService (1 método: check)
✅ RefundService (1 método: refund)
✅ GatewayReconciliationService (1 método: reconcile)
```

**Trigger:** Si fraudulencia se vuelve crítica (probabilidad: 30%)  
**Effort:** 4 horas

---

### P2 (Low — Considerar cuando sea convenient)

| Servicio | Líneas | Métodos | Propuesta | Trigger | Effort |
|----------|--------|---------|-----------|---------|--------|
| **SyncEventQueueService** | 280 | 4 | Split: Enqueue/Process/Publish | Mobile expansion | 2h |
| **ReportGenerationService** | 270 | 4 | Templatize: each report type | New report type | 2.5h |
| **AuditLoggingService** | 250 | 3 | Consolidation complete; monitor | Integration sprawl | 1.5h |
| **DeviceAuthorizationService** | 240 | 3 | Split: Authorize/Revoke/Query | Multi-device support | 1h |

---

## 🎯 Decisión: Por qué NO descomponer ahora

1. **Bajo acoplamiento:** Aunque grandes, son autoconsistentes
2. **Pocas dependencias cruzadas:** No bloquean otras features
3. **ROI negativo:** Tiempo de refactor > beneficio de mantenimiento
4. **Mejor trigger:** Cuando nueva feature require split natural
5. **Deuda técnica aceptable:** Documentada, no oculta

**Comparar:**
```
❌ Refactor god services ahora (6-8 horas)
   → Igual funcionalidad
   → Riesgo de regresiones
   → ROI: 0

✅ Documentar + agregar nueva feature (2-4 horas)
   → Funcionalidad nueva
   → Split natural durante desarrollo
   → ROI: +1 feature
```

---

## 🔄 Estrategia: Descomposición Incremental

### Cuando se agregue Feature X a God Service Y:

**Step 1:** Hacer feature sin tocar god service (if possible)

**Step 2:** Si god service ya toca límite, considerar split

**Example: Agregar promociones al pricing**

```
Antes:
  RatePricingService
  ├── calculatePrice(base)
  └── (365 líneas, 5 métodos)

Nueva feature: Promo codes

Opción A: Agregar a RatePricingService (❌)
  ├── calculatePrice(base) 
  ├── applyPromo(code)        ← +1 método (6 total)
  └── (420 líneas)

Opción B: Crear PromoCodeService (✅)
  ├── RatePricingService.calculate(base)
  └── PromoCodeService.apply(base, code)
       └── "Plugin" pattern, desacoplado
```

---

## 📋 Pre-commit Checklist: Detectar God Services

Cuando develops feature nueva, verifica:

```bash
# 1. Contar métodos públicos
grep -c "public " ServiceFile.java

# 2. Contar líneas
wc -l ServiceFile.java

# 3. Si >5 métodos Y >200 líneas:
#    → Abrir PR para descomposición
#    → O listar en GOD_SERVICES_ROADMAP.md
```

---

## 🚀 Roadmap de Descomposición (si ocurren triggers)

### Q3 2026 (Potencial)
- **CashSessionManagementService:** Si se agrega "advanced reconciliation"
- **RegisterExitService:** Si se agrega "batch exit processing"

### Q4 2026 (Potencial)
- **LicenseAuditService:** Si se agrega "tamper detection ML"
- **InvoiceGenerationService:** Si requieren "multi-format export"

### 2027+ (Potencial)
- **PaymentProcessingService:** Si fraudulencia se vuelve crítica
- **RatePricingService:** Si se agregan "dynamic pricing"

---

## ✅ Monitoreo

**Cada sprint, verificar:**

```
[ ] No new methods added to existing God Services
[ ] No God Services creados nuevos
[ ] Nuevas features crean servicios separados
[ ] Si un servicio toca >5 métodos → refactor plan creado
```

---

## 🔗 Véase También

- [HEXAGONAL_STRUCTURE.md](HEXAGONAL_STRUCTURE.md) — Cómo estructurar servicios pequeños
- [ANTIPATTERNS.md](ANTIPATTERNS.md) — Por qué >5 métodos es antipatrón
- [CLAUDE.md - Service Decomposition](../../CLAUDE.md) — Reglas mandatorias
- [STRUCTURAL_COMPLIANCE_REPORT.md](../STRUCTURAL_COMPLIANCE_REPORT.md) — Estado actual

---

## 📝 Plantilla: Documentar nuevo God Service

Si detectas otro:

```markdown
### Service Name (XXX líneas)
**Ubicación:** `modules/module/application/service/`

**Métodos públicos (N — EXCEDE/EN LÍMITE):**
1. ...
2. ...

**Problema:** 

**Propuesta de Split:**
\`\`\`
✅ ServiceA (N métodos)
✅ ServiceB (N métodos)
\`\`\`

**Trigger:** 

**Effort:**
```

---

**Última actualización:** 27 de junio de 2026  
**Próxima revisión:** Q3 2026 o cuando triggers ocurran
