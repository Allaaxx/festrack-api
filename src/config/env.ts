import { z } from 'zod';

const optionalString = z
    .string()
    .trim()
    .transform((val) => (val === '' ? undefined : val))
    .optional();

export const envSchema = z.object({
    NODE_ENV: z
        .enum(['development', 'test', 'production'])
        .default('development'),
    PORT: z.coerce.number().default(3000),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    BETTER_AUTH_SECRET: z.string().min(1, 'BETTER_AUTH_SECRET is required'),
    BETTER_AUTH_URL: z
        .string()
        .url('BETTER_AUTH_URL must be a valid URL')
        .default('http://localhost:3000'),
    FRONTEND_URL: optionalString,
    BETTER_AUTH_TRUSTED_ORIGINS: optionalString,
    GOOGLE_CLIENT_ID: optionalString,
    GOOGLE_CLIENT_SECRET: optionalString,
    S3_BUCKET: z.string().default('festrack'),
    S3_REGION: z.string().default('us-east-1'),
    S3_ENDPOINT: optionalString,
    S3_ACCESS_KEY_ID: optionalString,
    S3_SECRET_ACCESS_KEY: optionalString,
    S3_PUBLIC_URL: optionalString,
});

export type Env = z.infer<typeof envSchema>;

export const validateEnv = (
    config: Record<string, unknown> = process.env,
): Env => {
    const parsed = envSchema.safeParse(config);

    if (!parsed.success) {
        const formattedErrors = JSON.stringify(
            parsed.error.flatten().fieldErrors,
            null,
            2,
        );
        console.error(
            '❌ Invalid environment variables configuration:\n' +
                formattedErrors,
        );
        throw new Error(
            'Invalid environment variables. Please check your .env file.',
        );
    }

    return parsed.data;
};

export const env = validateEnv(process.env);
