import type { FastifyReply, FastifyRequest } from 'fastify';
import { unauthorized } from '../errors/appError.js';
import { userService } from '../services/usersServices.js';

declare module 'fastify' {
    interface FastifyRequest {
        user: Awaited<ReturnType<typeof userService.getById>>;
    }
}

export async function authenticateUser(
    request: FastifyRequest,
    _reply: FastifyReply,
): Promise<void> {
    const userId = request.headers['x-user-id'];
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (typeof userId !== 'string' || !UUID_RE.test(userId)) {
    throw unauthorized('X-User-Id header is missing or invalid');
}

    request.user = await userService.getById(userId);
}
