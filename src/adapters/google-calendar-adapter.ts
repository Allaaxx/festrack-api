import { and, eq } from 'drizzle-orm';
import { db, Database } from '../db/postgres/index.js';
import { account } from '../db/postgres/schemas/index.js';
import { env } from '../config/env.js';
import {
    GoogleCalendarAdapter,
    InsertCalendarEventParams,
    PatchCalendarEventParams,
} from '../domain/index.js';

export interface GoogleCalendarAdapterOptions {
    database?: Database;
    clientId?: string;
    clientSecret?: string;
    calendarBaseUrl?: string;
    oauthTokenUrl?: string;
}

export class DefaultGoogleCalendarAdapter implements GoogleCalendarAdapter {
    private readonly database: Database;
    private readonly clientId: string;
    private readonly clientSecret: string;
    private readonly calendarBaseUrl: string;
    private readonly oauthTokenUrl: string;

    constructor(options?: GoogleCalendarAdapterOptions) {
        this.database = options?.database ?? db;
        this.clientId = options?.clientId ?? env.GOOGLE_CLIENT_ID ?? '';
        this.clientSecret =
            options?.clientSecret ?? env.GOOGLE_CLIENT_SECRET ?? '';
        this.calendarBaseUrl =
            options?.calendarBaseUrl ??
            'https://www.googleapis.com/calendar/v3';
        this.oauthTokenUrl =
            options?.oauthTokenUrl ?? 'https://oauth2.googleapis.com/token';
    }

    private async getGoogleAccount(userId: string) {
        const [googleAccount] = await this.database
            .select()
            .from(account)
            .where(
                and(
                    eq(account.userId, userId),
                    eq(account.providerId, 'google'),
                ),
            );

        return googleAccount ?? null;
    }

    private async refreshToken(
        googleAccount: typeof account.$inferSelect,
    ): Promise<string> {
        if (!googleAccount.refreshToken) {
            throw new Error('Google refresh token not found for user');
        }

        const bodyParams = new URLSearchParams({
            client_id: this.clientId,
            client_secret: this.clientSecret,
            refresh_token: googleAccount.refreshToken,
            grant_type: 'refresh_token',
        });

        const response = await fetch(this.oauthTokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: bodyParams.toString(),
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(
                `Failed to refresh Google token (${response.status}): ${errText}`,
            );
        }

        const data = (await response.json()) as {
            access_token: string;
            expires_in?: number;
        };

        const newExpiresAt = data.expires_in
            ? new Date(Date.now() + data.expires_in * 1000)
            : null;

        await this.database
            .update(account)
            .set({
                accessToken: data.access_token,
                accessTokenExpiresAt: newExpiresAt,
            })
            .where(eq(account.id, googleAccount.id));

        return data.access_token;
    }

    private async getValidAccessToken(
        googleAccount: typeof account.$inferSelect,
    ): Promise<string> {
        const isExpired =
            !googleAccount.accessToken ||
            (googleAccount.accessTokenExpiresAt &&
                googleAccount.accessTokenExpiresAt.getTime() - Date.now() <
                    60000);

        if (isExpired && googleAccount.refreshToken) {
            return await this.refreshToken(googleAccount);
        }

        if (googleAccount.accessToken) {
            return googleAccount.accessToken;
        }

        throw new Error(
            'No valid access or refresh token found for Google account',
        );
    }

    async insert(
        userId: string,
        event: InsertCalendarEventParams,
    ): Promise<string | null> {
        const googleAccount = await this.getGoogleAccount(userId);
        if (!googleAccount) {
            return null;
        }

        let accessToken = await this.getValidAccessToken(googleAccount);

        const requestBody = {
            summary: event.name,
            description: event.description ?? undefined,
            start: {
                dateTime: new Date(event.start_date).toISOString(),
            },
            end: {
                dateTime: new Date(event.end_date).toISOString(),
            },
        };

        const url = `${this.calendarBaseUrl}/calendars/primary/events`;
        let response = await fetch(url, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        if (response.status === 401 && googleAccount.refreshToken) {
            accessToken = await this.refreshToken(googleAccount);
            response = await fetch(url, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });
        }

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(
                `Google Calendar insert failed (${response.status}): ${errText}`,
            );
        }

        const data = (await response.json()) as { id: string };
        return data.id ?? null;
    }

    async patch(
        userId: string,
        googleEventId: string,
        event: PatchCalendarEventParams,
    ): Promise<void> {
        const googleAccount = await this.getGoogleAccount(userId);
        if (!googleAccount) {
            return;
        }

        let accessToken = await this.getValidAccessToken(googleAccount);

        const requestBody: Record<string, unknown> = {};
        if (event.name !== undefined) requestBody.summary = event.name;
        if (event.description !== undefined)
            requestBody.description = event.description ?? '';
        if (event.start_date !== undefined) {
            requestBody.start = {
                dateTime: new Date(event.start_date).toISOString(),
            };
        }
        if (event.end_date !== undefined) {
            requestBody.end = {
                dateTime: new Date(event.end_date).toISOString(),
            };
        }

        const url = `${this.calendarBaseUrl}/calendars/primary/events/${encodeURIComponent(googleEventId)}`;
        let response = await fetch(url, {
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        if (response.status === 401 && googleAccount.refreshToken) {
            accessToken = await this.refreshToken(googleAccount);
            response = await fetch(url, {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });
        }

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(
                `Google Calendar patch failed (${response.status}): ${errText}`,
            );
        }
    }

    async delete(userId: string, googleEventId: string): Promise<void> {
        const googleAccount = await this.getGoogleAccount(userId);
        if (!googleAccount) {
            return;
        }

        let accessToken = await this.getValidAccessToken(googleAccount);

        const url = `${this.calendarBaseUrl}/calendars/primary/events/${encodeURIComponent(googleEventId)}`;
        let response = await fetch(url, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        if (response.status === 401 && googleAccount.refreshToken) {
            accessToken = await this.refreshToken(googleAccount);
            response = await fetch(url, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
        }

        // If event is already deleted (404 or 410), treat as idempotent success
        if (response.status === 404 || response.status === 410) {
            return;
        }

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(
                `Google Calendar delete failed (${response.status}): ${errText}`,
            );
        }
    }
}
