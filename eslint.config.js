import js from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default [
    // Ігноровані шляхи
    {
        ignores: ['node_modules/', 'coverage/', 'dist/'],
    },

    // Базова конфігурація для JS файлів проєкту
    {
        files: ['**/*.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                ...globals.node,
                ...globals.es2021,
            },
        },
        rules: {
            ...js.configs.recommended.rules,
            'no-console': 'error',
            'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
            'no-var': 'error',
            'prefer-const': 'error',
            eqeqeq: ['error', 'always'],
        },
    },

    // Оточення та глобальні змінні для тестів (Jest)
    {
        files: ['**/*.test.js', '**/__tests__/**/*.js'],
        languageOptions: {
            globals: {
                ...globals.jest,
            },
        },
    },
    // TypeScript-файли
    ...tseslint.configs.recommended.map((config) => ({
        ...config,
        files: ['**/*.ts'],
    })),
    {
        files: ['**/*.ts'],
        languageOptions: {
            globals: { ...globals.node },
        },
        rules: {
            'no-console': 'error',
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
            'no-var': 'error',
            'prefer-const': 'error',
            eqeqeq: ['error', 'always'],
        },
    },

    // Шари: routes не звертаються до repositories напряму
    {
        files: ['src/routes/**/*.ts'],
        rules: {
            'no-restricted-imports': ['error', { patterns: ['**/repositories/**'] }],
        },
    },

    // Вимкнення правил ESLint, які можуть конфліктувати з Prettier
    prettierConfig,
];
