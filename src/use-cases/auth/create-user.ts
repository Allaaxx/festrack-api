import { EmailAlreadyInUseError } from '../../errors/user.js';
import {
    CreateUserParams,
    UserWithTokens,
    UserRepository,
} from '../../domain/index.js';
import { PasswordHasher } from '../../adapters/password-hasher.js';
import { TokensGenerator } from '../../adapters/tokens-generator.js';

export class CreateUserUseCase {
    constructor(
        private readonly userRepository: Pick<
            UserRepository,
            'findByEmail' | 'create'
        >,
        private readonly passwordHasherAdapter: Pick<PasswordHasher, 'execute'>,
        private readonly tokensGeneratorAdapter: Pick<
            TokensGenerator,
            'execute'
        >,
    ) {}

    async execute(createUserParams: CreateUserParams): Promise<UserWithTokens> {
        const userWithProvidedEmail = await this.userRepository.findByEmail(
            createUserParams.email,
        );

        if (userWithProvidedEmail) {
            throw new EmailAlreadyInUseError(createUserParams.email);
        }

        const hashedPassword = await this.passwordHasherAdapter.execute(
            createUserParams.password,
        );

        const user = {
            ...createUserParams,
            password: hashedPassword,
        };

        const createdUser = await this.userRepository.create(user);

        return {
            ...createdUser,
            tokens: this.tokensGeneratorAdapter.execute(createdUser.id),
        };
    }
}
