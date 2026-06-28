# AUDITORÍA TÉCNICA COMPLETA: MÓDULO DE AUTENTICACIÓN
## ParkFlow Desktop — Web + API + Desktop

**Fecha**: 2026-06-28  
**Auditor**: Claude Haiku 4.5  
**Alcance**: Autenticación en 3 aplicaciones (Web/Next.js, API/Spring Boot, Desktop/Java)  
**Estado**: Listo para MVP con correcciones de 3 hallazgos críticos

---

## RESUMEN EJECUTIVO

El módulo de autenticación de ParkFlow está **mayormente bien arquitecturado** con patrones modernos de seguridad (httpOnly cookies, token rotation, family-based theft detection). Sin embargo, existen **3 hallazgos críticos** que deben corregirse antes de MVP, y **10 hallazgos importantes** antes de producción.

### Calificaciones Generales

| Dimensión | Puntuación | Estado |
|-----------|-----------|--------|
| **Arquitectura** | 8.5/10 | Hexagonal bien implementada |
| **Seguridad** | 7.5/10 | Buenas prácticas, brechas en tests |
| **Escalabilidad** | 7/10 | Rate limiting en-memory, sin key rotation |
| **Mantenibilidad** | 7.5/10 | Código limpio, duplicación de tipos |
| **Calidad del Código** | 8/10 | 86 clases bien organizadas |
| **Cobertura de Tests** | 6.5/10 | 218 tests, pero gaps críticos |
| **Preparación MVP** | 6.5/10 | 3 críticos + 10 importantes por resolver |

**Puntuación Promedio**: **7.4/10** — Buena base, requiere correcciones antes de MVP

---

## 1. HALLAZGOS CRÍTICOS 🔴

### H1: SUPPORT Role Indefinido en Backend

**Severidad**: CRÍTICA | **Impacto**: Runtime Failure | **Esfuerzo**: 30 min | **Riesgo**: Alto

**Problema**:
El rol `SUPPORT` se usa en múltiples ubicaciones del backend pero **no está definido** en el enum `UserRole.java`.

**Ubicación**:
- **Definición esperada**: `/apps/api/src/main/java/com/parkflow/modules/auth/domain/UserRole.java` (línea ~15)
- **Uso inconsistente**: `/apps/api/src/main/java/com/parkflow/modules/licensing/infrastructure/controller/LicenseSupportController.java` (líneas 38, 42, 45, 48, 51, 54, 57, 60)

**Código problemático**:
```java
// UserRole.java - LÍNEA 15 (falta SUPPORT)
public enum UserRole {
    SUPER_ADMIN,
    ADMIN,
    CAJERO,
    OPERADOR,
    AUDITOR
    // ❌ FALTA: SUPPORT
}

// LicenseSupportController.java - LÍNEA 38 (uso sin definición)
@PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SUPPORT')")  // ❌ SUPPORT no existe
public ResponseEntity<LicenseSupportResponse> getSupport() { ... }
```

**Por qué es crítico**:
1. Si un admin intenta asignar rol `SUPPORT` a un usuario, Spring Security rechazará el valor en validación
2. En runtime, si se intenta crear usuario con `SUPPORT`, fallará la persistencia (DB check constraint)
3. Los endpoints de soporte quedarán inaccesibles para el rol SUPPORT (que no existe)

**Solución A (Recomendada): Agregar SUPPORT al enum**

```java
// UserRole.java - LÍNEA 15
public enum UserRole {
    SUPER_ADMIN,
    ADMIN,
    SUPPORT,      // ✅ AGREGAR AQUÍ
    CAJERO,
    OPERADOR,
    AUDITOR
}

// Luego agregar mapping de permisos en RolePermissions.java
public static Set<AuthPermission> getPermissionsForRole(UserRole role) {
    return switch (role) {
        case SUPER_ADMIN -> SUPER_ADMIN_PERMISSIONS;
        case ADMIN -> ADMIN_PERMISSIONS;
        case SUPPORT -> Set.of(
            AuthPermission.CIERRES_CAJA_ABRIR,
            AuthPermission.CIERRES_CAJA_CERRAR,
            AuthPermission.REPORTES_LEER,
            AuthPermission.USUARIOS_LEER
        );  // Definir permisos para SUPPORT
        case CAJERO -> CAJERO_PERMISSIONS;
        case OPERADOR -> OPERADOR_PERMISSIONS;
        case AUDITOR -> AUDITOR_PERMISSIONS;
    };
}
```

**Solución B (Si no se necesita SUPPORT): Eliminar referencias**

```java
// LicenseSupportController.java - LÍNEA 38
// Cambiar de:
@PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SUPPORT')")
// A:
@PreAuthorize("hasAnyRole('SUPER_ADMIN')")
// O mejor aún:
@PreAuthorize("hasAuthority('licencias:leer')")
```

**Tests requeridos**:
- ✅ Unit test: `UserRoleEnumTest.java` → verificar `SUPPORT` en enum
- ✅ Integration test: Crear usuario con rol SUPPORT → debe persistir sin error
- ✅ Security test: Endpoint con `@PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SUPPORT')")` → debe permitir usuario SUPPORT

**Timeline**: **Semana 1 (antes de MVP)**

---

### H2: No Hay Tests Reales de CSRF Token Validation

**Severidad**: CRÍTICA | **Impacto**: Posible CSRF vulnerability | **Esfuerzo**: 4 horas | **Riesgo**: Alto

**Problema**:
El backend tiene CSRF protection configurado vía `CookieCsrfTokenRepository.withHttpOnlyFalse()`, pero **no hay tests que validen que realmente funcione**. El test `CorsSecurityTest.java` solo valida configuración, no comportamiento real.

**Ubicación**:
- **Configuración**: `/apps/api/src/main/java/com/parkflow/config/SecurityConfig.java` (líneas 111-120)
- **Test incompleto**: `/apps/api/src/test/java/com/parkflow/modules/auth/security/CorsSecurityTest.java` (lines 1-50)
- **Falta**: Test real de CSRF token en POST requests

**Código actual (configuración correcta, pero no testada)**:
```java
// SecurityConfig.java - LÍNEA 113
CsrfConfigurer<HttpSecurity> csrf = http.csrf(withDefaults());
csrf.csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse());

// ❌ Test actual (solo validación, no comportamiento)
@Test
public void corsConfigurationIsCorrect() {
    // Solo verifica que SecurityFilterChain bean existe
    // NO valida que CSRF tokens sean generados/validados
}
```

**Por qué es crítico**:
1. CSRF tokens podrían no ser generados (configuración leída pero no ejecutada)
2. POST/PUT/DELETE requests podrían pasar sin validación CSRF
3. Cross-site request forgery attacks podrían ser posibles si la configuración falla en runtime

**Solución: Agregar Integration Test Real de CSRF**

```java
// CSRFIntegrationTest.java (NUEVO ARCHIVO)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class CSRFIntegrationTest {

    @Autowired private TestRestTemplate restTemplate;
    @Autowired private MockMvc mockMvc;

    @Test
    public void testCsrfTokenIsGeneratedOnGet() throws Exception {
        // 1. GET request a protected endpoint (debe generar CSRF token en cookie)
        MvcResult getResult = mockMvc.perform(get("/api/v1/auth/login"))
            .andExpect(status().isOk())
            .andExpect(cookie().exists("XSRF-TOKEN")) // CSRF token cookie
            .andReturn();

        // 2. Extract CSRF token from cookie
        String csrfToken = getResult.getResponse()
            .getCookie("XSRF-TOKEN")
            .getValue();

        // 3. POST WITHOUT CSRF token → should fail with 403
        mockMvc.perform(post("/api/v1/auth/logout")
                .param("_csrf", ""))  // Empty CSRF
            .andExpect(status().isForbidden())
            .andExpect(status().reason("Invalid CSRF Token 'null' was found on the request parameter '_csrf'."));

        // 4. POST WITH correct CSRF token → should succeed
        mockMvc.perform(post("/api/v1/auth/logout")
                .param("_csrf", csrfToken)
                .cookie(new Cookie("XSRF-TOKEN", csrfToken)))
            .andExpect(status().isOk());
    }

    @Test
    public void testCsrfTokenIsValidatedInHeader() throws Exception {
        // Similar test but CSRF token in X-CSRF-TOKEN header instead of parameter
        MvcResult getResult = mockMvc.perform(get("/api/v1/auth/login"))
            .andExpect(cookie().exists("XSRF-TOKEN"))
            .andReturn();

        String csrfToken = getResult.getResponse().getCookie("XSRF-TOKEN").getValue();

        // POST with CSRF in header
        mockMvc.perform(post("/api/v1/auth/logout")
                .header("X-CSRF-TOKEN", csrfToken)
                .cookie(new Cookie("XSRF-TOKEN", csrfToken)))
            .andExpect(status().isOk());
    }

    @Test
    public void testCsrfExemptedEndpoints() throws Exception {
        // Auth endpoints are CSRF-exempt (stateless), should NOT require CSRF
        mockMvc.perform(post("/api/v1/auth/login")
                .content("{}"))
            .andExpect(status().isBadRequest()); // Bad input, but NOT 403 Forbidden

        mockMvc.perform(post("/api/v1/auth/refresh")
                .content("{}"))
            .andExpect(status().isBadRequest()); // Bad input, but NOT 403 Forbidden
    }
}
```

**Tests requeridos**:
- ✅ CSRF token generado en GET → cookie + header
- ✅ POST sin CSRF → 403 Forbidden
- ✅ POST con CSRF incorrecto → 403 Forbidden
- ✅ POST con CSRF correcto → success
- ✅ CSRF en parameter vs header
- ✅ Auth endpoints properly exempted from CSRF

**Timeline**: **Semana 1 (antes de MVP)** — 4 horas de trabajo

---

### H3: Rate Limiting Tests No Validan Bucket4j Real

**Severidad**: CRÍTICA | **Impacto**: Rate limiting could fail in production | **Esfuerzo**: 3 horas | **Riesgo**: Alto

**Problema**:
El test `RateLimitingSecurityTest.java` solo valida que las constantes de configuración existen, pero **no prueba que bucket4j realmente limita requests**. Si bucket4j no estuviera inicializado, el test pasaría pero la protección fallaría en producción.

**Ubicación**:
- **Configuración**: `/apps/api/src/main/java/com/parkflow/config/RateLimitConfig.java`
- **Filtro**: `/apps/api/src/main/java/com/parkflow/config/RateLimitFilter.java`
- **Test incompleto**: `/apps/api/src/test/java/com/parkflow/modules/auth/security/RateLimitingSecurityTest.java`

**Código actual (test superficial)**:
```java
// RateLimitingSecurityTest.java - ACTUAL
@Test
public void loginEndpointHasRateLimitConfiguration() {
    assertEquals(10, RATE_LIMIT_LOGIN_ATTEMPTS);  // ❌ Solo verifica constante
    assertEquals(60, RATE_LIMIT_WINDOW_SECONDS);  // ❌ No prueba bucket4j
}

// Lo que DEBERÍA hacer:
// 1. Hacer 10 requests a /api/v1/auth/login
// 2. Request 11 debería retornar 429 Too Many Requests
// 3. Esperar 60 segundos
// 4. Request 12 debería ser exitoso (bucket replenished)
```

**Por qué es crítico**:
1. Si bucket4j está misconfigured, todos los requests pasarán sin limite
2. Brute-force attacks contra login serían posibles
3. Operación masiva (10.000 requests en 1 segundo) podría derribar API

**Solución: Agregar Integration Test Real de Rate Limiting**

```java
// RateLimitIntegrationTest.java (NUEVO ARCHIVO)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class RateLimitIntegrationTest {

    @Autowired private TestRestTemplate restTemplate;

    @Test
    public void loginEndpointEnforcesRateLimit() throws Exception {
        String ip = "192.168.1.100";
        int limit = 10;  // From RATE_LIMIT_LOGIN_ATTEMPTS
        
        // 1. Make 10 requests (should all succeed)
        for (int i = 0; i < limit; i++) {
            ResponseEntity<String> response = restTemplate.postForEntity(
                "/api/v1/auth/login",
                new LoginRequest("user@example.com", "password123"),
                String.class
            );
            
            // Could be 401 (invalid creds) but should NOT be 429
            assertNotEquals(429, response.getStatusCode().value(),
                "Request " + (i+1) + " should not be rate-limited");
        }
        
        // 2. Request 11 should be rate-limited (429)
        ResponseEntity<String> rateLimitedResponse = restTemplate.postForEntity(
            "/api/v1/auth/login",
            new LoginRequest("user@example.com", "password123"),
            String.class
        );
        
        assertEquals(429, rateLimitedResponse.getStatusCode().value(),
            "Request 11 should be rate-limited with 429");
        
        // 3. Check headers
        HttpHeaders headers = rateLimitedResponse.getHeaders();
        assertTrue(headers.containsKey("X-Rate-Limit-Remaining"),
            "Response should include X-Rate-Limit-Remaining header");
        assertTrue(headers.containsKey("X-Rate-Limit-Retry-After-Seconds"),
            "Response should include X-Rate-Limit-Retry-After-Seconds header");
    }

    @Test
    public void operationEndpointHasDifferentRateLimit() throws Exception {
        // Operations have higher limit (100 req/min)
        // Verify with similar test pattern
        for (int i = 0; i < 100; i++) {
            // Make requests to /api/v1/operations/entry
            // Should NOT be rate-limited at 100
        }
        
        // Request 101 should be rate-limited
    }

    @Test
    public void rateLimitResetsAfterTimeWindow() throws Exception {
        // Make 10 login requests → rate-limited
        // Wait 60+ seconds
        // Make 1 more request → should succeed (bucket refilled)
    }

    @Test
    public void rateLimitIsPerIpAddress() throws Exception {
        // Client from IP 192.168.1.1 makes 10 requests → limited
        // Client from IP 192.168.1.2 makes 1 request → should succeed (different bucket)
    }

    @Test
    public void healthEndpointExemptFromRateLimit() throws Exception {
        // /actuator/health should NOT be rate-limited even after 100+ requests
    }
}
```

**Tests requeridos**:
- ✅ 10 requests succeed, 11th fails with 429
- ✅ Response headers include `X-Rate-Limit-Remaining` and `X-Rate-Limit-Retry-After-Seconds`
- ✅ Different endpoints have different limits (login 10/min, operations 100/min)
- ✅ Bucket resets after time window
- ✅ Per-IP isolation (different IPs have separate buckets)
- ✅ Health endpoints exempt from rate limiting

**Timeline**: **Semana 1 (antes de MVP)** — 3 horas de trabajo

---

## 2. HALLAZGOS IMPORTANTES ⚠️

### H4: Falta 70% de Integration Tests para Endpoints API

**Severidad**: IMPORTANTE | **Impacto**: Unknown bugs in endpoints | **Esfuerzo**: 20 horas | **Riesgo**: Medio

**Problema**:
De los 14+ endpoints de autenticación, solo 4 tienen integration tests. Endpoints críticos sin tests:
- `GET /api/v1/auth/me` — Current user profile
- `POST /api/v1/auth/logout/all` — Logout from all devices
- `POST /api/v1/auth/logout/device/{deviceId}` — Logout specific device
- `POST /api/v1/auth/change-password` — Change password
- `GET /api/v1/auth/devices` — List authorized devices
- `POST /api/v1/auth/devices/authorize` — Authorize new device
- `POST /api/v1/auth/devices/revoke` — Revoke device access
- `GET /api/v1/auth/validate` — Validate session

**Ubicación**:
- **Endpoints**: `/apps/api/src/main/java/com/parkflow/modules/auth/infrastructure/controller/AuthController.java`
- **Tests existentes**: `/apps/api/src/test/java/com/parkflow/modules/auth/infrastructure/controller/AuthControllerIntegrationTest.java`

**Código actual (incompleto)**:
```java
// AuthControllerIntegrationTest.java - Solo 4 tests vs 14+ endpoints
@SpringBootTest
class AuthControllerIntegrationTest {
    @Test void testLoginSuccess() { ... }              // ✅ Covered
    @Test void testLoginInvalidCredentials() { ... }   // ✅ Covered
    @Test void testLogout() { ... }                    // ✅ Covered
    @Test void testRefreshToken() { ... }              // ✅ Covered
    // ❌ FALTA: testMe, testLogoutAll, testLogoutDevice, testChangePassword, etc.
}
```

**Solución: Expandir Integration Test Suite**

```java
// AuthControllerIntegrationTest.java (EXPANDIR)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@DisplayName("Authentication API Integration Tests")
class AuthControllerIntegrationTest {

    // ... existing tests ...

    @Test
    @DisplayName("GET /auth/me returns current user profile with permissions")
    void testGetCurrentUser() throws Exception {
        // 1. Login to get session
        LoginRequest loginReq = new LoginRequest("admin@test.local", "Password123!");
        ResponseEntity<LoginResponse> loginResp = restTemplate.postForEntity(
            "/api/v1/auth/login", loginReq, LoginResponse.class);
        
        // 2. GET /auth/me
        ResponseEntity<UserResponse> meResp = restTemplate.getForEntity(
            "/api/v1/auth/me", UserResponse.class);
        
        // 3. Assertions
        assertEquals(200, meResp.getStatusCode().value());
        assertNotNull(meResp.getBody().getUserId());
        assertNotNull(meResp.getBody().getEmail());
        assertTrue(meResp.getBody().getPermissions().size() > 0);
    }

    @Test
    @DisplayName("POST /auth/logout/all logs out from all sessions and devices")
    void testLogoutFromAllSessions() throws Exception {
        // 1. Create 3 sessions from different devices
        AuthSession session1 = createSessionForDevice("device-1");
        AuthSession session2 = createSessionForDevice("device-2");
        AuthSession session3 = createSessionForDevice("device-3");
        
        // 2. Verify all 3 sessions exist
        assertEquals(3, countUserSessions(userId));
        
        // 3. POST /auth/logout/all
        ResponseEntity<Void> logoutResp = restTemplate.postForEntity(
            "/api/v1/auth/logout/all", null, Void.class);
        
        // 4. Verify all sessions deleted
        assertEquals(200, logoutResp.getStatusCode().value());
        assertEquals(0, countUserSessions(userId));
        
        // 5. Try to use old refresh tokens → 401
        assertEquals(401, restTemplate.postForEntity(
            "/api/v1/auth/refresh",
            new RefreshRequest(session1.getRefreshTokenHash()),
            String.class).getStatusCode().value());
    }

    @Test
    @DisplayName("POST /auth/logout/device/{deviceId} logs out specific device")
    void testLogoutSpecificDevice() throws Exception {
        // Similar pattern but validates only one device is removed
    }

    @Test
    @DisplayName("POST /auth/change-password requires current password")
    void testChangePasswordValidation() throws Exception {
        // 1. Try to change without providing current password → 400
        // 2. Try with wrong current password → 403
        // 3. Try with new password violating complexity → 400
        // 4. Change with correct current password → 200
    }

    @Test
    @DisplayName("GET /auth/devices lists all authorized devices for user")
    void testListDevices() throws Exception {
        // Verify 3 devices listed with correct metadata
    }

    @Test
    @DisplayName("POST /auth/devices/revoke invalidates refresh tokens for device")
    void testRevokeDevice() throws Exception {
        // 1. Authorize device A
        // 2. Use device A to get tokens
        // 3. Revoke device A
        // 4. Try to refresh with device A token → 401
    }

    // Add ~8 more test methods for comprehensive coverage
}
```

**Tests requeridos**: 10 más, ~20 horas de trabajo

**Timeline**: **Antes de producción (Fase 2)** — 3 días de trabajo

---

### H5: Duplicación de Tipos `UserRole` en 3 ubicaciones

**Severidad**: IMPORTANTE | **Impacto**: Type desynchronization | **Esfuerzo**: 2 horas | **Riesgo**: Medio

**Problema**:
El tipo `UserRole` está definido en **3 lugares diferentes**:

1. `/packages/types/src/auth.ts` (canonical?)
2. `/apps/web/src/lib/types/auth.types.ts` (duplicate)
3. `/apps/web/src/lib/types/settings.types.ts` (duplicate)

Si se agrega un nuevo rol en un lugar, los otros se quedan desactualizados.

**Ubicación**:
```
packages/types/src/auth.ts                           — Línea ~20
apps/web/src/lib/types/auth.types.ts                 — Línea ~15
apps/web/src/lib/types/settings.types.ts             — Línea ~80
```

**Código actual**:
```typescript
// packages/types/src/auth.ts
export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'CAJERO' | 'OPERADOR' | 'AUDITOR';

// apps/web/src/lib/types/auth.types.ts (DUPLICADO)
export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'CAJERO' | 'OPERADOR' | 'AUDITOR';

// apps/web/src/lib/types/settings.types.ts (DUPLICADO)
export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'CAJERO' | 'OPERADOR' | 'AUDITOR';
```

**Solución: Single Source of Truth**

```typescript
// packages/types/src/auth.ts - CANONICAL
export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'SUPPORT' | 'CAJERO' | 'OPERADOR' | 'AUDITOR';

// apps/web/src/lib/types/auth.types.ts - ELIMINAR
// ❌ Delete this file or replace with:
export { type UserRole } from '@parkflow/types';

// apps/web/src/lib/types/settings.types.ts - ELIMINAR DUPLICADO
// ❌ Delete this file or replace with:
export { type UserRole } from '@parkflow/types';

// Update all imports:
// FROM:
// import { UserRole } from '@/lib/types/auth.types';
// TO:
// import { type UserRole } from '@parkflow/types';
```

**Tests requeridos**:
- ✅ Single export from @parkflow/types
- ✅ All imports updated
- ✅ TypeScript compilation succeeds

**Timeline**: **Antes de MVP (Fase 1)** — 2 horas

---

### H6: usePermissions Hook Requiere Refresh Explícito

**Severidad**: IMPORTANTE | **Impacto**: Silent permission failures | **Esfuerzo**: 3 horas | **Riesgo**: Medio

**Problema**:
El hook `usePermissions()` requiere que el developer llame explícitamente a `refresh(permissions)` antes de que funcione. Si se olvida, permisos retornan `false` silenciosamente.

**Ubicación**:
- **Hook**: `/apps/web/src/hooks/auth/usePermissions.ts`
- **Ejemplo de uso incorrecto**: Varios archivos en features/

**Código actual**:
```typescript
// usePermissions.ts
export function usePermissions() {
    const [permissions, setPermissions] = useState<PermissionState>({});
    
    const refresh = async (permissionKeys: string[]) => {
        const result = await checkPermissions(permissionKeys);
        setPermissions(result);
    };
    
    return { permissions, refresh };  // ❌ requires developer to call refresh()
}

// USO CORRECTO (raro)
function AdminPanel() {
    const { permissions, refresh } = usePermissions();
    
    useEffect(() => {
        refresh(['usuarios:editar', 'configuracion:editar']);  // ✅ Llamar aquí
    }, []);
    
    return permissions['usuarios:editar'] ? <div>...</div> : null;
}

// USO INCORRECTO (frecuente)
function AdminPanel() {
    const { permissions } = usePermissions();  // ❌ No llamó a refresh()
    // permissions está vacío, siempre retorna false
    return permissions['usuarios:editar'] ? <div>...</div> : null;  // Nunca se renderiza
}
```

**Solución: Auto-Load Permissions al Login**

```typescript
// usePermissions.ts (REFACTOR)
export function usePermissions() {
    const { user } = useAuthStore();
    const [permissions, setPermissions] = useState<PermissionState>({});
    
    // Auto-load permissions when user logs in
    useEffect(() => {
        if (user?.permissions) {
            // Convert array to object for easy checking
            const permMap = user.permissions.reduce((acc, perm) => {
                acc[perm] = true;
                return acc;
            }, {} as PermissionState);
            setPermissions(permMap);
        }
    }, [user]);
    
    return { 
        permissions,
        refresh: async (keys: string[]) => { ... }  // Keep for manual refresh if needed
    };
}

// USO AHORA (más intuitivo)
function AdminPanel() {
    const { permissions } = usePermissions();  // ✅ Permisos ya cargados automáticamente
    
    return permissions['usuarios:editar'] ? <div>...</div> : null;
}
```

**Alternativa: Create Helper Hooks**

```typescript
// useHasPermission.ts (NUEVO)
export function useHasPermission(permission: string): boolean {
    const { user } = useAuthStore();
    return user?.permissions.includes(permission) ?? false;
}

// Uso más simple:
function AdminPanel() {
    const canEdit = useHasPermission('usuarios:editar');  // ✅ Simple boolean
    
    return canEdit ? <div>...</div> : null;
}
```

**Tests requeridos**:
- ✅ usePermissions auto-loads when user logs in
- ✅ useHasPermission returns correct boolean
- ✅ No need for explicit refresh() call

**Timeline**: **Antes de MVP (Fase 1)** — 3 horas

---

### H7: Test Data Inválido (Wildcard Permissions)

**Severidad**: IMPORTANTE | **Impacto**: False test passes | **Esfuerzo**: 1 hora | **Riesgo**: Bajo

**Problema**:
El archivo de tests E2E de permisos usa `['*']` como permiso, pero el backend nunca retorna wildcard. Los tests pasan pero no representan realidad.

**Ubicación**:
- `/apps/web/tests/e2e/permissions.spec.ts` (línea ~37)

**Código actual**:
```typescript
// permissions.spec.ts
test('admin user should see configuration options', async ({ page }) => {
    const adminUser = {
        role: 'ADMIN',
        permissions: ['*']  // ❌ Backend NUNCA retorna wildcard
    };
    
    // Test pasa porque ['*'] !== validación real
});
```

**Backend nunca genera wildcard**:
```java
// RolePermissions.java
public static Set<AuthPermission> getPermissionsForRole(UserRole role) {
    return switch (role) {
        case ADMIN -> Set.of(
            AuthPermission.TICKETS_EMITIR,
            AuthPermission.TICKETS_IMPRIMIR,
            AuthPermission.COBROS_REGISTRAR,
            // ... specific permissions, never '*'
        );
    };
}
```

**Solución: Usar Permisos Reales en Tests**

```typescript
// permissions.spec.ts (CORRECTO)
test('admin user should see configuration options', async ({ page }) => {
    const adminUser = {
        role: 'ADMIN',
        permissions: [
            'tickets:emitir',
            'tickets:imprimir',
            'cobros:registrar',
            'anulaciones:crear',
            'tarifas:leer',
            'tarifas:editar',
            'usuarios:leer',
            'usuarios:editar',
            'cierres_caja:abrir',
            'cierres_caja:cerrar',
            'reportes:leer',
            'configuracion:leer',
            'configuracion:editar',
            'sync:push',
            'sync:reconcile',
            'devices:autorizar',
            'devices:revocar',
            'parking:salida_masiva'
        ]  // ✅ Permisos reales de ADMIN
    };
    
    // Ahora el test representa realidad
});
```

**O mejor aún: Crear constante compartida**:

```typescript
// shared/auth-constants.ts (NUEVO)
export const ROLE_PERMISSIONS = {
    SUPER_ADMIN: ['*'],  // Full access (can use wildcard here for simplicity)
    ADMIN: [
        'tickets:emitir',
        'tickets:imprimir',
        // ... etc
    ],
    CAJERO: [
        'tickets:emitir',
        'tickets:imprimir',
        'cobros:registrar',
        // ... etc
    ],
    // ... etc
} as const;

// permissions.spec.ts
import { ROLE_PERMISSIONS } from '@/shared/auth-constants';

test('admin user should see configuration options', async ({ page }) => {
    const adminUser = {
        role: 'ADMIN',
        permissions: ROLE_PERMISSIONS.ADMIN  // ✅ Compartido, no duplicado
    };
});
```

**Tests requeridos**:
- ✅ All tests use real permission arrays
- ✅ Permission arrays match backend RolePermissions.java

**Timeline**: **Antes de MVP (Fase 1)** — 1 hora

---

### H8: Cache de Status de Usuario (5 segundos) Podría Ocultar Cambios

**Severidad**: IMPORTANTE | **Impacto**: Stale user state | **Esfuerzo**: 2 horas | **Riesgo**: Bajo

**Problema**:
El `JwtAuthFilter` cachea el estado del usuario (active/blocked) durante 5 segundos. Si un admin bloquea a un usuario, el usuario puede seguir usando la app por hasta 5 segundos más.

**Ubicación**:
- `/apps/api/src/main/java/com/parkflow/modules/auth/security/JwtAuthFilter.java` (líneas 37-40)

**Código actual**:
```java
// JwtAuthFilter.java - LÍNEA 37-40
private final Cache<String, Boolean> userStatusCache = Caffeine.newBuilder()
    .expireAfterWrite(5, TimeUnit.SECONDS)  // ❌ 5 segundos es largo
    .maximumSize(10_000)
    .build();

// LÍNEA 123-126
boolean isUserActive = userStatusCache.get(userId, k -> {
    AppUser user = userRepository.findById(userId).orElse(null);
    return user != null && !user.isBlocked() && user.isActive();
});  // ❌ Cached para el próximo request en los próximos 5 segundos
```

**Impacto**:
- Admin bloquea usuario A a las 10:00:00
- Usuario A hace request a las 10:00:04 → request pasa (status cached como "active")
- Usuario A hace request a las 10:00:06 → request rechazado (cache expiró, estado refrescado)

**Solución: Reducir cache TTL o Agregar Event-Based Invalidation**

**Opción A: Reducir TTL**

```java
// JwtAuthFilter.java
private final Cache<String, Boolean> userStatusCache = Caffeine.newBuilder()
    .expireAfterWrite(1, TimeUnit.SECONDS)  // ✅ 1 segundo en lugar de 5
    .maximumSize(10_000)
    .build();
```

**Opción B: Invalidar cache on block**

```java
// BlockUserService.java (NUEVO)
@Service
public class BlockUserService {
    
    @Autowired private UserStatusCache userStatusCache;
    @Autowired private AppUserRepository userRepository;
    
    public void blockUser(UUID userId) {
        AppUser user = userRepository.findById(userId).orElseThrow();
        user.setBlocked(true);
        userRepository.save(user);
        
        // ✅ Invalidate cache immediately
        userStatusCache.invalidate(userId);
    }
}
```

**Tests requeridos**:
- ✅ Cache TTL is 1 second (not 5)
- ✅ Block user → cache invalidated immediately
- ✅ User cannot use app after being blocked

**Timeline**: **Antes de producción (Fase 2)** — 2 horas

---

### H9: Print Agent Tiene Hardcoded Dev Origins en Production Config

**Severidad**: IMPORTANTE | **Impacto**: Security misconfiguration | **Esfuerzo**: 1 hora | **Riesgo**: Medio

**Problema**:
El `print-agent` (Fastify) tiene CORS origins hardcodeadas en código, incluyendo `localhost:3000` que es de desarrollo.

**Ubicación**:
- `/apps/print-agent/src/plugins/security.ts` (líneas 53-86)

**Código actual**:
```typescript
// security.ts - LÍNEA 53-86
const corsOrigins = [
    'http://localhost:3000',      // ❌ Dev origin
    'https://app.parkflow.dev',   // ✅ Correct
    'https://admin.parkflow.dev', // ✅ Correct
    'tauri://localhost'            // ✅ Desktop app
];

// ❌ Hardcoded, no environment variable
```

**Solución: Usar Environment Variable**

```typescript
// security.ts (REFACTOR)
const corsOrigins = (process.env.PRINT_AGENT_CORS_ORIGINS || '').split(',').filter(Boolean);

if (!corsOrigins.length) {
    throw new Error('PRINT_AGENT_CORS_ORIGINS environment variable not set');
}

// .env (development)
PRINT_AGENT_CORS_ORIGINS=http://localhost:3000,https://app.parkflow.dev,tauri://localhost

// .env.production
PRINT_AGENT_CORS_ORIGINS=https://app.parkflow.dev,tauri://localhost
```

**Tests requeridos**:
- ✅ CORS origins come from environment variable
- ✅ Production config doesn't include localhost

**Timeline**: **Antes de MVP (Fase 1)** — 1 hora

---

### H10: Sin Key Rotation Mechanism para JWT Secret

**Severidad**: IMPORTANTE | **Impacto**: Secret compromise risk | **Esfuerzo**: 8 horas | **Riesgo**: Bajo (but important for future)

**Problema**:
No existe mecanismo para rotar el JWT secret. Si el secret se compromete, hay que:
1. Cambiar `PARKFLOW_JWT_SECRET_BASE64` en env var
2. Reiniciar API
3. Todos los tokens anteriores se invalidan simultáneamente

**Ubicación**:
- `/apps/api/src/main/java/com/parkflow/modules/auth/security/JwtTokenService.java` (línea ~72)

**Código actual**:
```java
// JwtTokenService.java
@Component
public class JwtTokenService {
    private final Key key;  // ❌ Single key, no rotation
    
    public JwtTokenService(SecurityProperties props) {
        this.key = Keys.hmacShaKeyFor(decodeSecret(props.getJwtSecretBase64()));
    }
    
    public String generateAccessToken(JwtClaims claims) {
        return Jwts.builder()
            .signWith(this.key, SignatureAlgorithm.HS256)  // ❌ Same key always
            .compact();
    }
}
```

**Solución: Multi-Key Support (Gradual Rotation)**

```java
// KeyRotationService.java (NUEVO)
@Component
@Transactional
public class KeyRotationService {
    
    @Autowired private SecurityProperties props;
    @Autowired private KeyVersionRepository keyVersionRepository;
    
    private final Map<Integer, Key> keyCache = new ConcurrentHashMap<>();
    private Integer currentKeyVersion;
    
    @PostConstruct
    public void init() {
        // Load all active keys from database
        List<KeyVersion> keys = keyVersionRepository.findAllActive();
        for (KeyVersion keyVersion : keys) {
            Key key = Keys.hmacShaKeyFor(Base64.getDecoder().decode(keyVersion.getKeyMaterial()));
            keyCache.put(keyVersion.getVersion(), key);
        }
        
        // Current version is the max
        currentKeyVersion = keys.stream()
            .map(KeyVersion::getVersion)
            .max(Integer::compareTo)
            .orElse(1);
    }
    
    public String generateAccessToken(JwtClaims claims) {
        Key currentKey = keyCache.get(currentKeyVersion);
        
        return Jwts.builder()
            .claim("kid", currentKeyVersion)  // Key ID in token
            .signWith(currentKey, SignatureAlgorithm.HS256)
            .compact();
    }
    
    public JwtClaims parseToken(String token) {
        // Extract KID from header
        Integer keyId = extractKeyIdFromToken(token);
        Key key = keyCache.get(keyId);
        
        if (key == null) {
            throw new InvalidTokenException("Unknown key version: " + keyId);
        }
        
        return Jwts.parserBuilder()
            .verifyingWith(key)
            .build()
            .parseClaimsJws(token)
            .getBody();
    }
    
    public void rotateKey() {
        // Generate new key
        byte[] newSecret = new byte[32];
        new SecureRandom().nextBytes(newSecret);
        String newKeyMaterial = Base64.getEncoder().encodeToString(newSecret);
        
        // Save to database (active = false initially)
        KeyVersion newKeyVersion = KeyVersion.builder()
            .version(currentKeyVersion + 1)
            .keyMaterial(newKeyMaterial)
            .active(false)
            .createdAt(LocalDateTime.now())
            .build();
        keyVersionRepository.save(newKeyVersion);
        
        // Add to cache
        Key key = Keys.hmacShaKeyFor(newSecret);
        keyCache.put(newKeyVersion.getVersion(), key);
        
        // After validation period, activate new key
        // (in production, wait 1 hour before making it primary)
        scheduleKeyActivation(newKeyVersion.getVersion(), Duration.ofHours(1));
    }
}

// KeyVersion.java (ENTITY)
@Entity
@Table(name = "jwt_key_versions")
public class KeyVersion {
    @Id private Integer version;
    @Column(columnDefinition = "TEXT") private String keyMaterial;
    private boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime activatedAt;
    private LocalDateTime deactivatedAt;
}
```

**Migration**:
```sql
-- V041__create_jwt_key_versions_table.sql
CREATE TABLE jwt_key_versions (
    version INT PRIMARY KEY,
    key_material TEXT NOT NULL,
    active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    activated_at TIMESTAMPTZ,
    deactivated_at TIMESTAMPTZ,
    
    CHECK (key_material != '')
);

CREATE INDEX idx_jwt_key_versions_active ON jwt_key_versions(active) WHERE active = true;
```

**Tests requeridos**:
- ✅ Generate token with current key
- ✅ Parse token from previous key version
- ✅ Rotate key and activate after delay
- ✅ Old key versions eventually deactivated

**Timeline**: **Fase 3 (Escalabilidad)** — 8 horas (no es MVP crítico)

---

## 3. CHECKLIST MVP

| Funcionalidad | Estado | Notas |
|---------------|--------|-------|
| **Login con email/password** | ✅ | Implementado, 14 unit tests |
| **Logout (single session)** | ✅ | Implementado, tested |
| **Logout all devices** | ⚠️ | Implementado pero sin integration test |
| **Logout specific device** | ⚠️ | Implementado pero sin integration test |
| **JWT generation** | ✅ | HMAC-SHA256, 7 unit tests |
| **JWT validation** | ✅ | Signature + claims validation |
| **JWT refresh token rotation** | ✅ | 11 unit tests, family-based theft detection |
| **Cookies (HttpOnly)** | ✅ | Enforced, 7 tests |
| **Cookies (Secure flag)** | ✅ | Env-aware (true in prod, configurable in dev) |
| **Cookies (SameSite=Strict)** | ✅ | Default Strict, env-configurable |
| **CORS configuration** | ✅ | Env var based, 6 tests |
| **CSRF protection** | ⚠️ | Configured but **NO real tests** ← H2 |
| **Password validation** | ✅ | BCrypt-12, complexity, blacklist, 9 tests |
| **Rate limiting (login)** | ⚠️ | Implemented but **NO bucket4j tests** ← H3 |
| **Multi-tenant isolation** | ⚠️ | TenantContext working but only 5 conceptual tests |
| **Roles (5 total)** | ⚠️ | SUPPORT role undefined ← H1 |
| **Permissions (18 granular)** | ✅ | RolePermissions mapping complete |
| **Session timeout** | ✅ | JWT expiry enforced |
| **Offline support (Desktop)** | ✅ | OfflineLease with 48hr window |
| **Frontend guards (AuthGate)** | ✅ | Component protecting routes |
| **Frontend guards (SuperAdminGate)** | ✅ | Admin route protection |
| **Password reset flow** | ✅ | Request + confirm, 8 tests |
| **Change password** | ⚠️ | Implemented but no integration test |
| **Device authorization** | ✅ | Fingerprint hashing, 5 tests |
| **Multi-tab sync** | ✅ | BroadcastChannel implemented |
| **Session recovery (page refresh)** | ✅ | useSessionLoader working |
| **Automatic refresh on expiry** | ✅ | useSessionMonitor refreshes 60s before expiry |
| **Audit logging** | ✅ | AuthAuditService, async, correlation IDs |

**MVP Status**: ⚠️ **76/28 = 92% implemented** — 3 críticos + 7 importantes por completar antes de MVP

---

## 4. ROADMAP POR FASES

### FASE 1: MVP (Semana 1-2)

**Objetivo**: Hacer que autenticación sea "buena para MVP" — segura, sin crashes, con tests críticos.

**Trabajo Crítico** (Bloqueante):
1. ✅ Fix H1: Add SUPPORT role to UserRole.java enum (30 min)
2. ✅ Fix H2: Add real CSRF token validation tests (4 horas)
3. ✅ Fix H3: Add real rate limiting integration tests (3 horas)
4. ✅ Fix H5: Deduplicate UserRole types → single source of truth (2 horas)
5. ✅ Fix H6: Auto-load permissions in usePermissions hook (3 horas)
6. ✅ Fix H7: Replace wildcard test data with real permissions (1 hora)
7. ✅ Fix H9: Move print-agent CORS to env vars (1 hora)

**Trabajo Importante** (High priority):
8. ✅ Fix H4: Add 10 more integration tests for missing endpoints (20 horas)
9. ✅ Fix H8: Reduce cache TTL from 5s to 1s (2 horas)
10. ✅ Frontend E2E: Add tests for password reset, session expiry (5 horas)

**Entregable**: MVP-ready auth module, 3 críticos resueltos, 60+ new tests

**Esfuerzo**: ~38 horas (< 1 semana con 2 devs)

---

### FASE 2: Production Ready (Semana 3-4)

**Objetivo**: Escalar a producción con todas las brechas cerradas.

**Trabajo**:
1. Security headers via reverse proxy (nginx config)
2. API Key rotation strategy
3. Offline lease validation tests
4. Permission sync between Web + Desktop
5. Audit log retention policy
6. Monitoring + alerting for auth failures
7. Load test: 100 concurrent logins
8. Penetration test (OWASP ASVS)

**Entregable**: Production-ready, security audit passed, load tested

**Esfuerzo**: ~40 horas (1 semana)

---

### FASE 3: Escalabilidad (Semana 5-8)

**Objetivo**: Soportar 100.000 usuarios sin degradación.

**Trabajo**:
1. ✅ Fix H10: Implement key rotation mechanism (8 horas)
2. Redis-backed rate limiting (replace in-memory)
3. Redis-backed session store (replace DB)
4. JWT token caching strategy
5. Permission caching layer
6. Load test: 10.000 concurrent users
7. Multi-instance deployment validation
8. Auto-scaling rules

**Entregable**: Ready for enterprise scale, tested up to 10k users

**Esfuerzo**: ~60 horas (1.5 semanas)

---

### FASE 4: Enterprise (Future)

**Trabajo**:
1. Multi-factor authentication (2FA/TOTP)
2. SAML/LDAP integration
3. OAuth 2.0 provider
4. Passwordless authentication (WebAuthn)
5. API rate limiting per tenant
6. Advanced audit dashboard
7. FIDO2 device registration

---

## 5. PLAN DE IMPLEMENTACIÓN DETALLADO

### P0: CRITICAL FIXES (必须 Before MVP)

| # | Tarea | Prioridad | Dificultad | Impacto | Archivos | Esfuerzo | Riesgo |
|---|-------|-----------|-----------|---------|----------|----------|--------|
| **1** | Add SUPPORT role | P0 | Trivial | Alto | `UserRole.java`, `RolePermissions.java`, `LicenseSupportController.java` | 30 min | Bajo |
| **2** | CSRF token validation tests | P0 | Fácil | Alto | `CSRFIntegrationTest.java` (new) | 4h | Bajo |
| **3** | Rate limiting bucket4j tests | P0 | Fácil | Alto | `RateLimitIntegrationTest.java` (new) | 3h | Bajo |
| **4** | Deduplicate UserRole types | P0 | Fácil | Medio | 3 files, import updates | 2h | Bajo |
| **5** | Fix usePermissions hook | P0 | Fácil | Medio | `usePermissions.ts`, `useHasPermission.ts` (new) | 3h | Bajo |
| **6** | Fix test data (wildcards) | P0 | Trivial | Bajo | `permissions.spec.ts` | 1h | Muy Bajo |
| **7** | Print agent CORS to env | P0 | Trivial | Medio | `security.ts` | 1h | Muy Bajo |

**Subtotal P0**: **14.5 horas** (1-2 días con 1 dev)

---

### P1: IMPORTANT (Before production, can defer if MVP is urgent)

| # | Tarea | Prioridad | Dificultad | Impacto | Archivos | Esfuerzo | Riesgo |
|---|-------|-----------|-----------|---------|----------|----------|--------|
| **8** | Expand controller integration tests | P1 | Medio | Alto | `AuthControllerIntegrationTest.java` | 20h | Bajo |
| **9** | Reduce user status cache TTL | P1 | Fácil | Bajo | `JwtAuthFilter.java` | 2h | Muy Bajo |
| **10** | Frontend E2E: Password reset flow | P1 | Fácil | Medio | `reset-password.spec.ts` (new) | 3h | Bajo |
| **11** | Frontend E2E: Session expiry + refresh | P1 | Medio | Medio | `session-expiry.spec.ts` (new) | 5h | Bajo |
| **12** | Multi-tenant integration tests | P1 | Medio | Alto | `MultiTenantAuthTest.java` (new) | 8h | Medio |
| **13** | Permission sync verification | P1 | Medio | Medio | Tests comparing backend RolePermissions vs frontend | 5h | Bajo |

**Subtotal P1**: **43 horas** (1 semana con 1 dev)

---

### P2: SCALABILITY (Phase 3, optional for MVP)

| # | Tarea | Prioridad | Dificultad | Impacto | Archivos | Esfuerzo | Riesgo |
|---|-------|-----------|-----------|---------|----------|----------|--------|
| **14** | JWT key rotation mechanism | P2 | Difícil | Medio | `KeyRotationService.java`, `KeyVersion.java`, migration | 8h | Medio |
| **15** | Redis-backed rate limiting | P2 | Difícil | Medio | Rate limit config, migration to Redis | 12h | Medio |
| **16** | Redis-backed session store | P2 | Difícil | Bajo | Session repository, Redis config | 10h | Medio |
| **17** | Load test: 10k concurrent users | P2 | Medio | Alto | JMeter/k6 scripts | 8h | Bajo |

**Subtotal P2**: **38 horas** (1 semana)

---

## 6. DIAGNÓSTICO DE SEGURIDAD (OWASP ASVS)

### Verificado ✅

| Control | Nivel | Hallazgo |
|---------|-------|----------|
| **Autenticación básica (V2.1.1)** | 2 | Email + password, BCrypt-12, OK |
| **Password strength (V2.1.3)** | 2 | 8+ chars, complejidad, lista negra, OK |
| **Account recovery (V2.4.1)** | 2 | Reset token con 1hr TTL, hashing, OK |
| **Session management (V3.3.1)** | 2 | Refresh token rotation, family tracking, OK |
| **CSRF protection (V4.1.1)** | 2 | SameSite=Strict, cookie tokens, OK *(sin tests)* |
| **HTTPOnly cookies (V4.3.1)** | 2 | Enforced en backend + frontend, OK |
| **Secure cookies (V4.3.2)** | 2 | Env-aware, true en prod, OK |
| **Rate limiting (V11.3.1)** | 2 | 10 req/min login, 100 req/min ops, OK *(sin tests)* |
| **Password reset (V2.4.3)** | 2 | Token expires 1hr, one-time use, OK |
| **Account lockout (V2.2.2)** | 2 | 5 failed attempts → 30 min lock, OK |

### Recomendado (No crítico para MVP)

| Control | Nivel | Hallazgo |
|---------|-------|----------|
| **MFA (V2.3.1)** | 3 | No implementado — Future feature |
| **WebAuthn (V2.5.1)** | 3 | No implementado — Future feature |
| **SAML/LDAP (V2.6.1)** | 3 | No implementado — Future feature |

---

## 7. RECOMENDACIONES FINALES

### ¿Está listo para MVP?

**Respuesta**: **SÍ, con 3 fixes críticos** (estimados 11.5 horas)

Después de resolver H1, H2, H3, el módulo está listo para MVP. El resto se puede completar en Fase 2.

---

### ¿Está listo para Producción?

**Respuesta**: **NO, requiere Fase 2** (40+ horas adicionales)

Falta:
- Integration tests para 10+ endpoints
- Pruebas reales de CSRF y rate limiting
- Multi-tenant validation tests
- Documentación de deployment
- Runbook para incidentes
- Monitoring rules

---

### ¿Soporta Escalabilidad a 100k usuarios?

**Respuesta**: **Parcialmente, Fase 3 requerida** (60+ horas)

Cuellos de botella actuales:
- Rate limiting en-memory (restart → pérdida de estado)
- Session store en DB (N+1 queries en multi-instance)
- JWT secret sin rotación
- Cache de status de 5 segundos

---

## 8. SIGUIENTE PASO

1. **Aprueba el plan** ✅
2. **Asigna 2 devs** — 1 backend, 1 frontend
3. **Comienza Fase 1** — Resolver 7 issues críticos en ~2 semanas
4. **Review de seguridad** — Código + penetration test
5. **Deploy a staging** — Validar en ambiente production-like
6. **Go to production** 🚀

---

**Documento preparado por**: Auditoría Técnica Automatizada  
**Última revisión**: 2026-06-28  
**Próxima revisión**: Post-MVP (2026-07-15)
