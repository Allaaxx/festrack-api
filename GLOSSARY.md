# Financial Tracking API

API for managing personal, vendor, and event-related financial planning, expenses, and tracking across collaborative shops.

## Language

**Shop**:
A business, vendor, or collaborative organizational unit that owns events, transactions, and balances.
_Avoid_: Organization, team, store, vendor

**Shop Member**:
A user associated with a shop holding a specific role (e.g. Owner, Member) who can collaborate on the shop's events and transactions.
_Avoid_: Collaborator, participant, staff

**Shop Invitation**:
A pending authorization token sent to an email address allowing an invitee to join a shop as a member.
_Avoid_: Invite, pass, ticket, request

**Event**:
A scheduled occasion or financial project (e.g. wedding, festival, party) owned by a shop, spanning a start date and an end date, against which transactions can be tracked.
_Avoid_: Occasion, project, gathering

**Transaction**:
An individual financial movement of money (earning, expense, or investment) belonging to a shop, optionally associated with an event and attributed to the user who recorded it. Transactions associated with an event are temporally decoupled, meaning their occurrence date is independent of the event's start date and end date.
_Avoid_: Movement, entry, record

**User**:
An authenticated individual who can own, manage, or be a member of one or more shops. Better Auth's `Account` table is strictly an infrastructure credential storage detail for authentication providers and password hashes, not a domain concept.
_Avoid_: Account, client

**Balance**:
The net financial calculation (earnings minus expenses minus investments) for a shop over a designated time period.
_Avoid_: Net worth, total, summary
