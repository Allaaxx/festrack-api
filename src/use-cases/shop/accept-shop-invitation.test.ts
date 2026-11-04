import { describe, it, expect, mock } from 'bun:test';
import { AcceptShopInvitationUseCase } from './accept-shop-invitation.js';
import {
    ShopInvitationNotFoundError,
    ShopInvitationExpiredError,
    ShopInvitationEmailMismatchError,
    UserAlreadyShopMemberError,
} from '../../errors/shop.js';
import { ShopMember, ShopInvitation } from '../../domain/index.js';

describe('Accept Shop Invitation Use Case', () => {
    const validInvite: ShopInvitation = {
        id: 'inv-1',
        shop_id: 'shop-1',
        email: 'collaborator@example.com',
        role: 'MEMBER',
        token: 'valid-token',
        status: 'PENDING',
        expires_at: new Date(Date.now() + 1000000),
        created_at: new Date(),
        updated_at: new Date(),
    };

    const createdMember: ShopMember = {
        id: 'm-1',
        shop_id: 'shop-1',
        user_id: 'u-1',
        role: 'MEMBER',
        created_at: new Date(),
        updated_at: new Date(),
    };

    it('should accept invitation and create membership when email matches', async () => {
        const repo = {
            findByToken: mock(async () => validInvite),
            update: mock(async () => ({ ...validInvite, status: 'ACCEPTED' })),
        } as any;
        const memberRepo = {
            findByShopAndUserId: mock(async () => null),
            create: mock(async () => createdMember),
        } as any;

        const sut = new AcceptShopInvitationUseCase(repo, memberRepo);

        const result = await sut.execute({
            token: 'valid-token',
            user: { id: 'u-1', email: 'COLLABORATOR@example.com' },
        });

        expect(result).toEqual(createdMember);
        expect(repo.update).toHaveBeenCalledWith('inv-1', {
            status: 'ACCEPTED',
        });
    });

    it('should throw ShopInvitationNotFoundError if token not found or not pending', async () => {
        const sut = new AcceptShopInvitationUseCase(
            { findByToken: mock(async () => null) } as any,
            {} as any,
        );

        await expect(
            sut.execute({
                token: 'missing-token',
                user: { id: 'u-1', email: 'any@example.com' },
            }),
        ).rejects.toThrow(ShopInvitationNotFoundError);
    });

    it('should throw ShopInvitationExpiredError if expired', async () => {
        const expiredInvite: ShopInvitation = {
            ...validInvite,
            expires_at: new Date(Date.now() - 10000),
        };

        const sut = new AcceptShopInvitationUseCase(
            { findByToken: mock(async () => expiredInvite) } as any,
            {} as any,
        );

        await expect(
            sut.execute({
                token: 'valid-token',
                user: { id: 'u-1', email: 'collaborator@example.com' },
            }),
        ).rejects.toThrow(ShopInvitationExpiredError);
    });

    it('should throw ShopInvitationEmailMismatchError if email does not match', async () => {
        const sut = new AcceptShopInvitationUseCase(
            { findByToken: mock(async () => validInvite) } as any,
            {} as any,
        );

        await expect(
            sut.execute({
                token: 'valid-token',
                user: { id: 'u-2', email: 'intruder@example.com' },
            }),
        ).rejects.toThrow(ShopInvitationEmailMismatchError);
    });

    it('should throw UserAlreadyShopMemberError if user is already a member', async () => {
        const sut = new AcceptShopInvitationUseCase(
            { findByToken: mock(async () => validInvite) } as any,
            {
                findByShopAndUserId: mock(async () => createdMember),
            } as any,
        );

        await expect(
            sut.execute({
                token: 'valid-token',
                user: { id: 'u-1', email: 'collaborator@example.com' },
            }),
        ).rejects.toThrow(UserAlreadyShopMemberError);
    });
});
