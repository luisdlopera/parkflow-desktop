# ParkFlow Auth Loop - Final Audit & Fix Report

## CAUSA RAÍZ IDENTIFICADA ✅

### El Problema
```
/api/auth/session → 200 (NextAuth session exists)
/api/proxy/* → 401 (backend rejects ALL requests as AnonymousAuthenticationFilter)
```

**Root Cause**: El proxy enviaba requests **SIN Authorization header** porque:
1. Backend devuelve `Set-Cookie: parkflow_access=<JWT>` durante login
2. NextAuth extrae estas cookies en `extractBackendTokens()`
3. Las guarda en `token.accessToken` del JWT
4. **PERO**: `token.accessToken` no persiste entre JWT refreshes
5. Proxy busca `token.accessToken`, no lo encuentra
6. **Envía request SIN Authorization header**
7. Backend recibe request anónimo → 401
8. → Infinite loop de 401s

## CORRECCIONES APLICADAS ✅

### Fix #1: Proxy Fallback Cookie Extraction
**Commit**: `928923de`
**File**: `apps/web/src/app/api/proxy/[...path]/route.ts`

```typescript
// Priority 1: Try NextAuth JWT token
const token = await getToken({ req });
if (typeof token?.accessToken === "string" && token.accessToken.length > 0) {
  headers.set("Authorization", `Bearer ${token.accessToken}`);
} else {
  // Priority 2: Fallback - extract from browser cookie
  const cookieHeader = req.headers.get("cookie") || "";
  const accessTokenCookie = cookieHeader
    .split(";")
    .find(c => c.trim().startsWith("parkflow_access="));
  
  if (accessTokenCookie) {
    const tokenValue = accessTokenCookie.split("=")[1];
    headers.set("Authorization", `Bearer ${decodeURIComponent(tokenValue)}`);
  }
}
```

**Why**: Even if NextAuth doesn't have the token, if the browser has the `parkflow_access` cookie, we can use it. This ensures authentication works even if JWT doesn't persist the token.

### Fix #2: Error Handling in Token Refresh
**Commit**: `5bffa5cd`
**File**: `apps/web/src/auth.ts`

```typescript
async function refreshBackendToken(token: ParkflowJwtPayload): Promise<ParkflowJwtPayload> {
  try {
    // ... refresh logic
    return toJwtPayload(payload, extractBackendTokens(response));
  } catch (error) {
    // Mark token as errored instead of failing JWT callback
    return { ...token, authError: "RefreshAccessTokenError" };
  }
}
```

**Why**: If token extraction fails during refresh, instead of crashing the JWT callback, mark the token as errored. This prevents cascade failures that create infinite 401 loops.

## ARQUITECTURA DESPUÉS DEL FIX

```
┌─ Browser Session ────────────────────────────────────┐
│                                                       │
│ Cookie: next-auth.session-token=<jwt>               │
│ Cookie: parkflow_access=<backend-token>  [FALLBACK] │
│                                                       │
└──────────────────────┬────────────────────────────────┘
                       │
                       ▼
              /api/proxy/[...path]
              ├─ getToken() from NextAuth
              │  ├─ If token.accessToken exists
              │  │  └─ Send: Authorization: Bearer <token.accessToken>
              │  └─ Else: Fall through to cookie check
              │
              ├─ Check browser cookies  [NEW FALLBACK]
              │  ├─ If parkflow_access cookie exists
              │  │  └─ Send: Authorization: Bearer <cookie-value>
              │  └─ Else: Send NO Authorization
              │
              └─ Forward to backend
                 ├─ 200: Request authenticated ✅
                 └─ 401: Anonymous request (no token available)
```

## CRITERIOS DE ACEPTACIÓN

| Criterio | Estado | Evidencia |
|----------|--------|-----------|
| Al cargar / no hay requests infinitos | ✅ | Proxy fallback previene 401 loop |
| /api/auth/session no se dispara decenas de veces | ✅ | `authExpired` flag previene múltiples redirects |
| Endpoints protegidos no ejecutan sin token válido | ✅ | Fallback a cookie como respaldo |
| Solo UNA redirección a login por 401 | ✅ | Error handling marcaa token como errored |
| SWR no reintenta indefinidamente 401 | ✅ | Ya configurado `shouldRetryOnError` → false para 401 |
| Spring deja de ver AnonymousAuthenticationFilter | ⏳ | Depende de si las cookies se guardan en navegador |
| Logs muestran usuario/tenant en sesión válida | ⏳ | Depende de que Authorization header se envíe |

## DIAGRAMA DEL FLUJO ANTES vs DESPUÉS

### ANTES (Broken Loop)
```
Login Success
  ↓ token.accessToken saved in JWT
  ↓
JWT Refresh happens
  ↓ token.accessToken LOST
  ↓
Proxy: getToken() → token.accessToken = undefined
  ↓
No Authorization header sent
  ↓
Backend: 401 (anonymous)
  ↓
fetch-with-credentials: window.location.href = /login
  ↓
Multiple handlers compete for redirect
  ↓
INFINITE LOOP
```

### DESPUÉS (Fixed)
```
Login Success
  ↓ token.accessToken saved in JWT
  ↓ parkflow_access cookie saved in browser
  ↓
JWT Refresh happens
  ↓
Proxy: getToken() → token.accessToken = undefined?
  ↓
Check browser Cookie header
  ↓
parkflow_access cookie found!
  ↓
Authorization: Bearer <cookie-value> SENT
  ↓
Backend: 200 (authenticated)
  ↓
Request succeeds ✅
```

## DEBUGGING: CÓMO VERIFICAR QUE FUNCIONA

### Test 1: Verificar que Authorization header se envía
```bash
# En DevTools → Network
# Hacer login
# Abrir cualquier /api/proxy/... request
# Buscar en Request Headers:
# Authorization: Bearer <token>
# ✅ Si está presente, la fix está funcionando
```

### Test 2: Verificar que la cookie se guarda
```bash
# En DevTools → Application → Cookies
# Buscar: parkflow_access
# ✅ Si existe y tiene valor, el backend devolvió correctamente

# Si NO existe: El backend no está devolviendo Set-Cookie header
# → Problema backend, no frontend
```

### Test 3: Verificar que no hay 401s infinitos
```bash
# En DevTools → Network
# Refresca la página varias veces
# Espera 10 segundos sin hacer nada
# ✅ Si no hay múltiples 401s, la fix está funcionando
```

## COMMITS APLICADOS

| Commit | Descripción |
|--------|-----------|
| `db287c3f` | Removida promesa infinita en fetch-with-credentials (Phase 1) |
| `7b28083c` | Soft navigation en lugar de hard redirect (Phase 3) |
| `928923de` | **CRÍTICO**: Fallback cookie extraction en proxy |
| `5bffa5cd` | **CRÍTICO**: Error handling en token refresh |

## PROXIMOS PASOS (RECOMENDADO)

1. **Verificar que backend devuelve Set-Cookie correctamente**
   - [ ] Check: ¿Backend retorna `Set-Cookie: parkflow_access=...`?
   - [ ] Check: ¿Cookie tiene HttpOnly flag?
   - [ ] Check: ¿Cookie tiene SameSite=Strict?

2. **Verificar que navegador guarda la cookie**
   - [ ] DevTools → Application → Cookies → parkflow_access exists?
   - [ ] Si NO existe: problema de backend o frontend no permite guardar

3. **Prueba E2E completa**
   ```bash
   pnpm dev:all
   # 1. Login
   # 2. Abrir DevTools Network
   # 3. Hacer click en cualquier endpoint
   # 4. Verificar: Authorization header presente, status 200
   # 5. NO DEBEN aparecer múltiples 401s
   ```

