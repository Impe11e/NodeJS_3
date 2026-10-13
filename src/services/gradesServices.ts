import { randomUUID } from 'node:crypto';
import { badRequest, conflict, forbidden } from '../errors/appError.js';
import { gradeRepository } from '../repositories/gradesRepositories.js';
import { lessonService } from './lessonsServices.js';
import { subjectService } from './subjectsServices.js';
import { userService } from './usersServices.js';
import type { GradeView, LessonRoster, User } from '../types/domain.js';

export const gradeService = {
    create(teacher: User, studentId: string, lessonId: string, score: number) {
        if (teacher.role !== 'TEACHER') throw forbidden('Only teachers can assign grades');
        if (!Number.isInteger(score) || score < 1 || score > 100) {
            throw badRequest('Score must be an integer between 1 and 100');
        }
        const lesson = lessonService.getById(lessonId);
        subjectService.requireTeacherOfSubject(teacher.id, lesson.subjectId);
        const student = userService.requireStudent(studentId);
        if (student.groupId !== lesson.groupId) {
            throw forbidden('Student is not in the lesson group');
        }
        if (gradeRepository.findByStudentAndLesson(studentId, lessonId)) {
            throw conflict('Grade already exists for this student and lesson');
        }
        return gradeRepository.create({
            id: randomUUID(),
            studentId,
            lessonId,
            score,
            createdAt: new Date().toISOString(),
        });
    },

    openLesson(teacher: User, lessonId: string): LessonRoster {
        if (teacher.role !== 'TEACHER') throw forbidden('Only teachers can open lessons');
        const lesson = lessonService.getById(lessonId);
        const subject = subjectService.requireTeacherOfSubject(
            teacher.id,
            lesson.subjectId,
        );
        return {
            lesson_id: lesson.id,
            date: lesson.date,
            subject_name: subject.name,
            students: userService
                .getStudentsByGroupId(lesson.groupId)
                .map((student) => ({
                    student_id: student.id,
                    student_name: student.name,
                })),
        };
    },

    listForStudent(student: User, subjectId?: string, lessonId?: string): GradeView[] {
        if (student.role !== 'STUDENT') throw forbidden('Only students can view grades');
        if (subjectId) subjectService.getById(subjectId);
        if (lessonId) lessonService.getById(lessonId);
        return gradeRepository
            .findByStudentId(student.id)
            .filter((grade) => {
                const lesson = lessonService.getById(grade.lessonId);
                return (
                    (!subjectId || lesson.subjectId === subjectId) &&
                    (!lessonId || lesson.id === lessonId)
                );
            })
            .map((grade) => {
                const lesson = lessonService.getById(grade.lessonId);
                const subject = subjectService.getById(lesson.subjectId);
                return {
                    grade_id: grade.id,
                    score: grade.score,
                    created_at: grade.createdAt,
                    lesson_date: lesson.date,
                    subject_name: subject.name,
                };
            });
    },

    averageForStudent(student: User): number | null {
        if (student.role !== 'STUDENT') throw forbidden('Only students can view average');
        const scores = gradeRepository
            .findByStudentId(student.id)
            .map((grade) => grade.score);
        if (scores.length === 0) return null;
        return Number(
            (scores.reduce((total, score) => total + score, 0) / scores.length).toFixed(2),
        );
    },
};