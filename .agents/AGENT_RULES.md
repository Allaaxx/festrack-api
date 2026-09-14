# AI Agent Rules for Finance App API

This document outlines the coding patterns, technology stack, architectural principles, and conventions used in this project. All AI coding assistants must strictly adhere to these rules when modifying or adding code to this repository.

## 1. Technology Stack
*   **Runtime**: Node.js (ESM modules - `"type": "module"`).
*   **Web Framework**: Express.js.
*   **Database & ORM**: PostgreSQL with Prisma (`@prisma/client` and `@prisma/adapter-pg`).
*   **Validation**: Zod.
*   **Authentication/Security**: JSON Web Tokens (JWT) and Bcrypt.
*   **Testing**: Jest and Supertest.
*   **Formatting & Linting**: ESLint and Prettier.

## 2. Architectural Principles
This project uses **Clean Architecture** (Ports and Adapters). The codebase is highly decoupled using dependency injection. Code is separated by layer, and then by domain (e.g., `user`, `transaction`, `auth`).

### The Layers
When adding a new feature, you must respect the following boundaries:

1.  **Routes (`src/routes`)**:
    *   Responsible only for defining Express endpoints.
    *   Maps the Express `request`/`response` objects to the generic `httpRequest` format expected by Controllers.
    *   Applies Express middlewares (e.g., `auth`).
    *   **NEVER** put business logic or direct database calls in routes.

2.  **Controllers (`src/controllers`)**:
    *   Receives a standardized `httpRequest` object (framework agnostic).
    *   Validates incoming data (`body`, `params`, `query`) using **Zod** schemas from `src/schemas`.
    *   Calls the injected Use Case.
    *   Returns standardized HTTP responses (e.g., `ok(data)`, `badRequest()`, `serverError()`) imported from `src/controllers/helpers`.

3.  **Use Cases (`src/use-cases`)**:
    *   Contains the core business logic.
    *   Strictly adheres to the Single Responsibility Principle: **One file/class per action** (e.g., `get-user-by-id.js`).
    *   Calls injected Repositories or Adapters.
    *   Must not have any dependencies on Express or HTTP concepts.

4.  **Repositories (`src/repositories/postgres`)**:
    *   Handles all data access using Prisma.
    *   Classes should be prefixed with the adapter type, e.g., `PostgresGetUserByIdRepository`.
    *   Split into individual files/actions matching the Use Cases.

5.  **Adapters (`src/adapters`)**:
    *   Wrappers for external libraries (e.g., `PasswordHasherAdapter`, `IdGeneratorAdapter`) to ensure the core application doesn't depend directly on third-party packages.

6.  **Factories (`src/factories/controllers`)**:
    *   Responsible for Dependency Injection.
    *   Instantiates Repositories, Adapters, and Use Cases, and injects them into the Controller.
    *   Exposes a `makeXController()` function which is consumed by the routes.

## 3. Coding Conventions
*   **File Naming**: Use `kebab-case.js` for all files (e.g., `create-user.js`).
*   **Class Naming**: Use `PascalCase` for classes (e.g., `CreateUserUseCase`).
*   **Variable/Function Naming**: Use `camelCase`.
*   **Module System**: Exclusively use ES Modules (`import`/`export`). Do not use `require`.
*   **Barrel Exports**: Liberally use `index.js` files to group and re-export modules within directories.
*   **Response Helpers**: Always use the helpers in `src/controllers/helpers` for constructing HTTP responses.

## 4. Testing Strategy
*   **Unit Tests**: Must be co-located with the source file they test. E.g., `src/use-cases/user/get-user-by-id.test.js` sits next to `get-user-by-id.js`. Use Jest mocks to isolate dependencies.
*   **E2E Tests**: Integration/E2E tests should be placed in `src/routes/` and named `*.e2e.test.js` (e.g., `users.e2e.test.js`).
*   **Test Runner**: Commands are `npm run test`, `npm run test:watch`, and `npm run test:coverage`.

## 5. Adding a New Endpoint (Checklist)
1.  Define the Zod schema in `src/schemas`.
2.  Create the Data Access action in `src/repositories/postgres` (and its `.test.js`).
3.  Create the Business Logic in `src/use-cases` (and its `.test.js`).
4.  Create the HTTP Controller in `src/controllers` (and its `.test.js`), ensuring you use the Zod schema and helper responses.
5.  Wire them together by creating a factory in `src/factories/controllers`.
6.  Bind the factory to an Express route in `src/routes`.
7.  Write an E2E test in `src/routes/*.e2e.test.js`.
