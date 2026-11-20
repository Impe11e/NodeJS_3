import { beforeEach, describe, expect, test } from 'vitest';
import { expectDatabaseUnchanged } from './helpers/db.js';
import { createGrade, createWorld, type World } from './helpers/factory.js';
import { asUser, expectError, unauthorizedCases, useApp } from './helpers/app.js';

const { request } = useApp();

let world: World;

beforeEach(async () => {
    world = await createWorld();
});

function getAverage(userId: string | undefined) {
    return request({ method: 'GET', url: '/grades/average', headers: asUser(userId) });
}

describe('GET /grades/average — успіх', () => {
    test('середнє всіх своїх оцінок, округлене до 2 знаків', async () => {
        await createGrade(world.student.id, world.lessonId, 1, '2026-10-12T12:00:00.000Z');
        await createGrade(world.student.id, world.secondLessonId, 2, '2026-10-14T12:00:00.000Z');
        await createGrade(
            world.student.id,
            world.otherSubjectLessonId,
            2,
            '2026-10-13T12:00:00.000Z'
        );
        await createGrade(world.classmate.id, world.lessonId, 100, '2026-10-12T12:00:00.000Z');

        const response = await getAverage(world.student.id);

        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({ average_score: 1.67 });
    });

    test('дробове середнє без округлення', async () => {
        await createGrade(world.student.id, world.lessonId, 90, '2026-10-12T12:00:00.000Z');
        await createGrade(world.student.id, world.secondLessonId, 85, '2026-10-14T12:00:00.000Z');

        const response = await getAverage(world.student.id);

        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({ average_score: 87.5 });
    });

    test('студент без оцінок — null', async () => {
        await createGrade(world.classmate.id, world.lessonId, 100, '2026-10-12T12:00:00.000Z');

        const response = await getAverage(world.student.id);

        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({ average_score: null });
    });
});

describe('GET /grades/average — помилки', () => {
    test.each(unauthorizedCases)('%s — 401', async (_label, userId) => {
        const response = await expectDatabaseUnchanged(() => getAverage(userId));

        expectError(response, 401);
    });

    test('не студент — 403', async () => {
        const response = await expectDatabaseUnchanged(() => getAverage(world.teacher.id));

        expectError(response, 403);
    });
});
