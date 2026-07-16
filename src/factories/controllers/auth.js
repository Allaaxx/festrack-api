import {
    IdGeneratorAdapter,
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
import {
    PostgresCreateUserRepository,
    PostgresGetUserByEmailRepository,
} from '../../repositories/postgres/index.js';
import {
    CreateUserUseCase,
    LoginUserUseCase,
    RefreshTokenUseCase,
} from '../../use-cases/index.js';

export const makeCreateUserController = () => {
    const getUserByEmailRepository = new PostgresGetUserByEmailRepository();

    const createUserRepository = new PostgresCreateUserRepository();

    const passwordHasherAdapter = new PasswordHasherAdapter();

    const idGeneratorAdapter = new IdGeneratorAdapter();

    const tokensGeneratorAdapter = new TokensGeneratorAdapter();

    const createUserUseCase = new CreateUserUseCase(
        getUserByEmailRepository,
        createUserRepository,
        passwordHasherAdapter,
        idGeneratorAdapter,
        tokensGeneratorAdapter,
    );

    const createUserController = new CreateUserController(createUserUseCase);

    return createUserController;
};

export const makeLoginUserController = () => {
    const getUserByEmailRepository = new PostgresGetUserByEmailRepository();
    const passwordComparatorAdapter = new PasswordComparatorAdapter();
    const tokensGeneratorAdapter = new TokensGeneratorAdapter();

    const loginUserUseCase = new LoginUserUseCase(
        getUserByEmailRepository,
        passwordComparatorAdapter,
        tokensGeneratorAdapter,
    );

    const loginUserController = new LoginUserController(loginUserUseCase);

    return loginUserController;
};

export const makeRefreshTokenController = () => {
    const tokensGeneratorAdapter = new TokensGeneratorAdapter();
    const tokenVerifierAdapter = new TokenVerifierAdapter();
    const refreshTokenUseCase = new RefreshTokenUseCase(
        tokensGeneratorAdapter,
        tokenVerifierAdapter,
    );

    const refreshTokenController = new RefreshTokenController(
        refreshTokenUseCase,
    );

    return refreshTokenController;
};
