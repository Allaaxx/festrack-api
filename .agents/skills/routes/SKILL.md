---
name: routes
description: Guidelines and patterns for creating or modifying Routes in the Finance App API.
---

# Route Guidelines

When working with Routes (`src/routes`), adhere to the following rules:

- **Framework**: Use Elysia route handlers with TypeBox schemas (`t.Object`, `t.String`, etc.).
- **Validation**: Define Ahead-of-Time TypeBox schemas directly on route definitions (`body`, `params`, `query`) with `{ additionalProperties: false }`.
- **Authentication**: Use `authPlugin` and the `{ isAuth: true }` route hook to extract the authenticated `userId`.
- **Use Cases**: Instantiate and invoke domain use cases directly inside route handlers, mapping domain errors to appropriate HTTP status codes (200, 201, 400, 401, 403, 404, 500).
- **Documentation**: Annotate route endpoints with Swagger `detail: { tags: [...], summary: '...' }` for dynamic OpenAPI generation.
