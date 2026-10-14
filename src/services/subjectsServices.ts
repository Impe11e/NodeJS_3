import { forbidden, notFound } from '../errors/appError.js';
import { subjectRepository } from '../repositories/subjectsRepositories.js';
import type { Subject } from '../types/domain.js';

export const subjectService = {
    async getById(id: string): Promise<Subject> {
        const subject = await subjectRepository.findById(id);
        if (!subject) throw notFound('Subject not found');
        return subject;
    },
    async requireTeacherOfSubject(teacherId: string, subjectId: string): Promise<Subject> {
        const subject = await this.getById(subjectId);
        if (!(await subjectRepository.teacherLeadsSubject(teacherId, subjectId))) {
            throw forbidden('Teacher does not lead this subject');
        }
        return subject;
    },
};
