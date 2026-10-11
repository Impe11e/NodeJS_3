import { execSync } from 'node:child_process';
import Fastify from 'fastify';

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

    return app;
}
