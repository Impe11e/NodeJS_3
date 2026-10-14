CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('STUDENT', 'TEACHER')),
    group_id UUID REFERENCES groups(id),
    CONSTRAINT users_group_role_check CHECK (
        (role = 'STUDENT' AND group_id IS NOT NULL)
        OR (role = 'TEACHER' AND group_id IS NULL)
    )
);

CREATE TABLE IF NOT EXISTS subjects (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS teacher_subjects (
    teacher_id UUID NOT NULL REFERENCES users(id),
    subject_id UUID NOT NULL REFERENCES subjects(id),
    PRIMARY KEY (teacher_id, subject_id)
);

CREATE TABLE IF NOT EXISTS lessons (
    id UUID PRIMARY KEY,
    group_id UUID NOT NULL REFERENCES groups(id),
    subject_id UUID NOT NULL REFERENCES subjects(id),
    date TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE IF NOT EXISTS grades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id),
    lesson_id UUID NOT NULL REFERENCES lessons(id),
    score INTEGER NOT NULL CHECK (score BETWEEN 1 AND 100),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (student_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS lessons_subject_id_idx ON lessons(subject_id);
CREATE INDEX IF NOT EXISTS grades_student_id_idx ON grades(student_id);
