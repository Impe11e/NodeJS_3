import { grades } from './inMemoryStore.js';
import type { Grade } from '../types/domain.js';

export const gradeRepository = {
    findByStudentAndLesson(studentId: string, lessonId: string): Grade | undefined {
        return grades.find(
            (grade) => grade.studentId === studentId && grade.lessonId === lessonId,
        );
    },
    findByStudentId(studentId: string): Grade[] {
        return grades.filter((grade) => grade.studentId === studentId);
    },
    create(grade: Grade): Grade {
        grades.push(grade);
        return grade;
    },
};