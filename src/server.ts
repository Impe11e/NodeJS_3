import 'dotenv/config';
import { buildApp } from './app.js';
import { closeDatabase, initDatabase, loadDbConfig } from './db/database.js';

const app = buildApp({ logger: true });
const PORT = process.env.PORT || 3000;

app.addHook('onClose', async () => {
    await closeDatabase();
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, async () => {
        app.log.info({ signal }, 'Shutting down');
        try {
            await app.close();
            process.exit(0);
        } catch (err) {
            app.log.error(err);
            process.exit(1);
        }
    });
}

const start = async () => {
    try {
        initDatabase(loadDbConfig(), app.log);
        await app.listen({ port: Number(PORT), host: '0.0.0.0' });
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};

start();
