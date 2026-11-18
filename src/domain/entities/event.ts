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
}

/**
 * Extracts the YYYY-MM-DD civil calendar date from a Date or ISO date string
 * without shifting days across timezones.
 */
export function extractCivilDate(value: Date | string): string {
    if (value instanceof Date) {
        return value.toISOString().slice(0, 10);
    }
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
        return trimmed.slice(0, 10);
    }
    return new Date(trimmed).toISOString().slice(0, 10);
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
