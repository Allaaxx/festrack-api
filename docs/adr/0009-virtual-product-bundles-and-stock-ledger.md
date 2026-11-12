# 0009. Virtual Product Bundles and Stock Ledger

Date: 2026-11-12

## Status

Accepted

## Context

Festrack shops offer party decoration packages, combos, and equipment sets composed of multiple individual items (e.g., party kits containing tables, stands, and balloons). These items are often shared across different packages or rented independently. We needed a model to support product bundles, component inventory tracking, and race-condition-safe reservations across sale, rental, and service offerings.

## Decision

We introduce **Virtual Product Bundles** and an **Event-Driven Stock Ledger**:

1. **Virtual Bundles (Dynamic Kitting)**:
    - A `Product` with `is_bundle = true` has no independent physical `Stock` record.
    - Its available inventory is dynamically derived in real-time from the bottleneck of its component items:
      $$\text{Available Stock} = \min_{i \in \text{components}} \left\lfloor \frac{\text{stock.quantity}_i - \text{stock.reserved}_i}{\text{bundle\_items.quantity}_i} \right\rfloor$$
    - Bundles are strictly single-level (Level 1: bundles can only contain simple products).
    - Once created, a product's `is_bundle` flag is immutable.

2. **Component Sharing & Tenancy**:
    - Simple products can be reused across any number of bundles owned by the same `Shop` (`shop_id`). Cross-shop bundling is strictly forbidden.
    - Deletion of simple products referenced by active bundles is prevented via database `RESTRICT` constraints and domain validation.

3. **Stock Ledger & Snapshot**:
    - Simple products of type `sale` or `rent` have a `Stock` record with `quantity` (on-hand) and `reserved` (allocated). Products of type `service` do not maintain stock.
    - All balance changes are immutably audited in a `StockMovement` ledger (`INBOUND`, `SALE`, `RENTAL_ALLOCATION`, `RENTAL_RETURN`, `LOSS`, `ADJUSTMENT`).

4. **Checkout Reservation**:
    - Stock reservations occur during checkout/order creation using pessimistic row locks (`SELECT ... FOR UPDATE` on component stock records) to prevent race conditions and over-selling across shared components.
    - Rental returns and damages are inspected and checked in at the discrete component item level.

## Considered Options

1. **Pre-assembled Physical Kits (Work Orders)**:
    - _Rejected_: Requiring physical assembly and dedicated kit stock creates idle inventory and prevents vendors from sharing items (e.g., furniture pieces) across multiple decoration packages.
2. **Static Stock Table without Movement Ledger**:
    - _Rejected_: Updating raw integers without an immutable audit trail eliminates inventory reconciliation and accountability when items are damaged or lost during events.

## Consequences

- Zero idle kit inventory: items remain freely available across all packages until checkout.
- Atomic stock reservations require locking all distinct component rows in a predictable order to avoid deadlocks.
- Detailed component breakdowns are automatically resolved on bundle detail queries.
