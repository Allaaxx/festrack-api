---
name: repositories
description: Guidelines and patterns for creating or modifying Repositories in the Finance App API.
---
# Repository Guidelines

When working with Repositories (`src/repositories/postgres`), adhere to the following rules:

*   **Data Access**: Handles all data access using Prisma.
*   **Naming**: Classes should be prefixed with the adapter type, e.g., `PostgresGetUserByIdRepository`.
*   **Granularity**: Split into individual files/actions matching the Use Cases (SRP).
