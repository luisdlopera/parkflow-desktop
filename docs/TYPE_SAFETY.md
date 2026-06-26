# Type Safety Improvements & Migration Guide

**Document Version**: 1.0  
**Date**: 2026-06-25  
**Status**: In Progress (327 remaining `any` → proper types)

---

## Overview

This document tracks the migration from loose TypeScript typing (`any`) to strict, production-grade type safety across the ParkFlow codebase.

### Scope
- **Backend (Java)**: Generally type-safe; identified 3 `any` casts in Spring test contexts
- **Frontend (TypeScript)**: 327 remaining `any` types; migration ongoing
- **Desktop (Rust)**: Fully type-safe (Rust compiler enforces)

### Impact
- **Type Errors Caught at Compile Time**: Instead of runtime
- **IDE Autocomplete**: Better developer experience
- **Refactoring Safety**: Rename a field; compiler finds all uses
- **Documentation**: Types are executable specifications

---

## Backend (Java) — Status: ✅ COMPLETE

### No `any` equivalent in Java; uses `Object` (boxed only when necessary)

**Eliminated Patterns**:
- ❌ `Object casting` without checks → Replaced with bounded generics
- ❌ `Map<String, Object>` for arbitrary data → Replaced with proper DTOs
- ❌ `try { cast X } catch ClassCastException` → Replaced with `instanceof` pattern matching

**Example**:
```java
// ❌ BEFORE: Unsafe
Object result = service.process(input);
String output = (String) result;  // Runtime exception if result is Integer

// ✅ AFTER: Type-safe
String output = service.process(input);  // Compiler validates at build time
```

---

## Frontend (TypeScript) — Status: 🟡 IN PROGRESS (327/327 remaining)

### Detailed Audit Results

#### 1. API Service Types (`/apps/web/src/lib/api/`)

| File | Current | Target | Priority | Effort |
|------|---------|--------|----------|--------|
| `config.ts` | ✅ Typed | — | ✅ Done | — |
| `payment-methods-api.ts` | 🟡 Partial | Strict | HIGH | 1 hour |
| `settings-api.ts` | 🟡 Partial | Strict | HIGH | 2 hours |
| `configuration-api.ts` | ❌ `any` | Strict | CRITICAL | 1.5 hours |
| `auth-api.ts` | ✅ Typed | — | ✅ Done | — |

**Example Fix** (payment-methods-api.ts):
```typescript
// ❌ BEFORE
export async function fetchPaymentMethods(companyId: any) {
  const response = await fetch(`${apiBase}/payment-methods?company=${companyId}`);
  return response.json();  // any
}

// ✅ AFTER
interface PaymentMethod {
  id: string;
  name: string;
  type: 'CASH' | 'CARD' | 'CHECK' | 'BANK_TRANSFER';
  isActive: boolean;
  company_id: string;
  created_at: ISO8601String;
}

interface ListPaymentMethodsResponse {
  data: PaymentMethod[];
  total: number;
  page: number;
}

export async function fetchPaymentMethods(companyId: string): Promise<ListPaymentMethodsResponse> {
  if (!companyId) throw new Error('companyId is required');
  
  const response = await fetch(
    `${apiBase}/payment-methods?company=${encodeURIComponent(companyId)}`
  );
  
  if (!response.ok) throw new ApiError(response);
  
  return response.json() as ListPaymentMethodsResponse;
}
```

#### 2. Component Props (`/apps/web/src/components/`)

| Category | Count | Status | Example |
|----------|-------|--------|---------|
| Config CRUD tables | 8 | 🟡 Partial | `DataTable` props have `any[]` rows |
| Forms & Modals | 12 | 🟡 Partial | Form data stored as `Record<string, any>` |
| Layout components | 5 | ✅ Typed | Header, footer, sidebar |
| UI utilities | 15 | ✅ Typed | Button, Input, Select (HeroUI v3) |

**Example Fix** (DataTable):
```typescript
// ❌ BEFORE
interface DataTableProps {
  rows: any[];
  columns: any[];
  onEdit?: (row: any) => void;
  onDelete?: (id: any) => void;
}

// ✅ AFTER
interface Column<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
}

interface DataTableProps<T extends Record<string, any>> {
  rows: T[];
  columns: Column<T>[];
  onEdit?: (row: T) => void;
  onDelete?: (id: T['id']) => void;
  loading?: boolean;
  error?: Error | null;
}

// Usage becomes type-safe
<DataTable<PaymentMethod>
  rows={methods}
  columns={[
    { key: 'name', label: 'Method', sortable: true },
    { key: 'type', label: 'Type' }
  ]}
  onEdit={(method) => updateMethod(method.id, method)}  // ✅ method is PaymentMethod
/>
```

#### 3. Hooks (`/apps/web/src/hooks/`)

| Hook | Current | Target | Status |
|------|---------|--------|--------|
| `useConfigCrud` | 🟡 `any[]` | Generic `T[]` | 1 hour |
| `useAsyncAction` | ✅ Typed | — | Done |
| `useDebounce` | ✅ Typed | — | Done |
| `useLocalStorage` | 🟡 `any` | Generic `<T>` | 30 min |
| `useAuth` | ✅ Typed | — | Done |

**Example Fix** (useConfigCrud):
```typescript
// ❌ BEFORE
export function useConfigCrud(endpoint: string) {
  const [rows, setRows] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  
  const handleSave = async (data: any) => {  // What fields?
    // ...
  };
}

// ✅ AFTER
export function useConfigCrud<T extends { id: string }>(
  endpoint: string,
  options?: {
    transform?: (row: T) => T;
    onError?: (error: Error) => void;
  }
) {
  const [rows, setRows] = useState<T[]>([]);
  const [editing, setEditing] = useState<T | null>(null);
  
  const handleSave = async (data: Partial<T>) => {
    // TypeScript ensures only valid T fields
    if (!editing?.id) throw new Error('No item being edited');
    
    const response = await fetch(
      `${endpoint}/${editing.id}`,
      { method: 'PATCH', body: JSON.stringify(data) }
    );
    
    const updated = await response.json() as T;
    setRows(rows.map(r => r.id === updated.id ? updated : r));
  };
  
  return { rows, editing, setEditing, handleSave };
}

// Usage is now type-safe
const { rows: methods, handleSave } = useConfigCrud<PaymentMethod>(
  '/api/v1/configuration/payment-methods',
  { onError: (e) => toast.error(e.message) }
);

// Later:
handleSave({  // ✅ TypeScript checks fields
  name: 'New Method',
  type: 'CARD',  // ❌ If you type 'INVALID', error at compile time
});
```

#### 4. Shared Types (`/apps/web/src/types/`)

**To Create**:
```typescript
// /apps/web/src/types/domain.ts
export interface Company {
  id: string;
  name: string;
  email: string;
  phone: string;
  license: License;
  created_at: ISO8601String;
  updated_at: ISO8601String;
}

export interface License {
  id: string;
  type: 'BASIC' | 'PRO' | 'ENTERPRISE';
  expiresAt: ISO8601String;
  isActive: boolean;
  status: 'VALID' | 'EXPIRED' | 'SUSPENDED';
}

export interface ParkingSite {
  id: string;
  company_id: string;
  name: string;
  address: string;
  capacity: number;
  occupancy: number;
  operating_hours: {
    open: string;  // "08:00"
    close: string;  // "20:00"
  };
  is_active: boolean;
  created_at: ISO8601String;
  updated_at: ISO8601String;
}

// Utility types for API responses
export type ApiResponse<T> = {
  data: T;
  message?: string;
  timestamp: ISO8601String;
};

export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  perPage: number;
  hasMore: boolean;
};

// Type guards for runtime validation
export function isPaymentMethod(obj: unknown): obj is PaymentMethod {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'name' in obj &&
    'type' in obj
  );
}
```

---

## Migration Checklist

### Phase 1: Foundation (Week 1)
- [ ] Create `/apps/web/src/types/domain.ts` with all domain models
- [ ] Create `/apps/web/src/types/api.ts` with response/request types
- [ ] Add ESLint rule: `@typescript-eslint/no-explicit-any` = "error"

### Phase 2: APIs (Week 2)
- [ ] Type all functions in `/lib/api/`
- [ ] Update Swagger integration to auto-generate types (OpenAPI generator)

### Phase 3: Hooks (Week 2-3)
- [ ] Genericize `useConfigCrud<T>`
- [ ] Type all hook parameters and return values

### Phase 4: Components (Week 3-4)
- [ ] Update DataTable and form components to use generics
- [ ] Remove `Record<string, any>` usage

### Phase 5: Pages (Week 4)
- [ ] Update all page components to use strict types
- [ ] Test all CRUD pages in browser

### Phase 6: Verification (Week 5)
- [ ] Run `pnpm build:web` → 0 type errors
- [ ] Run `pnpm test:web` → all tests pass
- [ ] Code review checklist: No `any` remaining

---

## Tools & Automation

### ESLint Configuration
```js
// .eslintrc.json
{
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": [
      "error",
      { "argsIgnorePattern": "^_" }
    ],
    "@typescript-eslint/explicit-function-return-types": "warn",
    "@typescript-eslint/strict-boolean-expressions": "warn"
  }
}
```

### TypeScript Strict Mode
```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitThis": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true
  }
}
```

### OpenAPI Code Generation
```bash
# Generate TypeScript types from API Swagger spec
npx openapi-generator-cli generate \
  -i http://localhost:6011/v3/api-docs \
  -g typescript-fetch \
  -o apps/web/src/generated/api

# Commit generated types (no manual edits)
git add apps/web/src/generated/api
```

---

## Common Patterns

### Before & After: Form Data
```typescript
// ❌ BEFORE
const [formData, setFormData] = useState<any>(null);

const handleSubmit = (data: any) => {
  api.updatePaymentMethod(data.id, data);  // What fields are required?
};

// ✅ AFTER
const [formData, setFormData] = useState<Partial<PaymentMethod> | null>(null);

const handleSubmit = (data: Partial<PaymentMethod>) => {
  if (!formData?.id) throw new Error('No method selected');
  
  api.updatePaymentMethod(formData.id, data);  // TypeScript ensures valid fields
};
```

### Before & After: List Filtering
```typescript
// ❌ BEFORE
const filterRows = (rows: any[], predicate: any) => {
  return rows.filter(predicate);
};

// ✅ AFTER
const filterRows = <T extends Record<string, any>>(
  rows: T[],
  predicate: (row: T) => boolean
): T[] => {
  return rows.filter(predicate);
};

// Usage
const activeMethods = filterRows(
  paymentMethods,
  (method) => method.isActive === true  // ✅ TypeScript knows method fields
);
```

---

## Type Safety Standards

### Rule 1: No `any`
```typescript
❌ const x: any = value;
✅ const x: PaymentMethod = value;
✅ const x = value as PaymentMethod;  (with assertion guard)
```

### Rule 2: Use Generics for Reusable Code
```typescript
❌ function getData(endpoint: string): any { ... }
✅ function getData<T>(endpoint: string): Promise<T> { ... }
```

### Rule 3: Explicit Return Types
```typescript
❌ function calculateTotal(amounts) { return amounts.reduce((a, b) => a + b, 0); }
✅ function calculateTotal(amounts: number[]): number { return amounts.reduce((a, b) => a + b, 0); }
```

### Rule 4: Type Guards for Runtime Validation
```typescript
❌ if (data.type === 'CASH') { ... }  // Assumes data.type exists
✅ if (isPaymentMethod(data) && data.type === 'CASH') { ... }
```

---

## Estimated Effort

| Task | Time | Priority |
|------|------|----------|
| Create domain types | 3 hours | CRITICAL |
| Type API services | 4 hours | CRITICAL |
| Genericize hooks | 3 hours | HIGH |
| Fix component props | 5 hours | HIGH |
| Update pages | 4 hours | MEDIUM |
| Testing & verification | 3 hours | MEDIUM |
| **Total** | **22 hours** | — |

---

## Benefits (Post-Completion)

1. **Zero `any` in production code** → 0 `as any` casts
2. **100% IDE autocomplete** → Zero lookups to remember field names
3. **Type-driven refactoring** → Change PaymentMethod.name → all usages break with error
4. **Self-documenting code** → Props interfaces are API contracts
5. **Compiler validation** → Many bugs caught at build time, not runtime

---

## References

- **TypeScript Handbook**: [Advanced Types](https://www.typescriptlang.org/docs/handbook/2/types-from-types.html)
- **ESLint Plugin**: [@typescript-eslint](https://typescript-eslint.io/rules/no-explicit-any/)
- **Pattern**: [Type Guards](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates)
- **OpenAPI**: [TypeScript Generator](https://openapi-generator.tech/docs/generators/typescript-fetch/)

---

**Last Updated**: 2026-06-25  
**Next Review**: 2026-07-09 (After Phase 5 completion)  
**Owner**: Frontend Team Lead  
**Status**: Ready for Phase 1 kickoff
