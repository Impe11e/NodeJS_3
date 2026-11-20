import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { PoolClient } from 'pg';
import { gradeService } from '../../src/services/grades.service.js';
import { withTransaction } from '../../src/db/database.js';
import { gradeRepository } from '../../src/repositories/grades.repository.js';
import { lessonService } from '../../src/services/lessons.service.js';
import { subjectService } from '../../src/services/subjects.service.js';
import { userService } from '../../src/services/users.service.js';
import { AppError, forbidden, notFound } from '../../src/errors/appError.js';
import type { Grade, GradeView, Lesson, Subject, User } from '../../src/types/domain.js';

vi.mock('../../src/db/database.js', () => ({
    withTransaction: vi.fn(),
}));

vi.mock('../../src/repositories/grades.repository.js', () => ({
    gradeRepository: {
        insert: vi.fn(),
        findViewsByStudentId: vi.fn(),
        averageByStudentId: vi.fn(),
        findByStudentId: vi.fn(),
    },
}));

vi.mock('../../src/services/lessons.service.js', () => ({
    lessonService: {
        getById: vi.fn(),
        getBySubjectId: vi.fn(),
    },
}));

vi.mock('../../src/services/subjects.service.js', () => ({
    subjectService: {
        getById: vi.fn(),
        requireTeacherOfSubject: vi.fn(),
    },
}));

vi.mock('../../src/services/users.service.js', () => ({
    userService: {
        getById: vi.fn(),
        getStudentsByGroupId: vi.fn(),
        requireStudent: vi.fn(),
    },
}));

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NOW = '2026-11-20T10:00:00.000Z';

const GROUP_ID = '10000000-0000-4000-8000-000000000001';
const OTHER_GROUP_ID = '10000000-0000-4000-8000-000000000002';
const SUBJECT_ID = '20000000-0000-4000-8000-000000000001';
const LESSON_ID = '30000000-0000-4000-8000-000000000001';

const teacher: User = {
    id: '40000000-0000-4000-8000-000000000001',
    name: 'Вчитель',
    role: 'TEACHER',
    groupId: null,
};

const student: User = {
    id: '50000000-0000-4000-8000-000000000001',
    name: 'Студент',
    role: 'STUDENT',
    groupId: GROUP_ID,
};

const lesson: Lesson = {
    id: LESSON_ID,
    groupId: GROUP_ID,
    subjectId: SUBJECT_ID,
    date: '2026-10-12T10:00:00.000Z',
};

const subject: Subject = { id: SUBJECT_ID, name: 'Програмування' };

const client = { query: vi.fn() } as unknown as PoolClient;

const lessonGetById = vi.mocked(lessonService.getById);
const requireTeacherOfSubject = vi.mocked(subjectService.requireTeacherOfSubject);
const subjectGetById = vi.mocked(subjectService.getById);
const requireStudent = vi.mocked(userService.requireStudent);
const getStudentsByGroupId = vi.mocked(userService.getStudentsByGroupId);
const transaction = vi.mocked(withTransaction);
const insert = vi.mocked(gradeRepository.insert);
const findViewsByStudentId = vi.mocked(gradeRepository.findViewsByStudentId);
const averageByStudentId = vi.mocked(gradeRepository.averageByStudentId);

async function catchError(promise: Promise<unknown>): Promise<unknown> {
    return promise.then(
        () => {
            throw new Error('Expected promise to reject');
        },
        (error: unknown) => error
    );
}

async function expectAppError(
    promise: Promise<unknown>,
    statusCode: number,
    message: string
): Promise<void> {
    const error = await catchError(promise);
    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({ statusCode, message });
}

function insertedGrade(): Grade {
    return insert.mock.calls[0][1];
}

beforeEach(() => {
    lessonGetById.mockResolvedValue(lesson);
    requireTeacherOfSubject.mockResolvedValue(subject);
    subjectGetById.mockResolvedValue(subject);
    requireStudent.mockResolvedValue(student);
    transaction.mockImplementation(async (operation) => operation(client));
    insert.mockImplementation(async (_client, grade) => grade);
});

afterEach(() => {
    vi.useRealTimers();
});

describe('gradeService.create', () => {
    describe('успішне створення', () => {
        test.each([1, 50, 100])('оцінка %i зберігається й повертається', async (score) => {
            vi.useFakeTimers({ toFake: ['Date'] });
            vi.setSystemTime(new Date(NOW));

            const result = await gradeService.create(teacher, student.id, LESSON_ID, score);

            expect(lessonGetById).toHaveBeenCalledExactlyOnceWith(LESSON_ID);
            expect(requireTeacherOfSubject).toHaveBeenCalledExactlyOnceWith(teacher.id, SUBJECT_ID);
            expect(requireStudent).toHaveBeenCalledExactlyOnceWith(student.id);
            expect(transaction).toHaveBeenCalledOnce();
            expect(insert).toHaveBeenCalledExactlyOnceWith(client, {
                id: expect.stringMatching(UUID_RE),
                studentId: student.id,
                lessonId: LESSON_ID,
                score,
                createdAt: NOW,
            });
            expect(result).toEqual({
                id: insertedGrade().id,
                studentId: student.id,
                lessonId: LESSON_ID,
                score,
                createdAt: NOW,
            });
        });

        test('повертає саме те, що повернув репозиторій', async () => {
            const stored: Grade = {
                id: '60000000-0000-4000-8000-000000000001',
                studentId: student.id,
                lessonId: LESSON_ID,
                score: 77,
                createdAt: '2026-11-01T08:00:00.000Z',
            };
            insert.mockResolvedValue(stored);

            const result = await gradeService.create(teacher, student.id, LESSON_ID, 77);

            expect(result).toBe(stored);
        });

        test('id кожної оцінки — UUID і різний для різних оцінок', async () => {
            const first = await gradeService.create(teacher, student.id, LESSON_ID, 90);
            const second = await gradeService.create(teacher, student.id, LESSON_ID, 91);

            expect(first.id).toMatch(UUID_RE);
            expect(second.id).toMatch(UUID_RE);
            expect(first.id).not.toBe(second.id);
            expect(insert.mock.calls[0][1].id).not.toBe(insert.mock.calls[1][1].id);
        });
    });

    describe('роль', () => {
        test('студент не ставить оцінки — 403, нічого не викликається', async () => {
            await expectAppError(
                gradeService.create(student, student.id, LESSON_ID, 90),
                403,
                'Only teachers can assign grades'
            );

            expect(lessonGetById).not.toHaveBeenCalled();
            expect(requireTeacherOfSubject).not.toHaveBeenCalled();
            expect(requireStudent).not.toHaveBeenCalled();
            expect(transaction).not.toHaveBeenCalled();
            expect(insert).not.toHaveBeenCalled();
        });
    });

    describe('валідація оцінки', () => {
        test.each([
            ['0', 0],
            ['101', 101],
            ['-1', -1],
            ['дріб 50.5', 50.5],
            ['дріб 0.5', 0.5],
            ['дріб 100.5', 100.5],
            ['NaN', Number.NaN],
            ['Infinity', Number.POSITIVE_INFINITY],
            ['рядок "50"', '50' as unknown as number],
        ])('%s — 400, нічого не викликається', async (_label, score) => {
            await expectAppError(
                gradeService.create(teacher, student.id, LESSON_ID, score),
                400,
                'Score must be an integer between 1 and 100'
            );

            expect(lessonGetById).not.toHaveBeenCalled();
            expect(requireTeacherOfSubject).not.toHaveBeenCalled();
            expect(requireStudent).not.toHaveBeenCalled();
            expect(transaction).not.toHaveBeenCalled();
            expect(insert).not.toHaveBeenCalled();
        });
    });

    describe('помилки залежностей', () => {
        test('заняття не знайдено — 404, далі нічого не викликається', async () => {
            lessonGetById.mockRejectedValue(notFound('Lesson not found'));

            await expectAppError(
                gradeService.create(teacher, student.id, LESSON_ID, 90),
                404,
                'Lesson not found'
            );

            expect(lessonGetById).toHaveBeenCalledExactlyOnceWith(LESSON_ID);
            expect(requireTeacherOfSubject).not.toHaveBeenCalled();
            expect(requireStudent).not.toHaveBeenCalled();
            expect(transaction).not.toHaveBeenCalled();
        });

        test('вчитель не веде предмет — 403, далі нічого не викликається', async () => {
            requireTeacherOfSubject.mockRejectedValue(
                forbidden('Teacher does not lead this subject')
            );

            await expectAppError(
                gradeService.create(teacher, student.id, LESSON_ID, 90),
                403,
                'Teacher does not lead this subject'
            );

            expect(requireTeacherOfSubject).toHaveBeenCalledExactlyOnceWith(teacher.id, SUBJECT_ID);
            expect(requireStudent).not.toHaveBeenCalled();
            expect(transaction).not.toHaveBeenCalled();
        });

        test('студента не знайдено — 404, транзакції немає', async () => {
            requireStudent.mockRejectedValue(notFound('Student not found'));

            await expectAppError(
                gradeService.create(teacher, student.id, LESSON_ID, 90),
                404,
                'Student not found'
            );

            expect(requireStudent).toHaveBeenCalledExactlyOnceWith(student.id);
            expect(transaction).not.toHaveBeenCalled();
            expect(insert).not.toHaveBeenCalled();
        });
    });

    describe('правила оцінювання', () => {
        test('студент не з групи заняття — 403, транзакції немає', async () => {
            requireStudent.mockResolvedValue({ ...student, groupId: OTHER_GROUP_ID });

            await expectAppError(
                gradeService.create(teacher, student.id, LESSON_ID, 90),
                403,
                'Student is not in the lesson group'
            );

            expect(transaction).not.toHaveBeenCalled();
            expect(insert).not.toHaveBeenCalled();
        });

        test('повторна оцінка — 409', async () => {
            insert.mockResolvedValue(undefined);

            await expectAppError(
                gradeService.create(teacher, student.id, LESSON_ID, 90),
                409,
                'Grade for this student and lesson already exists'
            );

            expect(transaction).toHaveBeenCalledOnce();
            expect(insert).toHaveBeenCalledOnce();
        });
    });

    describe('помилка транзакції', () => {
        test('помилка withTransaction прокидається без змін', async () => {
            const failure = new Error('connection lost');
            transaction.mockRejectedValue(failure);

            const error = await catchError(gradeService.create(teacher, student.id, LESSON_ID, 90));

            expect(error).toBe(failure);
            expect(insert).not.toHaveBeenCalled();
        });

        test('AppError 503 з транзакції прокидається без змін', async () => {
            const failure = new AppError(503, 'Data source is unavailable');
            transaction.mockRejectedValue(failure);

            const error = await catchError(gradeService.create(teacher, student.id, LESSON_ID, 90));

            expect(error).toBe(failure);
        });

        test('помилка insert усередині транзакції прокидається без змін', async () => {
            const failure = Object.assign(new Error('duplicate key'), { code: '23505' });
            insert.mockRejectedValue(failure);

            const error = await catchError(gradeService.create(teacher, student.id, LESSON_ID, 90));

            expect(error).toBe(failure);
        });
    });
});

describe('gradeService.openLesson', () => {
    test('повертає заняття зі списком студентів групи в тому ж порядку', async () => {
        getStudentsByGroupId.mockResolvedValue([
            {
                id: 'a0000000-0000-4000-8000-000000000001',
                name: 'Анна',
                role: 'STUDENT',
                groupId: GROUP_ID,
            },
            {
                id: 'b0000000-0000-4000-8000-000000000002',
                name: 'Борис',
                role: 'STUDENT',
                groupId: GROUP_ID,
            },
        ]);

        const result = await gradeService.openLesson(teacher, LESSON_ID);

        expect(lessonGetById).toHaveBeenCalledExactlyOnceWith(LESSON_ID);
        expect(requireTeacherOfSubject).toHaveBeenCalledExactlyOnceWith(teacher.id, SUBJECT_ID);
        expect(getStudentsByGroupId).toHaveBeenCalledExactlyOnceWith(GROUP_ID);
        expect(result).toEqual({
            lesson_id: LESSON_ID,
            date: lesson.date,
            subject_name: 'Програмування',
            students: [
                { student_id: 'a0000000-0000-4000-8000-000000000001', student_name: 'Анна' },
                { student_id: 'b0000000-0000-4000-8000-000000000002', student_name: 'Борис' },
            ],
        });
    });

    test('група без студентів — порожній список', async () => {
        getStudentsByGroupId.mockResolvedValue([]);

        const result = await gradeService.openLesson(teacher, LESSON_ID);

        expect(result).toEqual({
            lesson_id: LESSON_ID,
            date: lesson.date,
            subject_name: 'Програмування',
            students: [],
        });
    });

    test('не вчитель — 403, нічого не викликається', async () => {
        await expectAppError(
            gradeService.openLesson(student, LESSON_ID),
            403,
            'Only teachers can open lessons'
        );

        expect(lessonGetById).not.toHaveBeenCalled();
        expect(requireTeacherOfSubject).not.toHaveBeenCalled();
        expect(getStudentsByGroupId).not.toHaveBeenCalled();
    });

    test('заняття не знайдено — 404, далі нічого не викликається', async () => {
        lessonGetById.mockRejectedValue(notFound('Lesson not found'));

        await expectAppError(gradeService.openLesson(teacher, LESSON_ID), 404, 'Lesson not found');

        expect(requireTeacherOfSubject).not.toHaveBeenCalled();
        expect(getStudentsByGroupId).not.toHaveBeenCalled();
    });

    test('вчитель не веде предмет — 403, студентів не запитує', async () => {
        requireTeacherOfSubject.mockRejectedValue(forbidden('Teacher does not lead this subject'));

        await expectAppError(
            gradeService.openLesson(teacher, LESSON_ID),
            403,
            'Teacher does not lead this subject'
        );

        expect(getStudentsByGroupId).not.toHaveBeenCalled();
    });

    test('помилка джерела даних прокидається без змін', async () => {
        const failure = new AppError(503, 'Data source is unavailable');
        getStudentsByGroupId.mockRejectedValue(failure);

        const error = await catchError(gradeService.openLesson(teacher, LESSON_ID));

        expect(error).toBe(failure);
    });
});

describe('gradeService.listForStudent', () => {
    const views: GradeView[] = [
        {
            grade_id: '60000000-0000-4000-8000-000000000001',
            score: 90,
            created_at: '2026-10-12T12:00:00.000Z',
            lesson_date: '2026-10-12T10:00:00.000Z',
            subject_name: 'Програмування',
        },
        {
            grade_id: '60000000-0000-4000-8000-000000000002',
            score: 75,
            created_at: '2026-10-13T12:00:00.000Z',
            lesson_date: '2026-10-13T10:00:00.000Z',
            subject_name: 'Програмування',
        },
    ];

    beforeEach(() => {
        findViewsByStudentId.mockResolvedValue(views);
    });

    test('без фільтрів — оцінки поточного студента, фільтри не перевіряються', async () => {
        const result = await gradeService.listForStudent(student);

        expect(subjectGetById).not.toHaveBeenCalled();
        expect(lessonGetById).not.toHaveBeenCalled();
        expect(findViewsByStudentId).toHaveBeenCalledExactlyOnceWith(student.id, {
            subjectId: undefined,
            lessonId: undefined,
        });
        expect(result).toBe(views);
    });

    test('фільтр за предметом — предмет перевіряється й передається', async () => {
        const result = await gradeService.listForStudent(student, SUBJECT_ID);

        expect(subjectGetById).toHaveBeenCalledExactlyOnceWith(SUBJECT_ID);
        expect(lessonGetById).not.toHaveBeenCalled();
        expect(findViewsByStudentId).toHaveBeenCalledExactlyOnceWith(student.id, {
            subjectId: SUBJECT_ID,
            lessonId: undefined,
        });
        expect(result).toBe(views);
    });

    test('фільтр за заняттям — заняття перевіряється й передається', async () => {
        const result = await gradeService.listForStudent(student, undefined, LESSON_ID);

        expect(subjectGetById).not.toHaveBeenCalled();
        expect(lessonGetById).toHaveBeenCalledExactlyOnceWith(LESSON_ID);
        expect(findViewsByStudentId).toHaveBeenCalledExactlyOnceWith(student.id, {
            subjectId: undefined,
            lessonId: LESSON_ID,
        });
        expect(result).toBe(views);
    });

    test('обидва фільтри — перевіряються обидва й передаються разом', async () => {
        const result = await gradeService.listForStudent(student, SUBJECT_ID, LESSON_ID);

        expect(subjectGetById).toHaveBeenCalledExactlyOnceWith(SUBJECT_ID);
        expect(lessonGetById).toHaveBeenCalledExactlyOnceWith(LESSON_ID);
        expect(findViewsByStudentId).toHaveBeenCalledExactlyOnceWith(student.id, {
            subjectId: SUBJECT_ID,
            lessonId: LESSON_ID,
        });
        expect(result).toBe(views);
    });

    test('студент без оцінок — порожній список', async () => {
        findViewsByStudentId.mockResolvedValue([]);

        const result = await gradeService.listForStudent(student);

        expect(result).toEqual([]);
    });

    test('не студент — 403, нічого не викликається', async () => {
        await expectAppError(
            gradeService.listForStudent(teacher, SUBJECT_ID, LESSON_ID),
            403,
            'Only students can view grades'
        );

        expect(subjectGetById).not.toHaveBeenCalled();
        expect(lessonGetById).not.toHaveBeenCalled();
        expect(findViewsByStudentId).not.toHaveBeenCalled();
    });

    test('предмет не знайдено — 404, оцінки не вибираються', async () => {
        subjectGetById.mockRejectedValue(notFound('Subject not found'));

        await expectAppError(
            gradeService.listForStudent(student, SUBJECT_ID, LESSON_ID),
            404,
            'Subject not found'
        );

        expect(lessonGetById).not.toHaveBeenCalled();
        expect(findViewsByStudentId).not.toHaveBeenCalled();
    });

    test('заняття не знайдено — 404, оцінки не вибираються', async () => {
        lessonGetById.mockRejectedValue(notFound('Lesson not found'));

        await expectAppError(
            gradeService.listForStudent(student, undefined, LESSON_ID),
            404,
            'Lesson not found'
        );

        expect(findViewsByStudentId).not.toHaveBeenCalled();
    });

    test('помилка джерела даних прокидається без змін', async () => {
        const failure = new AppError(503, 'Data source is unavailable');
        findViewsByStudentId.mockRejectedValue(failure);

        const error = await catchError(gradeService.listForStudent(student));

        expect(error).toBe(failure);
    });
});

describe('gradeService.averageForStudent', () => {
    test.each([87.5, 1, 100, 66.67])('повертає середній бал %s', async (average) => {
        averageByStudentId.mockResolvedValue(average);

        const result = await gradeService.averageForStudent(student);

        expect(averageByStudentId).toHaveBeenCalledExactlyOnceWith(student.id);
        expect(result).toBe(average);
    });

    test('студент без оцінок — null', async () => {
        averageByStudentId.mockResolvedValue(null);

        const result = await gradeService.averageForStudent(student);

        expect(averageByStudentId).toHaveBeenCalledExactlyOnceWith(student.id);
        expect(result).toBeNull();
    });

    test('не студент — 403, середній не обчислюється', async () => {
        await expectAppError(
            gradeService.averageForStudent(teacher),
            403,
            'Only students can view average'
        );

        expect(averageByStudentId).not.toHaveBeenCalled();
    });

    test('помилка джерела даних прокидається без змін', async () => {
        const failure = new AppError(503, 'Data source is unavailable');
        averageByStudentId.mockRejectedValue(failure);

        const error = await catchError(gradeService.averageForStudent(student));

        expect(error).toBe(failure);
    });
});
