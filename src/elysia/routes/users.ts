import { Elysia, t } from 'elysia';
import { authPlugin } from '../plugins/auth.js';
import {
    GetUserByIdUseCase,
    UpdateUserUseCase,
    DeleteUserUseCase,
    GetUserBalanceUseCase,
} from '../../use-cases/index.js';
import { PostgresUserRepository } from '../../repositories/postgres/index.js';
import { PasswordHasherAdapter } from '../../adapters/index.js';
import {
    EmailAlreadyInUseError,
    UserNotFoundError,
} from '../../errors/user.js';

export const usersRoutes = new Elysia({ prefix: '/api/users' })
    .use(authPlugin)
    .get(
        '/me',
        async ({ userId, set }) => {
            const userRepository = new PostgresUserRepository();
            const useCase = new GetUserByIdUseCase(userRepository);

            try {
                const user = await useCase.execute(userId!);
                set.status = 200;
                return user;
            } catch (error) {
                if (error instanceof UserNotFoundError) {
                    set.status = 404;
                    return { message: 'User not found.' };
                }
                set.status = 500;
                return { message: 'Internal server error' };
            }
        },
        {
            isAuth: true,
            detail: {
                tags: ['Users'],
                summary: 'Get current user profile',
            },
        },
    )
    .get(
        '/me/balance',
        async ({ userId, query, set }) => {
            const userRepository = new PostgresUserRepository();
            const useCase = new GetUserBalanceUseCase(userRepository);

            try {
                const balance = await useCase.execute(
                    userId!,
                    query.from,
                    query.to,
                );
                set.status = 200;
                return balance;
            } catch (error) {
                if (error instanceof UserNotFoundError) {
                    set.status = 404;
                    return { message: 'User not found.' };
                }
                set.status = 500;
                return { message: 'Internal server error' };
            }
        },
        {
            isAuth: true,
            query: t.Object({
                from: t.String({
                    pattern: '^\\d{4}-\\d{2}-\\d{2}$',
                    error: 'The from date must be in the format YYYY-MM-DD.',
                }),
                to: t.String({
                    pattern: '^\\d{4}-\\d{2}-\\d{2}$',
                    error: 'The to date must be in the format YYYY-MM-DD.',
                }),
            }),
            detail: {
                tags: ['Users'],
                summary: 'Calculate user balance and percentages',
            },
        },
    )
    .patch(
        '/me',
        async ({ userId, body, set }) => {
            const userRepository = new PostgresUserRepository();
            const passwordHasher = new PasswordHasherAdapter();
            const useCase = new UpdateUserUseCase(
                userRepository,
                passwordHasher,
            );

            try {
                const updatedUser = await useCase.execute(userId!, body);
                set.status = 200;
                return updatedUser;
            } catch (error) {
                if (error instanceof EmailAlreadyInUseError) {
                    set.status = 400;
                    return { message: error.message };
                }
                if (error instanceof UserNotFoundError) {
                    set.status = 404;
                    return { message: 'User not found.' };
                }
                set.status = 500;
                return { message: 'Internal server error' };
            }
        },
        {
            isAuth: true,
            body: t.Object(
                {
                    first_name: t.Optional(
                        t.String({
                            minLength: 1,
                            error: 'First name must not be empty.',
                        }),
                    ),
                    last_name: t.Optional(
                        t.String({
                            minLength: 1,
                            error: 'Last name must not be empty.',
                        }),
                    ),
                    email: t.Optional(
                        t.String({
                            format: 'email',
                            error: 'Please provide a valid e-mail.',
                        }),
                    ),
                    password: t.Optional(
                        t.String({
                            minLength: 6,
                            error: 'Password must have at least 6 characters.',
                        }),
                    ),
                },
                { additionalProperties: false },
            ),
            detail: {
                tags: ['Users'],
                summary: 'Update current user profile',
            },
        },
    )
    .delete(
        '/me',
        async ({ userId, set }) => {
            const userRepository = new PostgresUserRepository();
            const useCase = new DeleteUserUseCase(userRepository);

            try {
                const deletedUser = await useCase.execute(userId!);
                set.status = 200;
                return deletedUser;
            } catch (error) {
                if (error instanceof UserNotFoundError) {
                    set.status = 404;
                    return { message: 'User not found.' };
                }
                set.status = 500;
                return { message: 'Internal server error' };
            }
        },
        {
            isAuth: true,
            detail: {
                tags: ['Users'],
                summary: 'Delete current user profile',
            },
        },
    );
