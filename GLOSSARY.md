# Financial Tracking API

API for managing personal and event-related financial planning, expenses, and tracking.

## Language

**Event**:
A scheduled occasion or financial project (e.g. wedding, trip, party) owned by a user, spanning a start date and an end date, against which transactions can be tracked.
_Avoid_: Occasion, project, gathering

**Transaction**:
An individual financial movement of money (earning, expense, or investment) belonging to a user, optionally associated with an event.
_Avoid_: Movement, entry, record

**User**:
An account holder who owns events and transactions. In the domain model, `User` remains the single actor owning events and transactions. Better Auth's `Account` table is strictly an infrastructure credential storage detail for authentication providers and password hashes, not a domain concept.
_Avoid_: Account, member, client

**Balance**:
The net financial calculation (earnings minus expenses minus investments) for a user over a designated time period.
_Avoid_: Net worth, total, summary
