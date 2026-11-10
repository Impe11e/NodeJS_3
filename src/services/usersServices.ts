import { unauthorized, notFound } from '../errors/appError.js';
import { userRepository } from '../repositories/usersRepositories.js';
import type { User } from '../types/domain.js';

export const userService = {
    async getById(id: string): Promise<User> {
        const user = await userRepository.findById(id);
        if (!user) throw unauthorized('Unknown user');
        return user;
    },
    async getStudentsByGroupId(groupId: string): Promise<User[]> {
        return userRepository.findStudentsByGroupId(groupId);
    },
    async requireStudent(id: string): Promise<User> {
        const user = await this.getById(id);
        if (user.role !== 'STUDENT') throw notFound('Student not found');
        return user;
    },
};
