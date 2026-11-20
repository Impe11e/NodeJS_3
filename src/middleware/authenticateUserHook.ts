import type { FastifyReply, FastifyRequest } from 'fastify';
import { unauthorized } from '../errors/appError.js';
import { UUID_PATTERN } from '../schemas/uuid.schema.js';
import { userService } from '../services/users.service.js';

const UUID_RE = new RegExp(UUID_PATTERN);

declare module 'fastify' {
    interface FastifyRequest {
        user: Awaited<ReturnType<typeof userService.getById>>;
    }
}

export async function authenticateUser(
    request: FastifyRequest,
    _reply: FastifyReply
): Promise<void> {
    const userId = request.headers['x-user-id'];

    if (typeof userId !== 'string' || !UUID_RE.test(userId)) {
        throw unauthorized('X-User-Id header is missing or invalid');
    }

    request.user = await userService.getById(userId);
}
