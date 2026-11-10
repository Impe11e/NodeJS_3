import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import Fastify from 'fastify';
import gradesRoutes from './routes/gradesRoutes.js';
import lessonsRoutes from './routes/lessonsRoutes.js';
import { globalErrorHandler } from './middleware/globalErrorHandler.js';
import { runWithLogger, setBaseLogger } from './logger/requestContext.js';

const REQUEST_ID_RE = /^[A-Za-z0-9._-]{1,64}$/;

function getRequestId(req: IncomingMessage): string {
    const header = req.headers['x-request-id'];
    return typeof header === 'string' && REQUEST_ID_RE.test(header) ? header : randomUUID();
}

function getCommitSha() {
    if (process.env.GIT_COMMIT_SHA) {
        return process.env.GIT_COMMIT_SHA;
    }
    try {
        return execSync('git rev-parse HEAD').toString().trim();
    } catch {
        return 'unknown';
    }
}

export function buildApp(opts = {}) {
    const app = Fastify({
        ...opts,
        requestIdHeader: false,
        genReqId: getRequestId,
        ajv: {
            customOptions: {
                removeAdditional: false,
            },
        },
    });

    setBaseLogger(app.log);

    app.addHook('onRequest', (request, reply, done) => {
        reply.header('x-request-id', request.id);
        runWithLogger(request.log, done);
    });

    app.get('/version', async () => {
        return { sha: getCommitSha() };
    });

    app.register(gradesRoutes);
    app.register(lessonsRoutes);
    // якщо б була логіка, то реєструвалися б і інші:
    // app.register(usersRoutes);
    // app.register(groupsRoutes);
    // app.register(subjectsRoutes);

    app.setErrorHandler(globalErrorHandler);

    return app;
}
