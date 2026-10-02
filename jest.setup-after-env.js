import { jest } from '@jest/globals';
import { sqlClient } from './src/db/postgres/index.js';

globalThis.jest = jest;

beforeEach(async () => {
    await sqlClient.unsafe(
        'TRUNCATE TABLE "Transaction", "Event", "User" CASCADE;',
    );
});

afterAll(async () => {
    await sqlClient.end();
});
