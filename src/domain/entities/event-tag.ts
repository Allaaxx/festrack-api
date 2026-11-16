export interface EventTag {
    id: string;
    shop_id: string;
    name: string;
    slug: string;
    color: string;
    is_system: boolean;
    created_at: Date;
}

export interface CreateEventTagParams {
    shop_id: string;
    name: string;
    slug: string;
    color: string;
    is_system?: boolean;
}

export const SYSTEM_DEFAULT_EVENT_TAGS = [
    {
        name: 'Família',
        slug: 'family',
        color: 'bg-emerald-500',
        is_system: true,
    },
    {
        name: 'Negócios',
        slug: 'business',
        color: 'bg-blue-500',
        is_system: true,
    },
    {
        name: 'Pessoal',
        slug: 'personal',
        color: 'bg-purple-500',
        is_system: true,
    },
    {
        name: 'Feriado',
        slug: 'holiday',
        color: 'bg-amber-500',
        is_system: true,
    },
    {
        name: 'Outros',
        slug: 'etc',
        color: 'bg-slate-500',
        is_system: true,
    },
] as const;

export const SYSTEM_EVENT_TAG_SLUGS = [
    'family',
    'business',
    'personal',
    'holiday',
    'etc',
] as const;

export type SystemEventTagSlug = (typeof SYSTEM_EVENT_TAG_SLUGS)[number];

export function getSystemDefaultEventTags(shopId: string): EventTag[] {
    return SYSTEM_DEFAULT_EVENT_TAGS.map((tag) => ({
        id: `system-${tag.slug}`,
        shop_id: shopId,
        name: tag.name,
        slug: tag.slug,
        color: tag.color,
        is_system: true,
        created_at: new Date(0),
    }));
}
