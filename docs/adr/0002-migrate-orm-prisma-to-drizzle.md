# 0002. Migrate from Prisma to Drizzle ORM

Date: 2026-10-01

## Status

Accepted

## Context

The application initially used Prisma ORM with `@prisma/adapter-pg` and `@prisma/client` for database access and schema migrations. While Prisma provided rapid early prototyping and automated migrations, it introduced several constraints:

1. **Heavy Runtime Overhead and Engine Dependencies**: Prisma requires generating a binary or wasm runtime engine (`prisma generate`) during builds and postinstall scripts, increasing container startup time and package footprint.
2. **Abstract Query Modeling**: Prisma abstracts SQL queries behind a proprietary query engine, complicating fine-grained SQL optimizations, partial projections, and complex aggregation queries (such as net user balance calculations).
3. **Implicit Type Leaks**: Domain entities and route test suites occasionally imported types directly from `@prisma/client` (e.g. `TransactionType`, `Prisma.Decimal`), compromising architectural boundaries between domain definitions and persistence mechanisms.

## Decision

We replace Prisma with Drizzle ORM paired with `postgres.js`:

### 1. Underlying Driver & Database Client

- Use `postgres` (`postgres.js`) as the underlying database driver.
- Instantiate the Drizzle client in `src/db/index.ts` using connection pooling configured via `DATABASE_URL`.
- Cleanly separate the database connection lifecycle from repository implementations.

### 2. Modular Schema Organization

- Define database tables, relations, and enums modularly in `src/db/schema/` (`users.ts`, `transactions.ts`, `events.ts`, `relations.ts`), re-exported from `src/db/schema/index.ts`.
- Enforce domain naming consistent with `GLOSSARY.md` (`User`, `Transaction`, `Event`, `Balance`).

### 3. Migration and Test Synchronization

- Use `drizzle-kit` for schema management.
- For development and production, generate immutable SQL migrations in `drizzle/` via `drizzle-kit generate`.
- For automated test suites (`jest.global-setup.js`), synchronize the test schema using `drizzle-kit push` against the test container (`postgres-test`).
- Replace Prisma cleanup hooks in `jest.setup-after-env.js` with Drizzle-based table truncation.

### 4. Query Paradigms and Decimal Precision

- Repositories (`PostgresUserRepository`, `PostgresTransactionRepository`, `PostgresEventRepository`) implement domain repository interfaces without leaking Drizzle types.
- Relational queries (`db.query`) are used for structured lookups, while Drizzle's query builder and SQL aggregates (`sql`, `sum`) are used for balance aggregations.
- Monetary amounts in PostgreSQL `DECIMAL(10, 2)` map to string representations in Drizzle to prevent floating-point inaccuracies, satisfying `DecimalLike` in domain entities.

## Consequences

### Positive

- **Lightweight & High Performance**: Zero binary engine dependencies, faster cold starts, and minimal runtime footprint.
- **SQL Transparency**: Queries are written as standard SQL expressions and relational builder patterns with full type inference.
- **Strict Domain Seams**: Eliminates any direct dependency on `@prisma/client` in domain entities, repositories, and test fixtures.

### Negative / Trade-offs

- Requires manual table schema definitions in TypeScript rather than a single DSL file.
- Aggregation results require explicit type casting and mapping to domain return types.
