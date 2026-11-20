import { createServer, type Server, type Socket } from 'node:net';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, beforeEach, describe, test } from 'vitest';
import { closeDatabase, initDatabase } from '../../src/db/database.js';
import { expectDatabaseUnchanged } from './helpers/db.js';
import { createWorld, type World } from './helpers/factory.js';
import { asUser, expectError, useApp } from './helpers/app.js';

const { request } = useApp();

let world: World;

beforeEach(async () => {
    world = await createWorld();
});

function config(port: number, connectionTimeoutMillis: number) {
    return {
        connectionString: `postgres://journal:journal@127.0.0.1:${port}/journal`,
        max: 1,
        connectionTimeoutMillis,
        idleTimeoutMillis: 1000,
        statementTimeoutMillis: 1000,
    };
}

function endpoints(w: World) {
    return [
        {
            name: 'POST /grades',
            options: {
                method: 'POST' as const,
                url: '/grades',
                headers: asUser(w.teacher.id),
                payload: { student_id: w.student.id, lesson_id: w.lessonId, score: 90 },
            },
        },
        {
            name: 'GET /lessons/:lessonId',
            options: {
                method: 'GET' as const,
                url: `/lessons/${w.lessonId}`,
                headers: asUser(w.teacher.id),
            },
        },
        {
            name: 'GET /grades',
            options: { method: 'GET' as const, url: '/grades', headers: asUser(w.student.id) },
        },
        {
            name: 'GET /grades/average',
            options: {
                method: 'GET' as const,
                url: '/grades/average',
                headers: asUser(w.student.id),
            },
        },
    ];
}

const endpointNames = [
    'POST /grades',
    'GET /lessons/:lessonId',
    'GET /grades',
    'GET /grades/average',
];

async function listen(server: Server): Promise<number> {
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    return (server.address() as AddressInfo).port;
}

async function close(server: Server): Promise<void> {
    await new Promise<void>((resolve) => server.close(() => resolve()));
}

describe('БД відмовляє в з’єднанні — 503, дані не змінились', () => {
    beforeAll(async () => {
        const server = createServer();
        const port = await listen(server);
        await close(server);
        await closeDatabase();
        initDatabase(config(port, 10000), { error: () => undefined });
    });

    test.each(endpointNames)('%s', async (name) => {
        const endpoint = endpoints(world).find((item) => item.name === name)!;

        const response = await expectDatabaseUnchanged(() => request(endpoint.options));

        expectError(response, 503);
    });
});

describe('БД не відповідає (таймаут з’єднання) — 503, дані не змінились', () => {
    const sockets = new Set<Socket>();
    const server = createServer((socket) => {
        sockets.add(socket);
        socket.on('close', () => sockets.delete(socket));
    });

    beforeAll(async () => {
        const port = await listen(server);
        await closeDatabase();
        initDatabase(config(port, 500), { error: () => undefined });
    });

    afterAll(async () => {
        for (const socket of sockets) socket.destroy();
        await close(server);
    });

    test.each(endpointNames)('%s', async (name) => {
        const endpoint = endpoints(world).find((item) => item.name === name)!;

        const response = await expectDatabaseUnchanged(() => request(endpoint.options));

        expectError(response, 503);
    });
});
