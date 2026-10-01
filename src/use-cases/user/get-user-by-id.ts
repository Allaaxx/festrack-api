import { User, UserRepository } from '../../domain/index.js';

export class GetUserByIdUseCase {
    constructor(private readonly userRepository: Pick<UserRepository, 'findById'>) {}

    async execute(userId: string): Promise<User | null> {
        return await this.userRepository.findById(userId);
    }
}
