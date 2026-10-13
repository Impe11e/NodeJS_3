import { notFound } from '../errors/appError.js';
import { lessonRepository } from '../repositories/lessonsRepositories.js';
import type { Lesson } from '../types/domain.js';

export const lessonService = {
    getById(id: string): Lesson {
        const lesson = lessonRepository.findById(id);
        if (!lesson) throw notFound('Lesson not found');
        return lesson;
    },
    getBySubjectId(subjectId: string): Lesson[] {
        return lessonRepository.findBySubjectId(subjectId);
    },
};