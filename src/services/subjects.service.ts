import { forbidden, notFound } from '../errors/appError.js';
import { getLogger } from '../logger/requestContext.js';
import { subjectRepository } from '../repositories/subjects.repository.js';
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
            getLogger().warn({ teacherId, subjectId }, 'Teacher does not lead this subject');
            throw forbidden('Teacher does not lead this subject');
        }
        return subject;
    },
};
