# 0003. Migrate Application Runtime from Node.js to Bun

Date: 2026-10-02

## Status

Accepted

## Context

The application previously ran on Node.js using npm as the package manager, `tsx` for TypeScript file watching during local development, `tsc` for production compile-to-dist builds, and Jest alongside `@swc/jest` as the automated test harness.

While functional, this legacy tooling configuration presented several operational frictions:

1. **Slow and Complex Testing Workflow**: Running the 344 automated tests under Jest required transpilation with `@swc/jest`, Node experimental VM flags (`--experimental-vm-modules`), and sequential execution flags (`--runInBand`, `--detectOpenHandles`, `--forceExit`). Execution times were prolonged and setup was brittle across ESM and TypeScript boundaries.
2. **Runtime Transpilation & Compilation Overhead**: Local development required external watch daemons (`tsx watch`), while production deployments required precompiling TypeScript source code into a `dist/` distribution directory.
3. **Multi-tool Maintenance**: Dependency management, static type checking, test running, and development execution were fragmented across multiple distinct tools (`npm`, `tsx`, `jest`, `@swc/core`, `@swc/jest`, `dotenv-cli`), increasing maintenance overhead and slowing down CI pipelines and Docker builds.

## Decision

We migrate the runtime, package manager, and test execution engine from Node.js to Bun, while retaining Express 5 and the existing Clean Architecture layer (Domain Entities, Drizzle Repositories, Use Cases, Controllers, Factories, and HTTP routes):

### 1. Runtime & Framework Continuity

- Express 5 remains the HTTP web framework, executing on Bun's built-in Node.js compatibility layer.
- All existing routing, middleware, controller abstractions, and JSON response contracts remain invariant.
- Application entrypoint (`index.ts`) and TypeScript sources execute directly via Bun without intermediate compilation steps (`bun index.ts` and `bun --watch index.ts`). TypeScript (`tsc --noEmit`) is retained solely for static type validation.

### 2. Package Management

- Bun replaces npm as the package manager.
- The npm lockfile (`package-lock.json`) is decommissioned and replaced by Bun's lockfile (`bun.lock`).
- Obsolete devDependencies (`tsx`, `jest`, `@types/jest`, `@swc/core`, `@swc/jest`) are removed, and `@types/bun` (`bun-types`) is introduced.

### 3. Test Harness & Lifecycle Migration

- Bun's built-in test runner (`bun test`) replaces Jest and SWC.
- Test runner configuration is declared in `bunfig.toml` with preload harness `src/tests/setup.ts`.
- Compatibility with test spies and mock functions (`jest.spyOn`, `jest.fn`) is preserved through Bun's native test compatibility and global assignment.
- Database test lifecycle synchronization (`drizzle-kit push --force`) and table reset hooks (`TRUNCATE TABLE "Transaction", "Event", "User" CASCADE;`) execute via Bun's test lifecycle hooks (`beforeAll`, `beforeEach`, `afterAll`).

### 4. Containerization & CI/CD Pipeline

- A production-grade multi-stage Dockerfile is introduced using official `oven/bun:1.4.2` base images, installing production dependencies with `--frozen-lockfile --production --ignore-scripts` and running `bun run index.ts` as non-root user `bun`.
- GitHub Actions CI workflow (`.github/workflows/main.yml`) is modernized with `oven-sh/setup-bun@v2`, running deterministic installation, linting, formatting, tests, and database migrations with Bun before triggering Render production deployments.

### 5. Decommissioning Legacy Tooling

- Legacy configuration files (`jest.config.js`, `jest.setup-after-env.js`, `jest.global-setup.js`) are deleted from the repository.

## Consequences

### Positive

- **Sub-second Feedback Loop**: Automated test execution across 52 test suites and 344 tests dropped from multi-second/minute cycles to fast parallelized execution.
- **Unified Toolchain**: Runtime execution, dependency management, and test running are consolidated under Bun.
- **Zero Build Artifacts**: Elimination of the `dist/` compilation step streamlines both local development and production container images.
- **Faster CI & Builds**: Package installation via `bun install --frozen-lockfile` and multi-stage container builds execute in seconds.

### Negative / Trade-offs

- **Compatibility Reliance**: The application relies on Bun's Node.js compatibility APIs for Express and third-party modules.
- **Ecosystem Drift**: Future testing patterns leverage `bun:test` conventions rather than Jest-specific extensions.
