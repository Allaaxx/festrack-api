# 0005. Migrate Authentication from Custom JWT to Better Auth

Date: 2026-10-02

## Status

Accepted

## Context

Following the migration to Elysia ([ADR-0004](./0004-migrate-http-framework-express-to-elysia.md)), authentication relied on custom JWT access and refresh token generation, custom bcrypt adapters (`PasswordHasherAdapter`, `PasswordComparatorAdapter`, `TokensGeneratorAdapter`, `TokenVerifierAdapter`), and custom authentication use cases (`CreateUserUseCase`, `LoginUserUseCase`, `RefreshTokenUseCase`).

This custom architecture exhibited several operational and security limitations:

1. **Stateless Token Limitations**: Standard stateless JWT tokens cannot be revoked immediately upon sign-out or session compromise without complex token blocklist machinery.
2. **Missing Dual Transport**: Web applications require secure, HTTP-only session cookies with CSRF and SameSite protections, while mobile and API consumers require `Authorization: Bearer <token>` headers. Supporting both transports securely required custom cookie and header parsing infrastructure.
3. **Infrastructure Redundancy**: Credential hashing, password verification, session persistence, and token rotation are infrastructure concerns that added maintenance overhead to the core domain.

## Decision

We adopt [Better Auth](https://www.better-auth.com/) as the centralized authentication engine and infrastructure service, configuring it with the Drizzle ORM PostgreSQL adapter and Elysia HTTP framework:

### 1. Better Auth Server Instance & Drizzle Adapter

- Better Auth core is initialized in `src/auth.ts` using `drizzleAdapter` configured for PostgreSQL (`provider: 'pg'`).
- The Better Auth instance is configured with `emailAndPassword: { enabled: true }`, `plugins: [bearer()]`, and custom user profile fields `first_name` and `last_name`.
- A request hook automatically derives the default `name` field from `first_name` and `last_name` during email sign-up if `name` is omitted by the client.

### 2. Database Schema via Drizzle

- The database schema introduces Better Auth tables in `src/db/postgres/schemas/users.ts` and `src/db/postgres/schemas/auth.ts`:
    - `user`: mapped with `id`, `name`, `email`, `emailVerified`, `image`, `first_name`, `last_name`, `createdAt`, `updatedAt`.
    - `session`: mapped with `id`, `userId`, `token`, `expiresAt`, `ipAddress`, `userAgent`, `createdAt`, `updatedAt`.
    - `account`: mapped with `id`, `userId`, `accountId`, `providerId`, `password`, `createdAt`, `updatedAt`.
    - `verification`: mapped with `id`, `identifier`, `value`, `expiresAt`, `createdAt`, `updatedAt`.
- Foreign key constraints on domain tables `Event` (`eventsTable.user_id`) and `Transaction` (`transactionsTable.user_id`) point to `user.id` with cascade deletion and updates.

### 3. Elysia Handler & Dual Authentication Transport

- Better Auth HTTP handlers are mounted onto Elysia at `/api/auth/*` via `src/routes/auth.ts`, exposing standard Better Auth endpoints (`/api/auth/sign-up/email`, `/api/auth/sign-in/email`, `/api/auth/get-session`, `/api/auth/sign-out`).
- The `bearer` plugin enables dual transport mode: incoming requests authenticate via either HTTP-only session cookies (`better-auth.session_token`) or `Authorization: Bearer <sessionToken>` headers.
- CORS configuration in `src/app.ts` enables `credentials: true` and exposes `Set-Cookie` and `Authorization` headers for client origins.

### 4. Scoped Better Auth Plugin for Protected Routes

- `src/plugins/auth.ts` is refactored to inspect incoming request headers via `auth.api.getSession({ headers: request.headers })`.
- The plugin derives `userId`, `session`, and `user` into the Elysia route context under `{ as: 'scoped' }`.
- The declarative `.isAuth: true` route macro ensures unauthenticated or revoked requests immediately return HTTP 401 Unauthorized (`{"message": "Unauthorized"}`).

### 5. Decommissioning of Legacy Auth Modules & Adapters

- Obsolete custom auth endpoints (`POST /api/auth/`, `/login`, `/refresh-token`) are retired.
- Legacy authentication use cases (`LoginUserUseCase`, `RefreshTokenUseCase`, `CreateUserUseCase`) and their unit tests are removed.
- Custom adapters (`PasswordHasherAdapter`, `PasswordComparatorAdapter`, `TokensGeneratorAdapter`, `TokenVerifierAdapter`) and tests are removed.
- Obsolete dependencies (`@elysiajs/jwt`, `bcrypt`, `@types/bcrypt`) are removed from `package.json`.

### 6. Domain Model Preservation & Glossary Alignment

- Terminology in `GLOSSARY.md` is preserved: `User` remains the single domain actor owning events and transactions.
- Better Auth's `Account` table is strictly treated as an infrastructure credential storage detail (for credentials and provider links) and is not a domain entity.

## Consequences

### Positive

- **Server-Side Session Revocation**: Sessions can be revoked instantly on sign-out or device revocation, eliminating vulnerabilities associated with stale JWTs.
- **Dual Transport Flexibility**: Both cookie-based web clients and Bearer token API clients are supported out of the box with consistent session semantics.
- **Maintenance Reduction**: Credential storage, hashing, and token handling are delegated to an actively maintained, production-grade library.
- **Clean Architecture Boundary**: Domain use cases focus solely on business operations (events, transactions, user balance) rather than auth plumbing.

### Negative / Neutral

- **Database Table Expansion**: Additional database tables (`session`, `account`, `verification`) must be maintained alongside domain tables.
- **Session Lookup Overhead**: Authentic requests perform session verification against Better Auth's cache / database rather than purely offline JWT signature checks.
