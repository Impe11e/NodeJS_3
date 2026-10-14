export type Role = 'STUDENT' | 'TEACHER';

export interface Group {
    id: string;
    name: string;
}

export interface User {
    id: string;
    name: string;
    role: Role;
    groupId: string | null;
}

export interface Subject {
    id: string;
    name: string;
}

export interface Lesson {
    id: string;
    groupId: string;
    subjectId: string;
    date: string;
}

export interface Grade {
    id: string;
    studentId: string;
    lessonId: string;
    score: number;
    createdAt: string;
}

export interface GradeView {
    grade_id: string;
    score: number;
    created_at: string;
    lesson_date: string;
    subject_name: string;
}

export interface LessonRoster {
    lesson_id: string;
    date: string;
    subject_name: string;
    students: Array<{ student_id: string; student_name: string }>;
}
