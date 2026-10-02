import dotenv from 'dotenv';
dotenv.config({ path: '.env.test', override: true });

import { beforeAll, beforeEach, afterAll, jest } from 'bun:test';
import { sqlClient } from '../db/postgres/index.js';
import { execSync } from 'child_process';

globalThis.jest = jest;

beforeAll(async () => {
    try {
        const tables = await sqlClient.unsafe(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'User';",
        );
        if (tables.length === 0) {
            execSync('bunx drizzle-kit push --force', {
                env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
                stdio: 'ignore',
            });
        }
    } catch {
        // Allow tests to continue if check cannot be performed
    }
});

beforeEach(async () => {
    await sqlClient.unsafe(
        'TRUNCATE TABLE "Transaction", "Event", "User" CASCADE;',
    );
});

afterAll(async () => {
    await sqlClient.end();
});
