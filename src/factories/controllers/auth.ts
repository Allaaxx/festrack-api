import {
    PasswordComparatorAdapter,
    PasswordHasherAdapter,
    TokensGeneratorAdapter,
    TokenVerifierAdapter,
} from '../../adapters/index.js';
import {
    CreateUserController,
    LoginUserController,
    RefreshTokenController,
} from '../../controllers/index.js';
import { PostgresUserRepository } from '../../repositories/postgres/index.js';
import {
    CreateUserUseCase,
    LoginUserUseCase,
    RefreshTokenUseCase,
} from '../../use-cases/index.js';

export const makeCreateUserController = (): CreateUserController => {
    const userRepository = new PostgresUserRepository();
    const passwordHasherAdapter = new PasswordHasherAdapter();
    const tokensGeneratorAdapter = new TokensGeneratorAdapter();

    const createUserUseCase = new CreateUserUseCase(
        userRepository,
        passwordHasherAdapter,
        tokensGeneratorAdapter,
    );

    return new CreateUserController(createUserUseCase);
};

export const makeLoginUserController = (): LoginUserController => {
    const userRepository = new PostgresUserRepository();
    const passwordComparatorAdapter = new PasswordComparatorAdapter();
    const tokensGeneratorAdapter = new TokensGeneratorAdapter();

    const loginUserUseCase = new LoginUserUseCase(
        userRepository,
        passwordComparatorAdapter,
        tokensGeneratorAdapter,
    );

    return new LoginUserController(loginUserUseCase);
};

export const makeRefreshTokenController = (): RefreshTokenController => {
    const tokensGeneratorAdapter = new TokensGeneratorAdapter();
    const tokenVerifierAdapter = new TokenVerifierAdapter();
    const refreshTokenUseCase = new RefreshTokenUseCase(
        tokensGeneratorAdapter,
        tokenVerifierAdapter,
    );

    return new RefreshTokenController(refreshTokenUseCase);
};
