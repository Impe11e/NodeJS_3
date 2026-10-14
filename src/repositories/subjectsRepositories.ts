import { query } from '../db/database.js';
import type { Subject } from '../types/domain.js';

interface SubjectRow {
    id: string;
    name: string;
}

export const subjectRepository = {
    async findById(id: string): Promise<Subject | undefined> {
        const result = await query<SubjectRow>('SELECT id, name FROM subjects WHERE id = $1', [id]);
        return result.rows[0];
    },
    async teacherLeadsSubject(teacherId: string, subjectId: string): Promise<boolean> {
        const result = await query(
            `SELECT 1 FROM teacher_subjects
             WHERE teacher_id = $1 AND subject_id = $2`,
            [teacherId, subjectId]
        );
        return result.rows.length > 0;
    },
};
