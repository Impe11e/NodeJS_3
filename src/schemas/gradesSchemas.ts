export const createGradeSchema = {
    body: {
        type: 'object',
        required: ['student_id', 'lesson_id', 'score'],
        additionalProperties: false,
        properties: {
            student_id: { type: 'string', minLength: 1 },
            lesson_id: { type: 'string', minLength: 1 },
            score: { type: 'integer', minimum: 1, maximum: 100 },
        },
    },
} as const;
