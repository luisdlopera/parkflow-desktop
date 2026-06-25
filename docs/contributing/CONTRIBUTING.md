# Contributing to ParkFlow

Thank you for your interest in contributing to ParkFlow! This document provides guidelines to ensure a smooth contribution experience.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Development Requirements](#development-requirements)
- [Local Setup](#local-setup)
- [Code Conventions](#code-conventions)
- [Git Workflow](#git-workflow)
- [Commit Convention](#commit-convention)
- [How to Report Bugs](#how-to-report-bugs)
- [How to Request Features](#how-to-request-features)
- [Running Tests](#running-tests)
- [Linting & Formatting](#linting--formatting)
- [Pull Request Process](#pull-request-process)
- [Merge Checklist](#merge-checklist)

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Development Requirements

| Tool       | Version   | Purpose                    |
|------------|-----------|----------------------------|
| Node.js    | 20+       | Frontend, tooling, scripts |
| pnpm       | 10+       | Package manager            |
| Java       | 21 (JDK)  | Backend API                |
| Docker     | Latest    | Local database             |
| Rust       | 1.70+     | Desktop (Tauri)            |
| PostgreSQL | 16        | Production database        |

## Local Setup

```bash
# 1. Clone the repository
git clone https://github.com/luisdlopera/parkflow-desktop.git
cd parkflow-desktop

# 2. Install dependencies
pnpm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your values (see .env.example for details)

# 4. Start infrastructure (PostgreSQL)
pnpm db:up

# 5. Run database migrations
pnpm db:migrate

# 6. Start development servers
pnpm dev:api    # Terminal 1 - Backend on :6011
pnpm dev:web    # Terminal 2 - Frontend on :6001
```

## Code Conventions

### General Principles

- Follow **SOLID** principles and **Clean Architecture**
- Keep functions small with a single responsibility
- Write self-documenting code over adding comments
- No dead code, commented-out code, or TODO stubs
- Use meaningful, business-oriented naming

### Backend (Java/Spring Boot)

- **Architecture**: Hexagonal (`domain/` → `application/service/` → `infrastructure/controller/`)
- **Package structure**: Each feature module in `com.parkflow.modules.<module>`
- **DI**: Constructor injection only — no field injection
- **DTOs**: Separate request/response DTOs; never expose entities directly
- **Validation**: Use `jakarta.validation` annotations on DTOs
- **Tests**: JUnit 5 + Mockito + Testcontainers for integration tests

### Frontend (TypeScript/React/Next.js)

- **Framework**: Next.js App Router with route groups
- **UI Library**: HeroUI v3 exclusively (`@heroui/react`) — no raw HTML elements for form controls
- **Components**: Small, focused components with composable patterns
- **Hooks**: Feature hooks in `src/features/<feature>/hooks/`, shared hooks in `src/hooks/`
- **API calls**: Via `src/lib/api/` or `src/lib/settings-api.ts`
- **State**: React hooks initially; Zustand for cross-cutting stores
- **Styling**: Tailwind CSS v4 with `border border-slate-200` (no box shadows)
- **Types**: Shared types in `packages/types/`, local types co-located with feature

### Rust (Desktop/Tauri)

- Follow standard Rust 2021 edition idioms
- Use `anyhow` for error handling
- Tests with `#[cfg(test)]` modules and `#[tokio::test]` for async

## Git Workflow

We use a simplified **Git Flow** model:

- **`main`**: Production-ready code. All commits here are deployable.
- **`develop`**: Integration branch for ongoing work.
- **Feature branches**: `feature/<name>` — branched from `develop`, merged back via PR.
- **Fix branches**: `fix/<issue>` — for bug fixes.
- **Release branches**: `release/<version>` — release preparation.

```
main ────────●───────────────●──────────
             \             /
develop ─────●────●───●───●────────────
              \  /     \/
feature/xxx    ●●       ●
```

## Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type       | Usage                             |
|------------|-----------------------------------|
| `feat`     | New feature                       |
| `fix`      | Bug fix                           |
| `refactor` | Code change without fix/feature   |
| `perf`     | Performance improvement           |
| `test`     | Adding or fixing tests            |
| `docs`     | Documentation only                |
| `chore`    | Build, CI, tooling, dependencies  |
| `style`    | Formatting, linting (no logic)    |
| `ci`       | CI/CD changes                     |
| `security` | Security fixes                    |

### Scope

Use the module name: `api`, `web`, `desktop`, `print-agent`, `types`, `print-core`, `infra`, `docs`, `ci`, `deps`.

### Examples

```
feat(api): add parking space capacity endpoint
fix(web): resolve hydration error in dropdown component
docs(readme): update setup instructions
test(api): add integration tests for onboarding flow
ci: add dependency caching to build workflow
security(api): fix JWT token validation bypass
```

## How to Report Bugs

1. **Check existing issues** — search open/closed issues to avoid duplicates.
2. **Open a Bug Report** using the [Bug Report template](.github/ISSUE_TEMPLATE/bug_report.md).
3. Include:
   - ParkFlow version and environment
   - Steps to reproduce (minimal, complete, verifiable)
   - Expected vs actual behavior
   - Screenshots, logs, or network traces
   - Correlation ID if available

> **Security vulnerabilities**: Do NOT open a public issue. Email `security@parkflow.dev` instead.

## How to Request Features

1. **Search existing issues** and discussions to see if the feature is already planned.
2. **Open a Feature Request** using the [Feature Request template](.github/ISSUE_TEMPLATE/feature_request.md).
3. Describe:
   - Problem statement (what problem does this solve?)
   - Proposed solution
   - Alternative solutions considered
   - How this aligns with ParkFlow's architecture

## Running Tests

```bash
# Run all tests across the monorepo
pnpm test

# Backend tests (Java)
pnpm test:api

# Frontend tests (TypeScript)
pnpm test:web

# Desktop tests (Rust)
pnpm test:desktop

# E2E tests
pnpm test:e2e

# Coverage reports
pnpm test:api -- --no-build-cache # JaCoCo → apps/api/build/reports/
pnpm test:web:coverage             # Vitest → apps/web/coverage/
```

## Linting & Formatting

```bash
# Lint backend (Java)
cd apps/api && ./gradlew checkstyleMain checkstyleTest

# Lint frontend (TypeScript)
pnpm lint:web

# Format with Prettier
pnpm exec prettier --check "apps/web/src/**/*.{ts,tsx}"

# Auto-fix formatting
pnpm exec prettier --write "apps/web/src/**/*.{ts,tsx}"
```

The linter runs automatically in CI. All warnings must be resolved before merge.

## Pull Request Process

1. **Create a feature/fix branch** from `develop`:
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/my-feature
   ```

2. **Make your changes** following code conventions.

3. **Commit** using Conventional Commits format.

4. **Verify locally**:
   ```bash
   pnpm validate   # Build + lint + test all changed modules
   ```

5. **Push and open a PR** against `develop`:
   - Fill out the [PR template](.github/pull_request_template.md)
   - Add clear description of changes
   - Link related issues
   - Add screenshots for UI changes

6. **Address review feedback** — make requested changes and re-request review.

7. **Merge** after:
   - At least one approval from a maintainer
   - All CI checks pass
   - No merge conflicts

## Merge Checklist

Before requesting review, verify all items:

### Code Quality
- [ ] Follows existing patterns and conventions
- [ ] No dead code, TODOs, or console.log statements
- [ ] Imports are clean and properly ordered
- [ ] No TypeScript/Java compilation warnings
- [ ] No lint warnings in changed files

### Testing
- [ ] Unit tests added/updated for new functionality
- [ ] Integration tests added for API endpoints
- [ ] All existing tests pass locally
- [ ] New code has >= 80% coverage (90% for business logic)

### Architecture
- [ ] Follows hexagonal architecture (backend) / layered architecture (frontend)
- [ ] No circular dependencies introduced
- [ ] API follows REST conventions with proper status codes
- [ ] Error handling uses standardized patterns

### Security
- [ ] Input validation on all user-facing endpoints
- [ ] Proper authorization checks
- [ ] No secrets or credentials in code
- [ ] Rate limiting considered for new endpoints

### Documentation
- [ ] API endpoints documented (Swagger annotations)
- [ ] README updated if needed
- [ ] CHANGELOG.md updated under [Unreleased]
- [ ] Breaking changes communicated

### CI
- [ ] `pnpm validate` passes
- [ ] No new SonarCloud issues
- [ ] CodeQL / security scan passes
