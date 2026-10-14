import { notFound } from '../errors/appError.js';
import { lessonRepository } from '../repositories/lessonsRepositories.js';
import type { Lesson } from '../types/domain.js';

export const lessonService = {
    async getById(id: string): Promise<Lesson> {
        const lesson = await lessonRepository.findById(id);
        if (!lesson) throw notFound('Lesson not found');
        return lesson;
    },
    async getBySubjectId(subjectId: string): Promise<Lesson[]> {
        return lessonRepository.findBySubjectId(subjectId);
    },
};