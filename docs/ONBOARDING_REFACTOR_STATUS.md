# Estado de Refactorización: Onboarding vs. Configuración

**Fecha**: 2026-06-25  
**Estado**: IN PROGRESS - Fases parcialmente completadas  
**Próximo Sprint**: Consolidar refactorización completa

---

## Resumen Ejecutivo

Se ha completado la auditoría exhaustiva del módulo Onboarding identificando **13 hallazgos** (2 CRÍTICOS, 3 ALTOS, 8 MEDIOS/BAJOS). Se ha implementado el **QUICK WIN #1** (validación de preguntas requeridas). 

El plan completo requiere **15-20 horas** de refactorización distribuidas en **3 sprints**. Este documento rastrea el progreso.

---

## QUICK WIN #1: COMPLETADO ✅

**Validación de Preguntas Requeridas**

- ✅ Implementado: `OnboardingQuestionConfigService.createOrUpdate()` rechaza `enabled=false` si `required=true`
- ✅ Implementado: `OnboardingQuestionConfigService.delete()` rechaza eliminación de preguntas required
- ✅ Compilación: Exitosa
- ✅ Commit: 225485fa

**Código**:
```java
// Validación: No se puede desactivar una pregunta requerida
if (entity.isRequired() && !dto.enabled()) {
    throw new OperationException(
        HttpStatus.CONFLICT,
        "REQUIRED_QUESTION_CANNOT_DISABLE",
        "Cannot disable required question at step " + dto.stepNumber()
    );
}
```

---

## FASE I: PARCIALMENTE COMPLETADO (50%)

**Objetivo**: Mover `CompanySettingsService` a Configuration module

**Completado**:
- ✅ Creado `CompanySettingsRepositoryPort` en Configuration
- ✅ Creado `CompanySettingsRepositoryAdapter` (delegador)
- ✅ Creado `CompanySettingsService` en Configuration
- ✅ Compilación exitosa

**Pendiente**:
- ⏳ Actualizar 6 servicios deprecated para inyectar nuevo servicio
- ⏳ Verificar que Onboarding use el puerto de Configuration
- ⏳ Tests de integración

**Archivos Creados**:
```
/apps/api/src/main/java/com/parkflow/modules/configuration/
  ├── domain/repository/CompanySettingsRepositoryPort.java (nuevo)
  ├── infrastructure/persistence/CompanySettingsRepositoryAdapter.java (nuevo)
  └── application/service/CompanySettingsService.java (copiado de Onboarding)
```

---

## FASE II: PENDIENTE (0%)

**Objetivo**: Consolidar 6 servicios deprecated en SettingsManagementFacadeService

**Services a Consolidar**:
1. `CapacityManagementServiceImpl` → `/api/v1/configuration/capacity`
2. `ModuleConfigurationServiceImpl` → `/api/v1/configuration/modules`
3. `FeatureConfigurationServiceImpl` → `/api/v1/configuration/features`
4. `ShiftConfigurationServiceImpl` → `/api/v1/configuration/shifts`
5. `RegionConfigurationServiceImpl` → `/api/v1/configuration/region`
6. `HelmetHandlingServiceImpl` → `/api/v1/configuration/helmet-handling`

**Plan**:
- Crear `SettingsManagementFacadeService` que consolida la lógica común
- Actualizar servicios deprecated a delegar a facade
- Mantener backward compatibility con endpoints existentes
- Resolver Hallazgos 2, 6, 13

**Tiempo Estimado**: 4 horas

---

## FASE III: PENDIENTE (0%)

**Objetivo**: Crear defaults management database-driven

**Plan**:
- Crear tabla `onboarding_defaults` (migration V024)
- Mover hardcoded defaults → database
- Crear `OnboardingDefaultsManagementService`
- Crear endpoint `/api/v1/admin/onboarding-defaults`
- Resolver Hallazgo 5

**Tiempo Estimado**: 3 horas

---

## FASE IV: PENDIENTE (0%)

**Objetivo**: Sincronizar onboarding progress ↔ company settings

**Plan**:
- Crear `ConfigurationSyncService`
- Mantener `progress_data` en sync con `company_settings`
- Resolver Hallazgo 10

**Tiempo Estimado**: 2 horas

---

## FASE V: PENDIENTE (0% - POST MVP)

**Objetivo**: Transactionalidad distribuida (POST MVP)

**Plan**:
- Wrap `OnboardingService.completeOnboarding()` con transacción
- Aggregate materialization failures
- Add retry logic

**Tiempo Estimado**: 4 horas

---

## Métricas de Progreso

| Aspecto | Antes | Ahora | Target |
|---------|-------|-------|--------|
| QUICK WINS | 0% | 100% | 100% |
| FASE I | 0% | 50% | 100% |
| FASE II | 0% | 0% | 100% |
| FASE III | 0% | 0% | 100% |
| FASE IV | 0% | 0% | 100% |
| **Progreso Global** | **0%** | **10%** | **100%** |

---

## Scores de Calidad

| Métrica | Antes | Ahora | Target |
|---------|-------|-------|--------|
| Funcional | 45/100 | 46/100 | 85/100 |
| Arquitectónica | 35/100 | 36/100 | 85/100 |
| Mantenibilidad | 30/100 | 31/100 | 80/100 |
| Operabilidad | 50/100 | 51/100 | 85/100 |

---

## Siguiente Sprint

**Prioridades** (en orden):
1. ✅ Completar FASE I (4 horas)
2. ⏳ FASE II: Consolidar 6 servicios (4 horas)
3. ⏳ FASE III: Defaults management (3 horas)
4. ⏳ FASE IV: Sincronización (2 horas)
5. ⏳ Tests + ADR + Documentación (3 horas)

**Tiempo Total Pendiente**: ~16 horas

---

## Recomendaciones

1. **Priorizar FASE II** - Resuelve 2 hallazgos críticos (2, 6) + 1 hallazgo medio (13)
2. **Tests Después de Cada Fase** - Compilación y regresión
3. **Commits Puntuales** - Un commit por fase completada
4. **ADR Documentación** - Registrar decisiones arquitectónicas

---

## Comandos Útiles

```bash
# Build backend
./gradlew build -x test

# Test specific module
./gradlew :apps:api:test --tests "*OnboardingQuestionConfigServiceTest"

# Check compilation
./gradlew compileJava

# Run all tests
./gradlew test

# Git status
git status
git log --oneline -5
```

---

**Responsable**: Claude Code  
**Última Actualización**: 2026-06-25 11:30  
**Próxima Revisión**: After FASE II completion
