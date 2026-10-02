# 0001. Controller Use Case Dependency Inversion and HTTP Boundary

Date: 2026-10-01

## Status

Superseded by [ADR-0004](./0004-migrate-http-framework-express-to-elysia.md)

## Context

Historically, the application's HTTP layer had architectural couplings across three main areas:

1. **Framework Leakage into Controllers**: Express route handlers frequently used object spreading (`{ ...request }`) when passing requests into controllers. This coupled controller execution to Express-specific internal state, socket lifecycles, and non-serializable properties.
2. **Ad-hoc Parameter Validation**: Route parameters (such as `userId`, `eventId`, and `transactionId`) were validated via manual helper functions (`checkIfIdIsValid`) scattered across controller methods, while request bodies were validated declaratively using Zod schemas. Furthermore, raw input properties were often passed to use cases rather than the sanitized, parsed output of schema validation.
3. **Coupling to Concrete Use Cases**: Controllers depended directly on concrete use case classes or structural picks of concrete classes (`Pick<ConcreteUseCase, 'execute'>`). This violated the Dependency Inversion Principle (DIP) and made unit testing reliant on concrete classes rather than abstract seams.

## Decision

We formalize the following architectural boundaries across controllers, route adapters, and use cases:

### 1. Framework Isolation & Pure HTTP Request Boundary

Express route handlers act as adapters. They must explicitly map incoming HTTP data to a clean, framework-agnostic `HttpRequest<B, P, Q>` object containing only:

- `body`: Typed request payload `B`.
- `params`: Typed route parameters `P`.
- `query`: Typed query string parameters `Q`.
- `headers`: Optional request headers.
- `userId`: Optional authenticated User identifier provided by authentication middleware.

Express request spreading (`{ ...request }`) is strictly prohibited. Controllers must have zero knowledge of Express, receiving only `HttpRequest` and returning standardized `HttpResponse` objects (`ok`, `badRequest`, `notFound`, `serverError`, etc.).

### 2. Declarative Parameter Validation via Zod Schemas

All input surfaces—bodies, path parameters, and query strings—must be validated declaratively using Zod schemas:

- Path parameter schemas (e.g. `userIdParamSchema`, `eventIdParamSchema`, `transactionIdParamSchema`, `idParamSchema`) enforce UUID format and validate route parameters.
- When path parameter UUID validation fails, the schema produces `"The provided id is not valid."`, preserving existing API contracts and backward compatibility (returning HTTP 400 Bad Request with `{"message": "The provided id is not valid."}`).
- Controllers must consume the sanitized output returned by `schema.parseAsync(...)`, ensuring unexpected or extraneous fields are stripped prior to executing domain logic in use cases.

### 3. Dependency Inversion (DIP) at Controller Seams

Controllers must adhere to the Dependency Inversion Principle:

- High-level controller modules must not import or depend on low-level concrete use-case implementations.
- Controllers declare an abstract interface defining the required use-case contract at the point of consumption (e.g., `interface IGetUserByIdUseCase { execute(userId: string): Promise<User | null>; }`).
- Concrete dependencies are wired and injected exclusively at the composition root / factory layer (`src/factories/controllers/`).

### 4. Domain Terminology

All domain naming strictly follows `GLOSSARY.md`:

- `User`: Account holder owning events and transactions.
- `Event`: Scheduled occasion or financial project owned by a user.
- `Transaction`: Financial movement (earning, expense, investment) belonging to a user and optionally tied to an event.
- `Balance`: Net financial calculation over a given time period.

## Consequences

### Positive

- **Framework Agility**: Controllers are completely decoupled from Express and can be ported to other frameworks or serverless runtimes without modification.
- **Enhanced Type Safety**: `HttpRequest<B, P, Q>` allows controllers to declare strong types for body, parameters, and query strings without falling back to `any`.
- **Consistent Validation & Error Responses**: Input validation across body and route parameters uses uniform Zod error handling and preserves API error message contracts.
- **Isolated Testing Seams**: Controllers can be unit-tested against mock implementations of abstract use-case interfaces without loading concrete use-case code or database dependencies.

### Negative / Trade-offs

- Route handlers require explicit parameter mapping instead of passing request objects directly.
- Controllers must declare local use-case interfaces and invoke schema validation for parameters alongside body payloads.
