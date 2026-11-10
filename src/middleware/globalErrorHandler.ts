import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '../errors/appError.js';

export function globalErrorHandler(
    error: FastifyError,
    request: FastifyRequest,
    reply: FastifyReply
) {
    if (error instanceof AppError) {
        return reply.code(error.statusCode).send({ error: error.message });
    }

    if (error.validation) {
        return reply.code(400).send({ error: 'Invalid request data' });
    }

    request.log.error(error);
    return reply.code(500).send({ error: 'Internal server error' });
}
