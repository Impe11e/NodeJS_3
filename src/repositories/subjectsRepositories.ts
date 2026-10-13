import { subjects, teacherSubjects } from './inMemoryStore.js';
import type { Subject } from '../types/domain.js';

export const subjectRepository = {
    findById(id: string): Subject | undefined {
        return subjects.find((subject) => subject.id === id);
    },
    teacherLeadsSubject(teacherId: string, subjectId: string): boolean {
        return teacherSubjects.some(
            (item) => item.teacherId === teacherId && item.subjectId === subjectId,
        );
    },
};