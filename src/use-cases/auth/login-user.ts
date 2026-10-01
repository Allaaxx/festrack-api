import { InvalidPasswordError, UserNotFoundError } from '../../errors/user.js';
import { UserWithTokens, UserRepository } from '../../domain/index.js';
import { PasswordComparator } from '../../adapters/password-comparator.js';
import { TokensGenerator } from '../../adapters/tokens-generator.js';

export class LoginUserUseCase {
    constructor(
        private readonly userRepository: Pick<UserRepository, 'findByEmail'>,
        private readonly passwordComparatorAdapter: Pick<
            PasswordComparator,
            'execute'
        >,
        private readonly tokensGeneratorAdapter: Pick<
            TokensGenerator,
            'execute'
        >,
    ) {}

    async execute(email: string, password: string): Promise<UserWithTokens> {
        const user = await this.userRepository.findByEmail(email);

        if (!user) {
            throw new UserNotFoundError();
        }

        const isPasswordValid = await this.passwordComparatorAdapter.execute(
            password,
            user.password,
        );

        if (!isPasswordValid) {
            throw new InvalidPasswordError();
        }

        return {
            ...user,
            tokens: this.tokensGeneratorAdapter.execute(user.id),
        };
    }
}
