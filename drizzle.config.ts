import { defineConfig } from 'drizzle-kit';

export default defineConfig({
    dialect: 'postgresql',
    schema: './src/db/postgres/schemas/index.ts',
    out: './src/db/postgres/migrations',
    dbCredentials: {
        url: process.env.DATABASE_URL || '',
    },
});
