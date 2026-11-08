import { Elysia, t } from 'elysia';
import { authPlugin } from '../plugins/auth.js';
import {
    CreateShopUseCase,
    GetShopsByUserIdUseCase,
    GetShopByIdUseCase,
    UpdateShopUseCase,
    DeleteShopUseCase,
    CreateShopInvitationUseCase,
    GetPendingInvitationsUseCase,
    RevokeShopInvitationUseCase,
    AcceptShopInvitationUseCase,
    GetShopMembersUseCase,
    RemoveShopMemberUseCase,
    TransferShopOwnershipUseCase,
    GetShopBalanceUseCase,
    UploadShopAssetUseCase,
} from '../use-cases/index.js';
import {
    PostgresShopRepository,
    PostgresShopMemberRepository,
    PostgresShopInvitationRepository,
    PostgresUserRepository,
    PostgresTransactionRepository,
    PostgresEventRepository,
} from '../repositories/postgres/index.js';
import {
    ConsoleEmailService,
    S3StorageService,
    SharpImageProcessor,
} from '../adapters/index.js';
import {
    ShopNotFoundError,
    ShopMemberNotFoundError,
    ShopInvitationNotFoundError,
    ShopInvitationExpiredError,
    ShopInvitationEmailMismatchError,
    InvalidInvitationStateError,
    ShopSoleOwnerCannotLeaveError,
    TargetUserNotMemberError,
    UserAlreadyShopMemberError,
} from '../errors/shop.js';
import { ForbiddenError } from '../errors/auth.js';
import { EventNotFoundError } from '../errors/event.js';
import { InvalidFileTypeError, FileSizeExceededError } from '../errors/user.js';
import { isIsoDateValid } from './helpers.js';

export const shopsRoutes = new Elysia({ prefix: '/api/shops' })
    .use(authPlugin)
    .post(
        '',
        async ({ userId, body, set }) => {
            const shopRepository = new PostgresShopRepository();
            const shopMemberRepository = new PostgresShopMemberRepository();
            const useCase = new CreateShopUseCase(
                shopRepository,
                shopMemberRepository,
            );

            try {
                const shop = await useCase.execute({
                    userId: userId!,
                    name: body.name,
                    description: body.description ?? null,
                });
                set.status = 201;
                return shop;
            } catch {
                set.status = 500;
                return { message: 'Internal server error' };
            }
        },
        {
            isAuth: true,
            body: t.Object(
                {
                    name: t.String({
                        minLength: 1,
                        maxLength: 100,
                        error: 'Name is required.',
                    }),
                    description: t.Optional(
                        t.Nullable(
                            t.String({
                                maxLength: 500,
                                error: 'Description must be at most 500 characters.',
                            }),
                        ),
                    ),
                },
                { additionalProperties: false },
            ),
            detail: {
                tags: ['Shops'],
                summary: 'Create a new shop',
            },
        },
    )
    .get(
        '',
        async ({ userId, set }) => {
            const shopRepository = new PostgresShopRepository();
            const useCase = new GetShopsByUserIdUseCase(shopRepository);

            try {
                const shops = await useCase.execute(userId!);
                set.status = 200;
                return shops;
            } catch {
                set.status = 500;
                return { message: 'Internal server error' };
            }
        },
        {
            isAuth: true,
            detail: {
                tags: ['Shops'],
                summary: 'Get all shops for current user',
            },
        },
    )
    .get(
        '/invitations/:token',
        async ({ params, set }) => {
            const shopInvitationRepository =
                new PostgresShopInvitationRepository();
            const shopRepository = new PostgresShopRepository();

            try {
                const invitation = await shopInvitationRepository.findByToken(
                    params.token,
                );
                if (!invitation) {
                    set.status = 404;
                    return { message: 'Invitation not found.' };
                }

                const shop = await shopRepository.findById(invitation.shop_id);
                set.status = 200;
                return {
                    ...invitation,
                    shop: shop
                        ? {
                              id: shop.id,
                              name: shop.name,
                              description: shop.description,
                          }
                        : null,
                };
            } catch {
                set.status = 500;
                return { message: 'Internal server error' };
            }
        },
        {
            params: t.Object(
                {
                    token: t.String({
                        minLength: 1,
                        error: 'Token is required.',
                    }),
                },
                { additionalProperties: false },
            ),
            detail: {
                tags: ['Shops'],
                summary: 'Get shop invitation details by token',
            },
        },
    )
    .post(
        '/invitations/:token/accept',
        async ({ userId, user, params, set }) => {
            const shopInvitationRepository =
                new PostgresShopInvitationRepository();
            const shopMemberRepository = new PostgresShopMemberRepository();
            const useCase = new AcceptShopInvitationUseCase(
                shopInvitationRepository,
                shopMemberRepository,
            );

            let email = user?.email;
            if (!email) {
                const userRepo = new PostgresUserRepository();
                const dbUser = await userRepo.findById(userId!);
                email = dbUser?.email || '';
            }

            try {
                const member = await useCase.execute({
                    token: params.token,
                    user: {
                        id: userId!,
                        email,
                    },
                });
                set.status = 200;
                return member;
            } catch (error) {
                if (error instanceof ShopInvitationNotFoundError) {
                    set.status = 404;
                    return { message: error.message };
                }
                if (error instanceof ShopInvitationExpiredError) {
                    set.status = 400;
                    return { message: error.message };
                }
                if (error instanceof ShopInvitationEmailMismatchError) {
                    set.status = 403;
                    return { message: error.message };
                }
                if (error instanceof UserAlreadyShopMemberError) {
                    set.status = 409;
                    return { message: error.message };
                }
                set.status = 500;
                return { message: 'Internal server error' };
            }
        },
        {
            isAuth: true,
            params: t.Object(
                {
                    token: t.String({
                        minLength: 1,
                        error: 'Token is required.',
                    }),
                },
                { additionalProperties: false },
            ),
            detail: {
                tags: ['Shops'],
                summary: 'Accept an invitation to join a shop',
            },
        },
    )
    .get(
        '/:shopId/members',
        async ({ userId, params, set }) => {
            const shopRepository = new PostgresShopRepository();
            const shopMemberRepository = new PostgresShopMemberRepository();
            const useCase = new GetShopMembersUseCase(
                shopRepository,
                shopMemberRepository,
            );

            try {
                const members = await useCase.execute({
                    shopId: params.shopId,
                    userId: userId!,
                });
                set.status = 200;
                return members;
            } catch (error) {
                if (error instanceof ShopNotFoundError) {
                    set.status = 404;
                    return { message: 'Shop not found.' };
                }
                if (error instanceof ForbiddenError) {
                    set.status = 403;
                    return { message: error.message };
                }
                set.status = 500;
                return { message: 'Internal server error' };
            }
        },
        {
            isAuth: true,
            params: t.Object(
                {
                    shopId: t.String({
                        format: 'uuid',
                        error: 'The provided id is not valid.',
                    }),
                },
                { additionalProperties: false },
            ),
            detail: {
                tags: ['Shops'],
                summary: 'Get all members of a shop',
            },
        },
    )
    .delete(
        '/:shopId/members/:userId',
        async ({ userId, params, set }) => {
            const shopRepository = new PostgresShopRepository();
            const shopMemberRepository = new PostgresShopMemberRepository();
            const useCase = new RemoveShopMemberUseCase(
                shopRepository,
                shopMemberRepository,
            );

            try {
                const member = await useCase.execute({
                    shopId: params.shopId,
                    callerUserId: userId!,
                    targetUserId: params.userId,
                });
                set.status = 200;
                return member;
            } catch (error) {
                if (error instanceof ShopNotFoundError) {
                    set.status = 404;
                    return { message: 'Shop not found.' };
                }
                if (error instanceof ShopMemberNotFoundError) {
                    set.status = 404;
                    return { message: error.message };
                }
                if (error instanceof ShopSoleOwnerCannotLeaveError) {
                    set.status = 400;
                    return { message: error.message };
                }
                if (error instanceof ForbiddenError) {
                    set.status = 403;
                    return { message: error.message };
                }
                set.status = 500;
                return { message: 'Internal server error' };
            }
        },
        {
            isAuth: true,
            params: t.Object(
                {
                    shopId: t.String({
                        format: 'uuid',
                        error: 'The provided id is not valid.',
                    }),
                    userId: t.String({
                        minLength: 1,
                        error: 'The provided userId is not valid.',
                    }),
                },
                { additionalProperties: false },
            ),
            detail: {
                tags: ['Shops'],
                summary: 'Remove a member or leave a shop',
            },
        },
    )
    .post(
        '/:shopId/transfer-ownership',
        async ({ userId, params, body, set }) => {
            const shopRepository = new PostgresShopRepository();
            const shopMemberRepository = new PostgresShopMemberRepository();
            const useCase = new TransferShopOwnershipUseCase(
                shopRepository,
                shopMemberRepository,
            );

            try {
                const member = await useCase.execute({
                    shopId: params.shopId,
                    currentOwnerUserId: userId!,
                    newOwnerUserId: body.new_owner_user_id,
                });
                set.status = 200;
                return member;
            } catch (error) {
                if (error instanceof ShopNotFoundError) {
                    set.status = 404;
                    return { message: 'Shop not found.' };
                }
                if (error instanceof TargetUserNotMemberError) {
                    set.status = 404;
                    return { message: error.message };
                }
                if (error instanceof ForbiddenError) {
                    set.status = 403;
                    return { message: error.message };
                }
                set.status = 500;
                return { message: 'Internal server error' };
            }
        },
        {
            isAuth: true,
            params: t.Object(
                {
                    shopId: t.String({
                        format: 'uuid',
                        error: 'The provided id is not valid.',
                    }),
                },
                { additionalProperties: false },
            ),
            body: t.Object(
                {
                    new_owner_user_id: t.String({
                        minLength: 1,
                        error: 'New owner user ID is required.',
                    }),
                },
                { additionalProperties: false },
            ),
            detail: {
                tags: ['Shops'],
                summary: 'Transfer shop ownership',
            },
        },
    )
    .post(
        '/:shopId/invitations',
        async ({ userId, params, body, set }) => {
            const shopRepository = new PostgresShopRepository();
            const shopMemberRepository = new PostgresShopMemberRepository();
            const shopInvitationRepository =
                new PostgresShopInvitationRepository();
            const emailService = new ConsoleEmailService();
            const useCase = new CreateShopInvitationUseCase(
                shopRepository,
                shopMemberRepository,
                shopInvitationRepository,
                emailService,
            );

            try {
                const invitation = await useCase.execute({
                    shopId: params.shopId,
                    userId: userId!,
                    email: body.email,
                    role: body.role,
                });
                set.status = 201;
                return invitation;
            } catch (error) {
                if (error instanceof ShopNotFoundError) {
                    set.status = 404;
                    return { message: 'Shop not found.' };
                }
                if (error instanceof ForbiddenError) {
                    set.status = 403;
                    return { message: error.message };
                }
                set.status = 500;
                return { message: 'Internal server error' };
            }
        },
        {
            isAuth: true,
            params: t.Object(
                {
                    shopId: t.String({
                        format: 'uuid',
                        error: 'The provided id is not valid.',
                    }),
                },
                { additionalProperties: false },
            ),
            body: t.Object(
                {
                    email: t.String({
                        format: 'email',
                        error: 'A valid email is required.',
                    }),
                    role: t.Optional(
                        t.Union([t.Literal('OWNER'), t.Literal('MEMBER')], {
                            error: 'Role must be OWNER or MEMBER.',
                        }),
                    ),
                },
                { additionalProperties: false },
            ),
            detail: {
                tags: ['Shops'],
                summary: 'Create an invitation to join a shop',
            },
        },
    )
    .get(
        '/:shopId/invitations',
        async ({ userId, params, set }) => {
            const shopRepository = new PostgresShopRepository();
            const shopMemberRepository = new PostgresShopMemberRepository();
            const shopInvitationRepository =
                new PostgresShopInvitationRepository();
            const useCase = new GetPendingInvitationsUseCase(
                shopRepository,
                shopMemberRepository,
                shopInvitationRepository,
            );

            try {
                const invitations = await useCase.execute({
                    shopId: params.shopId,
                    userId: userId!,
                });
                set.status = 200;
                return invitations;
            } catch (error) {
                if (error instanceof ShopNotFoundError) {
                    set.status = 404;
                    return { message: 'Shop not found.' };
                }
                if (error instanceof ForbiddenError) {
                    set.status = 403;
                    return { message: error.message };
                }
                set.status = 500;
                return { message: 'Internal server error' };
            }
        },
        {
            isAuth: true,
            params: t.Object(
                {
                    shopId: t.String({
                        format: 'uuid',
                        error: 'The provided id is not valid.',
                    }),
                },
                { additionalProperties: false },
            ),
            detail: {
                tags: ['Shops'],
                summary: 'Get pending invitations for a shop',
            },
        },
    )
    .delete(
        '/:shopId/invitations/:invitationId',
        async ({ userId, params, set }) => {
            const shopRepository = new PostgresShopRepository();
            const shopMemberRepository = new PostgresShopMemberRepository();
            const shopInvitationRepository =
                new PostgresShopInvitationRepository();
            const useCase = new RevokeShopInvitationUseCase(
                shopRepository,
                shopMemberRepository,
                shopInvitationRepository,
            );

            try {
                const invitation = await useCase.execute({
                    shopId: params.shopId,
                    invitationId: params.invitationId,
                    userId: userId!,
                });
                set.status = 200;
                return invitation;
            } catch (error) {
                if (error instanceof ShopNotFoundError) {
                    set.status = 404;
                    return { message: 'Shop not found.' };
                }
                if (error instanceof ShopInvitationNotFoundError) {
                    set.status = 404;
                    return { message: error.message };
                }
                if (error instanceof InvalidInvitationStateError) {
                    set.status = 400;
                    return { message: error.message };
                }
                if (error instanceof ForbiddenError) {
                    set.status = 403;
                    return { message: error.message };
                }
                set.status = 500;
                return { message: 'Internal server error' };
            }
        },
        {
            isAuth: true,
            params: t.Object(
                {
                    shopId: t.String({
                        format: 'uuid',
                        error: 'The provided id is not valid.',
                    }),
                    invitationId: t.String({
                        format: 'uuid',
                        error: 'The provided invitation id is not valid.',
                    }),
                },
                { additionalProperties: false },
            ),
            detail: {
                tags: ['Shops'],
                summary: 'Revoke an invitation',
            },
        },
    )
    .get(
        '/:shopId/balance',
        async ({ userId, params, query, set }) => {
            if (query?.from && !isIsoDateValid(query.from)) {
                set.status = 400;
                return { message: 'Invalid query parameters' };
            }
            if (query?.to && !isIsoDateValid(query.to)) {
                set.status = 400;
                return { message: 'Invalid query parameters' };
            }

            const transactionRepository = new PostgresTransactionRepository();
            const shopRepository = new PostgresShopRepository();
            const shopMemberRepository = new PostgresShopMemberRepository();
            const eventRepository = new PostgresEventRepository();

            const useCase = new GetShopBalanceUseCase(
                transactionRepository,
                shopRepository,
                shopMemberRepository,
                eventRepository,
            );

            try {
                const balance = await useCase.execute(
                    params.shopId,
                    userId!,
                    query
                        ? {
                              from: query.from,
                              to: query.to,
                              event_id: query.event_id,
                          }
                        : undefined,
                );
                set.status = 200;
                return balance;
            } catch (error) {
                if (error instanceof ShopNotFoundError) {
                    set.status = 404;
                    return { message: 'Shop not found.' };
                }
                if (error instanceof EventNotFoundError) {
                    set.status = 404;
                    return { message: 'Event not found.' };
                }
                if (error instanceof ForbiddenError) {
                    set.status = 403;
                    return { message: 'Forbidden' };
                }
                set.status = 500;
                return { message: 'Internal server error' };
            }
        },
        {
            isAuth: true,
            params: t.Object(
                {
                    shopId: t.String({
                        format: 'uuid',
                        error: 'The provided id is not valid.',
                    }),
                },
                { additionalProperties: false },
            ),
            query: t.Object(
                {
                    from: t.Optional(t.String()),
                    to: t.Optional(t.String()),
                    event_id: t.Optional(
                        t.String({
                            format: 'uuid',
                            error: 'Event ID must be a valid UUID.',
                        }),
                    ),
                },
                { additionalProperties: false },
            ),
            detail: {
                tags: ['Shops'],
                summary: 'Get consolidated shop balance',
                description:
                    'Retrieve consolidated balance for a shop, optionally filtered by date range or associated event.',
            },
        },
    )
    .get(
        '/:shopId',
        async ({ userId, params, set }) => {
            const shopRepository = new PostgresShopRepository();
            const shopMemberRepository = new PostgresShopMemberRepository();
            const useCase = new GetShopByIdUseCase(
                shopRepository,
                shopMemberRepository,
            );

            try {
                const shop = await useCase.execute(params.shopId, userId!);
                set.status = 200;
                return shop;
            } catch (error) {
                if (error instanceof ShopNotFoundError) {
                    set.status = 404;
                    return { message: 'Shop not found.' };
                }
                if (error instanceof ForbiddenError) {
                    set.status = 403;
                    return { message: 'Forbidden' };
                }
                set.status = 500;
                return { message: 'Internal server error' };
            }
        },
        {
            isAuth: true,
            params: t.Object(
                {
                    shopId: t.String({
                        format: 'uuid',
                        error: 'The provided id is not valid.',
                    }),
                },
                { additionalProperties: false },
            ),
            detail: {
                tags: ['Shops'],
                summary: 'Get shop by id',
            },
        },
    )
    .patch(
        '/:shopId',
        async ({ userId, params, body, set }) => {
            const shopRepository = new PostgresShopRepository();
            const shopMemberRepository = new PostgresShopMemberRepository();
            const useCase = new UpdateShopUseCase(
                shopRepository,
                shopMemberRepository,
            );

            try {
                const shop = await useCase.execute(
                    params.shopId,
                    userId!,
                    body,
                );
                set.status = 200;
                return shop;
            } catch (error) {
                if (error instanceof ShopNotFoundError) {
                    set.status = 404;
                    return { message: 'Shop not found.' };
                }
                if (error instanceof ForbiddenError) {
                    set.status = 403;
                    return { message: 'Forbidden' };
                }
                set.status = 500;
                return { message: 'Internal server error' };
            }
        },
        {
            isAuth: true,
            params: t.Object(
                {
                    shopId: t.String({
                        format: 'uuid',
                        error: 'The provided id is not valid.',
                    }),
                },
                { additionalProperties: false },
            ),
            body: t.Object(
                {
                    name: t.Optional(
                        t.String({
                            minLength: 1,
                            maxLength: 100,
                            error: 'Name must not be empty.',
                        }),
                    ),
                    description: t.Optional(
                        t.Nullable(
                            t.String({
                                maxLength: 500,
                                error: 'Description must be at most 500 characters.',
                            }),
                        ),
                    ),
                },
                { additionalProperties: false },
            ),
            detail: {
                tags: ['Shops'],
                summary: 'Update shop by id',
            },
        },
    )
    .delete(
        '/:shopId',
        async ({ userId, params, set }) => {
            const shopRepository = new PostgresShopRepository();
            const shopMemberRepository = new PostgresShopMemberRepository();
            const useCase = new DeleteShopUseCase(
                shopRepository,
                shopMemberRepository,
            );

            try {
                const shop = await useCase.execute(params.shopId, userId!);
                set.status = 200;
                return shop;
            } catch (error) {
                if (error instanceof ShopNotFoundError) {
                    set.status = 404;
                    return { message: 'Shop not found.' };
                }
                if (error instanceof ForbiddenError) {
                    set.status = 403;
                    return { message: 'Forbidden' };
                }
                set.status = 500;
                return { message: 'Internal server error' };
            }
        },
        {
            isAuth: true,
            params: t.Object(
                {
                    shopId: t.String({
                        format: 'uuid',
                        error: 'The provided id is not valid.',
                    }),
                },
                { additionalProperties: false },
            ),
            detail: {
                tags: ['Shops'],
                summary: 'Delete shop by id',
            },
        },
    )
    .post(
        '/:shopId/uploads',
        async ({ userId, params, body, set }) => {
            const shopRepository = new PostgresShopRepository();
            const shopMemberRepository = new PostgresShopMemberRepository();
            const storageService = new S3StorageService();
            const imageProcessor = new SharpImageProcessor();
            const useCase = new UploadShopAssetUseCase(
                shopRepository,
                shopMemberRepository,
                storageService,
                imageProcessor,
            );

            try {
                const result = await useCase.execute({
                    shopId: params.shopId,
                    userId: userId!,
                    file: body.file,
                    folder: body.folder,
                });
                set.status = 201;
                return result;
            } catch (error) {
                if (
                    error instanceof InvalidFileTypeError ||
                    error instanceof FileSizeExceededError
                ) {
                    set.status = 400;
                    return { message: error.message };
                }
                if (error instanceof ShopNotFoundError) {
                    set.status = 404;
                    return { message: 'Shop not found.' };
                }
                if (error instanceof ForbiddenError) {
                    set.status = 403;
                    return { message: error.message };
                }
                set.status = 500;
                return { message: 'Internal server error' };
            }
        },
        {
            isAuth: true,
            params: t.Object(
                {
                    shopId: t.String({
                        format: 'uuid',
                        error: 'The provided id is not valid.',
                    }),
                },
                { additionalProperties: false },
            ),
            body: t.Object({
                file: t.File({
                    type: [
                        'image/jpeg',
                        'image/png',
                        'image/webp',
                        'image/avif',
                    ],
                    maxSize: '10m',
                    error: 'Please provide a valid image file (JPEG, PNG, WebP, AVIF) under 10MB.',
                }),
                folder: t.Optional(
                    t.Union([
                        t.Literal('general'),
                        t.Literal('products'),
                        t.Literal('receipts'),
                    ]),
                ),
            }),
            detail: {
                tags: ['Shops'],
                summary: 'Upload shop asset image',
            },
        },
    );
