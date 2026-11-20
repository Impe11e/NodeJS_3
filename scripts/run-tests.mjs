import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const vitestBin = path.join(path.dirname(require.resolve('vitest/package.json')), 'vitest.mjs');

const compose = ['compose', '-f', 'docker-compose.test.yml'];
const integrationOnly = process.argv.includes('integration');
const projects = integrationOnly ? ['integration'] : ['unit', 'integration'];

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

process.on('SIGINT', () => undefined);
process.on('SIGTERM', () => undefined);

let status = 1;

try {
    if (run('docker', [...compose, 'up', '-d', '--wait', 'db']) !== 0) {
        fail('Test database failed to start');
    }

    const address = capture('docker', [...compose, 'port', 'db', '5432']);
    const port = address.split(':').pop();
    const env = {
        ...process.env,
        DATABASE_URL: `postgres://journal:journal@127.0.0.1:${port}/journal`,
    };

    const migration = run(
        process.execPath,
        ['--import', 'tsx/esm', 'src/db/runSqlFile.ts', 'db/migrations/001_initial.sql'],
        { env }
    );
    if (migration !== 0) fail('Migration failed');

    const vitestArgs = ['run', ...projects.flatMap((name) => ['--project', name])];
    if (!integrationOnly) vitestArgs.push('--coverage');

    status = run(process.execPath, [vitestBin, ...vitestArgs], { env });
} catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    status = 1;
} finally {
    run('docker', [...compose, 'down', '-v', '--remove-orphans']);
}

process.exit(status);
