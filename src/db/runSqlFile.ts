import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { query, closeDatabase, initDatabase, loadDbConfig } from './database.js';
import { sql } from './sql.js';

const filePath = process.argv[2];

if (!filePath) {
    throw new Error('SQL file path is required');
}

initDatabase(loadDbConfig(), console);

try {
    await query(sql.raw(await readFile(filePath, 'utf8')));
} finally {
    await closeDatabase();
}
