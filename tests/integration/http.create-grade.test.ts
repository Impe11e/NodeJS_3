import { beforeEach, describe, expect, test } from 'vitest';
import { countGrades, expectDatabaseUnchanged, testPool } from '../helpers/db.js';
import { createGrade, createWorld, type World } from '../helpers/factory.js';
import {
    asUser,
    expectError,
    INVALID_ID,
    invalidIdCases,
    ISO_DATE_RE,
    unauthorizedCases,
    UNKNOWN_ID,
    useApp,
    UUID_RE,
} from './helpers/app.js';

const { request } = useApp();

let world: World;

beforeEach(async () => {
    world = await createWorld();
});

function postGrade(userId: string | undefined, body: Record<string, unknown>) {
    return request({ method: 'POST', url: '/grades', headers: asUser(userId), payload: body });
}

function validBody(overrides: Record<string, unknown> = {}) {
    return { student_id: world.student.id, lesson_id: world.lessonId, score: 90, ...overrides };
}

describe('POST /grades — успіх', () => {
    test.each([1, 100])('оцінка %i — 201, створена оцінка в БД', async (score) => {
        const response = await postGrade(world.teacher.id, validBody({ score }));

        expect(response.statusCode).toBe(201);
        const body = response.json();
        expect(body).toEqual({
            id: expect.stringMatching(UUID_RE),
            student_id: world.student.id,
            lesson_id: world.lessonId,
            score,
            created_at: expect.stringMatching(ISO_DATE_RE),
        });

        const rows = await testPool.query(
            'SELECT id, student_id, lesson_id, score, created_at FROM grades'
        );
        expect(rows.rows).toEqual([
            {
                id: body.id,
                student_id: world.student.id,
                lesson_id: world.lessonId,
                score,
                created_at: new Date(body.created_at),
            },
        ]);
    });

    test('id у верхньому регістрі — 201, оцінка в БД', async () => {
        const response = await postGrade(
            world.teacher.id.toUpperCase(),
            validBody({
                student_id: world.student.id.toUpperCase(),
                lesson_id: world.lessonId.toUpperCase(),
            })
        );

        expect(response.statusCode).toBe(201);
        const rows = await testPool.query('SELECT student_id, lesson_id FROM grades');
        expect(rows.rows).toEqual([{ student_id: world.student.id, lesson_id: world.lessonId }]);
    });
});

describe('POST /grades — 400', () => {
    test.each([
        ['оцінка 0', { score: 0 }],
        ['оцінка 101', { score: 101 }],
        ['дріб', { score: 50.5 }],
        ['рядок замість числа', { score: '50' }],
        ['boolean замість числа', { score: true }],
        ...invalidIdCases.flatMap(([label, id]): Array<[string, Record<string, unknown>]> => [
            [`student_id ${label}`, { student_id: id }],
            [`lesson_id ${label}`, { lesson_id: id }],
        ]),
    ])('%s — 400, дані не змінились', async (_label, overrides) => {
        const response = await expectDatabaseUnchanged(() =>
            postGrade(world.teacher.id, validBody(overrides))
        );

        expectError(response, 400);
    });

    test.each([
        ['оцінка 0', { score: 0 }],
        ['student_id не UUID', { student_id: INVALID_ID }],
    ])('студент і %s — 400 має пріоритет над 403, дані не змінились', async (_label, overrides) => {
        const response = await expectDatabaseUnchanged(() =>
            postGrade(world.student.id, validBody(overrides))
        );

        expectError(response, 400);
    });
});

describe('POST /grades — 401', () => {
    test.each(unauthorizedCases)('%s — 401, дані не змінились', async (_label, userId) => {
        const response = await expectDatabaseUnchanged(() => postGrade(userId, validBody()));

        expectError(response, 401);
    });

    test.each(unauthorizedCases)(
        '%s і невалідне тіло — 401 має пріоритет над 400, дані не змінились',
        async (_label, userId) => {
            const response = await expectDatabaseUnchanged(() =>
                postGrade(userId, { student_id: INVALID_ID, lesson_id: INVALID_ID, score: 0 })
            );

            expectError(response, 401);
        }
    );
});

describe('POST /grades — 403', () => {
    test('студент не ставить оцінки', async () => {
        const response = await expectDatabaseUnchanged(() =>
            postGrade(world.student.id, validBody())
        );

        expectError(response, 403);
    });

    test('вчитель не веде предмет заняття', async () => {
        const response = await expectDatabaseUnchanged(() =>
            postGrade(world.otherTeacher.id, validBody())
        );

        expectError(response, 403);
    });

    test('студент не з групи заняття', async () => {
        const response = await expectDatabaseUnchanged(() =>
            postGrade(world.teacher.id, validBody({ student_id: world.outsider.id }))
        );

        expectError(response, 403);
    });
});

describe('POST /grades — 404', () => {
    test('заняття не знайдено', async () => {
        const response = await expectDatabaseUnchanged(() =>
            postGrade(world.teacher.id, validBody({ lesson_id: UNKNOWN_ID }))
        );

        expectError(response, 404);
    });

    test.each([
        ['іншого вчителя', () => world.otherTeacher.id],
        ['самого вчителя, що ставить оцінку', () => world.teacher.id],
    ])('student_id %s — 404 Student not found, рядків у grades не додалось', async (_label, id) => {
        const gradesBefore = await countGrades();

        const response = await expectDatabaseUnchanged(() =>
            postGrade(world.teacher.id, validBody({ student_id: id() }))
        );

        expect(response.statusCode).toBe(404);
        expect(response.json()).toEqual({ error: 'Student not found' });
        expect(await countGrades()).toBe(gradesBefore);
    });

    test('студента не знайдено', async () => {
        const response = await expectDatabaseUnchanged(() =>
            postGrade(world.teacher.id, validBody({ student_id: UNKNOWN_ID }))
        );

        expectError(response, 404);
    });
});

describe('POST /grades — 409', () => {
    test('оцінка вже існує — дубль не створюється, перша не змінюється', async () => {
        await createGrade(world.student.id, world.lessonId, 70, '2026-10-12T12:00:00.000Z');

        const response = await expectDatabaseUnchanged(() =>
            postGrade(world.teacher.id, validBody({ score: 99 }))
        );

        expect(response.statusCode).toBe(409);
        expect(response.json()).toEqual({
            error: 'Grade for this student and lesson already exists',
        });
        expect(await countGrades()).toBe(1);
    });

    test('одночасні запити на ту саму пару — рівно один 201, решта 409, у БД один рядок', async () => {
        const scores = [60, 70, 80, 90, 100];

        const responses = await Promise.all(
            scores.map((score) => postGrade(world.teacher.id, validBody({ score })))
        );

        const created = responses.filter((response) => response.statusCode === 201);
        const conflicts = responses.filter((response) => response.statusCode === 409);
        expect(created).toHaveLength(1);
        expect(conflicts).toHaveLength(scores.length - 1);
        for (const response of conflicts) {
            expectError(response, 409);
        }

        const body = created[0].json();
        const rows = await testPool.query('SELECT id, student_id, lesson_id, score FROM grades');
        expect(rows.rows).toEqual([
            {
                id: body.id,
                student_id: world.student.id,
                lesson_id: world.lessonId,
                score: body.score,
            },
        ]);
    });
});
