# ParkFlow Documentation

Complete documentation for the ParkFlow hybrid offline-first parking management platform.

---

## 📚 Core Documentation

### Architecture & Design
- **[ARCHITECTURE.md](ARCHITECTURE.md)** — Project structure, hexagonal architecture, module organization, layer responsibilities
- **[ARCHITECTURE_ENFORCEMENT.md](ARCHITECTURE_ENFORCEMENT.md)** — Architectural standards, service decomposition rules, mandatory patterns
- **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** — Cheat sheet for common development tasks, ADR links, quick navigation

### Database & Migrations
- **[DATABASE.md](DATABASE.md)** — Schema overview, Flyway baseline (V001), multi-tenant setup, RLS policies
- **[MIGRATION_STRATEGY.md](MIGRATION_STRATEGY.md)** — Creating new migrations, testing strategy, disaster recovery

### Operations & Deployment
- **[OPERATIONS.md](OPERATIONS.md)** — Database backups, monitoring, disaster recovery, troubleshooting
- **[PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md)** — Pre-release verification, deployment steps, validation

### Code Quality & Standards
- **[TYPE_SAFETY.md](TYPE_SAFETY.md)** — TypeScript strict mode, type checking standards, frontend type safety
- **[TEST_ORGANIZATION.md](TEST_ORGANIZATION.md)** — Test structure, unit vs. integration, test naming conventions
- **[SECURITY_AUDIT.md](SECURITY_AUDIT.md)** — Security review findings, vulnerabilities, mitigations

### Development Guides
- **[MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)** — Complete migration documentation for database changes
- **[ARIA_LABEL_GUIDE.md](ARIA_LABEL_GUIDE.md)** — Accessibility standards, ARIA label usage, a11y best practices
- **[AGENTS.md](AGENTS.md)** — Available development agents, MCP tools, automation

### Change History
- **[CHANGELOG.md](CHANGELOG.md)** — Version history, release notes, major changes

---

## 🚀 Quick Start Paths

### New Backend Developer
1. Read [ARCHITECTURE.md](ARCHITECTURE.md) — understand hexagonal layers
2. Read [ARCHITECTURE_ENFORCEMENT.md](ARCHITECTURE_ENFORCEMENT.md) — learn the rules
3. Check [QUICK_REFERENCE.md](QUICK_REFERENCE.md) — find specific patterns

### New Frontend Developer
1. Read [ARCHITECTURE.md](ARCHITECTURE.md#-frontend-architecture) — Next.js structure
2. Check [TYPE_SAFETY.md](TYPE_SAFETY.md) — TypeScript rules
3. Review [ARIA_LABEL_GUIDE.md](ARIA_LABEL_GUIDE.md) — accessibility requirements

### Database Changes
1. Read [DATABASE.md](DATABASE.md) — understand current schema
2. Follow [MIGRATION_STRATEGY.md](MIGRATION_STRATEGY.md) — create migrations properly
3. Check [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) — detailed step-by-step

### Before Production Release
1. Use [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md) — verify everything
2. Review [SECURITY_AUDIT.md](SECURITY_AUDIT.md) — check security requirements
3. Follow [OPERATIONS.md](OPERATIONS.md#deployment) — deploy safely

---

## 📋 Living Documentation Policy

**These documents are LIVE and should be updated when:**
- Architectural standards change
- New patterns are established
- Operational procedures change
- Security best practices evolve

**Historical Reports** (Deleted)
- Completion reports, audit summaries, and refactoring status reports are archived in git history
- Only active development documentation is kept in this folder
- Check git log if you need historical context: `git log --oneline -- docs/`

---

## 🔗 Important Links

**In-Code Documentation:**
- Main project guide: [`/CLAUDE.md`](../CLAUDE.md) — mandatory reading, contains project standards

**Related Locations:**
- Backend code: `/apps/api/src/main/java/com/parkflow/`
- Frontend code: `/apps/web/src/`
- Database migrations: `/apps/api/src/main/resources/db/migration/`
- Infrastructure: `/infra/docker-compose.yml`

---

## ✅ Documentation Status

**Last Updated:** 2026-06-26  
**Coverage:** 14 active documents  
**Redundant Files Removed:** 12 historical reports and audit summaries  

**Complete with:**
- ✅ Architecture standards (hexagonal, service decomposition)
- ✅ Database schema and migration guides
- ✅ Operational procedures and checklists
- ✅ Security and type safety standards
- ✅ Accessibility requirements
- ✅ Development workflows and quick references
