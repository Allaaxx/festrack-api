import { EmailAlreadyInUseError } from '../../errors/user.js';
import { User, UpdateUserParams, UserRepository } from '../../domain/index.js';

export class UpdateUserUseCase {
    constructor(
        private readonly userRepository: Pick<
            UserRepository,
            'findByEmail' | 'update'
        >,
    ) {}

    async execute(
        userId: string,
        updateUserParams: UpdateUserParams,
    ): Promise<User> {
        if (updateUserParams.email) {
            const userWithProvidedEmail = await this.userRepository.findByEmail(
                updateUserParams.email,
            );

            if (userWithProvidedEmail && userWithProvidedEmail.id !== userId) {
                throw new EmailAlreadyInUseError(updateUserParams.email);
            }
        }

        const updatedUser = await this.userRepository.update(
            userId,
            updateUserParams,
        );

        return updatedUser;
    }
}
