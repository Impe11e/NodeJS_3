import { uuidSchema } from './uuid.schema.js';

export const createGradeSchema = {
    body: {
        type: 'object',
        required: ['student_id', 'lesson_id', 'score'],
        additionalProperties: false,
        properties: {
            student_id: uuidSchema,
            lesson_id: uuidSchema,
            score: { type: 'integer', minimum: 1, maximum: 100 },
        },
    },
} as const;

export const listGradesSchema = {
    querystring: {
        type: 'object',
        additionalProperties: false,
        properties: {
            subject_id: uuidSchema,
            lesson_id: uuidSchema,
        },
    },
} as const;

export const lessonParamsSchema = {
    params: {
        type: 'object',
        required: ['lessonId'],
        properties: { lessonId: uuidSchema },
    },
} as const;
