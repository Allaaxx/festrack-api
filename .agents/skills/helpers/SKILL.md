---
name: helpers
description: Guidelines for using and modifying HTTP response helpers in the Finance App API.
---
# Helper Guidelines

When working with response helpers (`src/controllers/helpers`), adhere to the following rules:

*   **Usage**: Always use the helpers in `src/controllers/helpers` for constructing HTTP responses in controllers.
*   **Consistency**: Ensure standard formats are maintained (e.g., `ok(data)`, `badRequest()`, `serverError()`).
