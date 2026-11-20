import { afterAll, beforeAll, expect } from 'vitest';
import type { FastifyInstance, InjectOptions, LightMyRequestResponse } from 'fastify';
import { buildApp } from '../../../src/app.js';

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
export const UNKNOWN_ID = '99999999-9999-4999-8999-999999999999';
export const INVALID_ID = 'not-a-uuid';

export function useApp(): { request: (options: InjectOptions) => Promise<LightMyRequestResponse> } {
    let app: FastifyInstance;

    beforeAll(async () => {
        app = buildApp({ logger: false });
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    return {
        request: (options) => app.inject(options),
    };
}

export function asUser(userId: string | undefined): Record<string, string> {
    return userId === undefined ? {} : { 'x-user-id': userId };
}

export const unauthorizedCases: Array<[string, string | undefined]> = [
    ['заголовка немає', undefined],
    ['невалідний формат', INVALID_ID],
    ['невідомий користувач', UNKNOWN_ID],
];

export function expectError(response: LightMyRequestResponse, statusCode: number): void {
    expect(response.statusCode).toBe(statusCode);
    expect(response.json()).toEqual({ error: expect.any(String) });
}
