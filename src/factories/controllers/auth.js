import {
    PasswordComparatorAdapter,
    TokensGeneratorAdapter,
    TokenVerifierAdapter,
} from '../../adapters/index.js';
import {
    LoginUserController,
    RefreshTokenController,
} from '../../controllers/index.js';
import { PostgresGetUserByEmailRepository } from '../../repositories/postgres/index.js';
import {
    LoginUserUseCase,
    RefreshTokenUseCase,
} from '../../use-cases/index.js';

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
