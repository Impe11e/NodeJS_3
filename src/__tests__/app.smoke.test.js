import { buildApp } from '../app.js';

describe('Smoke Test', () => {
    let app;

    beforeAll(() => {
        app = buildApp({ logger: false });
    });

    afterAll(async () => {
        await app.close();
    });

    test("GET /version повертає статус 200 та об'єкт із sha", async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/version',
        });

        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.body);
        expect(body).toHaveProperty('sha');
        expect(typeof body.sha).toBe('string');
    });
});
