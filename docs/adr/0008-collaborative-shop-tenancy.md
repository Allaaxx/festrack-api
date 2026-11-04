# 0008. Collaborative Shop Tenancy

Date: 2026-11-04

## Status

Accepted

## Context

Originally, Festrack was single-user centric: `Event` and `Transaction` records were foreign-keyed directly to `user_id`. As Festrack expands to support vendors and teams collaborating on common events, transactions, and finances, the domain required an organizational tenancy boundary where multiple users can operate inside the same financial context.

## Decision

We introduce **`Shop`** as the primary multi-tenant boundary for events, transactions, and balance calculations:

1. **Shop Scoping**: All `Event` and `Transaction` records are strictly owned by a `Shop` (`shop_id NOT NULL`). Direct user ownership (`user_id`) on these entities is replaced by `shop_id` for ownership, while retaining `created_by_user_id` on both tables for auditing who recorded each entry.
2. **Membership & Roles**: Users collaborate within a shop through a `ShopMember` relation with a `role` enum (`OWNER`, `MEMBER`).
    - `MEMBER`: Full access to create, read, update, and delete events, transactions, and view balances within the shop.
    - `OWNER`: Full operational access plus shop management (invitations, member management, ownership transfer, and shop deletion).
3. **Invitation Workflow**: Member collaboration is initiated via a tokenized invitation system (`ShopInvitation`). An owner issues an invite with an email and role (`POST /shops/:shopId/invitations`), generating a 7-day token. Acceptance (`POST /shops/invitations/:token/accept`) strictly validates that the authenticated user's email matches the invited email address.
4. **Nested REST Structure**: All shop-scoped resources are exposed via explicit nested paths (`/shops/:shopId/events`, `/shops/:shopId/transactions`, `/shops/:shopId/balance`), making authorization checks deterministic and avoiding ambient header states.
5. **Data Migration**: Existing single-user events and transactions are migrated by auto-provisioning a default shop per user who owns records, setting that user as `OWNER`, and backfilling `shop_id`.

## Considered Options

1. **Header/Session-Based Ambient Tenant Context (`x-shop-id`)**:
    - _Rejected_: Prone to ambient context leakage and client cache mixing; explicit nested REST URLs provide clear authorization boundaries at the Elysia route layer.
2. **Direct Member Addition by Email/UUID without Invitations**:
    - _Rejected_: Prevents invitees from choosing whether to join an organization and fails when inviting teammates who do not yet have an account.

## Consequences

- **Collaborative Visibility**: All members of a shop share identical real-time visibility into the shop's events, transactions, and balances.
- **Auditability**: Retaining `created_by_user_id` preserves authorship while transferring financial ledger ownership to the shop.
- **Strict Boundary**: No transaction or event can exist outside of a shop context.
