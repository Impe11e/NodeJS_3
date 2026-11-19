export const createGradeSchema = {
    body: {
        type: 'object',
        required: ['student_id', 'lesson_id', 'score'],
        additionalProperties: false,
        properties: {
            student_id: { type: 'string', format: 'uuid' },
            lesson_id: { type: 'string', format: 'uuid' },
            score: { type: 'integer', minimum: 1, maximum: 100 },
        },
    },
} as const;

export const listGradesSchema = {
    querystring: {
        type: 'object',
        additionalProperties: false,
        properties: {
            subject_id: { type: 'string', format: 'uuid' },
            lesson_id: { type: 'string', format: 'uuid' },
        },
    },
} as const;

export const lessonParamsSchema = {
    params: {
        type: 'object',
        required: ['lessonId'],
        properties: { lessonId: { type: 'string', format: 'uuid' } },
    },
} as const;
