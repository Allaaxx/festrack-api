import { Elysia, t } from 'elysia';
import {
    CreateUserUseCase,
    LoginUserUseCase,
    RefreshTokenUseCase,
} from '../use-cases/index.js';
import { PostgresUserRepository } from '../repositories/postgres/index.js';
import {
    PasswordHasherAdapter,
    PasswordComparatorAdapter,
    TokensGeneratorAdapter,
    TokenVerifierAdapter,
} from '../adapters/index.js';
import {
    EmailAlreadyInUseError,
    InvalidPasswordError,
    UserNotFoundError,
} from '../errors/user.js';
import { UnauthorizedError } from '../errors/auth.js';

export const authRoutes = new Elysia({ prefix: '/api/auth' })
    .post(
        '/',
        async ({ body, set }) => {
            const userRepository = new PostgresUserRepository();
            const passwordHasher = new PasswordHasherAdapter();
            const tokensGenerator = new TokensGeneratorAdapter();
            const useCase = new CreateUserUseCase(
                userRepository,
                passwordHasher,
                tokensGenerator,
            );

            try {
                const user = await useCase.execute(body);
                set.status = 201;
                return user;
            } catch (error) {
                if (error instanceof EmailAlreadyInUseError) {
                    set.status = 400;
                    return { message: error.message };
                }
                set.status = 500;
                return { message: 'Internal server error' };
            }
        },
        {
            body: t.Object({
                first_name: t.String({
                    minLength: 1,
                    error: 'First name is required.',
                }),
                last_name: t.String({
                    minLength: 1,
                    error: 'Last name is required.',
                }),
                email: t.String({
                    format: 'email',
                    error: 'Please provide a valid e-mail.',
                }),
                password: t.String({
                    minLength: 6,
                    error: 'Password must have at least 6 characters',
                }),
            }),
            detail: {
                tags: ['Auth'],
                summary: 'Register a new User',
            },
        },
    )
    .post(
        '/login',
        async ({ body, set }) => {
            const userRepository = new PostgresUserRepository();
            const passwordComparator = new PasswordComparatorAdapter();
            const tokensGenerator = new TokensGeneratorAdapter();
            const useCase = new LoginUserUseCase(
                userRepository,
                passwordComparator,
                tokensGenerator,
            );

            try {
                const user = await useCase.execute(body.email, body.password);
                set.status = 200;
                return user;
            } catch (error) {
                if (error instanceof InvalidPasswordError) {
                    set.status = 401;
                    return { message: 'Unauthorized' };
                }
                if (error instanceof UserNotFoundError) {
                    set.status = 404;
                    return { message: 'User not found' };
                }
                set.status = 500;
                return { message: 'Internal server error' };
            }
        },
        {
            body: t.Object({
                email: t.String({
                    format: 'email',
                    error: 'Please provide a valid e-mail.',
                }),
                password: t.String({
                    minLength: 6,
                    error: 'Password must have at least 6 characters',
                }),
            }),
            detail: {
                tags: ['Auth'],
                summary: 'Authenticate User and retrieve tokens',
            },
        },
    )
    .post(
        '/refresh-token',
        async ({ body, set }) => {
            const tokensGenerator = new TokensGeneratorAdapter();
            const tokenVerifier = new TokenVerifierAdapter();
            const useCase = new RefreshTokenUseCase(
                tokensGenerator,
                tokenVerifier,
            );

            try {
                const tokens = useCase.execute(body.refreshToken);
                set.status = 200;
                return { tokens };
            } catch (error) {
                if (error instanceof UnauthorizedError) {
                    set.status = 401;
                    return { message: 'Unauthorized' };
                }
                set.status = 500;
                return { message: 'Internal server error' };
            }
        },
        {
            body: t.Object({
                refreshToken: t.String({
                    minLength: 1,
                    error: 'Refresh token is required',
                }),
            }),
            detail: {
                tags: ['Auth'],
                summary: 'Refresh access token with a valid refresh token',
            },
        },
    );
