import { query } from '../db/database.js';
import type { User } from '../types/domain.js';

interface UserRow {
    id: string;
    name: string;
    role: User['role'];
    group_id: string | null;
}

function mapUser(row: UserRow): User {
    return { id: row.id, name: row.name, role: row.role, groupId: row.group_id };
}

export const userRepository = {
    async findById(id: string): Promise<User | undefined> {
        const result = await query<UserRow>(
            'SELECT id, name, role, group_id FROM users WHERE id = $1',
            [id]
        );
        return result.rows[0] ? mapUser(result.rows[0]) : undefined;
    },
    async findStudentsByGroupId(groupId: string): Promise<User[]> {
        const result = await query<UserRow>(
            `SELECT id, name, role, group_id
             FROM users
             WHERE role = 'STUDENT' AND group_id = $1
             ORDER BY name, id`,
            [groupId]
        );
        return result.rows.map(mapUser);
    },
};
