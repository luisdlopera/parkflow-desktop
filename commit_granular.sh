#!/bin/bash
set -e

# 1. Backend: DB Migrations
git add apps/api/src/main/resources/db/migration/
if ! git diff --cached --quiet; then
  git commit -m "chore(db): add multi-tenant DB migrations for email and device fingerprint"
fi

# 2. Backend: Auth & Audit
git add apps/api/src/main/java/com/parkflow/modules/audit/ apps/api/src/main/java/com/parkflow/modules/auth/ apps/api/src/main/java/com/parkflow/modules/onboarding/ apps/api/src/test/java/com/parkflow/modules/auth/ apps/api/src/main/resources/application.yml || true
if ! git diff --cached --quiet; then
  git commit -m "feat(api): enhance auth, audit logging, and onboarding flows"
fi

# 3. Backend: Configuration & Settings
git add apps/api/src/main/java/com/parkflow/config/ apps/api/src/main/java/com/parkflow/modules/configuration/ || true
if ! git diff --cached --quiet; then
  git commit -m "feat(api): add feature configuration endpoints and settings management"
fi

# 4. Backend: Parking Operations
git add apps/api/src/main/java/com/parkflow/modules/parking/operation/ apps/api/src/test/java/com/parkflow/modules/parking/operation/ || true
if ! git diff --cached --quiet; then
  git commit -m "refactor(api): modularize RegisterEntryService and improve parking operation validations"
fi

# 5. Frontend: Forms Validation Fix
git add apps/web/src/components/forms/VehicleEntryFormV2.tsx apps/web/src/components/forms/car/CarEntryFormUI.tsx apps/web/src/components/forms/motorcycle/MotorcycleEntryFormUI.tsx || true
if ! git diff --cached --quiet; then
  git commit -m "fix(web): resolve React Hook Form reactivity issue in vehicle entry forms"
fi

# 6. Frontend: App & Remaining Features
git add apps/web/ .prettierignore .prettierrc || true
if ! git diff --cached --quiet; then
  git commit -m "refactor(web): extract features to module-based structure, add local-first support, and update UI pages"
fi

echo "All commits completed successfully."
