---
name: use-cases
description: Guidelines and patterns for creating or modifying Use Cases in the Finance App API.
---
# Use Case Guidelines

When working with Use Cases (`src/use-cases`), adhere to the following rules:

*   **Responsibility**: Contains the core business logic.
*   **SRP**: Strictly adheres to the Single Responsibility Principle: **One file/class per action** (e.g., `get-user-by-id.js`).
*   **Dependencies**: Calls injected Repositories or Adapters.
*   **Framework Agnostic**: Must not have any dependencies on Express or HTTP concepts.
