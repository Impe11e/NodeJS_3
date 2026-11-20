import { beforeEach, describe, expect, test } from 'vitest';
import { expectDatabaseUnchanged } from './helpers/db.js';
import { createGrade, createWorld, type World } from './helpers/factory.js';
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
let lessonGradeId: string;
let secondLessonGradeId: string;
let otherSubjectGradeId: string;

beforeEach(async () => {
    world = await createWorld();
    secondLessonGradeId = await createGrade(
        world.student.id,
        world.secondLessonId,
        80,
        '2026-10-14T12:00:00.000Z'
    );
    otherSubjectGradeId = await createGrade(
        world.student.id,
        world.otherSubjectLessonId,
        70,
        '2026-10-13T12:00:00.000Z'
    );
    lessonGradeId = await createGrade(
        world.student.id,
        world.lessonId,
        90,
        '2026-10-12T12:00:00.000Z'
    );
    await createGrade(world.classmate.id, world.lessonId, 50, '2026-10-11T12:00:00.000Z');
});

function listGrades(userId: string | undefined, query: Record<string, string> = {}) {
    return request({ method: 'GET', url: '/grades', query, headers: asUser(userId) });
}

function gradeIds(response: { json: () => Array<{ grade_id: string }> }) {
    return response.json().map((grade) => grade.grade_id);
}

describe('GET /grades — успіх', () => {
    test('лише свої оцінки, впорядковані за часом створення, у форматі API', async () => {
        const response = await listGrades(world.student.id);

        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual([
            {
                grade_id: lessonGradeId,
                score: 90,
                created_at: '2026-10-12T12:00:00.000Z',
                lesson_date: world.lessonDate,
                subject_name: world.subjectName,
            },
            {
                grade_id: otherSubjectGradeId,
                score: 70,
                created_at: '2026-10-13T12:00:00.000Z',
                lesson_date: world.otherSubjectLessonDate,
                subject_name: world.otherSubjectName,
            },
            {
                grade_id: secondLessonGradeId,
                score: 80,
                created_at: '2026-10-14T12:00:00.000Z',
                lesson_date: world.secondLessonDate,
                subject_name: world.subjectName,
            },
        ]);
    });

    test('фільтр за предметом', async () => {
        const response = await listGrades(world.student.id, { subject_id: world.subjectId });

        expect(response.statusCode).toBe(200);
        expect(gradeIds(response)).toEqual([lessonGradeId, secondLessonGradeId]);
    });

    test('фільтр за заняттям', async () => {
        const response = await listGrades(world.student.id, { lesson_id: world.secondLessonId });

        expect(response.statusCode).toBe(200);
        expect(gradeIds(response)).toEqual([secondLessonGradeId]);
    });

    test('обидва фільтри', async () => {
        const response = await listGrades(world.student.id, {
            subject_id: world.subjectId,
            lesson_id: world.lessonId,
        });

        expect(response.statusCode).toBe(200);
        expect(gradeIds(response)).toEqual([lessonGradeId]);
    });

    test('студент без оцінок — порожній список', async () => {
        const response = await listGrades(world.outsider.id);

        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual([]);
    });
});

describe('GET /grades — помилки', () => {
    test.each([
        ['subject_id не UUID', { subject_id: INVALID_ID }],
        ['lesson_id не UUID', { lesson_id: INVALID_ID }],
    ])('%s — 400', async (_label, query) => {
        const response = await expectDatabaseUnchanged(() => listGrades(world.student.id, query));

        expectError(response, 400);
    });

    test.each(unauthorizedCases)('%s — 401', async (_label, userId) => {
        const response = await expectDatabaseUnchanged(() => listGrades(userId));

        expectError(response, 401);
    });

    test('не студент — 403', async () => {
        const response = await expectDatabaseUnchanged(() => listGrades(world.teacher.id));

        expectError(response, 403);
    });

    test.each([
        ['предмет не знайдено', { subject_id: UNKNOWN_ID }],
        ['заняття не знайдено', { lesson_id: UNKNOWN_ID }],
    ])('%s — 404', async (_label, query) => {
        const response = await expectDatabaseUnchanged(() => listGrades(world.student.id, query));

        expectError(response, 404);
    });
});
