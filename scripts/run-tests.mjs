import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const vitestBin = path.join(path.dirname(require.resolve('vitest/package.json')), 'vitest.mjs');

const compose = ['compose', '-f', 'docker-compose.test.yml'];
const only = process.argv[2];
const runUnitAndIntegration = only !== 'e2e';
const runE2e = only !== 'integration';
const projects = only === 'integration' ? ['integration'] : ['unit', 'integration'];

function run(command, args, options = {}) {
    const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', ...options });
    if (result.error) throw result.error;
    return result.status ?? 1;
}

function capture(command, args) {
    const result = spawnSync(command, args, { cwd: root, encoding: 'utf8' });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(result.stderr.trim());
    return result.stdout.trim();
}

function fail(message) {
    throw new Error(message);
}

function publishedPort(service, containerPort) {
    const address = capture('docker', [...compose, 'port', service, String(containerPort)]);
    return address.split(':').pop();
}

process.on('SIGINT', () => undefined);
process.on('SIGTERM', () => undefined);

let status = 1;

try {
    const sha = capture('git', ['rev-parse', 'HEAD']);

    if (run('docker', [...compose, 'up', '-d', '--wait', 'db']) !== 0) {
        fail('Test database failed to start');
    }

    const env = {
        ...process.env,
        DATABASE_URL: `postgres://journal:journal@127.0.0.1:${publishedPort('db', 5432)}/journal`,
        GIT_COMMIT_SHA: sha,
    };

    const migration = run(
        process.execPath,
        ['--import', 'tsx/esm', 'src/db/runSqlFile.ts', 'db/migrations/001_initial.sql'],
        { env }
    );
    if (migration !== 0) fail('Migration failed');

    status = 0;

    if (runUnitAndIntegration) {
        const vitestArgs = ['run', ...projects.flatMap((name) => ['--project', name])];
        if (only === undefined) vitestArgs.push('--coverage');
        status = run(process.execPath, [vitestBin, ...vitestArgs], { env });
    }

    if (runE2e && status === 0) {
        if (run('docker', [...compose, 'up', '-d', '--build', '--wait', 'app'], { env }) !== 0) {
            fail('Application container failed to start');
        }

        status = run(process.execPath, [vitestBin, 'run', '--project', 'e2e'], {
            env: { ...env, E2E_BASE_URL: `http://127.0.0.1:${publishedPort('app', 3000)}` },
        });
    }
} catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    status = 1;
} finally {
    run('docker', [...compose, 'down', '-v', '--remove-orphans']);
}

process.exit(status);
