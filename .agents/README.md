# Application Agent Workspace (`.agents/`)

This directory contains the AI agent instructions and skills specific to the **Financial Tracking API (Festrack)** application.

## Contents

- **[`AGENT_RULES.md`](./AGENT_RULES.md)**: Authoritative architecture rules, technology stack specifications, coding conventions, and testing guidelines for the application.
- **`skills/`**: Domain-specific skills designed for working on the application's clean architecture layers:
    - **[`skills/routes`](./skills/routes/SKILL.md)**: Creating and modifying Elysia routes and input validation schemas.
    - **[`skills/use-cases`](./skills/use-cases/SKILL.md)**: Creating and modifying use cases and business orchestration.
    - **[`skills/repositories`](./skills/repositories/SKILL.md)**: Creating and modifying PostgreSQL Drizzle repositories.

> For repository-wide agent workflow tools (GitHub issue tracker, triage labels, domain docs layout, and ADRs), refer to [`docs/`](../docs/).
