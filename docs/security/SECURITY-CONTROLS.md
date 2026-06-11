# Security Controls Implementation

## 1. Next.js Web Application (`apps/web`)

### Content Security Policy (CSP)

```typescript
// apps/web/src/middleware/security.ts
import { NextRequest, NextResponse } from 'next/server';

export function securityHeaders(req: NextRequest) {
  const response = NextResponse.next();
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');

  const csp = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https: 'unsafe-inline';
    style-src 'self' 'nonce-${nonce}' https: 'unsafe-inline';
    img-src 'self' blob: data: https://*.parkflow.dev;
    font-src 'self' https://fonts.gstatic.com;
    connect-src 'self' https://api.parkflow.dev ws://localhost:*;
    frame-ancestors 'none';
    base-uri 'self';
    form-action 'self';
    upgrade-insecure-requests;
  `.replace(/\s+/g, ' ').trim();

  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp');

  // Anti-clickjacking additional
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

### Secure Cookie Configuration

```typescript
// apps/web/src/lib/auth.ts
export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 60 * 60 * 8, // 8 hours
  path: '/',
};
```

### Input Validation (Zod)

```typescript
// apps/web/src/lib/validation.ts
import { z } from 'zod';

export const plateSchema = z.string()
  .min(5, 'Plate must be at least 5 characters')
  .max(10, 'Plate must be at most 10 characters')
  .regex(/^[A-Z0-9-]+$/, 'Invalid plate format')
  .transform(val => val.toUpperCase().trim());

export const ticketQuerySchema = z.object({
  query: z.string().max(100).optional(),
  page: z.coerce.number().min(1).max(100).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
});
```

---

## 2. Fastify API (`apps/print-agent`)

### Security Plugin

```typescript
// apps/print-agent/src/plugins/security.ts
import fp from 'fastify-plugin';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { FastifyInstance } from 'fastify';

export default fp(async function (app: FastifyInstance) {
  // Helmet: Security headers
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'same-origin' },
    dnsPrefetchControl: { allow: false },
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    hsts: { maxAge: 63072000, includeSubDomains: true, preload: true },
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: { permittedPolicies: 'none' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xssFilter: true,
  });

  // CORS: Strict origin control
  await app.register(cors, {
    origin: (origin, cb) => {
      const allowedOrigins = [
        'http://localhost:3000',
        'https://app.parkflow.dev',
        'https://admin.parkflow.dev',
      ];
      
      if (!origin || allowedOrigins.includes(origin)) {
        cb(null, true);
        return;
      }
      
      app.log.warn(`CORS blocked request from origin: ${origin}`);
      cb(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-CSRF-Token',
      'X-Request-ID',
    ],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-Request-ID'],
    maxAge: 86400, // 24 hours
  });

  // Rate Limiting
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    keyGenerator: (req) => {
      // Use authenticated user ID if available, fallback to IP
      return (req.user as any)?.id || req.ip;
    },
    errorResponseBuilder: (req, context) => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Retry after ${context.after}`,
      retryAfter: context.after,
    }),
    addHeadersOnExceeding: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
    },
    onExceeded: async (req) => {
      app.log.warn(`Rate limit exceeded for ${req.ip}`);
    },
  });

  // Additional: Request ID tracking
  app.addHook('onRequest', async (req, reply) => {
    req.id = req.headers['x-request-id'] || crypto.randomUUID();
    reply.header('X-Request-ID', req.id);
  });

  // Additional: Security logging
  app.addHook('onSend', async (req, reply, payload) => {
    // Remove sensitive headers from logs
    const sanitizedHeaders = { ...reply.getHeaders() };
    delete (sanitizedHeaders as any)['set-cookie'];
    
    app.log.debug({
      reqId: req.id,
      method: req.method,
      url: req.url,
      statusCode: reply.statusCode,
      headers: sanitizedHeaders,
    }, 'Response sent');
  });
});
```

### Authentication Hook

```typescript
// apps/print-agent/src/hooks/auth.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;

export async function authenticate(req: FastifyRequest, reply: FastifyReply) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'],
      clockTolerance: 30,
      maxAge: '1h',
    });

    req.user = decoded;
  } catch (err) {
    req.log.warn({ err }, 'Authentication failed');
    return reply.status(401).send({ error: 'Invalid or expired token' });
  }
}
```

---

## 3. Spring Boot API (`apps/api`)

### Security Configuration (Java)

```java
// apps/api/src/main/java/com/parkflow/config/SecurityConfig.java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .headers(headers -> headers
                .contentSecurityPolicy(csp -> csp
                    .policyDirectives("default-src 'self'; script-src 'self'")
                )
                .frameOptions(frameOptions -> frameOptions.deny())
                .xssProtection(xss -> xss.headerValue(XXssProtectionHeaderWriter.HeaderValue.ENABLED_MODE_BLOCK))
                .referrerPolicy(referrer -> referrer.policy(ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
                .permissionsPolicy(permissions -> permissions
                    .policy("camera=(), microphone=(), geolocation=(self)")
                )
                .httpStrictTransportSecurity(hsts -> hsts
                    .includeSubDomains(true)
                    .maxAgeInSeconds(63072000)
                )
            )
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/v1/health").permitAll()
                .requestMatchers("/api/v1/public/**").permitAll()
                .anyRequest().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtConverter()))
            );

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(List.of(
            "http://localhost:3000",
            "https://app.parkflow.dev"
        ));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-CSRF-Token"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(86400L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
```

### Rate Limiting (Bucket4j)

```java
// apps/api/src/main/java/com/parkflow/config/RateLimitConfig.java
@Configuration
public class RateLimitConfig {

    @Bean
    public RateLimiter rateLimiter() {
        Bandwidth limit = Bandwidth.classic(100, Refill.intervally(100, Duration.ofMinutes(1)));
        return RateLimiter.builder()
            .addLimit(BucketConfiguration.builder()
                .addLimit(limit)
                .build())
            .build();
    }
}

@RestController
public class TicketController {

    @Autowired
    private RateLimiter rateLimiter;

    @GetMapping("/api/v1/validate-plate")
    public ResponseEntity<?> validatePlate(@RequestParam String plate) {
        if (!rateLimiter.tryConsume(1)) {
            return ResponseEntity.status(429)
                .body(Map.of("error", "Rate limit exceeded", "retryAfter", 60));
        }
        // ... business logic
    }
}
```

---

## 4. Tauri Desktop Application (`apps/desktop`)

### CSP in Tauri Config

```json
// apps/desktop/src-tauri/tauri.conf.json
{
  "security": {
    "csp": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.parkflow.dev;",
    "dangerousDisableAssetCspModification": false,
    "freezePrototype": true,
    "dangerousRemoteDomainIpcAccess": []
  }
}
```

### Secure IPC Commands

```rust
// apps/desktop/src-tauri/src/commands.rs
use tauri::command;
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
pub struct PrintRequest {
    ticket_id: String,
    printer_id: String,
}

#[derive(Serialize)]
pub struct PrintResponse {
    success: bool,
    message: String,
}

#[command]
pub async fn print_ticket(request: PrintRequest) -> Result<PrintResponse, String> {
    // Validate ticket_id format
    if !request.ticket_id.chars().all(|c| c.is_alphanumeric() || c == '-') {
        return Err("Invalid ticket ID format".to_string());
    }

    // Validate printer_id
    if request.printer_id.is_empty() || request.printer_id.len() > 100 {
        return Err("Invalid printer ID".to_string());
    }

    // Execute print logic...
    Ok(PrintResponse {
        success: true,
        message: format!("Ticket {} sent to printer {}", request.ticket_id, request.printer_id),
    })
}
```

---

## 5. Database Security

### PostgreSQL

```sql
-- Use parameterized queries (via ORM/Query Builder)
-- NEVER concatenate SQL strings

-- ✅ Good (TypeORM example)
const user = await userRepository.findOne({
  where: { email: userInput }  // Automatically parameterized
});

-- ❌ Bad
const query = `SELECT * FROM users WHERE email = '${userInput}'`;
```

### Connection Security

```yaml
# infra/docker-compose.yml (production additions)
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_INITDB_ARGS: "--auth-host=scram-sha-256"
    command: >
      postgres
      -c ssl=on
      -c ssl_cert_file=/etc/ssl/certs/server.crt
      -c ssl_key_file=/etc/ssl/private/server.key
      -c password_encryption=scram-sha-256
    volumes:
      - ./ssl:/etc/ssl:ro
    networks:
      - backend
    # No exposed ports in production — only internal network
```

---

## 6. Environment Security

### Required Environment Variables

```bash
# .env.example (committed to repo)
# NEVER commit .env with real values

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/parkflow
DB_SSL_MODE=require

# JWT
JWT_SECRET=change-me-in-production-min-32-chars
JWT_ALGORITHM=HS256
JWT_EXPIRATION=1h

# API Keys
PARKFLOW_API_KEY=change-me
PARKFLOW_INTERNAL_API_KEY=change-me

# Security
NODE_ENV=production
ENABLE_RATE_LIMIT=true
CORS_ORIGIN=https://app.parkflow.dev
TRUST_PROXY=true

# Logging
LOG_LEVEL=info
LOG_SENSITIVE_FIELDS=password,token,secret,key
```

---

*Last updated: 2026-05-24*
