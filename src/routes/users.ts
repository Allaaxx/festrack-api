import { Elysia, t } from 'elysia';
import { authPlugin } from '../plugins/auth.js';
import {
    GetUserByIdUseCase,
    UpdateUserUseCase,
    DeleteUserUseCase,
    GetUserBalanceUseCase,
    UploadUserAvatarUseCase,
    ListUserAccountsUseCase,
    UnlinkUserAccountUseCase,
} from '../use-cases/index.js';
import { PostgresUserRepository } from '../repositories/postgres/index.js';
import {
    S3StorageService,
    BetterAuthPasswordVerifier,
} from '../adapters/index.js';
import {
    EmailAlreadyInUseError,
    UserNotFoundError,
    InvalidFileTypeError,
    FileSizeExceededError,
    CannotUnlinkLastProviderError,
    AccountNotFoundError,
    InvalidPasswordError,
} from '../errors/user.js';

const isIsoDateOnly = (dateStr: string): boolean => {
    return (
        /^\d{4}-\d{2}-\d{2}$/.test(dateStr) &&
        !isNaN(new Date(dateStr).getTime())
    );
};

export const usersRoutes = new Elysia({ prefix: '/api/users' })
    .use(authPlugin)
    .get(
        '/me',
        async ({ userId, set }) => {
            const userRepository = new PostgresUserRepository();
            const useCase = new GetUserByIdUseCase(userRepository);

            try {
                const user = await useCase.execute(userId!);
                if (!user) {
                    set.status = 404;
                    return { message: 'User not found.' };
                }
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
    .post(
        '/me/avatar',
        async ({ userId, body, set }) => {
            const userRepository = new PostgresUserRepository();
            const storageService = new S3StorageService();
            const useCase = new UploadUserAvatarUseCase(
                userRepository,
                storageService,
            );

            try {
                const user = await useCase.execute({
                    userId: userId!,
                    file: body.avatar,
                });
                set.status = 200;
                return user;
            } catch (error) {
                if (
                    error instanceof InvalidFileTypeError ||
                    error instanceof FileSizeExceededError
                ) {
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
            body: t.Object({
                avatar: t.File({
                    type: ['image/jpeg', 'image/png', 'image/webp'],
                    maxSize: '5m',
                    error: 'Please provide a valid image file (JPEG, PNG, WebP) under 5MB.',
                }),
            }),
            detail: {
                tags: ['Users'],
                summary: 'Upload current user profile avatar',
            },
        },
    )
    .patch(
        '/me',
        async ({ userId, body, set }) => {
            const userRepository = new PostgresUserRepository();
            const useCase = new UpdateUserUseCase(userRepository);

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
                            error: 'First name is required.',
                        }),
                    ),
                    last_name: t.Optional(
                        t.String({
                            minLength: 1,
                            error: 'Last name is required.',
                        }),
                    ),
                    email: t.Optional(
                        t.String({
                            format: 'email',
                            error: 'Please provide a valid e-mail.',
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
        async ({ userId, body, set }) => {
            const userRepository = new PostgresUserRepository();
            const passwordVerifier = new BetterAuthPasswordVerifier();
            const useCase = new DeleteUserUseCase(
                userRepository,
                passwordVerifier,
            );

            try {
                const deletedUser = await useCase.execute(
                    userId!,
                    body.password,
                );
                set.status = 200;
                return deletedUser;
            } catch (error) {
                if (error instanceof InvalidPasswordError) {
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
            body: t.Object({
                password: t.String({
                    minLength: 1,
                    error: 'Password is required.',
                }),
            }),
            detail: {
                tags: ['Users'],
                summary: 'Delete current user account',
            },
        },
    )
    .get(
        '/me/balance',
        async ({ userId, query, set }) => {
            if (
                !query?.from ||
                !query?.to ||
                !isIsoDateOnly(query.from) ||
                !isIsoDateOnly(query.to)
            ) {
                set.status = 400;
                return { message: 'Invalid query parameters' };
            }

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
                from: t.Optional(t.String()),
                to: t.Optional(t.String()),
            }),
            detail: {
                tags: ['Users'],
                summary: 'Get user balance over time period',
            },
        },
    )
    .get(
        '/me/accounts',
        async ({ userId, set }) => {
            const userRepository = new PostgresUserRepository();
            const useCase = new ListUserAccountsUseCase(userRepository);

            try {
                const accounts = await useCase.execute(userId!);
                set.status = 200;
                return accounts.map((acc) => ({
                    id: acc.id,
                    providerId: acc.providerId,
                    createdAt: acc.createdAt,
                }));
            } catch {
                set.status = 500;
                return { message: 'Internal server error' };
            }
        },
        {
            isAuth: true,
            detail: {
                tags: ['Users'],
                summary: 'List connected authentication accounts',
            },
        },
    )
    .post(
        '/me/accounts/unlink',
        async ({ userId, body, set }) => {
            const userRepository = new PostgresUserRepository();
            const useCase = new UnlinkUserAccountUseCase(userRepository);

            try {
                await useCase.execute(userId!, body.providerId);
                set.status = 200;
                return {
                    success: true,
                    message: `Provider ${body.providerId} unlinked successfully.`,
                };
            } catch (error) {
                if (error instanceof CannotUnlinkLastProviderError) {
                    set.status = 400;
                    return { message: error.message };
                }
                if (error instanceof AccountNotFoundError) {
                    set.status = 404;
                    return { message: error.message };
                }
                set.status = 500;
                return { message: 'Internal server error' };
            }
        },
        {
            isAuth: true,
            body: t.Object(
                {
                    providerId: t.String({
                        minLength: 1,
                        error: 'Provider ID is required.',
                    }),
                },
                { additionalProperties: false },
            ),
            detail: {
                tags: ['Users'],
                summary: 'Unlink an external authentication provider',
            },
        },
    );
