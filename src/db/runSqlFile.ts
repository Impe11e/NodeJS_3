import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { query, closeDatabase } from './database.js';

const filePath = process.argv[2];

if (!filePath) {
    throw new Error('SQL file path is required');
}

try {
    await query(await readFile(filePath, 'utf8'));
} finally {
    await closeDatabase();
}
