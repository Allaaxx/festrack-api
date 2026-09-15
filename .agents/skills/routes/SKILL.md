---
name: routes
description: Guidelines and patterns for creating or modifying Routes in the Finance App API.
---
# Route Guidelines

When working with Routes (`src/routes`), adhere to the following rules:

*   **Responsibility**: Responsible only for defining Express endpoints.
*   **Adaptation**: Maps the Express `request`/`response` objects to the generic `httpRequest` format expected by Controllers.
*   **Middleware**: Applies Express middlewares (e.g., `auth`).
*   **Strict Boundary**: **NEVER** put business logic or direct database calls in routes.
