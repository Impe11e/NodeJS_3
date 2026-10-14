import { query } from '../db/database.js';
import type { PoolClient } from 'pg';
import type { Grade, GradeView } from '../types/domain.js';

interface GradeRow {
    id: string;
    student_id: string;
    lesson_id: string;
    score: number;
    created_at: string;
}

interface GradeWithDetailsRow {
    grade_id: string;
    score: number;
    created_at: string;
    lesson_id: string;
    lesson_date: string;
    subject_id: string;
    subject_name: string;
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
    async insert(client: PoolClient, grade: Grade): Promise<Grade | undefined> {
    const result = await client.query<GradeRow>(
        `INSERT INTO grades (id, student_id, lesson_id, score, created_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (student_id, lesson_id) DO NOTHING
         RETURNING id, student_id, lesson_id, score, created_at`,
        [grade.id, grade.studentId, grade.lessonId, grade.score, grade.createdAt],
    );
    return result.rows[0] ? mapGrade(result.rows[0]) : undefined;
    },
    async findViewsByStudentId(
        studentId: string,
        filters?: { subjectId?: string; lessonId?: string }
    ): Promise<GradeView[]> {
        let sql = `
            SELECT 
                g.id AS grade_id,
                g.score AS score,
                g.created_at AS created_at,
                l.id AS lesson_id,
                l.date AS lesson_date,
                s.id AS subject_id,
                s.name AS subject_name
            FROM grades g
            JOIN lessons l ON g.lesson_id = l.id
            JOIN subjects s ON l.subject_id = s.id
            WHERE g.student_id = $1
        `;

        const params: any[] = [studentId];

        if (filters?.subjectId) {
            params.push(filters.subjectId);
            sql += ` AND s.id = $${params.length}`;
        }

        if (filters?.lessonId) {
            params.push(filters.lessonId);
            sql += ` AND l.id = $${params.length}`;
        }

        sql += ` ORDER BY g.created_at, g.id`;

        const result = await query<GradeWithDetailsRow>(sql, params);

        return result.rows.map((row) => ({
            grade_id: row.grade_id,
            score: row.score,
            created_at: new Date(row.created_at).toISOString(),
            lesson_date: row.lesson_date,
            subject_name: row.subject_name,
        }));
    },
};