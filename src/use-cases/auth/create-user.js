import { EmailAlreadyInUseError } from '../../errors/user.js';

export class CreateUserUseCase {
    constructor(userRepository, passwordHasherAdapter, tokensGeneratorAdapter) {
        this.userRepository = userRepository;
        this.passwordHasherAdapter = passwordHasherAdapter;
        this.tokensGeneratorAdapter = tokensGeneratorAdapter;
    }

    async execute(createUserParams) {
        const userWithProvideEmail = await this.userRepository.findByEmail(
            createUserParams.email,
        );

        if (userWithProvideEmail) {
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
