import { randomUUID } from 'node:crypto';
import { withTransaction } from '../db/database.js';
import { badRequest, forbidden } from '../errors/appError.js';
import { gradeRepository } from '../repositories/gradesRepositories.js';
import { lessonService } from './lessonsServices.js';
import { subjectService } from './subjectsServices.js';
import { userService } from './usersServices.js';
import type { GradeView, LessonRoster, User } from '../types/domain.js';

export const gradeService = {
    async create(teacher: User, studentId: string, lessonId: string, score: number) {
        if (teacher.role !== 'TEACHER') throw forbidden('Only teachers can assign grades');
        if (!Number.isInteger(score) || score < 1 || score > 100) {
            throw badRequest('Score must be an integer between 1 and 100');
        }
        const lesson = await lessonService.getById(lessonId);
        await subjectService.requireTeacherOfSubject(teacher.id, lesson.subjectId);
        const student = await userService.requireStudent(studentId);
        if (student.groupId !== lesson.groupId) {
            throw forbidden('Student is not in the lesson group');
        }
        return withTransaction((client) =>
            gradeRepository.upsert(client, {
                id: randomUUID(),
                studentId,
                lessonId,
                score,
                createdAt: new Date().toISOString(),
            }),
        );
    },

    async openLesson(teacher: User, lessonId: string): Promise<LessonRoster> {
        if (teacher.role !== 'TEACHER') throw forbidden('Only teachers can open lessons');
        const lesson = await lessonService.getById(lessonId);
        const subject = await subjectService.requireTeacherOfSubject(
            teacher.id,
            lesson.subjectId,
        );
        const students = await userService.getStudentsByGroupId(lesson.groupId);
        return {
            lesson_id: lesson.id,
            date: lesson.date,
            subject_name: subject.name,
            students: students.map((student) => ({
                student_id: student.id,
                student_name: student.name,
            })),
        };
    },

    async listForStudent(
        student: User,
        subjectId?: string,
        lessonId?: string,
    ): Promise<GradeView[]> {
        if (student.role !== 'STUDENT') throw forbidden('Only students can view grades');
        if (subjectId) await subjectService.getById(subjectId);
        if (lessonId) await lessonService.getById(lessonId);
        const grades = await gradeRepository.findByStudentId(student.id);
        const result: GradeView[] = [];
        for (const grade of grades) {
            const lesson = await lessonService.getById(grade.lessonId);
            if (
                (subjectId && lesson.subjectId !== subjectId) ||
                (lessonId && lesson.id !== lessonId)
            ) {
                continue;
            }
            const subject = await subjectService.getById(lesson.subjectId);
            result.push({
                grade_id: grade.id,
                score: grade.score,
                created_at: grade.createdAt,
                lesson_date: lesson.date,
                subject_name: subject.name,
            });
        }
        return result;
    },

    async averageForStudent(student: User): Promise<number | null> {
        if (student.role !== 'STUDENT') throw forbidden('Only students can view average');
        return gradeRepository.averageByStudentId(student.id);
    },
};
