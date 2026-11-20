import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import {
    closeDatabase,
    DatabaseUnavailableError,
    initDatabase,
    query,
    withTransaction,
} from '../../src/db/database.js';
import { sql } from '../../src/db/sql.js';
import { AppError } from '../../src/errors/appError.js';

const pool = vi.hoisted(() => ({
    query: vi.fn(),
    connect: vi.fn(),
    on: vi.fn(),
    end: vi.fn(),
}));

vi.mock('pg', () => ({
    Pool: vi.fn(function Pool() {
        return pool;
    }),
}));

const statement = sql`SELECT 1`;
const rows = { rows: [{ value: 1 }] };

function withCode(code: string): Error {
    return Object.assign(new Error(`error ${code}`), { code });
}

const transientErrors: Array<[string, () => Error]> = [
    ['ECONNREFUSED', () => withCode('ECONNREFUSED')],
    ['ECONNRESET', () => withCode('ECONNRESET')],
    ['57P01 admin_shutdown', () => withCode('57P01')],
    ['08006 connection_failure', () => withCode('08006')],
    [
        'таймаут нового з’єднання',
        () => new Error('Connection terminated due to connection timeout'),
    ],
    [
        'таймаут очікування з’єднання в пулі',
        () => new Error('timeout exceeded when trying to connect'),
    ],
];

const regularErrors: Array<[string, () => Error]> = [
    ['унікальність 23505', () => withCode('23505')],
    ['синтаксис SQL 42601', () => withCode('42601')],
    ['помилка без коду', () => new Error('unexpected failure')],
    ['інший текст про таймаут', () => new Error('Query read timeout')],
];

async function catchError(promise: Promise<unknown>): Promise<unknown> {
    return promise.then(
        () => {
            throw new Error('Expected promise to reject');
        },
        (error: unknown) => error
    );
}

function expectUnavailable(error: unknown): void {
    expect(error).toBeInstanceOf(DatabaseUnavailableError);
    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({ statusCode: 503, message: 'Data source is unavailable' });
}

beforeAll(() => {
    initDatabase(
        {
            connectionString: 'postgres://user:password@localhost:5432/db',
            max: 1,
            connectionTimeoutMillis: 100,
            idleTimeoutMillis: 100,
            statementTimeoutMillis: 100,
        },
        { error: () => undefined }
    );
});

afterAll(async () => {
    await closeDatabase();
});

describe('query — ретраї', () => {
    test.each(transientErrors)('%s один раз — повтор і успіх', async (_label, makeError) => {
        pool.query.mockRejectedValueOnce(makeError()).mockResolvedValueOnce(rows);

        const result = await query(statement);

        expect(result).toBe(rows);
        expect(pool.query).toHaveBeenCalledTimes(2);
        expect(pool.query).toHaveBeenNthCalledWith(1, statement);
        expect(pool.query).toHaveBeenNthCalledWith(2, statement);
    });

    test('дві тимчасові помилки поспіль — третя спроба успішна', async () => {
        pool.query
            .mockRejectedValueOnce(new Error('Connection terminated due to connection timeout'))
            .mockRejectedValueOnce(withCode('ECONNREFUSED'))
            .mockResolvedValueOnce(rows);

        const result = await query(statement);

        expect(result).toBe(rows);
        expect(pool.query).toHaveBeenCalledTimes(3);
    });

    test.each(transientErrors)('%s тричі — 503 після 3 спроб', async (_label, makeError) => {
        pool.query.mockImplementation(async () => {
            throw makeError();
        });

        const error = await catchError(query(statement));

        expectUnavailable(error);
        expect(pool.query).toHaveBeenCalledTimes(3);
    });

    test.each(regularErrors)('%s — без повторів, прокидається як є', async (_label, makeError) => {
        const failure = makeError();
        pool.query.mockRejectedValueOnce(failure);

        const error = await catchError(query(statement));

        expect(error).toBe(failure);
        expect(pool.query).toHaveBeenCalledOnce();
    });
});

describe('withTransaction — ретраї з’єднання', () => {
    function fakeClient() {
        return { query: vi.fn().mockResolvedValue(rows), release: vi.fn() };
    }

    test('таймаут з’єднання один раз — повтор, транзакція виконується', async () => {
        const client = fakeClient();
        pool.connect
            .mockRejectedValueOnce(new Error('Connection terminated due to connection timeout'))
            .mockResolvedValueOnce(client);
        const operation = vi.fn().mockResolvedValue('done');

        const result = await withTransaction(operation);

        expect(result).toBe('done');
        expect(pool.connect).toHaveBeenCalledTimes(2);
        expect(operation).toHaveBeenCalledExactlyOnceWith(client);
        expect(client.query.mock.calls).toEqual([['BEGIN'], ['COMMIT']]);
        expect(client.release).toHaveBeenCalledOnce();
    });

    test('таймаут з’єднання тричі — 503, операція не виконується', async () => {
        pool.connect.mockImplementation(async () => {
            throw new Error('Connection terminated due to connection timeout');
        });
        const operation = vi.fn();

        const error = await catchError(withTransaction(operation));

        expectUnavailable(error);
        expect(pool.connect).toHaveBeenCalledTimes(3);
        expect(operation).not.toHaveBeenCalled();
    });

    test('звичайна помилка з’єднання — без повторів, прокидається як є', async () => {
        const failure = withCode('28P01');
        pool.connect.mockRejectedValueOnce(failure);
        const operation = vi.fn();

        const error = await catchError(withTransaction(operation));

        expect(error).toBe(failure);
        expect(pool.connect).toHaveBeenCalledOnce();
        expect(operation).not.toHaveBeenCalled();
    });
});
