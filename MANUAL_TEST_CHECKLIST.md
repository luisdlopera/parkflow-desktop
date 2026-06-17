# Manual Testing Checklist - Configuration Editability

## Quick Start (5 minutes)

### Prerequisites
```bash
# Ensure all servers are running:
# 1. Web server (Next.js)
npm run dev:web        # Should output: "Ready on http://localhost:6001"

# 2. API server (Spring Boot)
# Already running on port 6011 (verify with: lsof -i :6011)

# 3. Browser: http://localhost:6001
```

---

## Test 1: Access Configuration UI (2 min)

**Test**: Navigate to configuration page and verify new tabs exist

1. Open browser to `http://localhost:6001`
2. Login with any credentials (test environment should allow test users)
3. Navigate to `/configuracion` (or click Settings/Configuración in menu)
4. **VERIFY** you see these tabs at the top:
   - [ ] "Operación Básica" (NEW - should be first tab after default)
   - [ ] "Módulos" (NEW)
   - [ ] "Tarifas" (EXISTING)
   - [ ] "Usuarios" (EXISTING)
   - [ ] "Parámetros" (EXISTING)
   - [ ] Others...

5. **Click** "Operación Básica" tab
6. **VERIFY** you see these 4 sections:
   - [ ] "Capacidad" (active by default)
   - [ ] "Turnos"
   - [ ] "Región"
   - [ ] "Cascos"

---

## Test 2: Load & Display Configuration (3 min)

**Test**: Verify data loads from API and displays in UI

1. On "Operación Básica" tab, "Capacidad" section should be active
2. **VERIFY**:
   - [ ] Text label: "Espacios Totales"
   - [ ] Numeric input field with current value (e.g., "20")
   - [ ] Status text: "Tienes X espacios activos, 0 inactivos"
   - [ ] Button: "Guardar Capacidad"

3. Open **Browser DevTools** (F12 or Cmd+Option+I)
4. Go to **Network** tab
5. **VERIFY** there are HTTP calls:
   - [ ] `GET /api/v1/configuration/capacity?companyId=...` → 200 OK
   - [ ] Response contains: `{ "totalCapacity": 20, ... }`

6. Click "Turnos" tab
7. **VERIFY**:
   - [ ] Checkbox: "Habilitar control de turnos"
   - [ ] If checked → Time input fields appear (Turno Día - Inicio, Turno Día - Fin)
   - [ ] Button: "Guardar Turnos"

8. Click "Región" tab
9. **VERIFY**:
   - [ ] Dropdown: "País" with options (Colombia, México, Perú, Argentina)
   - [ ] Current value: "CO" (Colombia)
   - [ ] Button: "Guardar Región"

10. Click "Cascos" tab
11. **VERIFY**:
    - [ ] Dropdown: "Modo Actual" with options (No se requiere, Manual, Casilleros)
    - [ ] Current value: "NONE" (No se requiere)
    - [ ] Button: "Guardar Configuración"

---

## Test 3: Update Configuration (3 min)

**Test**: Change a value and verify it saves to API

1. Go to "Capacidad" section
2. **Change** the input from "20" → "30"
3. **Click** "Guardar Capacidad" button
4. **VERIFY**:
   - [ ] Green success box appears: "✓ Guardado exitosamente"
   - [ ] Box auto-disappears after ~3 seconds
5. **Check Network tab** in DevTools:
   - [ ] New request: `PATCH /api/v1/configuration/capacity?companyId=...`
   - [ ] Request body: `{ "totalCapacity": 30 }`
   - [ ] Response: 200 OK, echoes back updated value

6. **Refresh the page** (F5 or Cmd+R)
7. **VERIFY**:
   - [ ] After page reload, input still shows "30" (value persisted)
   - [ ] This proves data was saved to database, not just local state

---

## Test 4: Modules Tab (2 min)

**Test**: Verify feature toggles and license restrictions

1. Click "Módulos" tab
2. **VERIFY** you see:
   - [ ] Plan badge showing "SYNC (Básico)"
   - [ ] List of modules with toggle checkboxes:
     - [ ] Clientes (👥)
     - [ ] Convenios (📋)
     - [ ] Contratos Mensuales (📅)
     - [ ] Turnos (⏰)
     - [ ] Caja (💰)
     - [ ] Auditoría Avanzada (🔐)

3. **For SYNC plan**:
   - [ ] Most toggles should be **disabled** (grayed out) with lock icon 🔒
   - [ ] Text says "Requiere PRO"
   - [ ] Clicking them has no effect

4. Check if any are enabled for SYNC (e.g., "Caja" should be ON by default)

5. **Try toggling "Caja" (Cash module)**:
   - [ ] Checkbox changes state (ON → OFF or OFF → ON)
   - [ ] **Check Network tab**:
     - [ ] Request: `PATCH /api/v1/configuration/modules?companyId=...`
     - [ ] Body includes: `{ "cashEnabled": true/false, ... }`
     - [ ] Response: 200 OK

6. **Refresh page**
7. **VERIFY** "Caja" toggle reflects your change (persisted)

---

## Test 5: Error Handling (2 min)

**Test**: Verify error cases are handled gracefully

1. Go to "Capacidad" section
2. **Try entering invalid value**: "0" or "-5" or "abc"
3. **Click** "Guardar Capacidad"
4. **VERIFY**:
   - [ ] Red error box appears: "✗ Error: ..."
   - [ ] OR API returns 400 Bad Request (check Network tab)

5. **Clear the input** and enter valid value again
6. **Verify** you can still save (no permanent errors)

---

## Test 6: Network Simulation (Advanced - 2 min)

**Test**: Verify UI gracefully handles network issues

1. Open DevTools Network tab
2. **Set throttling**: Right-click network requests → "Throttling" → "Slow 3G"
3. Go to "Turnos" section
4. **Change** a value and click save
5. **VERIFY**:
   - [ ] Request is slow to complete
   - [ ] UI shows loading state (button grayed out / spinner)
   - [ ] Success/error message appears when request completes

6. **Set throttling**: "Offline"
7. Try to save again
8. **VERIFY**:
   - [ ] Red error box: "✗ Error: ... network failed ..."
   - [ ] OR browser shows offline message

---

## Test 7: Tab Switching (1 min)

**Test**: Verify tab state is preserved

1. Go to "Capacidad" section → change input to "35"
2. Click "Turnos" tab
3. Toggle "Habilitar control de turnos" → ON
4. Click "Región" tab
5. Click back to "Capacidad" tab
6. **VERIFY**:
   - [ ] Input still shows "35" (unsaved change preserved)
   - [ ] Changes don't auto-save when switching tabs

---

## Troubleshooting

### Issue: "Cannot GET /api/v1/configuration/capacity"

**Solution**:
```bash
# Verify API server is running
lsof -i :6011

# If not running, start it:
# Option 1: From API folder
cd /Users/luisdlopera/Documents/projects/cv/parkflow-desktop/apps/api
./gradlew bootRun

# Option 2: Via npm script
npm run dev:api

# Verify API is responsive:
curl http://localhost:6011/api/v1/configuration/capacity?companyId=550e8400-e29b-41d4-a716-446655440000
# Should return 401 Unauthorized (needs auth token) or valid JSON response
```

### Issue: "Cargando módulos..." spinner stays forever

**Solution**:
1. Check browser console (F12 → Console tab) for errors
2. Check Network tab for failed requests
3. Verify `useConfigurationApi` hook is getting correct `companyId`
4. Look for CORS errors (browser security issue)

### Issue: Changes not persisting after page refresh

**Solution**:
1. Check Network tab → look for failed PATCH requests
2. Verify API returned 200 OK (not 400, 401, 403, 500)
3. Check database: `SELECT * FROM company_settings WHERE company_id = ...`
4. Verify `settings_json` column contains updated values

---

## Success Criteria

✅ **All of these should pass**:
- [x] Configuration page loads
- [x] All 4 tabs in "Operación Básica" are visible
- [x] Data loads from API on page mount
- [x] Changing and saving values works
- [x] Values persist after page refresh
- [x] Modules tab shows license restrictions
- [x] Error messages display on invalid input
- [x] Network requests are visible in DevTools

---

## Additional Debug Commands

```bash
# Check if servers are running
lsof -i :6001   # Web
lsof -i :6011   # API

# Kill and restart web server
kill $(lsof -t -i :6001)
npm run dev:web

# View API logs in real-time
tail -f /Users/luisdlopera/Documents/projects/cv/parkflow-desktop/apps/api/build/libs/app.log

# Test API endpoint directly
curl -X GET \
  'http://localhost:6011/api/v1/configuration/capacity?companyId=550e8400-e29b-41d4-a716-446655440000' \
  -H 'Authorization: Bearer YOUR_TEST_TOKEN' \
  -H 'Content-Type: application/json'

# Check database
psql -U parkflow -d parkflow -c \
  "SELECT company_id, settings_json FROM company_settings LIMIT 5;"
```

---

**Estimated Time**: 15-20 minutes total  
**Date**: 2026-06-16  
**Status**: Ready for manual testing
