import { beforeEach, describe, expect, test } from 'vitest';
import { expectDatabaseUnchanged } from './helpers/db.js';
import { createWorld, type World } from './helpers/factory.js';
import {
    asUser,
    expectError,
    INVALID_ID,
    unauthorizedCases,
    UNKNOWN_ID,
    useApp,
} from './helpers/app.js';

const { request } = useApp();

let world: World;

beforeEach(async () => {
    world = await createWorld();
});

function openLesson(userId: string | undefined, lessonId: string) {
    return request({ method: 'GET', url: `/lessons/${lessonId}`, headers: asUser(userId) });
}

describe('GET /lessons/:lessonId — успіх', () => {
    test('вчитель бачить заняття й лише студентів групи цього заняття', async () => {
        const response = await openLesson(world.teacher.id, world.lessonId);

        expect(response.statusCode).toBe(200);
        const body = response.json();
        expect(body).toEqual({
            lesson_id: world.lessonId,
            date: world.lessonDate,
            subject_name: world.subjectName,
            students: expect.any(Array),
        });
        expect(body.students).toHaveLength(2);
        expect(body.students).toEqual(
            expect.arrayContaining([
                { student_id: world.student.id, student_name: world.student.name },
                { student_id: world.classmate.id, student_name: world.classmate.name },
            ])
        );
    });
});

describe('GET /lessons/:lessonId — помилки', () => {
    test('lessonId не UUID — 400', async () => {
        const response = await expectDatabaseUnchanged(() =>
            openLesson(world.teacher.id, INVALID_ID)
        );

        expectError(response, 400);
    });

    test.each(unauthorizedCases)('%s — 401', async (_label, userId) => {
        const response = await expectDatabaseUnchanged(() => openLesson(userId, world.lessonId));

        expectError(response, 401);
    });

    test('не вчитель — 403', async () => {
        const response = await expectDatabaseUnchanged(() =>
            openLesson(world.student.id, world.lessonId)
        );

        expectError(response, 403);
    });

    test('вчитель не веде предмет заняття — 403', async () => {
        const response = await expectDatabaseUnchanged(() =>
            openLesson(world.otherTeacher.id, world.lessonId)
        );

        expectError(response, 403);
    });

    test('заняття не знайдено — 404', async () => {
        const response = await expectDatabaseUnchanged(() =>
            openLesson(world.teacher.id, UNKNOWN_ID)
        );

        expectError(response, 404);
    });
});
