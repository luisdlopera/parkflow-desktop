# Decisiones de arquitectura

1) Monorepo con pnpm workspaces
- Permite versionado coordinado y tooling unificado.

2) Backend separado en Spring Boot
- Facilita escalabilidad, auditoria y seguridad empresarial.

3) Prisma temporal en apps/web
- Mantiene continuidad mientras se migra a Flyway + JPA.
