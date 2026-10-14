import { Pool, type PoolClient, type QueryResultRow } from 'pg';
import { AppError } from '../errors/appError.js';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    connectionTimeoutMillis: Number(process.env.DATABASE_CONNECTION_TIMEOUT_MS ?? 5000),
});

const transientCodes = new Set([
    '08000',
    '08001',
    '08003',
    '08004',
    '08006',
    '08007',
    '57P01',
    '57P02',
    '57P03',
    '53300',
    'ECONNRESET',
    'ECONNREFUSED',
    'ETIMEDOUT',
]);

export class DatabaseUnavailableError extends AppError {
    constructor() {
        super(503, 'Data source is unavailable');
    }
}

function isTransientDatabaseError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;
    const code = 'code' in error ? error.code : undefined;
    return typeof code === 'string' && transientCodes.has(code);
}

async function withRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            if (!isTransientDatabaseError(error) || attempt === 2) {
                throw isTransientDatabaseError(error)
                    ? new DatabaseUnavailableError()
                    : error;
            }
            await new Promise((resolve) => setTimeout(resolve, 50 * 2 ** attempt));
        }
    }
    throw lastError;
}

export function query<T extends QueryResultRow>(
    text: string,
    values: unknown[] = [],
): Promise<{ rows: T[] }> {
    return withRetry(() => pool.query<T>(text, values));
}

export async function withTransaction<T>(
    operation: (client: PoolClient) => Promise<T>,
): Promise<T> {
    return withRetry(async () => {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const result = await operation(client);
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK').catch(() => undefined);
            throw error;
        } finally {
            client.release();
        }
    });
}

export async function closeDatabase(): Promise<void> {
    await pool.end();
}
