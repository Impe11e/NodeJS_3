import { groups, users } from './inMemoryStore.js';
import type { User } from '../types/domain.js';

export const userRepository = {
    findById(id: string): User | undefined {
        return users.find((user) => user.id === id);
    },
    findStudentsByGroupId(groupId: string): User[] {
        return users.filter(
            (user) => user.role === 'STUDENT' && user.groupId === groupId,
        );
    },
    groupExists(id: string): boolean {
        return groups.some((group) => group.id === id);
    },
};