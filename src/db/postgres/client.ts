import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schemas/index.js';
import { env } from '../../config/env.js';

const connectionString = env.DATABASE_URL;

export const sqlClient = postgres(connectionString, {
    max: 10,
});

export const db = drizzle(sqlClient, { schema });

export type Database = typeof db;
