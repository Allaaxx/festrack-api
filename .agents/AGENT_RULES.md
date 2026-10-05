# AI Agent Rules for Finance App API

This document outlines the high-level technology stack, architectural principles, and conventions used in this project. All AI coding assistants must strictly adhere to these rules when working on this repository.

## 1. Project Summary

This project is a back-end API for a Finance Application for personal and event-related expenses (weddings, trips, parties). It handles financial data securely and robustly, providing endpoints for managing user transactions, authentication, and core financial domains. The application is built using Bun and Elysia, strictly following Clean Architecture principles to ensure maintainability, testability, and separation of concerns.

## 2. Technology Stack

- **Runtime**: Bun (`bun`).
- **Language**: TypeScript (`.ts`).
- **Web Framework**: Elysia (`elysia`).
- **Database & ORM**: PostgreSQL with Drizzle ORM (`drizzle-orm` and `postgres.js`).
- **Validation**: Zod (for environment variables and domain validation) and Elysia TypeBox schemas.
- **Authentication & Security**: Better Auth (`better-auth`) with Bearer plugin and session cookies.
- **Object Storage**: S3-compatible storage (MinIO for local development, AWS S3/Cloudflare R2 in production) via `@aws-sdk/client-s3`.
- **Testing**: Bun Test (`bun:test`).
- **Formatting & Linting**: ESLint and Prettier.

## 3. Architectural Principles

This project uses **Clean Architecture** (Ports and Adapters). The codebase is highly decoupled using dependency injection. Code is separated by layer, and then by domain (e.g., `user`, `event`, `transaction`):

1. **Domain Layer (`src/domain/`)**: Pure business entities, repository interfaces, and adapter interfaces. Zero external infrastructure dependencies.
2. **Use Cases Layer (`src/use-cases/`)**: Application business rules and orchestration. Injects repository and adapter interfaces.
3. **Adapters & Repositories (`src/adapters/`, `src/repositories/`)**: Implementation of domain ports (e.g. PostgreSQL Drizzle repositories, S3 storage adapter).
4. **HTTP & Routes Layer (`src/routes/`, `src/app.ts`)**: Elysia route handlers, middleware plugins (`src/plugins/auth.ts`), request parsing, and error formatting.

### Infrastructure & Adapter Conventions

- **Option Isolation**: Adapters accepting configuration overrides (e.g. custom storage endpoints) must isolate dependencies: explicit constructor overrides must clear derived ambient defaults (such as public URLs) rather than leaking ambient environment settings.
- **Client Lifecycle**: Infrastructure clients (e.g. database connections, AWS S3 clients) must be instantiated once during adapter construction and reused across operations, avoiding per-request allocations.

### Layer Delegation & Skills

Specific instructions for creating or modifying code in each layer are maintained as separate **Skills** under `.agents/skills/`:

- `.agents/skills/routes/SKILL.md`: Route definitions, Elysia route schemas, and authentication macros.
- `.agents/skills/use-cases/SKILL.md`: Use case creation, domain logic orchestration, and error throwing.
- `.agents/skills/repositories/SKILL.md`: Drizzle ORM repository implementations and queries.

## 4. Coding Conventions

- **File Naming**: Use `kebab-case.ts` for all source files.
- **Module System**: Exclusively use ES Modules (`import`/`export`) with `.js` extensions in local relative imports to satisfy TypeScript ESM resolution (e.g., `import { db } from './db/postgres/index.js'`).
- **Barrel Exports**: Use `index.ts` files to group and re-export modules within directories.
- **Environment Variables**: Always import validated configuration from `src/config/env.js`. The project linter deterministically enforces this via `no-process-env`.

## 5. Testing Strategy

- **Unit Tests**: Must be co-located with the source file they test. E.g., `src/use-cases/user/get-user-by-id.test.ts` sits next to `get-user-by-id.ts`. Use Bun test mocks to isolate dependencies.
- **E2E Tests**: Integration/E2E tests should be placed in `src/routes/` and named `*.e2e.test.ts` (e.g., `users.e2e.test.ts`).
- **Test Runner**: Run all tests using `bun test`.
