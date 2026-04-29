# Decisiones de arquitectura

1) Monorepo con pnpm workspaces
- Permite versionado coordinado y tooling unificado.

2) Backend separado en Spring Boot
- Facilita escalabilidad, auditoria y seguridad empresarial.
- Usa Flyway + JPA para persistencia.
