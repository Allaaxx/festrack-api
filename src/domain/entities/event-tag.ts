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

export const DEFAULT_EVENT_TAG_SLUG = 'etc';
export const DEFAULT_EVENT_TAG_NAME = 'Outros';

export const SYSTEM_DEFAULT_EVENT_TAGS = [
    {
        id: 'system-family',
        name: 'Família',
        slug: 'family',
        color: 'bg-emerald-500',
        is_system: true,
    },
    {
        id: 'system-business',
        name: 'Negócios',
        slug: 'business',
        color: 'bg-blue-500',
        is_system: true,
    },
    {
        id: 'system-personal',
        name: 'Pessoal',
        slug: 'personal',
        color: 'bg-purple-500',
        is_system: true,
    },
    {
        id: 'system-holiday',
        name: 'Feriado',
        slug: 'holiday',
        color: 'bg-amber-500',
        is_system: true,
    },
    {
        id: 'system-etc',
        name: DEFAULT_EVENT_TAG_NAME,
        slug: DEFAULT_EVENT_TAG_SLUG,
        color: 'bg-slate-500',
        is_system: true,
    },
] as const;

export const SYSTEM_EVENT_TAGS = SYSTEM_DEFAULT_EVENT_TAGS;

export const SYSTEM_EVENT_TAG_IDS: ReadonlySet<string> = new Set(
    SYSTEM_EVENT_TAGS.map((t) => t.id),
);

export const SYSTEM_EVENT_TAG_SLUGS: ReadonlySet<string> = new Set(
    SYSTEM_EVENT_TAGS.map((t) => t.slug),
);

export type SystemEventTagSlug =
    (typeof SYSTEM_DEFAULT_EVENT_TAGS)[number]['slug'];
