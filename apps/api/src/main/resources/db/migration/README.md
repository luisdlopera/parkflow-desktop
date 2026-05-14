# Migration Baseline (Development)

This project is currently in **development mode** and uses a consolidated Flyway baseline:

- `V001__initial_schema.sql`
- `V002__seed_base_data.sql`
- `V003__indexes_and_constraints.sql`

## Important

The old incremental files (`V1..V14`) were intentionally consolidated. If your local DB already had the old history, do a clean reset.

## Safe local reset

1. Start infra:

```bash
pnpm db:up
```

2. Reset schema:

```bash
docker exec -i parkflow-postgres psql -U parkflow -d parkflow_dev -v ON_ERROR_STOP=1 -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
```

3. Re-run migrations:

```bash
pnpm db:migrate
```

4. Validate backend tests/build:

```bash
pnpm test:api
pnpm build:api
```

## Team note

All team members must reset local DB once after pulling this migration consolidation.
