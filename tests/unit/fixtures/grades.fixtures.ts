import type { Grade, GradeView, Lesson, Subject, User } from '../../../src/types/domain.js';

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const NOW = '2026-11-20T10:00:00.000Z';

export const GROUP_ID = '10000000-0000-4000-8000-000000000001';
export const OTHER_GROUP_ID = '10000000-0000-4000-8000-000000000002';
export const SUBJECT_ID = '20000000-0000-4000-8000-000000000001';
export const LESSON_ID = '30000000-0000-4000-8000-000000000001';

export const teacher: User = {
    id: '40000000-0000-4000-8000-000000000001',
    name: 'Вчитель',
    role: 'TEACHER',
    groupId: null,
};

export const student: User = {
    id: '50000000-0000-4000-8000-000000000001',
    name: 'Студент',
    role: 'STUDENT',
    groupId: GROUP_ID,
};

export const lesson: Lesson = {
    id: LESSON_ID,
    groupId: GROUP_ID,
    subjectId: SUBJECT_ID,
    date: '2026-10-12T10:00:00.000Z',
};

export const subject: Subject = { id: SUBJECT_ID, name: 'Програмування' };

export const storedGrade: Grade = {
    id: '60000000-0000-4000-8000-000000000001',
    studentId: student.id,
    lessonId: LESSON_ID,
    score: 77,
    createdAt: '2026-11-01T08:00:00.000Z',
};

export const groupStudents: User[] = [
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
];

export const gradeViews: GradeView[] = [
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

export const invalidScores: Array<[string, number]> = [
    ['0', 0],
    ['101', 101],
    ['-1', -1],
    ['дріб 50.5', 50.5],
    ['дріб 0.5', 0.5],
    ['дріб 100.5', 100.5],
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['рядок "50"', '50' as unknown as number],
];

export const validScores = [1, 50, 100];

export const averages = [87.5, 1, 100, 66.67];
