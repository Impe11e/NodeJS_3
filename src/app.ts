import { execSync } from 'node:child_process';
import Fastify from 'fastify';
import gradesRoutes from './routes/gradesRoutes.js';
import lessonsRoutes from './routes/lessonsRoutes.js';
import { globalErrorHandler } from './middleware/globalErrorHandler.js';

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
    const app = Fastify(opts);

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
