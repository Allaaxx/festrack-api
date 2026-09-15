---
name: factories
description: Guidelines and patterns for creating or modifying Factories (Dependency Injection) in the Finance App API.
---
# Factory Guidelines

When working with Factories (`src/factories/controllers`), adhere to the following rules:

*   **Responsibility**: Responsible for Dependency Injection.
*   **Instantiation**: Instantiates Repositories, Adapters, and Use Cases, and injects them into the Controller.
*   **Export**: Exposes a `makeXController()` function which is consumed by the routes.
