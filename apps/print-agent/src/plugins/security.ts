import fp from 'fastify-plugin';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

/**
 * Security Plugin for Parkflow Print Agent (Fastify)
 * 
 * Configures:
 * - Helmet security headers
 * - CORS with strict origin whitelist
 * - Rate limiting per IP/user
 * - Request ID tracking
 * - Security audit logging
 */

export default fp(async function (app: FastifyInstance) {
  // Helmet: Comprehensive HTTP header hardening
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
    hsts: {
      maxAge: 63072000,
      includeSubDomains: true,
      preload: true,
    },
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: { permittedPolicies: 'none' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xssFilter: true,
  });

  // CORS: Strict origin validation
  await app.register(cors, {
    origin: (origin, cb) => {
      const allowedOrigins = [
        'http://localhost:3000',
        'https://app.parkflow.dev',
        'https://admin.parkflow.dev',
        'tauri://localhost',
      ];

      if (!origin || allowedOrigins.includes(origin)) {
        cb(null, true);
        return;
      }

      app.log.warn({ origin }, 'CORS blocked request from unauthorized origin');
      cb(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-CSRF-Token',
      'X-Request-ID',
      'X-API-Key',
    ],
    exposedHeaders: [
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
      'X-Request-ID',
    ],
    maxAge: 86400,
  });

  // Rate Limiting: Prevent brute force and abuse
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    keyGenerator: (req: FastifyRequest) => {
      // Use authenticated user ID if available, fallback to IP
      return (req as any).user?.id || req.ip;
    },
    errorResponseBuilder: (req: FastifyRequest, context) => ({
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
    onExceeded: async (req: FastifyRequest) => {
      app.log.warn({ ip: req.ip, path: req.url }, 'Rate limit exceeded');
    },
  });

  // Request ID tracking for audit trails
  app.addHook('onRequest', async (req: FastifyRequest, reply: FastifyReply) => {
    req.id = (req.headers['x-request-id'] as string) || crypto.randomUUID();
    reply.header('X-Request-ID', req.id);
  });

  // Security audit logging
  app.addHook('onSend', async (req: FastifyRequest, reply: FastifyReply, payload: string) => {
    const sanitizedHeaders = { ...reply.getHeaders() };
    delete (sanitizedHeaders as any)['set-cookie'];

    app.log.debug(
      {
        reqId: req.id,
        method: req.method,
        url: req.url,
        statusCode: reply.statusCode,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      },
      'Response sent'
    );
  });
});
