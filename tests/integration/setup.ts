import { afterAll, beforeAll, beforeEach } from 'vitest';
import { closeDatabase, initDatabase, loadDbConfig } from '../../src/db/database.js';
import { closeTestPool, resetDatabase } from '../helpers/db.js';

beforeAll(() => {
    initDatabase(loadDbConfig(), { error: () => undefined });
});

beforeEach(async () => {
    await resetDatabase();
});

afterAll(async () => {
    await closeDatabase();
    await closeTestPool();
});
