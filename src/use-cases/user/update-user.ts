import { EmailAlreadyInUseError } from '../../errors/user.js';
import { User, UpdateUserParams, UserRepository } from '../../domain/index.js';
import { PasswordHasher } from '../../adapters/password-hasher.js';

export class UpdateUserUseCase {
    constructor(
        private readonly userRepository: Pick<UserRepository, 'findByEmail' | 'update'>,
        private readonly passwordHasherAdapter: PasswordHasher,
    ) {}

    async execute(userId: string, updateUserParams: UpdateUserParams): Promise<User> {
        if (updateUserParams.email) {
            const userWithProvidedEmail = await this.userRepository.findByEmail(
                updateUserParams.email,
            );

            if (userWithProvidedEmail && userWithProvidedEmail.id !== userId) {
                throw new EmailAlreadyInUseError(updateUserParams.email);
            }
        }

        const user: UpdateUserParams = {
            ...updateUserParams,
        };

        if (updateUserParams.password) {
            const hashedPassword = await this.passwordHasherAdapter.execute(
                updateUserParams.password,
            );
            user.password = hashedPassword;
        }

        const updatedUser = await this.userRepository.update(userId, user);

        return updatedUser;
    }
}
