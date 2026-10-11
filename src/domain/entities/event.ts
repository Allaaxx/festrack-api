export interface Event {
    id: string;
    name: string;
    description: string | null;
    start_date: Date | string;
    end_date: Date | string;
    user_id: string;
    google_event_id?: string | null;
}

export interface CreateEventParams {
    user_id: string;
    name: string;
    description?: string | null;
    start_date: Date | string;
    end_date: Date | string;
    google_event_id?: string | null;
}

export interface UpdateEventParams {
    name?: string;
    description?: string | null;
    start_date?: Date | string;
    end_date?: Date | string;
    google_event_id?: string | null;
}
