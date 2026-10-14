import { query } from '../db/database.js';
import type { Lesson } from '../types/domain.js';

interface LessonRow {
    id: string;
    group_id: string;
    subject_id: string;
    date: string;
}

function mapLesson(row: LessonRow): Lesson {
    return {
        id: row.id,
        groupId: row.group_id,
        subjectId: row.subject_id,
        date: new Date(row.date).toISOString(),
    };
}

export const lessonRepository = {
    async findById(id: string): Promise<Lesson | undefined> {
        const result = await query<LessonRow>(
            'SELECT id, group_id, subject_id, date FROM lessons WHERE id = $1',
            [id],
        );
        return result.rows[0] ? mapLesson(result.rows[0]) : undefined;
    },
    async findBySubjectId(subjectId: string): Promise<Lesson[]> {
        const result = await query<LessonRow>(
            'SELECT id, group_id, subject_id, date FROM lessons WHERE subject_id = $1',
            [subjectId],
        );
        return result.rows.map(mapLesson);
    },
};