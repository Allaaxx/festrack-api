import { defineConfig } from 'drizzle-kit';
import { env } from './src/config/env.js';

export default defineConfig({
    dialect: 'postgresql',
    schema: './src/db/postgres/schemas/index.ts',
    out: './src/db/postgres/migrations',
    dbCredentials: {
        url: env.DATABASE_URL,
    },
});
