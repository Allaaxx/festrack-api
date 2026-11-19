# 0011. Civil-Date Carrier for All-Day Events via Explicit `all_day` Boolean

Status: Accepted

We added an explicit `all_day` boolean column (`DEFAULT false NOT NULL`) to `Event` while keeping `start_date` and `end_date` as `timestamp` columns, storing All-Day Events as UTC civil-date carriers (`YYYY-MM-DDT00:00:00.000Z` to `YYYY-MM-DDT23:59:59.000Z`, inclusive) and synchronizing them to Google Calendar using `{ date }` with an exclusive `end.date` (+1 day).

## Context

Previously, Festrack had no `all_day` field and inferred all-day status on the frontend by checking for `00:00`–`23:59`. Once the client switched to sending explicit local timezone offsets (`-03:00`) for Google Calendar alignment, all-day events shifted to `03:00Z`–`02:59Z` next day, causing all-day detection to fail and events to spill into the following calendar day.

## Considered Options

1. **Infer from `00:00`–`23:59` with timezone-aware parsing:** Rejected because all-day events are civil calendar dates (not timezone-bound instants), so an event created in `-03:00` would shift days in `-04:00` or `+00:00`, and genuine `00:00`–`23:59` timed events could not exist.
2. **Separate `DATE` columns (`start_on`/`end_on`) vs `TIMESTAMP` columns (`start_at`/`end_at`):** Rejected because splitting columns complicates SQL ordering, range queries, and backward compatibility across existing API consumers.
3. **Explicit `all_day` boolean + UTC civil-date carrier on `start_date`/`end_date`:** Selected. Keeps a single chronological pair for DB indexing/sorting while unambiguously distinguishing civil dates (`all_day = true`) from timezone-aware instants (`all_day = false`).

## Consequences

- Clients and adapters must check `all_day` before interpreting `start_date` / `end_date`: read the UTC `YYYY-MM-DD` prefix when `all_day = true`, and parse as a timezone-aware instant when `all_day = false`.
- `GoogleCalendarAdapter` maps `all_day = true` to `{ date }` (adding 1 day to `end_date` for Google's exclusive end convention) and explicitly nulls out the opposite field (`dateTime: null` or `date: null`) when `patch` switches an event's mode.
