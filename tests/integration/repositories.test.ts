import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, test } from 'vitest';
import { withTransaction } from '../../src/db/database.js';
import { gradeRepository } from '../../src/repositories/grades.repository.js';
import { userRepository } from '../../src/repositories/users.repository.js';
import { countGrades, testPool } from './helpers/db.js';
import {
    createGrade,
    createStudent,
    createTeacher,
    createWorld,
    type World,
} from './helpers/factory.js';

let world: World;

beforeEach(async () => {
    world = await createWorld();
});

describe('gradeRepository.insert', () => {
    test('створює оцінку й повертає її', async () => {
        const grade = {
            id: randomUUID(),
            studentId: world.student.id,
            lessonId: world.lessonId,
            score: 95,
            createdAt: '2026-10-12T12:00:00.000Z',
        };

        const created = await withTransaction((client) => gradeRepository.insert(client, grade));

        expect(created).toEqual(grade);
        expect(await countGrades()).toBe(1);
    });

    test('ON CONFLICT: повторна оцінка за те саме заняття не створює дубля й не змінює першу', async () => {
        const firstId = await createGrade(
            world.student.id,
            world.lessonId,
            70,
            '2026-10-12T12:00:00.000Z'
        );

        const created = await withTransaction((client) =>
            gradeRepository.insert(client, {
                id: randomUUID(),
                studentId: world.student.id,
                lessonId: world.lessonId,
                score: 99,
                createdAt: '2026-10-12T13:00:00.000Z',
            })
        );

        expect(created).toBeUndefined();
        const rows = await testPool.query('SELECT id, score FROM grades');
        expect(rows.rows).toEqual([{ id: firstId, score: 70 }]);
    });
});

describe('gradeRepository.averageByStudentId', () => {
    test.each([
        [[90, 85], 87.5],
        [[1, 2, 2], 1.67],
        [[100, 99, 99], 99.33],
        [[1, 1, 2], 1.33],
        [[100], 100],
    ])('оцінки %j — середній %s, округлений до 2 знаків', async (scores, expected) => {
        const lessons = [world.lessonId, world.secondLessonId, world.otherSubjectLessonId];
        for (const [index, score] of scores.entries()) {
            await createGrade(
                world.student.id,
                lessons[index],
                score,
                `2026-10-1${index}T12:00:00.000Z`
            );
        }

        expect(await gradeRepository.averageByStudentId(world.student.id)).toBe(expected);
    });

    test('без оцінок — null', async () => {
        expect(await gradeRepository.averageByStudentId(world.student.id)).toBeNull();
    });

    test('враховує лише оцінки цього студента', async () => {
        await createGrade(world.student.id, world.lessonId, 60, '2026-10-12T12:00:00.000Z');
        await createGrade(world.classmate.id, world.lessonId, 100, '2026-10-12T12:00:00.000Z');

        expect(await gradeRepository.averageByStudentId(world.student.id)).toBe(60);
    });

    test('студент без оцінок — null, навіть якщо в інших оцінки є', async () => {
        await createGrade(world.classmate.id, world.lessonId, 100, '2026-10-12T12:00:00.000Z');

        expect(await gradeRepository.averageByStudentId(world.student.id)).toBeNull();
    });
});

describe('gradeRepository.findViewsByStudentId', () => {
    let lessonGradeId: string;
    let secondLessonGradeId: string;
    let otherSubjectGradeId: string;

    beforeEach(async () => {
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

    test('без фільтрів — усі оцінки студента, впорядковані за часом створення', async () => {
        const views = await gradeRepository.findViewsByStudentId(world.student.id);

        expect(views).toEqual([
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
        const views = await gradeRepository.findViewsByStudentId(world.student.id, {
            subjectId: world.subjectId,
        });

        expect(views.map((view) => view.grade_id)).toEqual([lessonGradeId, secondLessonGradeId]);
    });

    test('фільтр за заняттям', async () => {
        const views = await gradeRepository.findViewsByStudentId(world.student.id, {
            lessonId: world.secondLessonId,
        });

        expect(views.map((view) => view.grade_id)).toEqual([secondLessonGradeId]);
    });

    test('обидва фільтри — заняття цього предмета', async () => {
        const views = await gradeRepository.findViewsByStudentId(world.student.id, {
            subjectId: world.subjectId,
            lessonId: world.lessonId,
        });

        expect(views.map((view) => view.grade_id)).toEqual([lessonGradeId]);
    });

    test('обидва фільтри — заняття іншого предмета дає порожній список', async () => {
        const views = await gradeRepository.findViewsByStudentId(world.student.id, {
            subjectId: world.subjectId,
            lessonId: world.otherSubjectLessonId,
        });

        expect(views).toEqual([]);
    });

    test('студент без оцінок — порожній список', async () => {
        expect(await gradeRepository.findViewsByStudentId(world.outsider.id)).toEqual([]);
    });
});

describe('userRepository.findStudentsByGroupId', () => {
    test('повертає лише студентів цієї групи', async () => {
        await createTeacher('Ще один вчитель');
        await createStudent('Студент іншої групи', world.otherGroupId);

        const students = await userRepository.findStudentsByGroupId(world.groupId);

        expect(students).toHaveLength(2);
        expect(students).toEqual(
            expect.arrayContaining([
                {
                    id: world.student.id,
                    name: world.student.name,
                    role: 'STUDENT',
                    groupId: world.groupId,
                },
                {
                    id: world.classmate.id,
                    name: world.classmate.name,
                    role: 'STUDENT',
                    groupId: world.groupId,
                },
            ])
        );
    });

    test('група без студентів — порожній список', async () => {
        const emptyGroupStudents = await userRepository.findStudentsByGroupId(randomUUID());

        expect(emptyGroupStudents).toEqual([]);
    });
});
