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
}

export interface CreateEventParams {
    shop_id: string;
    created_by_user_id: string;
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
