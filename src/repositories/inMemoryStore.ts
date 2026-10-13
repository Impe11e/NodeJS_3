import { randomUUID } from 'node:crypto';
import type { Grade, Group, Lesson, Subject, User } from '../types/domain.js';

export const ids = {
    teacher: '00000000-0000-0000-0000-000000000001',
    student: '00000000-0000-0000-0000-000000000002',
    otherStudent: '00000000-0000-0000-0000-000000000003',
    group: '00000000-0000-0000-0000-000000000010',
    otherGroup: '00000000-0000-0000-0000-000000000011',
    subject: '00000000-0000-0000-0000-000000000020',
    otherSubject: '00000000-0000-0000-0000-000000000021',
    lesson: '00000000-0000-0000-0000-000000000030',
    otherLesson: '00000000-0000-0000-0000-000000000031',
};

export const groups: Group[] = [
    { id: ids.group, name: 'КН-21' },
    { id: ids.otherGroup, name: 'КН-22' },
];

export const users: User[] = [
    { id: ids.teacher, name: 'Олена Коваль', role: 'TEACHER', groupId: null },
    { id: ids.student, name: 'Іван Петренко', role: 'STUDENT', groupId: ids.group },
    {
        id: ids.otherStudent,
        name: 'Марія Шевченко',
        role: 'STUDENT',
        groupId: ids.otherGroup,
    },
];

export const subjects: Subject[] = [
    { id: ids.subject, name: 'Математика' },
    { id: ids.otherSubject, name: 'Фізика' },
];

export const teacherSubjects: Array<{ teacherId: string; subjectId: string }> = [
    { teacherId: ids.teacher, subjectId: ids.subject },
];

export const lessons: Lesson[] = [
    {
        id: ids.lesson,
        groupId: ids.group,
        subjectId: ids.subject,
        date: '2026-10-12T10:00:00.000Z',
    },
    {
        id: ids.otherLesson,
        groupId: ids.otherGroup,
        subjectId: ids.otherSubject,
        date: '2026-10-13T10:00:00.000Z',
    },
];

export const grades: Grade[] = [];

export function createId(): string {
    return randomUUID();
}
