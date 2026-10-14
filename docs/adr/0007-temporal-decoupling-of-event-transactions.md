# 0007. Temporal Decoupling of Event Transactions

Date: 2026-10-14

## Status

Accepted

## Context

In financial and event management domains, transactions linked to an Event (such as a wedding, conference, trip, or party) frequently take place outside the calendar window of the event itself. For example, venue deposits, ticket purchases, and vendor advance retainers often happen months before the event's `start_date`, while post-event vendor balance settlements, damage deposit refunds, or late reimbursements occur days or weeks after `end_date`.

When designing event-level transaction querying (`GET /api/transactions/me?event_id=:eventId`) to support dedicated event financial dashboards, the system needed to establish whether transactions tied to an Event are temporally bound by the event's date span.

## Decision

We decouple Transaction dates from Event dates across the domain model, API contracts, and database queries:

1. **Unbounded Event Querying**: When filtering transactions by `event_id`, the database query groups transactions purely by foreign key association (`WHERE user_id = :userId AND event_id = :eventId`), without constraining transaction dates to `start_date` and `end_date`.
2. **Explicit Composition**: Date filtering via `from` and `to` remains supported alongside `event_id` as optional criteria. When omitted, all transactions associated with the Event are returned across all time.
3. **Event Ownership Verification**: Querying by `event_id` explicitly checks event existence and verifies ownership by the authenticated User, returning `404 Not Found` if non-existent and `403 Forbidden` if owned by another user.
4. **Deterministic Sorting**: Transactions returned for a user or event are ordered chronologically by transaction date descending (`ORDER BY date DESC`) to ensure a consistent ledger view.

## Considered Options

1. **Strict Temporal Validation (Constrain transaction date to event date range)**:
    - _Pros_: Prevents accidental assignment of transactions to events occurring in completely different timeframes.
    - _Cons_: Artificially restricts real-world financial workflows where advance deposits and post-event settlements occur outside the event calendar window.

2. **Implicit Filter without Ownership Validation**:
    - _Pros_: Simpler SQL query without querying `EventRepository`.
    - _Cons_: Silent empty arrays on typos or non-existent event IDs, and ambiguous status codes when querying other users' events.

## Consequences

- **Domain Accuracy**: Users can record transactions whenever cash flows occur without being forced to manipulate event start/end dates.
- **Client Flexibility**: The event detail screen can reliably calculate total earnings, expenses, investments, and net balance across the entire lifecycle of an event.
- **Validation Consistency**: Route-level checks and use cases consistently enforce ownership across all event and transaction operations.
