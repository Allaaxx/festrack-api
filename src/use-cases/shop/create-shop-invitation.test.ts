import { describe, it, expect, mock } from 'bun:test';
import { CreateShopInvitationUseCase } from './create-shop-invitation.js';
import { ShopNotFoundError } from '../../errors/shop.js';
import { ForbiddenError } from '../../errors/auth.js';
import { Shop, ShopMember, ShopInvitation } from '../../domain/index.js';

describe('Create Shop Invitation Use Case', () => {
    const fakeShop: Shop = {
        id: 'shop-1',
        name: 'My Shop',
        description: null,
        created_at: new Date(),
        updated_at: new Date(),
    };

    const ownerMember: ShopMember = {
        id: 'member-1',
        shop_id: 'shop-1',
        user_id: 'owner-1',
        role: 'OWNER',
        created_at: new Date(),
        updated_at: new Date(),
    };

    const regularMember: ShopMember = {
        id: 'member-2',
        shop_id: 'shop-1',
        user_id: 'member-1',
        role: 'MEMBER',
        created_at: new Date(),
        updated_at: new Date(),
    };

    it('should create an invitation and send email when caller is OWNER', async () => {
        const fakeInvitation: ShopInvitation = {
            id: 'invite-1',
            shop_id: 'shop-1',
            email: 'collaborator@example.com',
            role: 'MEMBER',
            token: 'test-token',
            status: 'PENDING',
            expires_at: new Date(),
            created_at: new Date(),
            updated_at: new Date(),
        };

        const shopRepository = {
            findById: mock(async () => fakeShop),
        } as any;
        const shopMemberRepository = {
            findByShopAndUserId: mock(async () => ownerMember),
        } as any;
        const shopInvitationRepository = {
            findPendingByShopIdAndEmail: mock(async () => null),
            create: mock(async () => fakeInvitation),
        } as any;
        const emailService = {
            sendInvitation: mock(async () => {}),
        };

        const sut = new CreateShopInvitationUseCase(
            shopRepository,
            shopMemberRepository,
            shopInvitationRepository,
            emailService,
        );

        const result = await sut.execute({
            shopId: 'shop-1',
            userId: 'owner-1',
            email: 'COLLABORATOR@example.com',
            role: 'MEMBER',
        });

        expect(result).toEqual(fakeInvitation);
        expect(emailService.sendInvitation).toHaveBeenCalled();
        expect(shopInvitationRepository.create).toHaveBeenCalled();
    });

    it('should refresh token and expiration when pending invite exists', async () => {
        const existingInvite: ShopInvitation = {
            id: 'invite-1',
            shop_id: 'shop-1',
            email: 'existing@example.com',
            role: 'MEMBER',
            token: 'old-token',
            status: 'PENDING',
            expires_at: new Date(),
            created_at: new Date(),
            updated_at: new Date(),
        };

        const refreshedInvite: ShopInvitation = {
            ...existingInvite,
            token: 'new-token',
        };

        const shopRepository = {
            findById: mock(async () => fakeShop),
        } as any;
        const shopMemberRepository = {
            findByShopAndUserId: mock(async () => ownerMember),
        } as any;
        const shopInvitationRepository = {
            findPendingByShopIdAndEmail: mock(async () => existingInvite),
            update: mock(async () => refreshedInvite),
        } as any;
        const emailService = {
            sendInvitation: mock(async () => {}),
        };

        const sut = new CreateShopInvitationUseCase(
            shopRepository,
            shopMemberRepository,
            shopInvitationRepository,
            emailService,
        );

        const result = await sut.execute({
            shopId: 'shop-1',
            userId: 'owner-1',
            email: 'existing@example.com',
        });

        expect(result.token).toBe('new-token');
        expect(shopInvitationRepository.update).toHaveBeenCalled();
    });

    it('should throw ShopNotFoundError if shop does not exist', async () => {
        const sut = new CreateShopInvitationUseCase(
            { findById: mock(async () => null) } as any,
            {} as any,
            {} as any,
            {} as any,
        );

        await expect(
            sut.execute({
                shopId: 'non-existent',
                userId: 'user-1',
                email: 'test@example.com',
            }),
        ).rejects.toThrow(ShopNotFoundError);
    });

    it('should throw ForbiddenError if caller is not an OWNER', async () => {
        const sut = new CreateShopInvitationUseCase(
            { findById: mock(async () => fakeShop) } as any,
            { findByShopAndUserId: mock(async () => regularMember) } as any,
            {} as any,
            {} as any,
        );

        await expect(
            sut.execute({
                shopId: 'shop-1',
                userId: 'member-1',
                email: 'test@example.com',
            }),
        ).rejects.toThrow(ForbiddenError);
    });
});
