# 0002. Migrate ORM from Prisma to Drizzle ORM

Date: 2026-10-02

## Status

Accepted

## Context

The application previously relied on Prisma (`@prisma/client`, `@prisma/adapter-pg`, and `prisma`) as its Object-Relational Mapping (ORM) layer. While Prisma offered convenient schema management and generated client APIs, several architectural and operational challenges motivated a migration to Drizzle ORM:

1. **Engine Overhead and Binary Dependencies**: Prisma requires a dedicated query engine and code generation step (`prisma generate`) on postinstall. In containerized environments and serverless architectures, external engine binaries introduce additional startup latency and maintenance overhead.
2. **Framework Decoupling and Domain Boundary**: Clean architecture demands that domain layer types and repository contracts remain independent of ORM-specific types. Prisma types like `Prisma.Decimal` and `PrismaClientKnownRequestError` previously leaked across repositories and tests.
3. **Transparent SQL Execution & Type Safety**: Drizzle ORM provides a lightweight, pure TypeScript SQL query builder that maps directly to PostgreSQL schemas without intermediate DSLs or proprietary runtime engines. Using `postgres.js`, database connection pooling is lightweight, efficient, and native to JavaScript runtimes.

## Decision

We migrate the persistence and data access layer from Prisma to Drizzle ORM (`drizzle-orm` and `postgres.js`):

### 1. Underlying Database Client & Connection Pooling

- The application uses `postgres.js` for pooled PostgreSQL connections configured via standard environment variables (`DATABASE_URL`).
- The database connection lifecycle is decoupled from repository implementations, allowing repositories to accept an optional database client instance for dependency injection and testing.

### 2. Modular Database Schemas

Database schemas are defined modularly using Drizzle PostgreSQL schema definitions (`src/db/postgres/schemas/`):

- `User`: Primary key UUID, `first_name` (varchar 50), `last_name` (varchar 50), `email` (varchar 100, unique index `User_email_key`), `password` (varchar 100).
- `Event`: Primary key UUID, `name` (varchar 50), optional `description` (varchar 200), `start_date` and `end_date` (timestamp 3), `user_id` foreign key referencing `User` with cascade delete.
- `Transaction`: Primary key UUID, `user_id` foreign key referencing `User` with cascade delete, `name` (varchar 50), `date` (date), `amount` (numeric 10, 2), `type` (enum `TransactionType`: `EXPENSE`, `EARNING`, `INVESTMENT`), nullable `event_id` foreign key referencing `Event` with set null delete.

### 3. Repository Layer Implementation

- Concrete repositories (`PostgresUserRepository`, `PostgresEventRepository`, `PostgresTransactionRepository`) implement canonical domain interfaces (`UserRepository`, `EventRepository`, `TransactionRepository`) exclusively using Drizzle ORM query builders and SQL expressions.
- Domain entities and repository contracts remain completely free of ORM-specific types.
- Balance aggregation queries leverage Drizzle SQL expressions (`sql`, `sum`) grouping and filtering by transaction type within specified date windows, using exact integer arithmetic (cents) to avoid floating-point inaccuracies. Zero division when no transactions match returns zero percentages.

### 4. Migration & Testing Lifecycle

- Schema migrations are managed via Drizzle Kit, targeting PostgreSQL and outputting reviewable SQL migration files (`src/db/postgres/migrations/`).
- Automated test global setup synchronizes the test database schema using `drizzle-kit push --force`.
- Test lifecycle hooks reset database state between test runs using table truncation (`TRUNCATE TABLE "Transaction", "Event", "User" CASCADE;`) and close client connections in `afterAll`.
- All Prisma dependencies, generators, and configuration files are decommissioned.

## Consequences

### Positive

- **Pure JavaScript Driver**: Eliminates engine binaries and runtime generation steps, speeding up container builds and CI workflows.
- **SQL Predictability**: Drizzle queries map 1:1 to SQL without magical abstractions or hidden round-trips.
- **Strict Clean Architecture**: Zero leakage of ORM types into domain layers or public controller contracts.
- **Auditable Migrations**: Declarative TypeScript schemas generate transparent, reviewable SQL migrations.

### Negative / Trade-offs

- Manual mapping between database column types and domain entities is required (e.g. numeric amounts to domain string representations).
- Query syntax changes from Prisma's object-based query syntax to SQL-like Drizzle query builders.
