import { describe, it, expect } from 'bun:test';
import { envSchema, validateEnv } from './env.js';

describe('Environment Configuration Validation', () => {
    it('should successfully parse valid minimal environment variables with defaults', () => {
        const input = {
            DATABASE_URL:
                'postgresql://postgres:password@localhost:5432/finance-app',
            BETTER_AUTH_SECRET: 'super-secret-test-key-at-least-32-chars-long',
        };

        const result = envSchema.safeParse(input);

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.PORT).toBe(3000);
            expect(result.data.NODE_ENV).toBe('development');
            expect(result.data.BETTER_AUTH_URL).toBe('http://localhost:3000');
            expect(result.data.S3_BUCKET).toBe('festrack');
            expect(result.data.S3_REGION).toBe('us-east-1');
            expect(result.data.FRONTEND_URL).toBeUndefined();
            expect(result.data.S3_ENDPOINT).toBeUndefined();
        }
    });

    it('should fail validation when DATABASE_URL is missing or empty', () => {
        const input = {
            BETTER_AUTH_SECRET: 'super-secret-key',
        };

        const result = envSchema.safeParse(input);

        expect(result.success).toBe(false);
        if (!result.success) {
            const errors = result.error.flatten().fieldErrors;
            expect(errors.DATABASE_URL).toBeDefined();
        }
    });

    it('should fail validation when BETTER_AUTH_SECRET is missing or empty', () => {
        const input = {
            DATABASE_URL:
                'postgresql://postgres:password@localhost:5432/finance-app',
            BETTER_AUTH_SECRET: '',
        };

        const result = envSchema.safeParse(input);

        expect(result.success).toBe(false);
        if (!result.success) {
            const errors = result.error.flatten().fieldErrors;
            expect(errors.BETTER_AUTH_SECRET).toBeDefined();
        }
    });

    it('should convert empty strings to undefined for optional fields', () => {
        const input = {
            DATABASE_URL:
                'postgresql://postgres:password@localhost:5432/finance-app',
            BETTER_AUTH_SECRET: 'super-secret-key',
            FRONTEND_URL: '',
            BETTER_AUTH_TRUSTED_ORIGINS: '',
            GOOGLE_CLIENT_ID: '',
            GOOGLE_CLIENT_SECRET: '',
            S3_ENDPOINT: '',
            S3_PUBLIC_URL: '',
        };

        const result = envSchema.safeParse(input);

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.FRONTEND_URL).toBeUndefined();
            expect(result.data.BETTER_AUTH_TRUSTED_ORIGINS).toBeUndefined();
            expect(result.data.GOOGLE_CLIENT_ID).toBeUndefined();
            expect(result.data.GOOGLE_CLIENT_SECRET).toBeUndefined();
            expect(result.data.S3_ENDPOINT).toBeUndefined();
            expect(result.data.S3_PUBLIC_URL).toBeUndefined();
        }
    });

    it('should coerce PORT from string to number', () => {
        const input = {
            DATABASE_URL:
                'postgresql://postgres:password@localhost:5432/finance-app',
            BETTER_AUTH_SECRET: 'super-secret-key',
            PORT: '8080',
        };

        const result = envSchema.safeParse(input);

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.PORT).toBe(8080);
        }
    });

    it('should throw an informative error when validateEnv is called with invalid config', () => {
        expect(() => validateEnv({})).toThrow(/Invalid environment variables/);
    });
});
