import type { FastifyReply, FastifyRequest } from 'fastify';
import { unauthorized } from '../errors/appError.js';
import { userService } from '../services/usersServices.js';

declare module 'fastify' {
    interface FastifyRequest {
        user: ReturnType<typeof userService.getById>;
    }
}

export async function authenticateUser(
    request: FastifyRequest,
    _reply: FastifyReply,
): Promise<void> {
    const userId = request.headers['x-user-id'];

    if (typeof userId !== 'string' || userId.length === 0) {
        throw unauthorized('X-User-Id header is required');
    }

    request.user = userService.getById(userId);
}
