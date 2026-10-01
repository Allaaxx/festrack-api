import { User, UserRepository } from '../../domain/index.js';

export class DeleteUserUseCase {
    constructor(
        private readonly userRepository: Pick<UserRepository, 'delete'>,
    ) {}

    async execute(userId: string): Promise<User> {
        const deletedUser = await this.userRepository.delete(userId);

        return deletedUser;
    }
}
