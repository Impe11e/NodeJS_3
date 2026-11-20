import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        restoreMocks: true,
        mockReset: true,
        coverage: {
            provider: 'v8',
            include: ['src/**/*.ts'],
            exclude: ['src/server.ts', 'src/db/runSqlFile.ts', 'src/types/**'],
            reporter: ['text', 'html'],
            reportsDirectory: 'coverage',
            thresholds: {
                branches: 80,
                lines: 80,
                'src/services/grades.service.ts': {
                    branches: 100,
                },
            },
        },
        projects: [
            {
                extends: true,
                test: {
                    name: 'unit',
                    include: ['tests/unit/**/*.test.ts'],
                },
            },
            {
                extends: true,
                test: {
                    name: 'smoke',
                    include: ['tests/smoke/**/*.test.ts'],
                },
            },
        ],
    },
});
