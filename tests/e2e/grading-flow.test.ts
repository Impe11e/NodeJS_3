import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { closeTestPool, resetDatabase, testPool } from '../integration/helpers/db.js';
import { createWorld, type World } from '../integration/helpers/factory.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function requireEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`${name} is not set: run e2e tests via npm run test:e2e`);
    }
    return value;
}

const baseUrl = requireEnv('E2E_BASE_URL');
const expectedSha = requireEnv('GIT_COMMIT_SHA');

interface LessonBody {
    lesson_id: string;
    date: string;
    subject_name: string;
    students: Array<{ student_id: string; student_name: string }>;
}

interface GradeBody {
    id: string;
    student_id: string;
    lesson_id: string;
    score: number;
    created_at: string;
}

interface GradeViewBody {
    grade_id: string;
    score: number;
    created_at: string;
    lesson_date: string;
    subject_name: string;
}

async function call<T>(
    method: 'GET' | 'POST',
    path: string,
    userId?: string,
    body?: unknown
): Promise<{ status: number; body: T }> {
    const headers: Record<string, string> = {};
    if (userId !== undefined) headers['x-user-id'] = userId;
    if (body !== undefined) headers['content-type'] = 'application/json';

    const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
    });

    return { status: response.status, body: (await response.json()) as T };
}

let world: World;

beforeAll(async () => {
    await resetDatabase();
    world = await createWorld();
});

afterAll(async () => {
    await closeTestPool();
});

describe('E2E: вчитель відкриває заняття, ставить оцінки, студент бачить оцінки й середній бал', () => {
    test('повний сценарій через HTTP до контейнера застосунку', async () => {
        const lesson = await call<LessonBody>(
            'GET',
            `/lessons/${world.lessonId}`,
            world.teacher.id
        );

        expect(lesson.status).toBe(200);
        expect(lesson.body).toMatchObject({
            lesson_id: world.lessonId,
            date: world.lessonDate,
            subject_name: world.subjectName,
        });
        expect(lesson.body.students).toContainEqual({
            student_id: world.student.id,
            student_name: world.student.name,
        });

        const first = await call<GradeBody>('POST', '/grades', world.teacher.id, {
            student_id: world.student.id,
            lesson_id: world.lessonId,
            score: 90,
        });

        expect(first.status).toBe(201);
        expect(first.body).toEqual({
            id: expect.stringMatching(UUID_RE),
            student_id: world.student.id,
            lesson_id: world.lessonId,
            score: 90,
            created_at: expect.stringMatching(ISO_DATE_RE),
        });

        const second = await call<GradeBody>('POST', '/grades', world.teacher.id, {
            student_id: world.student.id,
            lesson_id: world.secondLessonId,
            score: 75,
        });

        expect(second.status).toBe(201);
        expect(second.body).toEqual({
            id: expect.stringMatching(UUID_RE),
            student_id: world.student.id,
            lesson_id: world.secondLessonId,
            score: 75,
            created_at: expect.stringMatching(ISO_DATE_RE),
        });

        const grades = await call<GradeViewBody[]>('GET', '/grades', world.student.id);

        expect(grades.status).toBe(200);
        expect(grades.body).toHaveLength(2);
        expect(grades.body).toEqual(
            expect.arrayContaining([
                {
                    grade_id: first.body.id,
                    score: 90,
                    created_at: first.body.created_at,
                    lesson_date: world.lessonDate,
                    subject_name: world.subjectName,
                },
                {
                    grade_id: second.body.id,
                    score: 75,
                    created_at: second.body.created_at,
                    lesson_date: world.secondLessonDate,
                    subject_name: world.subjectName,
                },
            ])
        );

        const average = await call<{ average_score: number | null }>(
            'GET',
            '/grades/average',
            world.student.id
        );

        expect(average.status).toBe(200);
        expect(average.body).toEqual({ average_score: 82.5 });

        const rows = await testPool.query(
            'SELECT id, student_id, lesson_id, score FROM grades ORDER BY score DESC'
        );

        expect(rows.rows).toEqual([
            {
                id: first.body.id,
                student_id: world.student.id,
                lesson_id: world.lessonId,
                score: 90,
            },
            {
                id: second.body.id,
                student_id: world.student.id,
                lesson_id: world.secondLessonId,
                score: 75,
            },
        ]);
    });

    test('/version повертає sha поточного коміту', async () => {
        const version = await call<{ sha: string }>('GET', '/version');

        expect(version.status).toBe(200);
        expect(version.body).toEqual({ sha: expectedSha });
    });
});
