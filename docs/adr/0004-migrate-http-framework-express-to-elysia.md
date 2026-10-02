# 0004. Migrate HTTP Framework from Express to Elysia

Date: 2026-10-02

## Status

Accepted (Supersedes [ADR-0001](./0001-controller-use-case-dip-and-http-boundary.md))

## Context

Following the application runtime migration to Bun ([ADR-0003](./0003-migrate-runtime-node-to-bun.md)), the HTTP transport layer continued to use Express 5. While functional, the Express-based architecture exhibited several architectural bottlenecks and developer experience trade-offs:

1. **Intermediate Controller Overhead**: To maintain framework independence, [ADR-0001](./0001-controller-use-case-dip-and-http-boundary.md) introduced an intermediate abstraction layer (`HttpRequest<B, P, Q>`, `HttpResponse`, and Controller classes instantiated through factory functions in `src/factories/controllers/`). This created substantial boilerplate, multi-hop request delegation, and redundant object allocation per request.
2. **Runtime Validation Bottleneck (Zod)**: Request bodies and path parameters were parsed at runtime using Zod. While declarative, Zod validation incurred runtime parsing penalties on every request without leveraging Ahead-of-Time (AoT) compilation.
3. **Static OpenAPI Maintenance**: The OpenAPI specification was manually synchronized in a static `docs/swagger.json` file served via `swagger-ui-express`. Schema changes frequently drifted from runtime implementations.
4. **E2E Network & Port Binding Overhead**: Automated HTTP integration testing depended on `supertest`, which bound ephemeral TCP ports and incurred OS-level network stack overhead for every test suite.
5. **Polyfill-Heavy Authentication**: Authentication relied on `jsonwebtoken`, depending on Node.js cryptographic polyfills rather than modern Web Crypto / native Bun cryptographic primitives.

## Decision

We migrate the primary HTTP server framework from Express to Elysia, modernizing schema validation, documentation, authentication, and integration testing:

### 1. Elysia-Native Handlers & Ahead-of-Time (AoT) TypeBox Schemas

- We dismantle the `HttpRequest`/`HttpResponse` controller abstraction layer and controller factories, formally superseding [ADR-0001](./0001-controller-use-case-dip-and-http-boundary.md).
- Route handlers are declared natively on Elysia router instances (`src/routes/auth.ts`, `src/routes/users.ts`, `src/routes/events.ts`, `src/routes/transactions.ts`).
- Route validation adopts Ahead-of-Time TypeBox schemas (`t.Object`, `t.String`, `t.Number`, `t.Union`) directly in endpoint route schemas (`body`, `params`, `query`). Elysia compiles these schemas into optimized JavaScript validator functions ahead of time, eliminating runtime parsing bottlenecks.
- Strict payload validation is enforced using `{ additionalProperties: false }` combined with `new Elysia({ normalize: false })`, ensuring HTTP 400 Bad Request responses when clients submit unrecognized fields.
- Route handlers invoke domain use cases directly, mapping HTTP context parameters and authenticated user identifiers to use case inputs and translating domain errors into standardized HTTP responses.

### 2. In-Memory Web Fetch Integration Testing

- We decommission `supertest` and ephemeral TCP socket allocation.
- Integration tests execute in-memory via `app.handle(new Request(...))` using native Web Fetch API abstractions wrapped by a fluent `testClient(app)` test harness (`src/test-helper.ts`).
- E2E tests for all vertical slices (`auth.e2e.test.ts`, `users.e2e.test.ts`, `events.e2e.test.ts`, `transactions.e2e.test.ts`) execute completely in memory, drastically reducing CI and test suite execution time.

### 3. Dynamic OpenAPI 3.0 Documentation

- Static `docs/swagger.json` and `swagger-ui-express` are decommissioned.
- OpenAPI documentation is generated dynamically at runtime using `@elysiajs/swagger`, exposed at `/docs` (interactive UI) and `/docs/json` (OpenAPI 3.0 specification).
- Route endpoints declare OpenAPI metadata (`detail: { tags: [...], summary: '...' }`) directly alongside TypeBox validation schemas, ensuring API documentation is always synchronized with code.

### 4. Modern Authentication & Native Crypto

- Authentication middleware is replaced by a scoped Elysia plugin (`src/plugins/auth.ts`) utilizing `@elysiajs/jwt` with Web Crypto.
- Route protection is declarative via an `.isAuth: true` macro and a `.derive({ as: 'scoped' })` hook that extracts `userId` from the Bearer token and rejects unauthenticated requests with HTTP 401 Unauthorized (`{"message": "Unauthorized"}`).
- Token generation and verification adapters (`src/adapters/tokens-generator.ts`, `src/adapters/token-verifier.ts`) utilize native `node:crypto` HMAC-SHA256 primitives, removing `jsonwebtoken` and its associated polyfills.

### 5. Decommissioning Obsolete Packages

The following dependencies are removed from `package.json`:

- Production: `express`, `cors`, `jsonwebtoken`, `swagger-ui-express`, `zod`.
- Development: `@types/express`, `@types/cors`, `@types/jsonwebtoken`, `@types/swagger-ui-express`, `supertest`, `@types/supertest`.

### 6. Domain Terminology

All domain entities and repository contracts strictly maintain `GLOSSARY.md` terminology (`User`, `Event`, `Transaction`, `Balance`).

## Consequences

### Positive

- **Maximum Throughput**: AoT-compiled TypeBox schemas and Elysia's optimized router maximize request handling performance on Bun.
- **Minimal Boilerplate**: Dismantling controllers, controller factories, and adapter classes simplifies the codebase while preserving clean domain logic in use cases.
- **Fast, Socketless Testing**: In-memory `app.handle(new Request(...))` tests execute without TCP port contention or OS networking latency.
- **Real-Time API Docs**: OpenAPI documentation is automatically derived from route schemas, eliminating documentation drift.
- **Lean Dependency Footprint**: Elimination of 11 legacy packages reduces bundle size and dependency vulnerability surface.

### Negative / Trade-offs

- **Framework Coupling at Route Level**: Route handlers directly utilize Elysia idioms (`{ body, params, set }`) rather than framework-agnostic `HttpRequest` adapters. Domain business logic remains isolated within use cases and entities.
