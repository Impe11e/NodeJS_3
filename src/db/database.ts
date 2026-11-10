import { Pool, type PoolClient, type QueryResultRow } from 'pg';
import { AppError } from '../errors/appError.js';

export interface DatabaseConfig {
    connectionString: string;
    max: number;
    connectionTimeoutMillis: number;
    idleTimeoutMillis: number;
    statementTimeoutMillis: number;
}

export interface DatabaseLogger {
    error(obj: unknown, msg?: string): void;
}

function readPositiveInt(name: string, fallback: number): number {
    const raw = process.env[name];
    if (raw === undefined || raw === '') return fallback;
    const value = Number(raw);
    if (!Number.isInteger(value) || value <= 0) {
        throw new Error(`${name} must be a positive integer, got "${raw}"`);
    }
    return value;
}

export function loadDbConfig(): DatabaseConfig {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        throw new Error('DATABASE_URL is not set');
    }
    return {
        connectionString,
        max: readPositiveInt('DATABASE_POOL_MAX', 10),
        connectionTimeoutMillis: readPositiveInt('DATABASE_CONNECTION_TIMEOUT_MS', 5000),
        idleTimeoutMillis: readPositiveInt('DATABASE_IDLE_TIMEOUT_MS', 10000),
        statementTimeoutMillis: readPositiveInt('DATABASE_STATEMENT_TIMEOUT_MS', 10000),
    };
}

let pool: Pool | undefined;

export function initDatabase(config: DatabaseConfig, logger: DatabaseLogger): void {
    if (pool) {
        throw new Error('Database is already initialized');
    }
    pool = new Pool({
        connectionString: config.connectionString,
        max: config.max,
        connectionTimeoutMillis: config.connectionTimeoutMillis,
        idleTimeoutMillis: config.idleTimeoutMillis,
        statement_timeout: config.statementTimeoutMillis,
    });
    pool.on('error', (err) => {
        logger.error({ err }, 'Unexpected error on idle PostgreSQL client');
    });
}

function getPool(): Pool {
    if (!pool) {
        throw new Error('Database is not initialized, call initDatabase() first');
    }
    return pool;
}

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
                throw isTransientDatabaseError(error) ? new DatabaseUnavailableError() : error;
            }
            await new Promise((resolve) => setTimeout(resolve, 50 * 2 ** attempt));
        }
    }
    throw lastError;
}

export function query<T extends QueryResultRow>(
    text: string,
    values: unknown[] = []
): Promise<{ rows: T[] }> {
    return withRetry(() => getPool().query<T>(text, values));
}

export async function withTransaction<T>(
    operation: (client: PoolClient) => Promise<T>
): Promise<T> {
    const client = await withRetry(() => getPool().connect());
    let brokenConnection: Error | undefined;
    try {
        await client.query('BEGIN');
        const result = await operation(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        try {
            await client.query('ROLLBACK');
        } catch (rollbackError) {
            brokenConnection =
                rollbackError instanceof Error ? rollbackError : new Error(String(rollbackError));
        }
        throw isTransientDatabaseError(error) ? new DatabaseUnavailableError() : error;
    } finally {
        client.release(brokenConnection);
    }
}

export async function closeDatabase(): Promise<void> {
    if (!pool) return;
    const current = pool;
    pool = undefined;
    await current.end();
}
