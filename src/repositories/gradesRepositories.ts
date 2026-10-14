import { query } from '../db/database.js';
import type { PoolClient } from 'pg';
import type { Grade } from '../types/domain.js';

interface GradeRow {
    id: string;
    student_id: string;
    lesson_id: string;
    score: number;
    created_at: string;
}

function mapGrade(row: GradeRow): Grade {
    return {
        id: row.id,
        studentId: row.student_id,
        lessonId: row.lesson_id,
        score: row.score,
        createdAt: new Date(row.created_at).toISOString(),
    };
}

export const gradeRepository = {
    async findByStudentId(studentId: string): Promise<Grade[]> {
        const result = await query<GradeRow>(
            `SELECT id, student_id, lesson_id, score, created_at
             FROM grades WHERE student_id = $1 ORDER BY created_at, id`,
            [studentId],
        );
        return result.rows.map(mapGrade);
    },
    async averageByStudentId(studentId: string): Promise<number | null> {
        const result = await query<{ average_score: string | null }>(
            'SELECT ROUND(AVG(score)::numeric, 2)::text AS average_score FROM grades WHERE student_id = $1',
            [studentId],
        );
        return result.rows[0]?.average_score === null ||
            result.rows[0]?.average_score === undefined
            ? null
            : Number(result.rows[0].average_score);
    },
    async upsert(client: PoolClient, grade: Grade): Promise<Grade> {
        const result = await client.query<GradeRow>(
            `INSERT INTO grades (id, student_id, lesson_id, score, created_at)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (student_id, lesson_id)
             DO UPDATE SET score = EXCLUDED.score
             RETURNING id, student_id, lesson_id, score, created_at`,
            [grade.id, grade.studentId, grade.lessonId, grade.score, grade.createdAt],
        );
        return mapGrade(result.rows[0]);
    },
};