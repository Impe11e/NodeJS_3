import { unauthorized, notFound } from '../errors/appError.js';
import { userRepository } from '../repositories/usersRepositories.js';
import type { User } from '../types/domain.js';

export const userService = {
    getById(id: string): User {
        const user = userRepository.findById(id);
        if (!user) throw unauthorized('Unknown user');
        return user;
    },
    getStudentsByGroupId(groupId: string): User[] {
        return userRepository.findStudentsByGroupId(groupId);
    },
    requireStudent(id: string): User {
        const user = this.getById(id);
        if (user.role !== 'STUDENT') throw notFound('Student not found');
        return user;
    },
};