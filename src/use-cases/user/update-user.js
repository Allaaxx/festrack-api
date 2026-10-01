import { EmailAlreadyInUseError } from '../../errors/user.js';

export class UpdateUserUseCase {
    constructor(userRepository, passwordHasherAdapter) {
        this.userRepository = userRepository;
        this.passwordHasherAdapter = passwordHasherAdapter;
    }

    async execute(userId, updateUserParams) {
        if (updateUserParams.email) {
            const userWithProvideEmail = await this.userRepository.findByEmail(
                updateUserParams.email,
            );

            if (userWithProvideEmail && userWithProvideEmail.id != userId) {
                throw new EmailAlreadyInUseError(updateUserParams.email);
            }
        }

        const user = {
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
