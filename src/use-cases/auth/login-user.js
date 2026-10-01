import { InvalidPasswordError, UserNotFoundError } from '../../errors/user.js';

export class LoginUserUseCase {
    constructor(
        userRepository,
        passwordComparatorAdapter,
        tokensGeneratorAdapter,
    ) {
        this.userRepository = userRepository;
        this.passwordComparatorAdapter = passwordComparatorAdapter;
        this.tokensGeneratorAdapter = tokensGeneratorAdapter;
    }

    async execute(email, password) {
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

export default LoginUserUseCase;
