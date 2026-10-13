import { lessons } from './inMemoryStore.js';
import type { Lesson } from '../types/domain.js';

export const lessonRepository = {
    findById(id: string): Lesson | undefined {
        return lessons.find((lesson) => lesson.id === id);
    },
    findBySubjectId(subjectId: string): Lesson[] {
        return lessons.filter((lesson) => lesson.subjectId === subjectId);
    },
};