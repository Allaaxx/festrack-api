# 0006. Centralized Environment Validation and MinIO Storage

Date: 2026-10-05

## Status

Accepted

## Context

Configuration in the application previously relied on scattered calls to `process.env` with hardcoded fallback strings across database clients (`src/db/postgres/client.ts`), authentication modules (`src/auth.ts`), object storage adapters (`src/adapters/s3-storage-service.ts`), and Drizzle configuration (`drizzle.config.ts`). In addition, legacy authentication environment variables (`JWT_ACCESS_TOKEN_SECRET`, `JWT_REFRESH_TOKEN_SECRET`) remained present even after the migration to Better Auth ([ADR-0005](./0005-migrate-authentication-jwt-to-better-auth.md)).

Furthermore, local development of file storage (e.g. user avatar uploads) required either live AWS S3 credentials or manually configured cloud object storage buckets, introducing friction for local development and offline testing.

## Decision

We centralize and strictly validate all environment configuration using Zod, remove hardcoded fallback credentials, and provide a containerized MinIO object storage service for local development:

### 1. Centralized Environment Validation (`src/config/env.ts`)

- We introduce `src/config/env.ts`, using Zod to parse, validate, and strongly type environment variables at boot time.
- Critical variables (`DATABASE_URL`, `BETTER_AUTH_SECRET`) are strictly required, causing the process to fail fast with descriptive field error outputs if omitted or empty.
- Non-critical variables and URLs provide sensible defaults (`NODE_ENV` defaults to `development`, `PORT` to `3000`, `BETTER_AUTH_URL` to `http://localhost:3000`).
- Empty string inputs for optional parameters (such as `FRONTEND_URL`, `BETTER_AUTH_TRUSTED_ORIGINS`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and S3 endpoints) are sanitized to `undefined`.
- Modules across the application (`src/db/postgres/client.ts`, `src/auth.ts`, `index.ts`, `drizzle.config.ts`) now import and consume the validated `env` export rather than raw `process.env`.

### 2. Elimination of Hardcoded Fallbacks & Legacy Secrets

- Hardcoded database connection URLs and fallback secrets (e.g. `'secret'`, `'postgresql://postgres:password@localhost:5432/finance-app'`) have been removed from source code.
- Legacy JWT environment variables (`JWT_ACCESS_TOKEN_SECRET`, `JWT_REFRESH_TOKEN_SECRET`) are removed from `.env.example` and code fallbacks, establishing `BETTER_AUTH_SECRET` as the single canonical secret.

### 3. MinIO Local Storage Integration (`docker-compose.yml`)

- `docker-compose.yml` is updated with a `minio` service (`minio/minio`) exposing port `9000` (S3 API) and `9001` (Web Console UI) with credentials `minioadmin:minioadmin`.
- A helper container (`finance-app-minio-setup`) automatically verifies and initializes the default `festrack` bucket on startup with public download permissions.
- `.env.example` is configured with default local MinIO endpoints (`http://localhost:9000`), enabling out-of-the-box local S3 asset storage.

### 4. Preservation of Domain Model & Clean Architecture

- `StorageService` domain interface remains unchanged.
- `S3StorageService` adapter consumes validated `env` variables by default while preserving constructor injection (`S3StorageConfig`) for testability and flexibility.

## Considered Options

1. **Raw `process.env` with scattered defaults**:
    - _Pros_: Zero upfront setup, no external dependencies.
    - _Cons_: Prone to accidental hardcoded credentials in production, silent failures on missing parameters, and inconsistent configurations.
2. **Framework-bound validation (e.g. Elysia TypeBox schema)**:
    - _Pros_: Reuses Elysia's native schema library.
    - _Cons_: CLI tools (such as `drizzle-kit`) and standalone scripts run outside the Elysia HTTP lifecycle and cannot consume the configuration without pulling in web framework dependencies.
3. **Live AWS S3 in local development**:
    - _Pros_: Matches production AWS environment directly.
    - _Cons_: Requires AWS credentials, incurs cloud costs, prevents offline work, and complicates onboarding.

## Consequences

- **Fail-Fast Safety**: Invalid or missing configuration halts the process immediately with descriptive field-level error messages before the server accepts traffic.
- **Strong Typing**: Developers gain compile-time type completion for all configuration parameters without raw string index lookups.
- **Zero Cloud Friction**: Contributors can develop avatar and asset upload features offline without an AWS account or external cloud dependencies.
- **Runtime Dependency**: Environment variables are parsed at startup via Zod; invalid environment files will prevent standalone CLI tools or scripts importing `src/config/env.js` from booting until resolved.
- **Resource Usage**: Running MinIO locally introduces an additional container in `docker-compose.yml`, which is mitigated by its lightweight footprint and automated bucket setup.
