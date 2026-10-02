import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schemas/index.js';

const connectionString =
    process.env.DATABASE_URL ||
    'postgresql://postgres:password@localhost:5432/finance-app';

export const sqlClient = postgres(connectionString, {
    max: 10,
});

export const db = drizzle(sqlClient, { schema });

export type Database = typeof db;
