import { query } from '../db/database.js';
import { sql } from '../db/sql.js';
import type { Subject } from '../types/domain.js';

interface SubjectRow {
    id: string;
    name: string;
}

export const subjectRepository = {
    async findById(id: string): Promise<Subject | undefined> {
        const result = await query<SubjectRow>(sql`SELECT id, name FROM subjects WHERE id = ${id}`);
        return result.rows[0];
    },
    async teacherLeadsSubject(teacherId: string, subjectId: string): Promise<boolean> {
        const result = await query(
            sql`SELECT 1 FROM teacher_subjects
                WHERE teacher_id = ${teacherId} AND subject_id = ${subjectId}`
        );
        return result.rows.length > 0;
    },
};
