import dotenv from 'dotenv';
dotenv.config({ path: '.env.test', override: true });

import { beforeEach, afterAll, jest } from 'bun:test';
import { sqlClient } from '../db/postgres/index.js';

globalThis.jest = jest;

beforeEach(async () => {
    try {
        await sqlClient.unsafe(
            'TRUNCATE TABLE "Transaction", "Event", "User" CASCADE;',
        );
    } catch {
        // Safe fallback if database is not reachable or tables do not exist
    }
});

afterAll(async () => {
    try {
        await sqlClient.end();
    } catch {
        // Safe fallback
    }
});
