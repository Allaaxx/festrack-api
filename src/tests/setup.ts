import dotenv from 'dotenv';
dotenv.config({ path: '.env.test', override: true });

import { beforeEach, afterAll, jest } from 'bun:test';
import { sqlClient } from '../db/postgres/index.js';

globalThis.jest = jest;

beforeEach(async () => {
    await sqlClient.unsafe(
        'TRUNCATE TABLE "Transaction", "Event", "User" CASCADE;',
    );
});

afterAll(async () => {
    await sqlClient.end();
});
