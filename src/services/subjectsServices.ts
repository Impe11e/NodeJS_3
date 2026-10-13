import { forbidden, notFound } from '../errors/appError.js';
import { subjectRepository } from '../repositories/subjectsRepositories.js';
import type { Subject } from '../types/domain.js';

export const subjectService = {
    getById(id: string): Subject {
        const subject = subjectRepository.findById(id);
        if (!subject) throw notFound('Subject not found');
        return subject;
    },
    requireTeacherOfSubject(teacherId: string, subjectId: string): Subject {
        const subject = this.getById(subjectId);
        if (!subjectRepository.teacherLeadsSubject(teacherId, subjectId)) {
            throw forbidden('Teacher does not lead this subject');
        }
        return subject;
    },
};