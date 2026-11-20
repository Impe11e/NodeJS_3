import { readFile } from 'node:fs/promises';
import { Pool } from 'pg';
import { expect } from 'vitest';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error('DATABASE_URL is not set: run tests via npm run test:all');
}

export const testPool = new Pool({ connectionString, max: 2 });

const TABLES = ['groups', 'users', 'subjects', 'teacher_subjects', 'lessons', 'grades'] as const;

const clearSql = await readFile(new URL('../../db/clear.sql', import.meta.url), 'utf8');

export async function resetDatabase(): Promise<void> {
    await testPool.query(clearSql);
}

export async function snapshotDatabase(): Promise<Record<string, unknown[]>> {
    const snapshot: Record<string, unknown[]> = {};
    for (const table of TABLES) {
        const result = await testPool.query(`SELECT * FROM ${table} ORDER BY 1, 2`);
        snapshot[table] = result.rows;
    }
    return snapshot;
}

export async function expectDatabaseUnchanged<T>(action: () => Promise<T>): Promise<T> {
    const before = await snapshotDatabase();
    const result = await action();
    expect(await snapshotDatabase()).toEqual(before);
    return result;
}

export async function countGrades(): Promise<number> {
    const result = await testPool.query<{ count: string }>('SELECT COUNT(*) AS count FROM grades');
    return Number(result.rows[0].count);
}

export async function closeTestPool(): Promise<void> {
    await testPool.end();
}
