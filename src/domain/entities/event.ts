import { InvalidEventDateRangeError } from '../../errors/event.js';

export interface EventAuthor {
    id: string;
    name: string;
    first_name: string;
    last_name: string;
    email: string;
    image: string | null;
}

export interface Event {
    id: string;
    shop_id: string;
    name: string;
    description: string | null;
    start_date: Date | string;
    end_date: Date | string;
    created_by_user_id: string | null;
    user_id?: string | null;
    google_event_id?: string | null;
    tag?: string | null;
    all_day: boolean;
    author?: EventAuthor;
}

export interface CreateEventParams {
    shop_id: string;
    created_by_user_id: string;
    name: string;
    description?: string | null;
    start_date: Date | string;
    end_date: Date | string;
    google_event_id?: string | null;
    tag?: string | null;
    all_day?: boolean;
}

export interface UpdateEventParams {
    name?: string;
    description?: string | null;
    start_date?: Date | string;
    end_date?: Date | string;
    google_event_id?: string | null;
    tag?: string | null;
    all_day?: boolean;
}

const ISO_DATE_PREFIX_REGEX = /^(\d{4})-(\d{2})-(\d{2})(?:$|[Tt])/;

/**
 * Validates that an ISO date/datetime string parses cleanly and does not
 * silently roll over an impossible calendar date (e.g. 2026-02-30 -> 2026-03-02).
 */
export function isIsoDateValid(dateStr: string): boolean {
    const trimmed = dateStr.trim();
    const match = ISO_DATE_PREFIX_REGEX.exec(trimmed);
    if (!match) {
        return false;
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const calendarCheck = new Date(Date.UTC(year, month - 1, day));
    if (
        calendarCheck.getUTCFullYear() !== year ||
        calendarCheck.getUTCMonth() !== month - 1 ||
        calendarCheck.getUTCDate() !== day
    ) {
        return false;
    }

    return !isNaN(new Date(trimmed).getTime());
}

function assertValidEventDate(value: Date | string): void {
    if (value instanceof Date) {
        if (isNaN(value.getTime())) {
            throw new InvalidEventDateRangeError('Invalid date.');
        }
        return;
    }
    if (!isIsoDateValid(value)) {
        throw new InvalidEventDateRangeError('Invalid date.');
    }
}

/**
 * Extracts the YYYY-MM-DD civil calendar date from a Date or ISO date string
 * without shifting days across timezones.
 */
export function extractCivilDate(value: Date | string): string {
    assertValidEventDate(value);
    if (value instanceof Date) {
        return value.toISOString().slice(0, 10);
    }
    return value.trim().slice(0, 10);
}

/**
 * Normalizes All-Day Event dates to inclusive UTC civil-date carrier bounds
 * (`YYYY-MM-DDT00:00:00.000Z` to `YYYY-MM-DDT23:59:59.000Z`) per ADR 0011.
 */
export function normalizeAllDayDates(
    startDate: Date | string,
    endDate: Date | string,
): { start_date: string; end_date: string } {
    return {
        start_date: `${extractCivilDate(startDate)}T00:00:00.000Z`,
        end_date: `${extractCivilDate(endDate)}T23:59:59.000Z`,
    };
}

/**
 * Validates and resolves effective event date bounds for All-Day and Timed Events.
 */
export function resolveEventDateRange(
    startDate: Date | string,
    endDate: Date | string,
    allDay = false,
): { start_date: Date | string; end_date: Date | string } {
    if (allDay) {
        const normalized = normalizeAllDayDates(startDate, endDate);
        if (new Date(normalized.end_date) < new Date(normalized.start_date)) {
            throw new InvalidEventDateRangeError();
        }
        return normalized;
    }

    assertValidEventDate(startDate);
    assertValidEventDate(endDate);
    if (new Date(endDate) < new Date(startDate)) {
        throw new InvalidEventDateRangeError();
    }

    return {
        start_date: startDate,
        end_date: endDate,
    };
}
