import type { FastifyPluginAsync } from 'fastify';
import { authenticateUser } from '../middleware/authenticateUserHook.js';
import { gradeService } from '../services/gradesServices.js';
import { createGradeSchema, listGradesSchema } from '../schemas/gradesSchemas.js';

interface CreateGradeBody {
    student_id: string;
    lesson_id: string;
    score: number;
}

interface GradeQuery {
    subject_id?: string;
    lesson_id?: string;
}

const gradesRoutes: FastifyPluginAsync = async (app) => {
    app.addHook('preHandler', authenticateUser);

    app.post<{ Body: CreateGradeBody }>(
        '/grades',
        { schema: createGradeSchema },
        async (request, reply) => {
            const grade = await gradeService.create(
                request.user,
                request.body.student_id,
                request.body.lesson_id,
                request.body.score
            );
            return reply.code(201).send({
                id: grade.id,
                student_id: grade.studentId,
                lesson_id: grade.lessonId,
                score: grade.score,
                created_at: grade.createdAt,
            });
        }
    );

    app.get<{ Querystring: GradeQuery }>(
        '/grades',
        { schema: listGradesSchema },
        async (request) => {
            return gradeService.listForStudent(
                request.user,
                request.query.subject_id,
                request.query.lesson_id
            );
        }
    );

    app.get('/grades/average', async (request) => {
        return { average_score: await gradeService.averageForStudent(request.user) };
    });
};

export default gradesRoutes;
