import { buildApp } from './app.js';

const app = buildApp({ logger: true });
const PORT = process.env.PORT || 3000;

const start = async () => {
    try {
        await app.listen({ port: Number(PORT), host: '0.0.0.0' });
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};

start();
