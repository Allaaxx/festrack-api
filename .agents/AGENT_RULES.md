# AI Agent Rules for Finance App API

This document outlines the high-level technology stack, architectural principles, and conventions used in this project. All AI coding assistants must strictly adhere to these rules when working on this repository.

## 1. Project Summary

This project is a back-end API for a Finance Application about events, party, wedding. It handles financial data securely and robustly, providing endpoints for managing user transactions, authentication, and core financial domains. The application is built using a modern Node.js stack and strictly follows Clean Architecture principles to ensure maintainability, testability, and separation of concerns.

## 2. Technology Stack

- **Runtime**: Node.js (ESM modules - `"type": "module"`).
- **Web Framework**: Express.js.
- **Database & ORM**: PostgreSQL with Prisma (`@prisma/client` and `@prisma/adapter-pg`).
- **Validation**: Zod.
- **Authentication/Security**: JSON Web Tokens (JWT) and Bcrypt.
- **Testing**: Jest and Supertest.
- **Formatting & Linting**: ESLint and Prettier.

## 3. Architectural Principles

This project uses **Clean Architecture** (Ports and Adapters). The codebase is highly decoupled using dependency injection. Code is separated by layer, and then by domain (e.g., `user`, `transaction`, `auth`).

### Layer Delegation

Specific instructions for creating or modifying code in each layer are maintained as separate **Skills**. Instruct the agent to use the respective skill when working on a specific part of the architecture:

- `controller`
- `factories`
- `routes`
- `use-cases`
- `repositories`
- `helpers`

## 4. Coding Conventions

- **File Naming**: Use `kebab-case.js` for all files (e.g., `create-user.js`).
- **Class Naming**: Use `PascalCase` for classes (e.g., `CreateUserUseCase`).
- **Variable/Function Naming**: Use `camelCase`.
- **Module System**: Exclusively use ES Modules (`import`/`export`). Do not use `require`.
- **Barrel Exports**: Liberally use `index.js` files to group and re-export modules within directories.

## 5. Testing Strategy

- **Unit Tests**: Must be co-located with the source file they test. E.g., `src/use-cases/user/get-user-by-id.test.js` sits next to `get-user-by-id.js`. Use Jest mocks to isolate dependencies.
- **E2E Tests**: Integration/E2E tests should be placed in `src/routes/` and named `*.e2e.test.js` (e.g., `users.e2e.test.js`).
