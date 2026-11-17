export interface EventTag {
    id: string;
    shop_id: string;
    name: string;
    slug: string;
    color: string;
    created_at: Date;
}

export interface CreateEventTagParams {
    shop_id: string;
    name: string;
    slug: string;
    color: string;
}
