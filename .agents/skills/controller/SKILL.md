---
name: controller
description: Guidelines and patterns for creating or modifying Controllers in the Finance App API.
---
# Controller Guidelines

When working with Controllers (`src/controllers`), adhere to the following rules:

*   **Input**: Receives a standardized `httpRequest` object (framework agnostic).
*   **Validation**: Validates incoming data (`body`, `params`, `query`) using **Zod** schemas from `src/schemas`.
*   **Business Logic**: Calls the injected Use Case. DO NOT put business logic inside the controller itself.
*   **Output**: Returns standardized HTTP responses (e.g., `ok(data)`, `badRequest()`, `serverError()`) imported from `src/controllers/helpers`.
