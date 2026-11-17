# 0010. Centralized Shop Owner Google Calendar Synchronization

Date: 2026-11-17

## Status

Accepted

## Context

Festrack supports multi-user collaborative `Shops` where multiple `Shop Members` (`OWNER` and `MEMBER`) can create, update, and delete `Events`. Previously, Google Calendar synchronization was bound to the individual authenticated user executing the request (`input.userId`). This caused two problems in multi-user shops:

1. Events created by a `MEMBER` were either not synced to the business calendar or synced to the member's personal Google Calendar instead of a single shop-wide calendar.
2. When another member or the owner subsequently edited an event, `patch` could not locate or update the event in the editor's calendar, and events without a `google_event_id` (legacy or failed initial sync) were silently skipped on update.

## Decision

1. **Owner-Centralized Sync**: All Google Calendar operations (`insert`, `patch`, `delete`) for any `Event` belonging to a `Shop` are executed against the Shop `OWNER`'s connected Google account (if `google_calendar_sync_enabled` is active on the `OWNER`), regardless of which `Shop Member` performs the action.
2. **Automatic Fallback on Update**: During an event update, if the event lacks a `google_event_id` or if the `patch` request returns `404`/`410` (e.g., deleted externally or migrated from a previous owner/member calendar), the use case automatically falls back to `insert` on the current Shop `OWNER`'s Google Calendar and persists the newly returned `google_event_id`.
3. **Non-Blocking Synchronization**: Google Calendar failures remain non-blocking so local Festrack event persistence is never interrupted by external API outages or revoked tokens.

## Consequences

- **Positive**: A `Shop` has a single, consistent external Google Calendar source of truth managed by the `OWNER`, and `MEMBER`s do not need personal Google Calendar integrations to contribute events.
- **Negative / Trade-off**: If a `Shop` transfers ownership (`transfer-shop-ownership`), existing events retain the previous owner's `google_event_id`. Updating any such event will trigger the `404` fallback and recreate it in the new owner's calendar, while the old entry remains in the previous owner's calendar unless manually removed.
