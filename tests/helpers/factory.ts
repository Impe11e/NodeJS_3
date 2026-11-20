import { randomUUID } from 'node:crypto';
import { testPool } from './db.js';

export interface WorldUser {
    id: string;
    name: string;
}

export async function createGroup(name: string): Promise<string> {
    const id = randomUUID();
    await testPool.query('INSERT INTO groups (id, name) VALUES ($1, $2)', [id, name]);
    return id;
}

export async function createTeacher(name: string): Promise<WorldUser> {
    const id = randomUUID();
    await testPool.query(
        "INSERT INTO users (id, name, role, group_id) VALUES ($1, $2, 'TEACHER', NULL)",
        [id, name]
    );
    return { id, name };
}

export async function createStudent(name: string, groupId: string): Promise<WorldUser> {
    const id = randomUUID();
    await testPool.query(
        "INSERT INTO users (id, name, role, group_id) VALUES ($1, $2, 'STUDENT', $3)",
        [id, name, groupId]
    );
    return { id, name };
}

export async function createSubject(name: string): Promise<string> {
    const id = randomUUID();
    await testPool.query('INSERT INTO subjects (id, name) VALUES ($1, $2)', [id, name]);
    return id;
}

export async function assignTeacher(teacherId: string, subjectId: string): Promise<void> {
    await testPool.query('INSERT INTO teacher_subjects (teacher_id, subject_id) VALUES ($1, $2)', [
        teacherId,
        subjectId,
    ]);
}

export async function createLesson(
    groupId: string,
    subjectId: string,
    date: string
): Promise<string> {
    const id = randomUUID();
    await testPool.query(
        'INSERT INTO lessons (id, group_id, subject_id, date) VALUES ($1, $2, $3, $4)',
        [id, groupId, subjectId, date]
    );
    return id;
}

export async function createGrade(
    studentId: string,
    lessonId: string,
    score: number,
    createdAt: string
): Promise<string> {
    const id = randomUUID();
    await testPool.query(
        'INSERT INTO grades (id, student_id, lesson_id, score, created_at) VALUES ($1, $2, $3, $4, $5)',
        [id, studentId, lessonId, score, createdAt]
    );
    return id;
}

export interface World {
    groupId: string;
    otherGroupId: string;
    subjectId: string;
    subjectName: string;
    otherSubjectId: string;
    otherSubjectName: string;
    teacher: WorldUser;
    otherTeacher: WorldUser;
    student: WorldUser;
    classmate: WorldUser;
    outsider: WorldUser;
    lessonId: string;
    lessonDate: string;
    secondLessonId: string;
    secondLessonDate: string;
    otherSubjectLessonId: string;
    otherSubjectLessonDate: string;
    otherGroupLessonId: string;
}

export async function createWorld(): Promise<World> {
    const groupId = await createGroup('ІМ-41');
    const otherGroupId = await createGroup('ІМ-42');
    const subjectName = 'Програмування';
    const otherSubjectName = 'Математика';
    const subjectId = await createSubject(subjectName);
    const otherSubjectId = await createSubject(otherSubjectName);
    const teacher = await createTeacher('Вчитель Програмування');
    const otherTeacher = await createTeacher('Вчитель Математики');
    await assignTeacher(teacher.id, subjectId);
    await assignTeacher(otherTeacher.id, otherSubjectId);
    const student = await createStudent('Олена Коваль', groupId);
    const classmate = await createStudent('Андрій Бондар', groupId);
    const outsider = await createStudent('Ігор Мельник', otherGroupId);
    const lessonDate = '2026-10-12T10:00:00.000Z';
    const secondLessonDate = '2026-10-14T10:00:00.000Z';
    const otherSubjectLessonDate = '2026-10-13T10:00:00.000Z';
    const lessonId = await createLesson(groupId, subjectId, lessonDate);
    const secondLessonId = await createLesson(groupId, subjectId, secondLessonDate);
    const otherSubjectLessonId = await createLesson(
        groupId,
        otherSubjectId,
        otherSubjectLessonDate
    );
    const otherGroupLessonId = await createLesson(otherGroupId, subjectId, lessonDate);

    return {
        groupId,
        otherGroupId,
        subjectId,
        subjectName,
        otherSubjectId,
        otherSubjectName,
        teacher,
        otherTeacher,
        student,
        classmate,
        outsider,
        lessonId,
        lessonDate,
        secondLessonId,
        secondLessonDate,
        otherSubjectLessonId,
        otherSubjectLessonDate,
        otherGroupLessonId,
    };
}
