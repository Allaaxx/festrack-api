export interface InsertCalendarEventParams {
    name: string;
    description?: string | null;
    start_date: Date | string;
    end_date: Date | string;
    timeZone?: string;
    all_day?: boolean;
}

export interface PatchCalendarEventParams {
    name?: string;
    description?: string | null;
    start_date?: Date | string;
    end_date?: Date | string;
    timeZone?: string;
    all_day?: boolean;
}

export interface GoogleCalendarAdapter {
    insert(
        userId: string,
        event: InsertCalendarEventParams,
    ): Promise<string | null>;
    patch(
        userId: string,
        googleEventId: string,
        event: PatchCalendarEventParams,
    ): Promise<void>;
    delete(userId: string, googleEventId: string): Promise<void>;
}
