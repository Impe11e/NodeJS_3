import type { FastifyPluginAsync } from 'fastify';
import { authenticateUser } from '../middleware/authenticateUserHook.js';
import { gradeService } from '../services/gradesServices.js';
import { lessonParamsSchema } from '../schemas/gradesSchemas.js';

interface LessonParams {
    lessonId: string;
}

const lessonsRoutes: FastifyPluginAsync = async (app) => {
    app.addHook('preHandler', authenticateUser);

    app.get<{ Params: LessonParams }>(
        '/lessons/:lessonId',
        { schema: lessonParamsSchema },
        async (request) => gradeService.openLesson(request.user, request.params.lessonId)
    );
};

export default lessonsRoutes;
