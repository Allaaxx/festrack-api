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
A scheduled occasion or financial project (e.g. wedding, festival, party) owned by a shop, spanning a start date and an end date, against which transactions can be tracked. Explicitly classified via `all_day` as either an All-Day Event or a Timed Event, attributed to the Shop Member (Author) who created it, and optionally synced to the Shop Owner's Google Calendar.
_Avoid_: Occasion, project, gathering

**All-Day Event**:
An Event (`all_day = true`) whose timeframe represents pure civil calendar dates (`YYYY-MM-DD`, inclusive end, independent of timezone offsets) rather than clock-time instants.
_Avoid_: Full-day event, 00:00–23:59 event

**Timed Event**:
An Event (`all_day = false`) anchored to exact clock-time instants with explicit timezone offsets from `start_date` to `end_date`.
_Avoid_: Hourly event, partial-day event

**Event Tag**:
A visual classification marker and filtering token (e.g. family, business, custom occasions) assigned to an event to categorize and organize calendar entries across a shop. May be a built-in system default or a custom tag created by shop members.
_Avoid_: Category, EventType, Classificação, Label

**Transaction**:
An individual financial movement of money (earning, expense, or investment) belonging to a shop, optionally associated with an event and attributed to the user who recorded it. Recorded against a pure civil calendar date (`YYYY-MM-DD`), independent of time-of-day or timezone offsets. Transactions associated with an event are temporally decoupled, meaning their occurrence date is independent of the event's start date and end date.
_Avoid_: Movement, entry, record

**User**:
An authenticated individual who can own, manage, or be a member of one or more shops. Better Auth's `Account` table is strictly an infrastructure credential storage detail for authentication providers and password hashes, not a domain concept.
_Avoid_: Account, client

**Balance**:
The net financial calculation (earnings minus expenses minus investments) for a shop over a designated time period.
_Avoid_: Net worth, total, summary

**Shop Asset**:
An optimized binary media resource (such as a WebP image, transaction receipt, or product image) owned by a shop, stored in object storage, and referenced by URL across domain records.
_Avoid_: File, media, attachment, upload

**Credential Provisioning**:
Users who register or sign in via an external OAuth identity provider (e.g. Google) initially lack a password credential. Festrack enables on-demand credential provisioning (`setPassword`), allowing users to create a password without needing a previous one and transitioning the account to support dual authentication methods (SSO and password).
_Avoid_: Password creation, initial password, account conversion

**Credential Rotation**:
Users with an existing password credential must provide their active password alongside their replacement secret (`changePassword`) to verify account ownership prior to updating credentials.
_Avoid_: Password reset, credential refresh, password modification

**Product**:
A salable, rentable, or serviceable offering created by a shop for customers.
_Avoid_: Item, article, listing, goods

**Product Bundle**:
A composite product whose availability and fulfillment are dynamically derived from a collection of component products rather than maintaining a dedicated physical stock.
_Avoid_: Kit, combo, package, grouped product

**Bundle Item**:
The association linking a product bundle to a required component product alongside its multiplier quantity.
_Avoid_: Component, ingredient, sub-item, part

**Stock**:
The physical inventory record tracking on-hand quantity and reserved allocations for a single simple product owned by a shop.
_Avoid_: Inventory, storage, warehouse count

**Stock Movement**:
An immutable ledger entry recording a discrete change in a product's stock caused by receipts, sales, rental allocations, returns, or losses.
_Avoid_: Stock change, adjustment record, inventory log
