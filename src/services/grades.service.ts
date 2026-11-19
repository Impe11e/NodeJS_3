import { randomUUID } from 'node:crypto';
import { withTransaction } from '../db/database.js';
import { badRequest, conflict, forbidden } from '../errors/appError.js';
import { getLogger } from '../logger/requestContext.js';
import { gradeRepository } from '../repositories/grades.repository.js';
import { lessonService } from './lessons.service.js';
import { subjectService } from './subjects.service.js';
import { userService } from './users.service.js';
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
            getLogger().warn({ studentId, lessonId }, 'Student is not in the lesson group');
            throw forbidden('Student is not in the lesson group');
        }
        const created = await withTransaction((client) =>
            gradeRepository.insert(client, {
                id: randomUUID(),
                studentId,
                lessonId,
                score,
                createdAt: new Date().toISOString(),
            })
        );
        if (!created) {
            getLogger().warn({ studentId, lessonId }, 'Grade already exists');
            throw conflict('Grade for this student and lesson already exists');
        }
        getLogger().info(
            { gradeId: created.id, teacherId: teacher.id, studentId, lessonId, score },
            'Grade created'
        );
        return created;
    },

    async openLesson(teacher: User, lessonId: string): Promise<LessonRoster> {
        if (teacher.role !== 'TEACHER') throw forbidden('Only teachers can open lessons');
        const lesson = await lessonService.getById(lessonId);
        const subject = await subjectService.requireTeacherOfSubject(teacher.id, lesson.subjectId);
        const students = await userService.getStudentsByGroupId(lesson.groupId);
        getLogger().info(
            { lessonId, teacherId: teacher.id, studentCount: students.length },
            'Lesson opened'
        );
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
        lessonId?: string
    ): Promise<GradeView[]> {
        if (student.role !== 'STUDENT') throw forbidden('Only students can view grades');

        if (subjectId) await subjectService.getById(subjectId);
        if (lessonId) await lessonService.getById(lessonId);

        return gradeRepository.findViewsByStudentId(student.id, {
            subjectId,
            lessonId,
        });
    },

    async averageForStudent(student: User): Promise<number | null> {
        if (student.role !== 'STUDENT') throw forbidden('Only students can view average');
        return gradeRepository.averageByStudentId(student.id);
    },
};
