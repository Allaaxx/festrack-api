import { User, UserRepository, PasswordVerifier } from '../../domain/index.js';
import { InvalidPasswordError, UserNotFoundError } from '../../errors/user.js';

export class DeleteUserUseCase {
    constructor(
        private readonly userRepository: Pick<
            UserRepository,
            'findById' | 'listAccounts' | 'delete'
        >,
        private readonly passwordVerifier: PasswordVerifier,
    ) {}

    async execute(userId: string, password?: string): Promise<User> {
        if (!password) {
            throw new InvalidPasswordError();
        }

        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new UserNotFoundError(userId);
        }

        const accounts = await this.userRepository.listAccounts(userId);
        const credentialAccount = accounts.find(
            (acc) => acc.providerId === 'credential',
        );

        if (!credentialAccount || !credentialAccount.password) {
            throw new InvalidPasswordError();
        }

        const isPasswordValid = await this.passwordVerifier.verify(
            password,
            credentialAccount.password,
        );

        if (!isPasswordValid) {
            throw new InvalidPasswordError();
        }

        const deletedUser = await this.userRepository.delete(userId);

        return deletedUser;
    }
}
