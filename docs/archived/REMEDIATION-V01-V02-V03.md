# Plan de Remediación Técnica: V-01, V-02, V-03
## Stack: React + TypeScript + Tauri + Rust + Fastify/Spring Boot

**Fecha**: 2026-05-24  
**Proyecto**: Parkflow Monorepo  
**Estándar**: OWASP Top 10 2021, ISO/IEC 25010, ASVS Level 2  
**Clasificación**: Remediación Inmediata — Prioridad P0

---

## 🔴 V-01: Fallo en la Validación de Entradas (Input Validation Failure)

**CWE**: CWE-20 (Improper Input Validation)  
**OWASP Top 10 2021**: A03 — Injection  
**Severidad**: High  
**Estado**: Abierto

### Análisis de Impacto en Parkflow

En tu arquitectura (React → Tauri IPC → Rust Core → API), una entrada mal validada en cualquier capa puede:
1. **Frontend (React)**: Inyectar XSS en el DOM
2. **IPC (Tauri)**: Pasar payloads maliciosos al core nativo
3. **Rust Core**: Causar panics, buffer overflows o ejecución de comandos
4. **API (Fastify/Spring Boot)**: SQL Injection, NoSQL Injection, Command Injection
5. **Almacenamiento local**: Corrupto SQLite con datos malformados

### Arquitectura de Validación Multi-Capa

```
┌─────────────────────────────────────────────────────────────┐
│                    VALIDACIÓN EN CAPAS                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Capa 1: Frontend — React + Zod]                          │
│  ├── Validación UX inmediata (feedback al usuario)          │
│  └── Previene errores de usuario legítimos                  │
│                        │                                    │
│                        ▼                                    │
│  [Capa 2: IPC — Tauri Command Args]                         │
│  ├── Validación de argumentos antes de llamar Rust          │
│  └── Previene ataques IPC hijacking                         │
│                        │                                    │
│                        ▼                                    │
│  [Capa 3: Rust Core — Manual + Regex]                       │
│  ├── Validación estricta antes de procesar                  │
│  └── Previene panics y comportamiento indefinido            │
│                        │                                    │
│                        ▼                                    │
│  [Capa 4: API — Fastify/Spring Validation]                  │
│  ├── Validación en borde de red                             │
│  └── Previene inyección en base de datos                    │
│                        │                                    │
│                        ▼                                    │
│  [Capa 5: Base de Datos — Constraints]                      │
│  └── Última línea de defensa                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Implementación por Capa

#### Capa 1: Frontend (React + Zod + React Hook Form)

```typescript
// packages/types/src/validation.ts
// Esquemas Zod centralizados para reuso en toda la app

import { z } from 'zod';

/**
 * Validación de placa de vehículo
 * Soporta formatos internacionales: ABC-123, ABC1234, AB-123-CD
 */
export const plateSchema = z
  .string()
  .min(5, 'La placa debe tener al menos 5 caracteres')
  .max(10, 'La placa no puede exceder 10 caracteres')
  .regex(
    /^[A-Z0-9-]+$/,
    'Formato inválido. Solo letras mayúsculas, números y guiones'
  )
  .transform((val) => val.toUpperCase().trim())
  .refine(
    (val) => !val.includes('--'),
    'La placa no puede contener guiones consecutivos'
  )
  .refine(
    (val) => !val.startsWith('-') && !val.endsWith('-'),
    'La placa no puede iniciar ni terminar con guión'
  );

/**
 * Validación de datos de usuario
 */
export const userSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Nombre muy corto')
    .max(100, 'Nombre muy largo')
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, 'Nombre contiene caracteres inválidos')
    .transform((val) => val.trim().replace(/\s+/g, ' ')),

  email: z
    .string()
    .email('Correo electrónico inválido')
    .max(255)
    .transform((val) => val.toLowerCase().trim()),

  phone: z
    .string()
    .regex(/^\+?[0-9]{8,15}$/, 'Teléfono inválido')
    .optional(),

  role: z.enum(['admin', 'cashier', 'operator']),
});

/**
 * Validación de datos de ticket
 */
export const ticketSchema = z.object({
  plate: plateSchema,
  vehicleType: z.enum(['car', 'motorcycle', 'truck', 'other']),
  entryTime: z.string().datetime(),
  notes: z
    .string()
    .max(500, 'Las notas no pueden exceder 500 caracteres')
    .optional()
    .transform((val) => (val ? val.trim() : undefined)),
});

/**
 * Validación de búsqueda (previene XSS)
 */
export const searchSchema = z.object({
  query: z
    .string()
    .max(100, 'La búsqueda es muy larga')
    .regex(/^[^<>\"']*$/, 'La búsqueda contiene caracteres no permitidos')
    .optional(),
  page: z.coerce.number().min(1).max(100).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
});

export type PlateInput = z.infer<typeof plateSchema>;
export type UserInput = z.infer<typeof userSchema>;
export type TicketInput = z.infer<typeof ticketSchema>;
```

```typescript
// apps/web/src/components/TicketForm.tsx
// Uso en componente React con React Hook Form

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ticketSchema, TicketInput } from '@parkflow/types/validation';

export function TicketForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TicketInput>({
    resolver: zodResolver(ticketSchema),
    mode: 'onBlur', // Validar al perder foco
  });

  const onSubmit = async (data: TicketInput) => {
    // En este punto, los datos YA están validados por Zod
    // Pero aún así sanitizamos antes de enviar
    const sanitizedData = {
      ...data,
      notes: data.notes
        ? data.notes.replace(/[<>]/g, '')
        : undefined,
    };

    await fetch('/api/v1/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sanitizedData),
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label>Placa</label>
        <input
          {...register('plate')}
          placeholder="ABC-123"
          maxLength={10}
          autoComplete="off"
        />
        {errors.plate && (
          <span className="error">{errors.plate.message}</span>
        )}
      </div>

      <div>
        <label>Tipo de Vehículo</label>
        <select {...register('vehicleType')}>
          <option value="car">Carro</option>
          <option value="motorcycle">Moto</option>
          <option value="truck">Camión</option>
          <option value="other">Otro</option>
        </select>
      </div>

      <div>
        <label>Notas</label>
        <textarea
          {...register('notes')}
          maxLength={500}
          rows={3}
        />
        {errors.notes && (
          <span className="error">{errors.notes.message}</span>
        )}
      </div>

      <button type="submit">Crear Ticket</button>
    </form>
  );
}
```

#### Capa 2: IPC — Tauri Command Validation

```typescript
// apps/desktop/src/lib/validation.ts
// Validación antes de llamar comandos Rust

import { invoke } from '@tauri-apps/api/core';
import { plateSchema } from '@parkflow/types/validation';

/**
 * Wrapper seguro para invocar comandos Rust
 * Valida inputs ANTES de pasarlos al core nativo
 */
export async function invokeSecure<T>(
  command: string,
  args?: Record<string, unknown>
): Promise<T> {
  // Validar placa si está presente
  if (args?.plate) {
    const result = plateSchema.safeParse(args.plate);
    if (!result.success) {
      throw new Error(`Validación IPC fallida: ${result.error.message}`);
    }
    // Reemplazar con valor sanitizado
    args.plate = result.data;
  }

  // Validar strings generales (previene payloads IPC)
  for (const [key, value] of Object.entries(args || {})) {
    if (typeof value === 'string') {
      // Prevenir null bytes y caracteres de control
      if (/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value)) {
        throw new Error(`Caracteres de control no permitidos en: ${key}`);
      }
    }
  }

  return invoke<T>(command, args);
}

// Uso:
// const result = await invokeSecure('create_ticket', { plate: 'ABC-123' });
```

#### Capa 3: Rust Core — Validación Estricta

```rust
// apps/desktop/src-tauri/src/validation.rs
// Validación en el core nativo — ÚLTIMA línea de defensa antes de procesar

use regex::Regex;
use lazy_static::lazy_static;

lazy_static! {
    // Regex para placas: letras mayúsculas, números, guiones
    static ref PLATE_REGEX: Regex = Regex::new(r"^[A-Z0-9-]{5,10}$").unwrap();
    
    // Regex para nombres: letras, espacios, tildes
    static ref NAME_REGEX: Regex = Regex::new(r"^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]{2,100}$").unwrap();
    
    // Regex para emails básicos
    static ref EMAIL_REGEX: Regex = Regex::new(
        r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    ).unwrap();
    
    // Caracteres peligrosos que NO deben aparecer en inputs
    static ref DANGEROUS_CHARS: Regex = Regex::new(r"[<>'\"&;]|--|/\*|\*/|xp_").unwrap();
}

/// Errores de validación
#[derive(Debug)]
pub enum ValidationError {
    InvalidPlate(String),
    InvalidName(String),
    InvalidEmail(String),
    ContainsDangerousChars(String),
    TooLong { field: String, max: usize },
    TooShort { field: String, min: usize },
}

impl std::fmt::Display for ValidationError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ValidationError::InvalidPlate(val) => {
                write!(f, "Placa inválida: {}", val)
            }
            ValidationError::InvalidName(val) => {
                write!(f, "Nombre inválido: {}", val)
            }
            ValidationError::InvalidEmail(val) => {
                write!(f, "Email inválido: {}", val)
            }
            ValidationError::ContainsDangerousChars(field) => {
                write!(f, "Caracteres peligrosos detectados en: {}", field)
            }
            ValidationError::TooLong { field, max } => {
                write!(f, "{} excede el límite de {} caracteres", field, max)
            }
            ValidationError::TooShort { field, min } => {
                write!(f, "{} debe tener al menos {} caracteres", field, min)
            }
        }
    }
}

impl std::error::Error for ValidationError {}

/// Valida una placa de vehículo
pub fn validate_plate(plate: &str) -> Result<String, ValidationError> {
    let trimmed = plate.trim();
    
    if trimmed.len() < 5 {
        return Err(ValidationError::TooShort {
            field: "plate".to_string(),
            min: 5,
        });
    }
    
    if trimmed.len() > 10 {
        return Err(ValidationError::TooLong {
            field: "plate".to_string(),
            max: 10,
        });
    }
    
    if !PLATE_REGEX.is_match(trimmed) {
        return Err(ValidationError::InvalidPlate(trimmed.to_string()));
    }
    
    // Verificar caracteres peligrosos
    if DANGEROUS_CHARS.is_match(trimmed) {
        return Err(ValidationError::ContainsDangerousChars("plate".to_string()));
    }
    
    // Normalizar a mayúsculas
    Ok(trimmed.to_uppercase())
}

/// Valida nombre de usuario
pub fn validate_name(name: &str) -> Result<String, ValidationError> {
    let trimmed = name.trim();
    
    if trimmed.len() < 2 {
        return Err(ValidationError::TooShort {
            field: "name".to_string(),
            min: 2,
        });
    }
    
    if trimmed.len() > 100 {
        return Err(ValidationError::TooLong {
            field: "name".to_string(),
            max: 100,
        });
    }
    
    if !NAME_REGEX.is_match(trimmed) {
        return Err(ValidationError::InvalidName(trimmed.to_string()));
    }
    
    // Normalizar espacios
    let normalized = trimmed.split_whitespace().collect::<Vec<_>>().join(" ");
    Ok(normalized)
}

/// Valida email
pub fn validate_email(email: &str) -> Result<String, ValidationError> {
    let trimmed = email.trim().to_lowercase();
    
    if trimmed.len() > 255 {
        return Err(ValidationError::TooLong {
            field: "email".to_string(),
            max: 255,
        });
    }
    
    if !EMAIL_REGEX.is_match(&trimmed) {
        return Err(ValidationError::InvalidEmail(trimmed));
    }
    
    Ok(trimmed)
}

/// Sanitiza un string general (notas, descripciones)
pub fn sanitize_text(input: &str, max_length: usize) -> Result<String, ValidationError> {
    let trimmed = input.trim();
    
    if trimmed.len() > max_length {
        return Err(ValidationError::TooLong {
            field: "text".to_string(),
            max: max_length,
        });
    }
    
    // Reemplazar caracteres HTML peligrosos
    let sanitized = trimmed
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#x27;")
        .replace('&', "&amp;");
    
    Ok(sanitized)
}

/// Macro para validar todos los inputs de un comando Tauri
#[macro_export]
macro_rules! validate_args {
    ($plate:expr) => {
        validate_plate($plate)?
    };
    ($plate:expr, $name:expr) => {
        (validate_plate($plate)?, validate_name($name)?)
    };
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_plate() {
        assert_eq!(validate_plate("ABC-123").unwrap(), "ABC-123");
        assert_eq!(validate_plate("  abc-123  ").unwrap(), "ABC-123");
    }

    #[test]
    fn test_invalid_plate_too_short() {
        assert!(validate_plate("AB").is_err());
    }

    #[test]
    fn test_invalid_plate_dangerous_chars() {
        assert!(validate_plate("ABC<script>").is_err());
        assert!(validate_plate("ABC;DROP").is_err());
    }

    #[test]
    fn test_sql_injection_payload() {
        let payload = "'; DROP TABLE tickets; --";
        assert!(validate_plate(payload).is_err());
    }

    #[test]
    fn test_xss_payload() {
        let payload = "<img src=x onerror=alert(1)>";
        assert!(validate_plate(payload).is_err());
    }
}
```

```rust
// apps/desktop/src-tauri/src/commands.rs
// Comandos Tauri con validación integrada

use crate::validation::{validate_plate, validate_name, sanitize_text, ValidationError};

#[tauri::command]
pub async fn create_ticket(
    plate: String,
    vehicle_type: String,
    notes: Option<String>,
) -> Result<Ticket, String> {
    // CAPA 3: Validación en Rust
    let validated_plate = validate_plate(&plate)
        .map_err(|e| format!("Validation error: {}", e))?;
    
    let sanitized_notes = match notes {
        Some(n) => Some(sanitize_text(&n, 500)
            .map_err(|e| format!("Validation error: {}", e))?),
        None => None,
    };
    
    // Solo después de validar, procesamos
    let ticket = Ticket {
        id: uuid::Uuid::new_v4().to_string(),
        plate: validated_plate,
        vehicle_type: validate_vehicle_type(&vehicle_type)?,
        notes: sanitized_notes,
        created_at: chrono::Utc::now(),
    };
    
    // Guardar en SQLite local
    db::save_ticket(&ticket).map_err(|e| e.to_string())?;
    
    Ok(ticket)
}

fn validate_vehicle_type(vt: &str) -> Result<String, String> {
    match vt {
        "car" | "motorcycle" | "truck" | "other" => Ok(vt.to_string()),
        _ => Err("Tipo de vehículo inválido".to_string()),
    }
}
```

```toml
# apps/desktop/src-tauri/Cargo.toml
# Agregar dependencias de validación

[dependencies]
# ... dependencias existentes ...
regex = "1.10"
lazy_static = "1.4"
```

#### Capa 4: API — Fastify Validation Plugin

```typescript
// apps/print-agent/src/plugins/validation.ts
import fp from 'fastify-plugin';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

/**
 * Plugin de validación para Fastify
 * Valida inputs antes de llegar a los handlers
 */
export default fp(async function (app: FastifyInstance) {
  // Hook global de validación
  app.addHook('preValidation', async (req: FastifyRequest, reply: FastifyReply) => {
    const route = req.routerPath;
    
    // Validar parámetros de URL
    if (req.params) {
      for (const [key, value] of Object.entries(req.params)) {
        if (typeof value === 'string') {
          validateParam(value, key, reply);
        }
      }
    }
    
    // Validar query strings
    if (req.query) {
      for (const [key, value] of Object.entries(req.query)) {
        if (typeof value === 'string') {
          validateQuery(value, key, reply);
        }
      }
    }
    
    // Validar body (si es JSON)
    if (req.body && typeof req.body === 'object') {
      validateBody(req.body, reply);
    }
  });
});

function validateParam(value: string, key: string, reply: FastifyReply): void {
  // Validar placas en parámetros
  if (key === 'plate') {
    const plateRegex = /^[A-Z0-9-]{5,10}$/;
    if (!plateRegex.test(value.toUpperCase())) {
      reply.code(400).send({
        error: 'Invalid plate format',
        field: key,
        value: sanitizeForError(value),
      });
      throw new Error('Validation failed');
    }
  }
  
  // Validar IDs (solo UUIDs)
  if (key.endsWith('Id')) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(value)) {
      reply.code(400).send({
        error: 'Invalid ID format',
        field: key,
      });
      throw new Error('Validation failed');
    }
  }
}

function validateQuery(value: string, key: string, reply: FastifyReply): void {
  const maxLength = 100;
  
  if (value.length > maxLength) {
    reply.code(400).send({
      error: `Query parameter too long (max ${maxLength})`,
      field: key,
    });
    throw new Error('Validation failed');
  }
  
  // Prevenir XSS en queries de búsqueda
  if (key === 'q' || key === 'query' || key === 'search') {
    const dangerous = /[<>\"']/;
    if (dangerous.test(value)) {
      reply.code(400).send({
        error: 'Search query contains invalid characters',
        field: key,
      });
      throw new Error('Validation failed');
    }
  }
}

function validateBody(body: any, reply: FastifyReply): void {
  // Recursivamente validar strings en el body
  validateObjectStrings(body, '', reply);
}

function validateObjectStrings(obj: any, path: string, reply: FastifyReply): void {
  if (typeof obj === 'string') {
    const maxLength = 10000;
    if (obj.length > maxLength) {
      reply.code(400).send({
        error: `Field too long (max ${maxLength})`,
        field: path,
      });
      throw new Error('Validation failed');
    }
    
    // Detectar posibles payloads de inyección
    const injectionPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)\b)/i,
      /(<script|<iframe|<object|<embed)/i,
      /(javascript:|data:text\/html)/i,
    ];
    
    for (const pattern of injectionPatterns) {
      if (pattern.test(obj)) {
        reply.code(400).send({
          error: 'Potentially dangerous content detected',
          field: path,
        });
        throw new Error('Validation failed');
      }
    }
  } else if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      validateObjectStrings(item, `${path}[${index}]`, reply);
    });
  } else if (typeof obj === 'object' && obj !== null) {
    for (const [key, value] of Object.entries(obj)) {
      validateObjectStrings(value, path ? `${path}.${key}` : key, reply);
    }
  }
}

function sanitizeForError(value: string): string {
  return value.length > 50 ? `${value.substring(0, 50)}...` : value;
}
```

```typescript
// apps/print-agent/src/routes/tickets.ts
// Uso con validación de Fastify

import { FastifyInstance } from 'fastify';

export default async function ticketRoutes(app: FastifyInstance) {
  // Crear ticket — con validación automática del plugin
  app.post('/api/v1/tickets', {
    schema: {
      body: {
        type: 'object',
        required: ['plate', 'vehicleType'],
        properties: {
          plate: { 
            type: 'string', 
            pattern: '^[A-Z0-9-]{5,10}$',
            maxLength: 10 
          },
          vehicleType: { 
            type: 'string', 
            enum: ['car', 'motorcycle', 'truck', 'other'] 
          },
          notes: { 
            type: 'string', 
            maxLength: 500,
            pattern: '^[^<>\"\']*$'
          },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            plate: { type: 'string' },
            vehicleType: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    handler: async (req, reply) => {
      const { plate, vehicleType, notes } = req.body as any;
      
      // CAPA 4: Validación adicional en el handler
      const normalizedPlate = plate.toUpperCase().trim();
      
      // Usar parameterized queries (previene SQL injection)
      const result = await app.db.query(
        'INSERT INTO tickets (id, plate, vehicle_type, notes, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *',
        [crypto.randomUUID(), normalizedPlate, vehicleType, notes || null]
      );
      
      reply.code(201).send(result.rows[0]);
    },
  });
}
```

#### Capa 5: Base de Datos — Constraints

```sql
-- migrations/20240524_add_validation_constraints.sql
-- Constraints de base de datos como última línea de defensa

-- Validar formato de placa a nivel de base de datos
ALTER TABLE tickets
ADD CONSTRAINT chk_plate_format 
CHECK (plate ~ '^[A-Z0-9-]{5,10}$');

-- Limitar longitud de campos de texto
ALTER TABLE tickets
ADD CONSTRAINT chk_notes_length 
CHECK (LENGTH(notes) <= 500);

-- Enum para tipos de vehículo
ALTER TABLE tickets
ADD CONSTRAINT chk_vehicle_type 
CHECK (vehicle_type IN ('car', 'motorcycle', 'truck', 'other'));

-- Validar formato de email en tabla users
ALTER TABLE users
ADD CONSTRAINT chk_email_format 
CHECK (email ~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$');

-- Limitar longitud de nombres
ALTER TABLE users
ADD CONSTRAINT chk_name_length 
CHECK (LENGTH(full_name) BETWEEN 2 AND 100);

-- Prevenir caracteres de control en campos de texto
ALTER TABLE tickets
ADD CONSTRAINT chk_no_control_chars 
CHECK (plate !~ '[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]');
```

---

## 🔴 V-02: Falla en el Manejo de Sesiones/Tokens

**CWE**: CWE-287 (Improper Authentication), CWE-384 (Session Fixation)  
**OWASP Top 10 2021**: A01 — Broken Access Control  
**Severidad**: High  
**Estado**: Abierto

### Análisis de Impacto en Parkflow

Tu arquitectura involucra múltiples puntos de autenticación:
1. **Tauri Desktop**: Token almacenado en keyring (seguro)
2. **IPC**: Token pasado desde React a Rust
3. **API**: Token validado en Fastify/Spring Boot
4. **Base de datos**: Sesiones almacenadas en PostgreSQL

El riesgo es que un token comprometido permita:
- Acceso no autorizado a funciones de administrador
- Modificación de datos de tickets
- Acceso a información de otros usuarios (BOLA)

### Arquitectura de Tokens Segura

```
┌─────────────────────────────────────────────────────────────┐
│              ARQUITECTURA DE TOKENS SEGUROS                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Usuario] ──login──▶ [API Auth]                            │
│                         │                                   │
│                         ▼                                   │
│                  ┌──────────────┐                           │
│                  │   Emite:     │                           │
│                  │ - Access JWT │  (15 min, mínimo)         │
│                  │ - Refresh JWT│  (7 días, httpOnly cookie)│
│                  └──────┬───────┘                           │
│                         │                                   │
│                         ▼                                   │
│  [Tauri Desktop]  ┌─────────────┐                           │
│  ├── Access Token │  Keyring    │  (seguro, OS-level)       │
│  ├── Refresh Token│  Keyring    │  (seguro, OS-level)       │
│  └── Device ID    │  Keyring    │  (para vincular sesiones) │
│                   └─────────────┘                           │
│                         │                                   │
│                         ▼                                   │
│  [IPC Calls]            │ Access Token en header            │
│                         ▼                                   │
│  [API]                  │ Validar:                          │
│                         │ - Firma JWT                       │
│                         │ - Expiración (exp)                │
│                         │ - Revocación (blacklist Redis)    │
│                         │ - Device ID match                 │
│                         ▼                                   │
│  [PostgreSQL]  ┌──────────────────┐                        │
│                │  active_sessions │                        │
│                │  revoked_tokens  │                        │
│                └──────────────────┘                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Implementación

#### 1. Configuración JWT Segura (Fastify)

```typescript
// apps/print-agent/src/plugins/auth.ts
import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export default fp(async function (app: FastifyInstance) {
  // Registrar plugin JWT con configuración segura
  await app.register(jwt, {
    secret: process.env.JWT_SECRET!, // Mínimo 256 bits
    cookie: {
      cookieName: 'refreshToken',
      signed: false,
    },
    sign: {
      algorithm: 'HS256',
      expiresIn: '15m', // Access token: 15 minutos MÁXIMO
      issuer: 'parkflow-api',
      audience: 'parkflow-desktop',
    },
    verify: {
      algorithms: ['HS256'],
      clockTolerance: 30, // 30 segundos de tolerancia de reloj
      maxAge: '15m',
      issuer: 'parkflow-api',
      audience: 'parkflow-desktop',
    },
  });

  // Decorar Fastify con métodos de autenticación
  app.decorate('authenticate', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      await req.jwtVerify();
      
      // Verificar revocación
      const jti = (req.user as any)?.jti;
      if (jti && await isTokenRevoked(app, jti)) {
        reply.code(401).send({ error: 'Token revoked' });
        return;
      }
      
      // Verificar device ID (opcional pero recomendado)
      const deviceId = req.headers['x-device-id'] as string;
      const tokenDeviceId = (req.user as any)?.deviceId;
      if (deviceId && tokenDeviceId && deviceId !== tokenDeviceId) {
        reply.code(401).send({ error: 'Invalid device' });
        return;
      }
    } catch (err) {
      reply.code(401).send({ error: 'Unauthorized' });
    }
  });

  // Refresh token rotation
  app.decorate('refresh', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const refreshToken = req.cookies.refreshToken;
      if (!refreshToken) {
        reply.code(401).send({ error: 'No refresh token' });
        return;
      }

      // Verificar refresh token
      const decoded = app.jwt.verify(refreshToken, {
        maxAge: '7d',
      });

      // Revocar token anterior (rotación)
      await revokeToken(app, (decoded as any).jti);

      // Generar nuevos tokens
      const tokens = await generateTokenPair(app, {
        userId: (decoded as any).userId,
        role: (decoded as any).role,
        deviceId: (decoded as any).deviceId,
      });

      // Setear nueva cookie
      reply.setCookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
        path: '/',
      });

      reply.send({ accessToken: tokens.accessToken });
    } catch (err) {
      reply.code(401).send({ error: 'Invalid refresh token' });
    }
  });
});

async function isTokenRevoked(app: FastifyInstance, jti: string): Promise<boolean> {
  // En producción usar Redis
  const result = await app.db.query(
    'SELECT 1 FROM revoked_tokens WHERE jti = $1',
    [jti]
  );
  return result.rows.length > 0;
}

async function revokeToken(app: FastifyInstance, jti: string): Promise<void> {
  await app.db.query(
    'INSERT INTO revoked_tokens (jti, revoked_at) VALUES ($1, NOW())',
    [jti]
  );
}

async function generateTokenPair(
  app: FastifyInstance,
  payload: { userId: string; role: string; deviceId: string }
) {
  const jti = crypto.randomUUID();
  const refreshJti = crypto.randomUUID();

  const accessToken = app.jwt.sign({
    ...payload,
    jti,
    type: 'access',
  });

  const refreshToken = app.jwt.sign({
    userId: payload.userId,
    jti: refreshJti,
    type: 'refresh',
    deviceId: payload.deviceId,
  }, { expiresIn: '7d' });

  // Guardar en base de datos
  await app.db.query(
    `INSERT INTO active_sessions (jti, user_id, device_id, created_at, expires_at)
     VALUES ($1, $2, $3, NOW(), NOW() + INTERVAL '7 days')`,
    [refreshJti, payload.userId, payload.deviceId]
  );

  return { accessToken, refreshToken };
}
```

#### 2. Spring Boot JWT Configuration

```java
// apps/api/src/main/java/com/parkflow/config/JwtConfig.java
@Configuration
public class JwtConfig {

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${jwt.access-token.expiration:900000}") // 15 minutos
    private long accessTokenExpiration;

    @Value("${jwt.refresh-token.expiration:604800000}") // 7 días
    private long refreshTokenExpiration;

    @Bean
    public JwtEncoder jwtEncoder() {
        SecretKey key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
        JWKSource<SecurityContext> jwkSource = new ImmutableSecret<>(key);
        return new NimbusJwtEncoder(jwkSource);
    }

    @Bean
    public JwtDecoder jwtDecoder() {
        SecretKey key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withSecretKey(key).build();
        
        OAuth2TokenValidator<Jwt> withIssuer = JwtValidators.createDefaultWithIssuer("parkflow-api");
        OAuth2TokenValidator<Jwt> withAudience = AudienceValidator.of("parkflow-desktop");
        OAuth2TokenValidator<Jwt> validator = OAuth2TokenValidator
            .withValidators(withIssuer, withAudience, TokenExpiryValidator.INSTANCE);
        
        decoder.setJwtValidator(validator);
        return decoder;
    }

    @Bean
    public JwtTokenProvider jwtTokenProvider(JwtEncoder encoder) {
        return new JwtTokenProvider(encoder, accessTokenExpiration, refreshTokenExpiration);
    }
}

@Component
public class JwtTokenProvider {
    private final JwtEncoder encoder;
    private final long accessTokenExpiration;
    private final long refreshTokenExpiration;

    public TokenPair generateTokenPair(String userId, String role, String deviceId) {
        Instant now = Instant.now();
        
        JwtClaimsSet accessClaims = JwtClaimsSet.builder()
            .issuer("parkflow-api")
            .audience(List.of("parkflow-desktop"))
            .subject(userId)
            .id(UUID.randomUUID().toString())
            .issuedAt(now)
            .expiresAt(now.plusMillis(accessTokenExpiration))
            .claim("role", role)
            .claim("deviceId", deviceId)
            .claim("type", "access")
            .build();

        JwtClaimsSet refreshClaims = JwtClaimsSet.builder()
            .issuer("parkflow-api")
            .subject(userId)
            .id(UUID.randomUUID().toString())
            .issuedAt(now)
            .expiresAt(now.plusMillis(refreshTokenExpiration))
            .claim("deviceId", deviceId)
            .claim("type", "refresh")
            .build();

        return new TokenPair(
            encoder.encode(JwtEncoderParameters.from(accessClaims)).getTokenValue(),
            encoder.encode(JwtEncoderParameters.from(refreshClaims)).getTokenValue()
        );
    }
}
```

#### 3. Tauri — Almacenamiento Seguro en Keyring

```typescript
// apps/desktop/src/lib/auth.ts
import { invoke } from '@tauri-apps/api/core';

/**
 * Gestión segura de tokens usando keyring del sistema operativo
 * - macOS: Keychain
 * - Windows: Credential Manager
 * - Linux: Secret Service API / libsecret
 */

const SERVICE_NAME = 'com.parkflow.desktop';
const ACCESS_TOKEN_KEY = 'parkflow_access_token';
const REFRESH_TOKEN_KEY = 'parkflow_refresh_token';
const DEVICE_ID_KEY = 'parkflow_device_id';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Guarda tokens de forma segura en el keyring del sistema
 */
export async function storeTokens(tokens: TokenPair): Promise<void> {
  // Generar device ID único si no existe
  let deviceId = await getDeviceId();
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    await invoke('set_keyring_password', {
      service: SERVICE_NAME,
      account: DEVICE_ID_KEY,
      password: deviceId,
    });
  }

  // Guardar access token (corto plazo)
  await invoke('set_keyring_password', {
    service: SERVICE_NAME,
    account: ACCESS_TOKEN_KEY,
    password: tokens.accessToken,
  });

  // Guardar refresh token (largo plazo)
  await invoke('set_keyring_password', {
    service: SERVICE_NAME,
    account: REFRESH_TOKEN_KEY,
    password: tokens.refreshToken,
  });

  // Limpiar cualquier token anterior en localStorage (inseguro)
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}

/**
 * Recupera access token del keyring
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    return await invoke('get_keyring_password', {
      service: SERVICE_NAME,
      account: ACCESS_TOKEN_KEY,
    });
  } catch {
    return null;
  }
}

/**
 * Recupera refresh token del keyring
 */
export async function getRefreshToken(): Promise<string | null> {
  try {
    return await invoke('get_keyring_password', {
      service: SERVICE_NAME,
      account: REFRESH_TOKEN_KEY,
    });
  } catch {
    return null;
  }
}

/**
 * Recupera device ID
 */
export async function getDeviceId(): Promise<string | null> {
  try {
    return await invoke('get_keyring_password', {
      service: SERVICE_NAME,
      account: DEVICE_ID_KEY,
    });
  } catch {
    return null;
  }
}

/**
 * Elimina todos los tokens (logout)
 */
export async function clearTokens(): Promise<void> {
  await invoke('delete_keyring_password', {
    service: SERVICE_NAME,
    account: ACCESS_TOKEN_KEY,
  });
  await invoke('delete_keyring_password', {
    service: SERVICE_NAME,
    account: REFRESH_TOKEN_KEY,
  });
}

/**
 * API client con auto-refresh de token
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const accessToken = await getAccessToken();
  const deviceId = await getDeviceId();

  if (!accessToken) {
    throw new Error('No access token available');
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${accessToken}`,
      'X-Device-ID': deviceId || '',
      'Content-Type': 'application/json',
    },
  });

  // Si el token expiró, intentar refresh
  if (response.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      // Reintentar request con nuevo token
      return authenticatedFetch(url, options);
    }
    throw new Error('Session expired');
  }

  return response;
}

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return false;

  try {
    const response = await fetch('/api/v1/auth/refresh', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (response.ok) {
      const { accessToken } = await response.json();
      await invoke('set_keyring_password', {
        service: SERVICE_NAME,
        account: ACCESS_TOKEN_KEY,
        password: accessToken,
      });
      return true;
    }
  } catch {
    // Error de red
  }

  return false;
}
```

```rust
// apps/desktop/src-tauri/src/commands/auth.rs
// Comandos Rust para keyring

use tauri::command;
use keyring::Entry;

#[command]
pub fn set_keyring_password(service: String, account: String, password: String) -> Result<(), String> {
    let entry = Entry::new(&service, &account)
        .map_err(|e| format!("Keyring error: {}", e))?;
    
    entry.set_password(&password)
        .map_err(|e| format!("Failed to store password: {}", e))?;
    
    Ok(())
}

#[command]
pub fn get_keyring_password(service: String, account: String) -> Result<String, String> {
    let entry = Entry::new(&service, &account)
        .map_err(|e| format!("Keyring error: {}", e))?;
    
    entry.get_password()
        .map_err(|e| format!("Failed to retrieve password: {}", e))
}

#[command]
pub fn delete_keyring_password(service: String, account: String) -> Result<(), String> {
    let entry = Entry::new(&service, &account)
        .map_err(|e| format!("Keyring error: {}", e))?;
    
    entry.delete_password()
        .map_err(|e| format!("Failed to delete password: {}", e))?;
    
    Ok(())
}
```

#### 4. Base de Datos — Tablas de Sesión

```sql
-- migrations/20240524_add_session_tables.sql

-- Tabla para tokens revocados (blacklist)
CREATE TABLE revoked_tokens (
    jti UUID PRIMARY KEY,
    revoked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reason VARCHAR(50) DEFAULT 'logout'
);

CREATE INDEX idx_revoked_tokens_jti ON revoked_tokens(jti);

-- Tabla para sesiones activas
CREATE TABLE active_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    jti UUID NOT NULL UNIQUE,
    device_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_active_sessions_user_id ON active_sessions(user_id);
CREATE INDEX idx_active_sessions_jti ON active_sessions(jti);
CREATE INDEX idx_active_sessions_expires ON active_sessions(expires_at);

-- Limpiar sesiones expiradas automáticamente
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM active_sessions WHERE expires_at < NOW();
    DELETE FROM revoked_tokens WHERE revoked_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Job para limpieza (ejecutar cada hora)
-- En producción usar pg_cron o similar
```

#### 5. Configuración de Headers Seguros

```typescript
// apps/print-agent/src/plugins/security.ts
// Agregar a la configuración de cookies existente

// Cookie de refresh token
reply.setCookie('refreshToken', refreshToken, {
  httpOnly: true,        // No accesible vía JavaScript
  secure: process.env.NODE_ENV === 'production', // Solo HTTPS en producción
  sameSite: 'strict',    // No enviar en requests cross-site
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/api/v1/auth',  // Solo accesible en rutas de auth
  domain: undefined,     // Default del host
});

// Headers anti-secuestro de sesión
reply.header('X-Content-Type-Options', 'nosniff');
reply.header('X-Frame-Options', 'DENY');
reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
reply.header('Cache-Control', 'no-store, max-age=0, must-revalidate');
```

---

## 🔴 V-03: Configuración Insegura por Defecto

**CWE**: CWE-16 (Configuration), CWE-200 (Information Exposure)  
**OWASP Top 10 2021**: A05 — Security Misconfiguration  
**Severidad**: Medium  
**Estado**: Abierto

### Análisis de Impacto

Archivos de configuración expuestos pueden revelar:
- URLs de APIs internas
- Claves de base de datos
- Secrets de JWT
- Credenciales de servicios de terceros
- Información del entorno de desarrollo

### Checklist de Auditoría de Configuración

#### 1. Archivos a Revisar

```bash
# Crear script de auditoría
#!/bin/bash
# security/scripts/audit-config.sh

echo "=== Auditoría de Configuración ==="
echo ""

# 1. Buscar archivos .env comprometidos
echo "🔍 Buscando archivos .env..."
find . -name ".env*" -not -path "*/node_modules/*" -not -path "*/target/*"

# 2. Buscar credenciales hardcodeadas
echo ""
echo "🔍 Buscando credenciales hardcodeadas..."
grep -r -E "(password|secret|key|token)\s*[=:]\s*[\"'][^\"']{8,}[\"']" \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.json" \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=target \
  | grep -v "package.json" | grep -v "pnpm-lock"

# 3. Buscar configuraciones de debug
echo ""
echo "🔍 Buscando configuraciones de debug..."
grep -r -E "(debug|trace|verbose)\s*[:=]\s*true" \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.json" \
  --exclude-dir=node_modules --exclude-dir=.git

# 4. Verificar tauri.conf.json
echo ""
echo "🔍 Verificando tauri.conf.json..."
TAURI_CONF="apps/desktop/src-tauri/tauri.conf.json"
if [ -f "$TAURI_CONF" ]; then
  echo "  ✓ Archivo encontrado"
  
  # Verificar CSP
  if grep -q "dangerous" "$TAURI_CONF"; then
    echo "  ⚠️  Se encontraron configuraciones 'dangerous' en CSP"
  fi
  
  # Verificar allowlist
  if grep -q '"all": true' "$TAURI_CONF"; then
    echo "  ⚠️  Allowlist permite TODAS las APIs (inseguro)"
  fi
else
  echo "  ✗ Archivo no encontrado"
fi

# 5. Verificar package.json scripts
echo ""
echo "🔍 Verificando scripts de package.json..."
if grep -q "insecure" package.json 2>/dev/null; then
  echo "  ⚠️  Se encontró 'insecure' en package.json"
fi

echo ""
echo "=== Auditoría completada ==="
```

#### 2. Configuración Segura de Tauri

```json
// apps/desktop/src-tauri/tauri.conf.json
{
  "build": {
    "beforeBuildCommand": "pnpm build",
    "beforeDevCommand": "pnpm dev",
    "devPath": "http://localhost:3000",
    "distDir": "../dist"
  },
  "tauri": {
    "allowlist": {
      // ❌ NO permitir todo
      // "all": true
      
      // ✅ Permitir solo lo necesario
      "fs": {
        "all": false,
        "readFile": true,
        "writeFile": false,
        "readDir": true,
        "copyFile": false,
        "createDir": false,
        "removeDir": false,
        "removeFile": false,
        "renameFile": false,
        "exists": true
      },
      "shell": {
        "all": false,
        "open": true
      },
      "http": {
        "all": false,
        "request": true,
        "scope": [
          "https://api.parkflow.dev/*",
          "http://localhost:8080/*"
        ]
      },
      "dialog": {
        "all": false,
        "open": true,
        "save": false
      },
      "notification": {
        "all": true
      },
      "os": {
        "all": false
      }
    },
    "bundle": {
      "active": true,
      "category": "DeveloperTool",
      "copyright": "© 2026 Parkflow",
      "deb": {
        "depends": []
      },
      "externalBin": [],
      "icon": [
        "icons/32x32.png",
        "icons/128x128.png",
        "icons/128x128@2x.png",
        "icons/icon.icns",
        "icons/icon.ico"
      ],
      "identifier": "com.parkflow.desktop",
      "longDescription": "",
      "macOS": {
        "entitlements": null,
        "exceptionDomain": "",
        "frameworks": [],
        "providerShortName": null,
        "signingIdentity": null
      },
      "resources": [],
      "shortDescription": "",
      "targets": "all",
      "windows": {
        "certificateThumbprint": null,
        "digestAlgorithm": "sha256",
        "timestampUrl": ""
      }
    },
    "security": {
      "csp": "default-src 'self'; connect-src 'self' https://api.parkflow.dev http://localhost:8080; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self';",
      "dangerousDisableAssetCspModification": false,
      "freezePrototype": true,
      "dangerousRemoteDomainIpcAccess": []
    },
    "updater": {
      "active": true,
      "endpoints": [
        "https://api.parkflow.dev/updates/{{target}}/{{arch}}/{{current_version}}"
      ],
      "dialog": true,
      "pubkey": "dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IDg0NzQyQzAyQkJENw..."
    },
    "windows": [
      {
        "fullscreen": false,
        "height": 800,
        "resizable": true,
        "title": "Parkflow",
        "width": 1200,
        "minWidth": 800,
        "minHeight": 600
      }
    ]
  }
}
```

#### 3. Variables de Entorno Seguras

```bash
# .env.example (Este archivo SÍ se commitea — sin valores reales)
# =============================================================================
# Parkflow Environment Variables
# =============================================================================
# Copiar a .env y llenar con valores reales (NO commitear .env)

# Application
NODE_ENV=development
APP_NAME=parkflow
APP_VERSION=0.1.0

# Database (PostgreSQL)
# Formato: postgresql://user:password@host:port/database
DATABASE_URL=postgresql://USER:PASSWORD@localhost:6021/parkflow_dev
DB_SSL_MODE=disable

# JWT Secrets (Generar con: openssl rand -base64 32)
JWT_SECRET=CHANGE_ME_MIN_32_CHARS_BASE64
JWT_REFRESH_SECRET=CHANGE_ME_DIFFERENT_FROM_JWT_SECRET

# API Keys (Generar UUIDs)
PARKFLOW_API_KEY=CHANGE_ME_UUID
PARKFLOW_INTERNAL_API_KEY=CHANGE_ME_DIFFERENT_UUID

# Tauri/Desktop
TAURI_DEV_HOST=localhost
TAURI_FRONTEND_URL=http://localhost:3000

# Print Agent
PRINT_AGENT_PORT=3001
PRINT_AGENT_API_KEY=CHANGE_ME

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Feature Flags
ENABLE_ANALYTICS=false
ENABLE_CRASH_REPORTING=false

# Security
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_ENABLED=true
```

```bash
# .env (Este archivo NO se commitea — está en .gitignore)
# Valores reales solo aquí
DATABASE_URL=postgresql://parkflow:secret_password@localhost:6021/parkflow_dev
JWT_SECRET=aBcD1234eFgH5678iJkL9012mNoP3456
# ... etc
```

#### 4. Pre-commit Hook para Prevenir Leaks

```bash
# .husky/pre-commit (o .git/hooks/pre-commit)
#!/bin/bash
set -e

echo "🔍 Pre-commit security checks..."

# 1. Verificar que no se commiteen archivos .env
git diff --cached --name-only | while read file; do
  if [[ "$file" == *.env* ]] && [[ "$file" != *.env.example* ]]; then
    echo "❌ ERROR: Intentando commitear archivo .env: $file"
    echo "   Los archivos .env contienen secretos y NO deben commitearse."
    exit 1
  fi
done

# 2. Verificar que no haya secretos hardcodeados
git diff --cached -U0 | grep -E "(password|secret|key|token)\s*[=:]\s*[\"'][^\"']{8,}[\"']" && {
  echo "❌ ERROR: Posible secreto hardcodeado detectado en el diff"
  exit 1
} || true

# 3. Ejecutar gitleaks si está instalado
if command -v gitleaks &> /dev/null; then
  gitleaks protect --staged --verbose
fi

echo "✅ Pre-commit checks passed"
```

#### 5. Script de Build Seguro

```bash
#!/bin/bash
# scripts/build-secure.sh
# Script de build que verifica configuraciones antes de compilar

set -euo pipefail

echo "=== Secure Build Process ==="

# 1. Verificar que no hay secretos en el código
echo "🔍 Verificando secretos..."
gitleaks detect --source . --verbose || {
  echo "❌ Secretos detectados. Corregir antes de build."
  exit 1
}

# 2. Verificar configuración de Tauri
echo "🔍 Verificando tauri.conf.json..."
TAURI_CONF="apps/desktop/src-tauri/tauri.conf.json"

if grep -q '"all": true' "$TAURI_CONF"; then
  echo "❌ tauri.conf.json tiene 'all': true (inseguro)"
  exit 1
fi

if grep -q '"dangerousRemoteDomainIpcAccess": \[' "$TAURI_CONF"; then
  if grep -q '"dangerousRemoteDomainIpcAccess": \[\]' "$TAURI_CONF"; then
    echo "✓ dangerousRemoteDomainIpcAccess está vacío"
  else
    echo "⚠️ dangerousRemoteDomainIpcAccess tiene entradas — verificar manualmente"
  fi
fi

# 3. Verificar variables de entorno
echo "🔍 Verificando variables de entorno..."
if [ ! -f ".env.example" ]; then
  echo "❌ Falta .env.example"
  exit 1
fi

if [ -f ".env" ]; then
  echo "⚠️  .env existe — asegurarse de que NO se incluirá en el build"
fi

# 4. Verificar que no hay modo debug en producción
echo "🔍 Verificando modo debug..."
if grep -r "console.log" apps/*/src/ --include="*.ts" --include="*.tsx" | grep -v "// debug" > /dev/null; then
  echo "⚠️  console.log encontrados — considerar remover para producción"
fi

# 5. Build
echo "🔨 Ejecutando build..."
pnpm build:all

echo "✅ Secure build completed"
```

---

## 6. Plan de Implementación Priorizado

| Prioridad | Vulnerabilidad | Tiempo Est. | Impacto |
|-----------|---------------|-------------|---------|
| **P0** | V-02: Tokens JWT sin expiración | 2-3 días | Crítico — Acceso no autorizado |
| **P0** | V-01: Validación de entradas | 3-5 días | Alto — Inyección de datos |
| **P1** | V-03: Configuración insegura | 1-2 días | Medio — Info disclosure |

### Sprint Recomendado

**Sprint 14 — Semana 1-2:**
- Día 1-2: Implementar `validation.rs` (Capa 3 Rust)
- Día 3-4: Implementar `validation.ts` (Capa 1 Frontend + Capa 2 IPC)
- Día 5: Tests unitarios de validación

**Sprint 14 — Semana 3:**
- Día 1-2: Configurar JWT con expiración en API (Fastify/Spring)
- Día 3: Implementar keyring storage en Tauri
- Día 4: Tablas de sesión en PostgreSQL
- Día 5: Integration tests

**Sprint 15 — Semana 1:**
- Día 1: Auditoría de configuración
- Día 2: Hardening de tauri.conf.json
- Día 3: Pre-commit hooks
- Día 4-5: Documentación y ZAP re-scan

---

*Documento generado para remediación de vulnerabilidades críticas*  
*Estándares: OWASP Top 10 2021, ASVS Level 2, ISO/IEC 25010*
